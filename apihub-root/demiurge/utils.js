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
    await $$.promisify(sharedEnclave.refresh)();
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

/*
* mode = alert | block_alert
* alert - show toast but user can continue with app
* block_alert - blocks interaction with app
* */
function renderToast(message, type, mode, timeoutValue = 5000) { 
    if (mode && (mode === "alert" || "block_alert")) {
        let toastContainer = document.querySelector(".toast-container");
        const dialogElement = document.createElement('dialog');
        dialogElement.classList.add('toast-dialog');
        let toastElement = document.createElement("div");
        toastElement.classList.add("toast");
        toastElement.classList.add(type);
        toastElement.innerHTML = `<p class="toast-text">${message}</p>`
        let toastButton = document.createElement("div");
        toastButton.classList.add("toast-close-button");
        toastButton.innerHTML = `<svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.705 2.20934C13.8928 2.02156 13.9983 1.76687 13.9983 1.50131C13.9983 1.23575 13.8928 0.981059 13.705 0.793278C13.5172 0.605495 13.2625 0.5 12.997 0.5C12.7314 0.5 12.4767 0.605495 12.2889 0.793278L7 6.08352L1.70944 0.794943C1.52165 0.607161 1.26695 0.501666 1.00137 0.501666C0.735788 0.501666 0.481087 0.607161 0.293294 0.794943C0.105501 0.982724 2.79833e-09 1.23741 0 1.50297C-2.79833e-09 1.76854 0.105501 2.02322 0.293294 2.21101L5.58385 7.49958L0.29496 12.7898C0.107167 12.9776 0.00166609 13.2323 0.00166609 13.4979C0.0016661 13.7634 0.107167 14.0181 0.29496 14.2059C0.482752 14.3937 0.737454 14.4992 1.00303 14.4992C1.26861 14.4992 1.52331 14.3937 1.71111 14.2059L7 8.91565L12.2906 14.2067C12.4784 14.3945 12.7331 14.5 12.9986 14.5C13.2642 14.5 13.5189 14.3945 13.7067 14.2067C13.8945 14.0189 14 13.7643 14 13.4987C14 13.2331 13.8945 12.9784 13.7067 12.7907L8.41615 7.49958L13.705 2.20934Z" fill="black"/>
</svg>`

        toastElement.appendChild(toastButton);
        dialogElement.appendChild(toastElement);
        if (mode === "alert") {
            toastContainer.appendChild(dialogElement);
            toastButton.addEventListener(constants.HTML_EVENTS.CLICK, () => {
                if (toastElement && toastElement.parentElement && toastContainer.contains(toastElement.parentElement)) {
                    toastContainer.removeChild(toastElement.parentElement);
                }
            })
            dialogElement.show();
        }
        if (mode === "block_alert") {
            dialogElement.classList.add(mode);
            document.body.appendChild(dialogElement);
            toastButton.addEventListener(constants.HTML_EVENTS.CLICK, () => {
                dialogElement.close();
                dialogElement.remove();
            })
            dialogElement.showModal();
        }
        setTimeout(() => {
            if (dialogElement && toastContainer.contains(dialogElement)) 
                toastContainer.removeChild(dialogElement);
        }, timeoutValue)

        return;
    }

   
    let toastContainer = document.querySelector(".toast-container");
    toastContainer.insertAdjacentHTML("beforeend", `<message-toast data-message="${message}" data-type="${type}" data-timeout="${timeoutValue}" data-presenter="message-toast"></message-toast>`);
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
    initSharedEnclave,
    renderToast
}
