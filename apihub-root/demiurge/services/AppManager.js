import env from "./../environment.js";
import {getPermissionsWatcher} from "./PermissionsWatcher.js";
import SetupMan from "./SetupMan.js";
import GroupsManager from "./GroupsManager.js";
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
        await this.setMainDID(typicalBusinessLogicHub, didDocument);
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


async function getMainEnclave() {
    if (!this.mainEnclave) {
        try {
            this.mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantWarning(`Failed to get main enclave: ${e.message}. Retrying ...`);
            return await this.getMainEnclave();
        }
    }

    return this.mainEnclave;
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
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(putData)
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

async function loadWallet() {
    let resolver = require("opendsu").loadApi("resolver");
    let keyssi = require("opendsu").loadApi("keyssi");
    let walletSSI = keyssi.createTemplateWalletSSI(env.vaultDomain, getWalletSecretsArray(this.encryptedSSOSecret));
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

async function firstOrRecoveryAdminToAdministrationGroup(did, userDetails, logAction = constants.OPERATIONS.SHARED_ENCLAVE_CREATE) {
    if (typeof did !== "string") {
        did = did.getIdentifier();
    }
    const sharedEnclave = await getSharedEnclave();
    let groupsManager = GroupsManager.getInstance();
    let adminGroup = await groupsManager.getAdminGroup(sharedEnclave);
    groupsManager.addMember(adminGroup.did, did);
    //TODO: add the audit log
    // await utils.addLogMessage(did, logAction, utils.getGroupName(adminGroup), userDetails.userName || "-");
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
            const dsu = await loadWallet();
            let envJson = await dsu.readFileAsync("environment.json");
            envJson = JSON.parse(envJson);
            console.log(envJson);
            env.WALLET_MAIN_DID = envJson.WALLET_MAIN_DID;
            env.enclaveKeySSI = envJson.enclaveKeySSI;
            env.enclaveType = envJson.enclaveType;
            env.enclaveDID = envJson.enclaveDID;
        } catch (e) {
            // No previous version wallet found
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

            let finish = async ()=>{
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
        let userId = `${appName}/${userDetails.userName}`;
        let didDocument;
        let shouldPersist = false;
        const mainDID = await scAPI.getMainDIDAsync();

        const healDID = async (didIdentifier) => {
            try {
                didDocument = await $$.promisify(w3cDID.resolveDID)(didIdentifier);
                // try to sign with the DID to check if it's valid
                await $$.promisify(didDocument.sign)("test");
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
                    didDocument = await $$.promisify(w3cDID.createIdentity)("ssi:name", vaultDomain, userId);
                    shouldPersist = true;
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
        if (this.firstTimeAndFirstAdmin) {
            //we need to auto-authorize because we are the first one...
            await firstOrRecoveryAdminToAdministrationGroup(didDocument, userDetails);
            await autoAuthorization(didDocument);
        }

        return didDocument.getIdentifier();
    }

//fourth phase... get access
    getWalletAccess = async (sourcePage) => {
        await webSkel.showLoading();
        try {
            let did = await getStoredDID();

            /*if (this.sourcePage === "#landing-page" || this.sourcePage === "#generate-did-page") {
                this.sourcePage = "#home-page";
            }*/

            let domain = await $$.promisify(scAPI.getVaultDomain)();
            const credential = await GroupsManager.getInstance().getGroupCredential(`did:ssi:name:${domain}:${constants.EPI_ADMIN_GROUP}`);
            getPermissionsWatcher(did, async () => {
                await webSkel.appServices.addAccessLog(did);
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

    async getBreakGlassCode(){
        let enclave = await getSharedEnclave();
        let keySSI = await $$.promisify(enclave.getKeySSI)();
        return keySSI.getIdentifier();
    }

    async useBreakGlassCode(code){
        //todo: save the shared enclave info and authorize the new admin user...
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
}

let instance;

function getInstance() {
    if (!instance) {
        instance = new AppManager();
    }
    return instance;
}

export default {getInstance};

