import constants from "./constants.js";

const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");
const w3cdid = openDSU.loadAPI("w3cdid");
const notificationHandler = openDSU.loadAPI("error");
const crypto = openDSU.loadAPI("crypto");
const config = openDSU.loadAPI("config");
const resolver = openDSU.loadAPI("resolver");
const enclaveAPI = openDSU.loadAPI("enclave");

const getSorUserId = async () => {
    return await getSharedEnclaveKey(constants.SOR_USER_ID);
}

const setSorUserId = async (userId) => {
    return await setSharedEnclaveKey(constants.SOR_USER_ID, userId);
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

async function setEpiEnclave(enclaveRecord) {
    const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    await sharedEnclave.writeKeyAsync(constants.EPI_SHARED_ENCLAVE, enclaveRecord);
    await $$.promisify(config.setEnv)(constants.EPI_SHARED_ENCLAVE, enclaveRecord.enclaveKeySSI);
}

async function getEpiEnclave() {
    const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    let enclaveRecord;
    try {
        enclaveRecord = await sharedEnclave.readKeyAsync(constants.EPI_SHARED_ENCLAVE);
    } catch (e) {
        // ignore
    }
    return enclaveRecord;
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

//recovery arg is used to determine if the enclave is created for the first time or a recovery is performed
async function initSharedEnclave(keySSI, enclaveConfig, recovery) {
    const enclaveDB = await $$.promisify(scAPI.getMainEnclave)();
    if (recovery) {
        try {
            await $$.promisify(resolver.loadDSU)(keySSI);
        } catch (e) {
            await $$.promisify(resolver.createDSUForExistingSSI)(keySSI);
        }
    }
    let enclave;
    try {
        enclave = enclaveAPI.initialiseWalletDBEnclave(keySSI);

        function waitForEnclaveInitialization() {
            return new Promise((resolve) => {
                enclave.on("initialised", resolve)
            })
        }

        await waitForEnclaveInitialization();
    } catch (e) {
        throw e
    }

    const enclaveDID = await $$.promisify(enclave.getDID)();
    let enclaveKeySSI = await $$.promisify(enclave.getKeySSI)();
    enclaveKeySSI = enclaveKeySSI.getIdentifier();
    let tables = Object.keys(enclaveConfig.enclaveIndexesMap);
    let bID;

    try {
        bID = await enclave.startOrAttachBatchAsync();
    } catch (e) {
        return webSkel.notificationHandler.reportUserRelevantWarning('Failed to begin batch on enclave: ', e)
    }
    for (let dbTableName of tables) {
        for (let indexField of enclaveConfig.enclaveIndexesMap[dbTableName]) {
            try {
                await $$.promisify(enclave.addIndex)(null, dbTableName, indexField)
            } catch (e) {
                const addIndexError = createOpenDSUErrorWrapper(`Failed to add index ${indexField} on table ${dbTableName}`, e);
                try {
                    await enclave.cancelBatchAsync(bID);
                } catch (error) {
                    return webSkel.notificationHandler.reportUserRelevantWarning('Failed to cancel batch on enclave: ', error, addIndexError)
                }
                return webSkel.notificationHandler.reportUserRelevantWarning('Failed to add index on enclave: ', addIndexError);
            }
        }
    }

    try {
        await enclave.commitBatchAsync(bID);
    } catch (e) {
        return webSkel.notificationHandler.reportUserRelevantWarning('Failed to commit batch on enclave: ', e)
    }

    if (enclaveConfig.enclaveName.indexOf("demiurge") !== -1) {
        await $$.promisify(scAPI.setSharedEnclave)(enclave);
    }

    const enclaveRecord = {
        enclaveType: enclaveConfig.enclaveType,
        enclaveDID,
        enclaveKeySSI,
        enclaveName: enclaveConfig.enclaveName
    };

    let batchId = await enclaveDB.startOrAttachBatchAsync();
    await enclaveDB.writeKeyAsync(enclaveConfig.enclaveName, enclaveRecord);
    await enclaveDB.insertRecordAsync(constants.TABLES.GROUP_ENCLAVES, enclaveRecord.enclaveDID, enclaveRecord);
    await enclaveDB.commitBatchAsync(batchId);

    if (enclaveConfig.enclaveName.indexOf("epiEnclave") !== -1) {
        const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
        const batchId = await sharedEnclave.startOrAttachBatchAsync();
        await setEpiEnclave(enclaveRecord);
        await sharedEnclave.commitBatchAsync(batchId);
    }

    return enclaveRecord;
}

export default {
    getSorUserId,
    setSorUserId,
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
    getUserIdFromUsername,
    setEpiEnclave,
    getEpiEnclave,
    initSharedEnclave
}
