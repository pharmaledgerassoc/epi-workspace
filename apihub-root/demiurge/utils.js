import constants from "./constants.js";
const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");
const w3cdid = openDSU.loadAPI("w3cdid");

const getSorUserId = async () => {
    return await getSharedEnclaveKey(constants.SOR_USER_ID);
}
const getSharedEnclaveKey = async (key) => {
    const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    let record;
    try {
        record = await sharedEnclave.readKeyAsync(key);
    } catch (e) {
        // ignore
    }
    return record;
}

const detectCurrentPage = () => {
    let currentPage = window.location.hash.slice(1);
    let presenterName = currentPage.split("/")[0];
    if (currentPage === "") {
        currentPage = "groups-page";
        presenterName = currentPage;
    }
    return {currentPage, presenterName};
}

async function fetchGroups() {
    const enclaveDB = await $$.promisify(scAPI.getSharedEnclave)();
    let groups;
    try {
        groups = await $$.promisify(enclaveDB.filter)(constants.TABLES.GROUPS);
    } catch (e) {
        return console.log(e);
    }
    return groups;
}

async function getUserDetails() {
    if (!window.userDetails) {
        let username = localStorage.getItem("SSODetectedId");

        const openDSU = require("opendsu");
        const config = openDSU.loadAPI("config");
        let appName = await $$.promisify(config.getEnv)("appName");
        window.userDetails = {
            userAppDetails: `${appName || "-"}/${username}`,
            username: username
        }
    }
    return window.userDetails;
}

function retryAsyncFunction(asyncFunction, maxTries, timeBetweenRetries, ...args) {
    return new Promise(async (resolve) => {
        let attempt = 0;
        while (attempt < maxTries) {
            try {
                const result = await asyncFunction(...args);
                resolve(result); // Successful execution, resolve the promise with the result
                return; // Exit the function
            } catch (error) {
                attempt++;
                if (attempt >= maxTries) {
                    $$.forceTabRefresh();
                } else {
                    await new Promise(resolve => setTimeout(resolve, timeBetweenRetries)); // Wait before the next retry
                }
            }
        }
    });
}

function getGroupName(group) {
    const segments = group.did.split(":");
    let groupName = segments.pop();
    return groupName;
}

function getUserIdFromUsername(username) {
    const DSU_FABRIC = 'DSU_Fabric/';
    const DEMIURGE = 'Demiurge/';
    // if DSU_FABRIC username format:  DSU_Fabric/user@domain
    if (username.includes(DSU_FABRIC)) {
        username = username.replace(DSU_FABRIC, '');
        if (username.includes('@')) {
            username = username.replace(/\d+$/, '');
        }
    } else if (username.includes(DEMIURGE)) {
        username = username.replace(DEMIURGE, '');
        if (username.includes('/')) {
            username = username.replace(/\d+$/, '');
            username = username.replaceAll("/", "@");
        }
    }
    return username;
}

const setSharedEnclaveKey = async (key, value) => {
    const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    let batchId = await sharedEnclave.startOrAttachBatchAsync();
    try {
        await sharedEnclave.writeKeyAsync(key, value);
        await sharedEnclave.commitBatchAsync(batchId);
    } catch (e) {
        await sharedEnclave.cancelBatchAsync(batchId);
        throw e;
    }
}

async function setSysadminCreated(sysadminCreated) {
    return await setSharedEnclaveKey(constants.SYSADMIN_CREATED, sysadminCreated);
}

async function getSysadminCreated() {
    return await getSharedEnclaveKey(constants.SYSADMIN_CREATED);
}

async function getBreakGlassRecoveryCode() {
    const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    let keySSI = await sharedEnclave.getKeySSIAsync();
    if (typeof keySSI !== "string" && keySSI.getIdentifier) {
        keySSI = keySSI.getIdentifier();
    }
    return keySSI;
}

function getPKFromContent(stringContent) {
    return crypto.sha256(stringContent);
}

export default {
    getSorUserId,
    getSharedEnclaveKey,
    detectCurrentPage,
    fetchGroups,
    getUserDetails,
    retryAsyncFunction,
    getGroupName,
    getSysadminCreated,
    setSysadminCreated,
    getBreakGlassRecoveryCode,
    getPKFromContent,
    getUserIdFromUsername
}

