import constants from "./constants.js";

const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");
const w3cdid = openDSU.loadAPI("w3cdid");
const notificationHandler = openDSU.loadAPI("error");
const crypto = openDSU.loadAPI("crypto");
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

async function migrateData(sharedEnclave) {
    let adminGroup = await getAdminGroup(sharedEnclave);
    const apiKeyClient = apiKeySpace.getAPIKeysClient();
    try {
        notificationHandler.reportUserRelevantInfo(`System Alert: Migration of Access Control Mechanisms is Currently Underway. Your Patience is Appreciated.`);
        let did = await getStoredDID();
        try {
            const sysadminSecret = await getBreakGlassRecoveryCode();
            const apiKey = crypto.sha256JOSE(crypto.generateRandom(32), "base64");
            const body = {
                secret: sysadminSecret,
                apiKey
            }
            await apiKeyClient.becomeSysAdmin(JSON.stringify(body));
            await setSysadminCreated(true);
        } catch (e) {
            console.log(e);
            // already sysadmin
        }
        let groupDIDDocument = await $$.promisify(w3cdid.resolveDID)(adminGroup.did);
        const members = await $$.promisify(groupDIDDocument.getMembers)();
        for (let member in members) {
            const memberObject = members[member];
            if (member !== did) {
                await apiKeyClient.makeSysAdmin(getUserIdFromUsername(memberObject.username), crypto.generateRandom(32).toString("base64"));
            }
        }
        const epiEnclaveRecord = await $$.promisify(sharedEnclave.readKey)(constants.EPI_SHARED_ENCLAVE);
        let enclaveKeySSI = epiEnclaveRecord.enclaveKeySSI;
        let response
        try {
            response = await fetch(`${window.location.origin}/doMigration`, {
                body: JSON.stringify({epiEnclaveKeySSI: enclaveKeySSI}),
                method: "PUT",
                headers: {"Content-Type": "application/json"}
            });
        } catch (e) {
            notificationHandler.reportUserRelevantError(`Failed to migrate Access Control Mechanisms.`);
            return;
        }
        if (response.status !== 200) {
            console.log(response.statusText);
            notificationHandler.reportUserRelevantError(`Failed to migrate Access Control Mechanisms.`);
            return;
        }
    } catch (e) {
        console.log(e);
        notificationHandler.reportUserRelevantError(`Failed to migrate Access Control Mechanisms.`);
        return;
    }

    async function assignAccessToGroups(sharedEnclave) {
        await associateGroupAccess(sharedEnclave, constants.WRITE_ACCESS_MODE);
        await associateGroupAccess(sharedEnclave, constants.READ_ONLY_ACCESS_MODE);
    }

    await assignAccessToGroups(sharedEnclave);
}

async function doMigration(sharedEnclave, force = false) {
    function showMigrationDialog() {
        // Check if the dialog already exists
        let dialog = document.getElementById('migrationDialog');
        if (!dialog) {
            dialog = document.createElement('div');
            dialog.id = 'migrationDialog';
            dialog.style.position = 'fixed';
            dialog.style.left = '0';
            dialog.style.top = '0';
            dialog.style.width = '100%';
            dialog.style.height = '100%';
            dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            dialog.style.zIndex = '1000';
            dialog.style.display = 'flex';
            dialog.style.justifyContent = 'center';
            dialog.style.alignItems = 'center';
            dialog.style.color = 'black';
            dialog.innerHTML = '<div style="padding: 40px; background: #FFF;">Migration is in progress, please wait...</div>';
            document.body.appendChild(dialog);
        } else {
            dialog.style.display = 'flex';
        }
    }

    // Function to hide the migration dialog
    function hideMigrationDialog() {
        const dialog = document.getElementById('migrationDialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
    }

    if (!sharedEnclave) {
        sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    }
    if (force) {
        await migrateData(sharedEnclave);
    }
    let response = await fetch(`${window.location.origin}/getMigrationStatus`);
    if (response.status !== 200) {
        throw new Error(`Failed to check migration status. HTTP status: ${response.status}`);
    }

    let migrationStatus = await response.text();

    if (migrationStatus === constants.MIGRATION_STATUS.NOT_STARTED) {
        await migrateData(sharedEnclave);
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    response = await fetch(`${window.location.origin}/getMigrationStatus`);
    if (response.status !== 200) {
        throw new Error(`Failed to check migration status. HTTP status: ${response.status}`);
    }

    migrationStatus = await response.text();

    if (migrationStatus === constants.MIGRATION_STATUS.IN_PROGRESS) {
        showMigrationDialog();
    }

    while (migrationStatus === constants.MIGRATION_STATUS.IN_PROGRESS) {
        await delay(10000);

        response = await fetch(`${window.location.origin}/getMigrationStatus`);
        if (response.status !== 200) {
            throw new Error(`Failed to recheck migration status. HTTP status: ${response.status}`);
        }
        migrationStatus = await response.text();

        if (migrationStatus === constants.MIGRATION_STATUS.COMPLETED) {
            hideMigrationDialog();
            notificationHandler.reportUserRelevantInfo(`Migration of Access Control Mechanisms successfully executed !`);
            return;
        }

        if (migrationStatus === constants.MIGRATION_STATUS.FAILED) {
            hideMigrationDialog();
            notificationHandler.reportUserRelevantError(`Failed to migrate Access Control Mechanisms.`);
            return;
        }
    }
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
