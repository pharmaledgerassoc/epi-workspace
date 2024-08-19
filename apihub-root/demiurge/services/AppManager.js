import env from "./../environment.js";
import {getPermissionsWatcher} from "./PermissionsWatcher.js";
import SetupMan from "./SetupMan.js";
import GroupsManager from "./GroupsManager.js";
import AuditService from "./AuditService.js";
import constants from "../constants.js";
import utils from "../utils.js";

const openDSU = require("opendsu");
const dbAPI = openDSU.loadAPI("db");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const systemAPI = openDSU.loadApi("system");
const crypto = openDSU.loadAPI("crypto");
const notificationHandler = openDSU.loadAPI("error");
const apiKeySpace = openDSU.loadAPI("apiKey");

const DEFAULT_PIN = "1qaz";

/**
 * @param {string} did - identifier of DIDDocument
 */
async function setStoredDID(did, walletStatus = constants.ACCOUNT_STATUS.WAITING_APPROVAL) {
    const walletStorage = await $$.promisify(dbAPI.getMainEnclave)();
    const _setStoredDID = async () => {
        if (typeof did !== "string") {
            did = did.getIdentifier();
        }
        let batchId = await walletStorage.startOrAttachBatchAsync();
        try {
            await scAPI.setMainDIDAsync(did);
            await walletStorage.writeKeyAsync(constants.IDENTITY, {did, walletStatus});
            await walletStorage.commitBatchAsync(batchId);
        } catch (e) {
            try {
                await walletStorage.cancelBatchAsync(batchId);
            } catch (err) {
                console.log(err);
            }
            throw e;
        }
    };

    let identity;
    try {
        identity = await walletStorage.readKeyAsync(constants.IDENTITY);
    } catch (e) {
        identity = undefined;
    }

    if (identity && identity.did === did && identity.walletStatus === walletStatus) {
        return;
    }

    await utils.retryAsyncFunction(_setStoredDID, 3, 100);
}

async function getStoredDID() {
    let walletStorage = await $$.promisify(dbAPI.getMainEnclave)();

    let record;

    try {
        record = await walletStorage.readKeyAsync(constants.IDENTITY);
    } catch (err) {
        // TODO: wait for a future improvement of db from OpenDSU SDK
    }

    if (!record) {
        console.log("No identity did obtained from db for current wallet!");
        return undefined;
    }

    return record.did;
}

async function setMainDID(typicalBusinessLogicHub, didDocument, notificationHandler) {
    if (typeof didDocument === "object") {
        didDocument = didDocument.getIdentifier();
    }
    try {
        await $$.promisify(typicalBusinessLogicHub.setMainDID)(didDocument);
    } catch (e) {
        notificationHandler.reportUserRelevantInfo(`Failed to initialise communication layer. Retrying ...`);
        await setMainDID(typicalBusinessLogicHub, didDocument);
    }
}

async function setSharedEnclaveKeySSI(recoveryCode) {
    return new Promise((resolve, reject) => {
        const openDSU = require("opendsu");
        const scAPI = openDSU.loadAPI("sc");
        const keySSI = openDSU.loadAPI("keyssi");
        const enclaveAPI = openDSU.loadAPI("enclave");
        try {
            keySSI.parse(recoveryCode); // parse and check if the recoveryCode has the right format for a sharedEnclaveKeySSI
            const sharedEnclave = enclaveAPI.initialiseWalletDBEnclave(recoveryCode);
            sharedEnclave.on("error", err => {
                return reject(err);
            });
            sharedEnclave.on("initialised", async () => {
                await $$.promisify(scAPI.setSharedEnclave)(sharedEnclave);
                return resolve();
            });
        } catch (err) {
            return reject(err);
        }
    });
}

async function storeDID(did) {
    await setStoredDID(did);
}

let mainEnclave;

async function getMainEnclave() {
    if (!mainEnclave) {
        try {
            mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantWarning(`Failed to get main enclave: ${e.message}. Retrying ...`);
            return await this.getMainEnclave();
        }
    }

    return mainEnclave;
}

let sharedEnclave;

async function getSharedEnclave() {
    if (!sharedEnclave) {
        try {
            sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantWarning(`Failed to get shared enclave: ${e.message}. Retrying ...`);
            return await getSharedEnclave();
        }
    }

    return sharedEnclave;
}

async function getSharedEnclaveDataFromEnv() {
    const mainDSU = await $$.promisify(scAPI.getMainDSU)();
    let env = await $$.promisify(mainDSU.readFile)("/environment.json");
    env = JSON.parse(env.toString());
    let data = {
        "enclaveType": env[openDSU.constants.SHARED_ENCLAVE.TYPE],
        "enclaveDID": env[openDSU.constants.SHARED_ENCLAVE.DID],
        "enclaveKeySSI": env[openDSU.constants.SHARED_ENCLAVE.KEY_SSI]
    }
    return data;
}

async function getMigrationStatus() {
    let response = await fetch(`${window.location.origin}/getMigrationStatus`);
    if (response.status !== 200) {
        throw new Error(`Failed to check if migration is needed. Status: ${response.status}`);
    }
    let migrationStatus = await response.text();
    return migrationStatus;
}

function deriveEncryptionKey(key) {
    return crypto.deriveEncryptionKey(key);
}

function getCookie(cookieName) {
    const name = cookieName + "=";
    let res;
    try {
        const cookiesArr = decodeURIComponent(document.cookie).split('; ');
        cookiesArr.forEach(val => {
            if (val.indexOf(name) === 0) res = val.substring(name.length);
        })
    } catch (e) {
        console.log("error on get cookie ", e);
    }
    return res;
}

function getSSOId(ssoIdFieldName) {
    let ssoDetectedId = localStorage.getItem(ssoIdFieldName);
    if (!ssoDetectedId) {
        ssoDetectedId = getCookie(ssoIdFieldName);
    }
    return ssoDetectedId;
}

function getSSODetectedId() {
    return getSSOId("SSODetectedId");
}

function getSSOUserId() {
    return getSSOId("SSOUserId");
}

async function putSSOSecret() {
    let secret = crypto.generateRandom(32).toString("base64");
    let encrypted = encrypt(DEFAULT_PIN, secret);
    let putData = {secret: JSON.stringify(JSON.parse(encrypted).data)};
    const url = `${systemAPI.getBaseURL()}/putSSOSecret/${env.appName}`;
    try {
        await fetch(url, {
            method: "PUT", headers: {
                "Content-Type": "application/json",
            }, body: JSON.stringify(putData)
        });
    } catch (e) {
        console.log(e);
    }
    return putData.secret;
}

async function getSSOSecret() {
    const url = `${systemAPI.getBaseURL()}/getSSOSecret/${env.appName}`;
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Secret not found");
        }

        throw new Error(`Failed to get secret: ${response.status}`);
    }
    const encryptedSecret = await response.text();
    return encryptedSecret;
}

function encrypt(key, dataObj) {
    const encryptionKey = crypto.deriveEncryptionKey(key);
    const encryptedCredentials = crypto.encrypt(JSON.stringify(dataObj), encryptionKey);
    return JSON.stringify(encryptedCredentials);
}

function decrypt(key, encryptedData) {
    const encryptionKey = crypto.deriveEncryptionKey(key);
    const decryptData = crypto.decrypt($$.Buffer.from(JSON.parse(encryptedData)), encryptionKey);
    return JSON.parse(decryptData.toString());
}

function getWalletSecretsArray(encryptedSSOSecret) {
    const ssoSecret = decrypt(DEFAULT_PIN, encryptedSSOSecret);
    return [getSSODetectedId(), getSSOUserId(), ssoSecret, env.appName];
}

async function loadWallet(encryptedSSOSecret) {
    let resolver = require("opendsu").loadApi("resolver");
    let keyssi = require("opendsu").loadApi("keyssi");
    let walletSSI = keyssi.createTemplateWalletSSI(env.vaultDomain, getWalletSecretsArray(encryptedSSOSecret));
    const constDSU = await $$.promisify(resolver.loadDSU)(walletSSI);
    return constDSU.getWritableDSU();
}

async function autoAuthorization() {
    let did = await getStoredDID();
    let SecretsHandler = w3cDID.SecretsHandler;
    let handler = await SecretsHandler.getInstance(did);
    let domain = await $$.promisify(scAPI.getVaultDomain)();
    const enclaveData = await getSharedEnclaveDataFromEnv();
    let groupCredential = await GroupsManager.getInstance().getGroupCredential(`did:ssi:name:${domain}:${constants.EPI_ADMIN_GROUP}`);
    await handler.authorizeUser(did, groupCredential, enclaveData);
}

async function firstOrRecoveryAdminToAdministrationGroup(did, userDetails, logAction = constants.AUDIT_OPERATIONS.SHARED_ENCLAVE_CREATE) {
    if (typeof did !== "string") {
        did = did.getIdentifier();
    }
    const sharedEnclave = await getSharedEnclave();
    let groupsManager = GroupsManager.getInstance();
    let adminGroup = await groupsManager.getAdminGroup(sharedEnclave);
    await groupsManager.addMember(adminGroup.id, did);
    //TODO: add the audit log
    // await utils.addLogMessage(did, logAction, utils.getGroupName(adminGroup), userDetails.userName || "-");
}

async function migrateDemiurgeData() {
    const sharedEnclave = await getSharedEnclave();
    const sharedEnclaveKeySSI = await $$.promisify(sharedEnclave.getKeySSI)();
    await $$.promisify(webSkel.demiurgeSorClient.doDemiurgeMigration)(sharedEnclaveKeySSI);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

function hideMigrationDialog() {
    const dialog = document.getElementById('migrationDialog');
    if (dialog) {
        dialog.style.display = 'none';
    }
}

async function waitForMigration() {
    let migrationStatus = await $$.promisify(webSkel.demiurgeSorClient.getDemiurgeMigrationStatus)();
    while (migrationStatus === constants.MIGRATION_STATUS.IN_PROGRESS) {
        await delay(10000);
        migrationStatus = await $$.promisify(webSkel.demiurgeSorClient.getDemiurgeMigrationStatus)();

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

async function doDemiurgeMigration() {
    let migrationStatus = await $$.promisify(webSkel.demiurgeSorClient.getDemiurgeMigrationStatus)();

    if (migrationStatus === constants.MIGRATION_STATUS.IN_PROGRESS) {
        showMigrationDialog();
        await waitForMigration();
        return;
    }

    if (migrationStatus === constants.MIGRATION_STATUS.NOT_STARTED) {
        await migrateDemiurgeData(sharedEnclave);
    }


    migrationStatus = await $$.promisify(webSkel.demiurgeSorClient.getDemiurgeMigrationStatus)();

    if (migrationStatus === constants.MIGRATION_STATUS.IN_PROGRESS) {
        showMigrationDialog();
    }

    await waitForMigration();
}

async function getGroupByType(sharedEnclave, accessMode, groupName) {
    const _getGroup = async () => {
        try {
            const groups = await $$.promisify(sharedEnclave.filter)(constants.TABLES.GROUPS);
            const group = groups.find(gr => gr.accessMode === accessMode || gr.name === groupName) || {};
            if (!group) {
                throw new Error(`Group ${groupName} not found in the shared enclave`);
            }
            return group;
        } catch (e) {
            notificationHandler.reportUserRelevantWarning(`Failed to retrieve configuration data. Retrying ...`);
            notificationHandler.reportUserRelevantInfo(`Failed to get info about group. Retrying ...`, e);
            throw e;
        }
    }
    return await utils.retryAsyncFunction(_getGroup, 3, 100);
}

async function getAdminGroup(sharedEnclave) {
    return getGroupByType(sharedEnclave, constants.ADMIN_ACCESS_MODE, constants.EPI_ADMIN_GROUP_NAME);
}

async function getWriteGroup(sharedEnclave) {
    return getGroupByType(sharedEnclave, constants.WRITE_ACCESS_MODE, constants.EPI_WRITE_GROUP);
}

async function getReadGroup(sharedEnclave) {
    return getGroupByType(sharedEnclave, constants.READ_ONLY_ACCESS_MODE, constants.EPI_READ_GROUP);
}

async function associateGroupAccess(sharedEnclave, groupType) {
    const AVAILABLE_ACCESS_MODES = [constants.WRITE_ACCESS_MODE, constants.READ_ONLY_ACCESS_MODE];
    if (!AVAILABLE_ACCESS_MODES.includes(groupType)) {
        throw new Error(`Invalid group type: ${groupType}`);
    }

    const apiKeyClient = apiKeySpace.getAPIKeysClient();
    const group = groupType === constants.WRITE_ACCESS_MODE ? await getWriteGroup(sharedEnclave) : await getReadGroup(sharedEnclave);
    const groupDIDDocument = await $$.promisify(w3cDID.resolveDID)(group.did);
    const members = await $$.promisify(groupDIDDocument.getMembers)();
    for (let member in members) {
        const memberObject = members[member];
        const apiKey = {
            scope: groupType, secret: crypto.sha256JOSE(crypto.generateRandom(32), "base64")
        };
        await apiKeyClient.associateAPIKey(constants.APPS.DSU_FABRIC, constants.API_KEY_NAME, utils.getUserIdFromUsername(memberObject.username), JSON.stringify(apiKey));
    }
}

function getGroupName(group) {
    const segments = group.did.split(":");
    let groupName = segments.pop();
    return groupName;
}

async function migrateDSUFabricData(sharedEnclave) {
    let adminGroup = await getAdminGroup(sharedEnclave);
    const apiKeyClient = apiKeySpace.getAPIKeysClient();
    try {
        notificationHandler.reportUserRelevantInfo(`System Alert: Migration of Access Control Mechanisms is Currently Underway. Your Patience is Appreciated.`);
        let did = await getStoredDID();
        try {
            const sysadminSecret = await utils.getBreakGlassRecoveryCode();
            const apiKey = crypto.sha256JOSE(crypto.generateRandom(32), "base64");
            const body = {
                secret: sysadminSecret, apiKey
            }
            await apiKeyClient.becomeSysAdmin(JSON.stringify(body));
            await utils.setSysadminCreated(true);
        } catch (e) {
            console.log(e);
            // already sysadmin
        }
        let groupDIDDocument = await $$.promisify(w3cDID.resolveDID)(adminGroup.did);
        const members = await $$.promisify(groupDIDDocument.getMembers)();
        for (let member in members) {
            const memberObject = members[member];
            if (member !== did) {
                await apiKeyClient.makeSysAdmin(utils.getUserIdFromUsername(memberObject.username), crypto.generateRandom(32).toString("base64"));
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

async function doDSUFabricMigration(sharedEnclave, force = false) {
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
        await migrateDSUFabricData(sharedEnclave);
    }

    let migrationStatus = await $$.promisify(webSkel.dsuFabricSorClient.getDSUFabricMigrationStatus)();

    if (migrationStatus === constants.MIGRATION_STATUS.NOT_STARTED) {
        await migrateDSUFabricData(sharedEnclave);
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    migrationStatus = await $$.promisify(webSkel.dsuFabricSorClient.getDSUFabricMigrationStatus)();

    if (migrationStatus === constants.MIGRATION_STATUS.IN_PROGRESS) {
        showMigrationDialog();
    }

    while (migrationStatus === constants.MIGRATION_STATUS.IN_PROGRESS) {
        await delay(10000);

        migrationStatus = await $$.promisify(webSkel.dsuFabricSorClient.getDSUFabricMigrationStatus)();

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

class AppManager {

    constructor() {
    }

    //first phase... we need to ensure that we have a wallet
    async walletInitialization() {
        try {
            this.encryptedSSOSecret = await getSSOSecret();
        } catch (e) {
            console.log("generating new secret")
            this.encryptedSSOSecret = await putSSOSecret();
        }

        const versionlessSSI = keySSISpace.createVersionlessSSI(undefined, `/${getSSODetectedId()}`, deriveEncryptionKey(this.encryptedSSOSecret));
        try {
            const dsu = await loadWallet(this.encryptedSSOSecret);
            let envJson = await dsu.readFileAsync("environment.json");
            envJson = JSON.parse(envJson);
            console.log(envJson);
            env.WALLET_MAIN_DID = envJson.WALLET_MAIN_DID;
            env.enclaveKeySSI = envJson.enclaveKeySSI;
            env.enclaveType = envJson.enclaveType;
            env.enclaveDID = envJson.enclaveDID;
            this.previousVersionWalletFound = true;
        } catch (e) {
            // No previous version wallet found
            console.log(e);
        }

        let mainDSU;
        //let walletJustCreated = false;
        try {
            mainDSU = await $$.promisify(resolver.loadDSU)(versionlessSSI);
        } catch (error) {
            try {
                mainDSU = await $$.promisify(resolver.createDSUForExistingSSI)(versionlessSSI);
                await $$.promisify(mainDSU.writeFile)('environment.json', JSON.stringify(env));
                this.walletJustCreated = true;
            } catch (e) {
                webSkel.notificationHandler.reportUserRelevantWarning("Failed to create the wallet", e);
                return;
            }
        }

        scAPI.setMainDSU(mainDSU);

        return new Promise(async (resolve, reject) => {
            const sc = scAPI.getSecurityContext();

            let finish = async () => {
                if (!this.walletJustCreated) {
                    await this.getWalletAccess();
                    resolve();
                    return;
                }
                resolve(this.walletJustCreated);
            }

            if (sc.isInitialised()) {
                await finish();
            }

            sc.on("initialised", finish);
        });
        //await this.oneTimeSetup(walletJustCreated);
        //return this.walletJustCreated;

    }

//second phase... setup of the necessary enclaves and groups
    async oneTimeSetup(walletJustCreated) {
        let setupMan = SetupMan.getInstance();
        let firstAdmin = await setupMan.isFirstAdmin();
        if (firstAdmin && walletJustCreated) {
            //we are the first admin
            try {
                await setupMan.createInitialDID();
                await setupMan.doSetup();
                this.firstTimeAndFirstAdmin = true;
            } catch (e) {
                return webSkel.notificationHandler.reportUserRelevantError(`Failed to initialise. Probably an infrastructure issue. ${e.message}`);
            }
        }
    }

//third phase... create or recover Identity
    async createIdentity(userDetails) {
        const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
        const config = openDSU.loadAPI("config");
        let appName = await $$.promisify(config.getEnv)("appName");
        let userId = `${appName}/${userDetails.username}`;
        let didDocument;
        let shouldPersist = false;
        const mainDID = await scAPI.getMainDIDAsync();
        const initialiseIdentityModal = await webSkel.showModal("create-identity-modal");

        const healDID = async (didIdentifier) => {
            try {
                didDocument = await $$.promisify(w3cDID.resolveDID)(didIdentifier);
                // try to sign with the DID to check if it's valid
                await $$.promisify(didDocument.sign)("test");
                if (this.previousVersionWalletFound) {
                    shouldPersist = true;
                }
            } catch (e) {
                console.log(`Failed to resolve DID. Error: ${e.message}`)
                let response = await fetch(`${window.location.origin}/resetUserDID/${vaultDomain}`, {method: "DELETE"});
                if (response.status !== 200) {
                    console.log(`Failed to reset DID. Status: ${response.status}`);
                }
                try {
                    let mainEnc = await $$.promisify(scAPI.getMainEnclave)();
                    let keyS = await $$.promisify(mainEnc.getKeySSI)();
                    console.log(keyS.getIdentifier());
                    didDocument = await $$.promisify(mainEnc.createIdentity)("ssi:name", vaultDomain, userId);
                    shouldPersist = true;
                    this.walletJustCreated = true;
                } catch (e) {
                    throw new Error(`Failed to create DID. Error: ${e.message}`);
                }
            }
        }
        if (mainDID) {
            await healDID(mainDID);
        } else {
            const didIdentifier = `did:ssi:name:${vaultDomain}:${userId}`;
            await healDID(didIdentifier);
            shouldPersist = true;
        }
        if (shouldPersist) {
            await storeDID(didDocument.getIdentifier());
        }

        await this.oneTimeSetup(this.walletJustCreated);
        initialiseIdentityModal.close();
        initialiseIdentityModal.remove();
        if (this.firstTimeAndFirstAdmin) {
            //we need to auto-authorize because we are the first one...
            await doDemiurgeMigration();
            await doDSUFabricMigration();
            await firstOrRecoveryAdminToAdministrationGroup(didDocument, userDetails);
            await autoAuthorization(didDocument);
        }

        return didDocument.getIdentifier();
    }

//fourth phase... get access
    getWalletAccess = async (sourcePage="groups-page") => {
        await webSkel.showLoading();
        let did;
        if (this.previousVersionWalletFound) {
            const userDetails = await utils.getUserDetails();
            did = await this.createIdentity(userDetails);
        } else {
            did = await getStoredDID();

            if (!did) {
                webSkel.notificationHandler.reportUserRelevantInfo(`Identity was not created yet. Let's go and create one.`);
                return await webSkel.changeToDynamicPage("booting-identity-page", "booting-identity-page");
            }
        }
        try {
            /*if (this.sourcePage === "#landing-page" || this.sourcePage === "#generate-did-page") {
                this.sourcePage = "#home-page";
            }*/

            let domain = await $$.promisify(scAPI.getVaultDomain)();
            let credential;
            try {
                credential = await GroupsManager.getInstance().getGroupCredential(`did:ssi:name:${domain}:${constants.EPI_ADMIN_GROUP}`);
            } catch (err) {
                //ignore for now...
            }
            getPermissionsWatcher(did, async () => {
                await doDemiurgeMigration();
                await doDSUFabricMigration();
                await AuditService.getInstance().addAccessLog(did);
                await webSkel.changeToDynamicPage(sourcePage, sourcePage);
            }, credential);
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to initialize wallet", err);
            setTimeout(() => {
                window.disableRefreshSafetyAlert = true;
                window.location.reload()
            }, 2000);
        }
    }

    async getBreakGlassCode() {
        let enclave = await getSharedEnclave();
        let keySSI = await $$.promisify(enclave.getKeySSI)();
        return keySSI.getIdentifier();
    }

    async useBreakGlassCode(code) {
        //todo: save the shared enclave info and authorize the new admin user...
        await setSharedEnclaveKeySSI(code);
        let did = await getStoredDID();
        let groupManager = GroupsManager.getInstance();
        await groupManager.addMember(constants.EPI_ADMIN_GROUP, did);
        await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.BREAK_GLASS_RECOVERY, did, constants.EPI_ADMIN_GROUP);
        /*let domain = await $$.promisify(scAPI.getVaultDomain)();
        let groupCredential = await GroupsManager.getInstance().getGroupCredential(`did:ssi:name:${domain}:${constants.EPI_ADMIN_GROUP}`);

        let SecretsHandler = w3cDID.SecretsHandler;
        let handler = await SecretsHandler.getInstance(did);
        await handler.authorizeUser(did, groupCredential, await getSharedEnclaveDataFromEnv());*/
    }

    async didWasCreated() {
        let didRecord;

        try {
            didRecord = await getStoredDID();
        } catch (e) {

        }

        if (typeof didRecord === "undefined") {
            return false;
        }

        return true;
    }

    async getDID() {
        return await getStoredDID();
    }
}

let instance;

function getInstance() {
    if (!instance) {
        instance = new AppManager();
    }
    return instance;
}

export default {getInstance, doDemiurgeMigration, doDSUFabricMigration, getStoredDID};

