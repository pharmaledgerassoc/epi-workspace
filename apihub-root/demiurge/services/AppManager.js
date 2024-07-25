import env from "./../environment.js";
import {getPermissionsWatcher} from "./PermissionsWatcher.js";
import {getUserDetails} from "./getUserDetails.js";
import constants from "../constants.js";
import utils from "../utils.js";
const openDSU = require("opendsu");
const dbAPI = openDSU.loadAPI("db");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

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

    if(identity && identity.did === did && identity.walletStatus === walletStatus){
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

export class AppManager {

    constructor() {
        const openDSU = require("opendsu");
        this.notificationHandler = openDSU.loadAPI("error");
    }

    async isFirstAdmin() {
        const didDomain = await $$.promisify(scAPI.getDIDDomain)();
        try {
            await $$.promisify(didAPI.resolveDID)(`did:${constants.SSI_NAME_DID_TYPE}:${didDomain}:${constants.INITIAL_IDENTITY_PUBLIC_NAME}`);
        } catch (e) {
            return true;
        }

        return false;
    }

    async init() {
        const openDSU = require("opendsu");
        const w3cDID = openDSU.loadAPI("w3cdid");
        const typicalBusinessLogicHub = w3cDID.getTypicalBusinessLogicHub();
        typicalBusinessLogicHub.mainDIDCreated(async (error, did) => {
            if (error) {
                return this.notificationHandler.reportUserRelevantError(`Failed to initialise. Probably an infrastructure issue. ${error.message}`, error);
            }
            if (this.isFirstAdmin()) {
                if (did) {
                    return;
                }

                self.createDID(async (err, model) => {
                    if (err) {
                        return this.notificationHandler.reportUserRelevantError(`Failed to create did. Probably an infrastructure issue. ${err.message}`, err);
                    }
                    const {didDocument, submitElement} = model;
                    await this.setMainDID(typicalBusinessLogicHub, didDocument, self.notificationHandler);
                    submitElement.loading = true;
                    try {
                        await self.createInitialDID();
                        await self.showInitDialog();
                        await self.createEnclaves();
                        self.notificationHandler.reportUserRelevantInfo("Created enclaves");
                        await self.createGroups();
                        self.notificationHandler.reportUserRelevantInfo("Created groups");
                        await self.firstOrRecoveryAdminToAdministrationGroup(didDocument, self.userDetails);

                        //we need to auto-authorize because we are the first one...
                        await utils.autoAuthorization(self.did);

                        self.notificationHandler.reportUserRelevantInfo("Waiting for final initialization steps");
                        self.finishingStepOfWalletCreation();
                    } catch (e) {
                        console.log(e);
                        return alert(`Failed to initialise. Probably an infrastructure issue. ${e.message}`);
                    }

                });
            } else {
                if (did) {
                    await self.waitForApproval(did);
                    return;
                }
                self.createDID(async (err, model) => {
                    if (err) {
                        return alert(`Failed create did. Probably an infrastructure issue. ${err.message}`);
                    }
                    const {didDocument, submitElement} = model;
                    submitElement.loading = true;
                    try {
                        await $$.promisify(typicalBusinessLogicHub.setMainDID)(didDocument.getIdentifier());
                        await this.setMainDID(typicalBusinessLogicHub, didDocument, self.notificationHandler);
                        await self.waitForApproval(didDocument);
                        submitElement.loading = false;
                    } catch (e) {
                        return alert(`Failed to subscribe. Probably an infrastructure issue. ${err.message}`);
                    }
                });
            }
        });
    }

    async setMainDID(typicalBusinessLogicHub, didDocument, notificationHandler) {
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

     async setSharedEnclaveKeySSI(recoveryCode){
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

    async storeDID(did) {
        await setStoredDID(did, this.model.username);
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

    createDID(callback) {
        this.onTagEvent("did-component", "did-generate", async (model) => {
            try {
                await this.storeDID(model.didDocument);
            } catch (e) {
                return callback(createOpenDSUErrorWrapper("Failed to store DID", e));
            }
            callback(undefined, model);
        });
    }

    async getDIDDomain(){
        if (!this.didDomain) {
            this.didDomain = await $$.promisify(scAPI.getDIDDomain)();
        }

        return this.didDomain;
    }

    async getMainEnclave() {
        if (!this.mainEnclave) {
            try {
                this.mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
            } catch (e) {
                this.notificationHandler.reportUserRelevantWarning(`Failed to get main enclave: ${e.message}. Retrying ...`);
                return await this.getMainEnclave();
            }
        }

        return this.mainEnclave;
    }

    async getSharedEnclave() {
        if (!this.sharedEnclave) {
            try {
                this.sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
            } catch (e) {
                this.notificationHandler.reportUserRelevantWarning(`Failed to get shared enclave: ${e.message}. Retrying ...`);
                return await this.getSharedEnclave();
            }
        }

        return this.sharedEnclave;
    }

    async createInitialDID() {
        const _createDID = async () => {
            const didDomain = await this.getDIDDomain();
            try {
                await $$.promisify(w3cDID.createIdentity)(constants.SSI_NAME_DID_TYPE, didDomain, constants.INITIAL_IDENTITY_PUBLIC_NAME);
            } catch (e) {
                this.notificationHandler.reportUserRelevantWarning(`Failed to create DID. Retrying ...`);
                throw e;
            }
        }

        await utils.retryAsyncFunction(_createDID, 3, 100);
    }

    async walletInitialization() {
        try {
            this.encryptedSSOSecret = await this.getSSOSecret();
        } catch (e) {
            console.log("generating new secret")
            this.encryptedSSOSecret = await this.putSSOSecret();
        }

        const versionlessSSI = keySSISpace.createVersionlessSSI(undefined, `/${this.getSSODetectedId()}`, this.deriveEncryptionKey(this.encryptedSSOSecret));
        try {
            const dsu = await this.loadWallet();
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
        try {
            mainDSU = await $$.promisify(resolver.loadDSU)(versionlessSSI);
        } catch (error) {
            try {
                mainDSU = await $$.promisify(resolver.createDSUForExistingSSI)(versionlessSSI);
                await $$.promisify(mainDSU.writeFile)('environment.json', JSON.stringify(env));
            } catch (e) {
                console.log(e);
            }
        }

        scAPI.setMainDSU(mainDSU);
        const sc = scAPI.getSecurityContext();
        if (sc.isInitialised()) {
            return await this.getWalletAccess();
        }

        sc.on("initialised", async () => {
            console.log("Initialised");
            return await this.getWalletAccess();
        });
    }

    getMigrationStatus = async () => {
        let response = await fetch(`${window.location.origin}/getMigrationStatus`);
        if (response.status !== 200) {
            throw new Error(`Failed to check if migration is needed. Status: ${response.status}`);
        }
        let migrationStatus = await response.text();
        return migrationStatus;
    }

    deriveEncryptionKey = (key) => {
        return crypto.deriveEncryptionKey(key);
    }

    getSSODetectedId = () => {
        return getSSOId("SSODetectedId");
    }

    getSSOUserId = () => {
        return getSSOId("SSOUserId");
    }

    putSSOSecret = async () => {
        let secret = crypto.generateRandom(32).toString("base64");
        let encrypted = this.encrypt(DEFAULT_PIN, secret);
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

    getSSOSecret = async () => {
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

    encrypt(key, dataObj) {
        const encryptionKey = crypto.deriveEncryptionKey(key);
        const encryptedCredentials = crypto.encrypt(JSON.stringify(dataObj), encryptionKey);
        return JSON.stringify(encryptedCredentials);
    }

    decrypt(key, encryptedData) {
        const encryptionKey = crypto.deriveEncryptionKey(key);
        const decryptData = crypto.decrypt($$.Buffer.from(JSON.parse(encryptedData)), encryptionKey);
        return JSON.parse(decryptData.toString());
    }

    getWalletSecretsArray(encryptedSSOSecret) {
        const ssoSecret = this.decrypt(DEFAULT_PIN, encryptedSSOSecret);
        return [this.getSSODetectedId(), this.getSSOUserId(), ssoSecret, env.appName];
    }

    loadWallet = async () => {
        let resolver = require("opendsu").loadApi("resolver");
        let keyssi = require("opendsu").loadApi("keyssi");
        let walletSSI = keyssi.createTemplateWalletSSI(env.vaultDomain, this.getWalletSecretsArray(this.encryptedSSOSecret));
        const constDSU = await $$.promisify(resolver.loadDSU)(walletSSI);
        return constDSU.getWritableDSU();
    }

    async createDID() {
        const userDetails = getUserDetails();
        const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
        const openDSU = require("opendsu");
        const config = openDSU.loadAPI("config");
        let appName = await $$.promisify(config.getEnv)("appName");
        let userId = `${appName}/${userDetails}`;
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
            let batchId;
            let mainEnclave;
            try {
                mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
                batchId = await mainEnclave.startOrAttachBatchAsync();
                await scAPI.setMainDIDAsync(didDocument.getIdentifier());
                await mainEnclave.commitBatchAsync(batchId);
            } catch (e) {
                const writeKeyError = createOpenDSUErrorWrapper(`Failed to write key`, e);
                try {
                    await mainEnclave.cancelBatchAsync(batchId);
                } catch (error) {
                    throw createOpenDSUErrorWrapper(`Failed to cancel batch`, error, writeKeyError);
                }
                throw writeKeyError;
            }
        }
        return didDocument.getIdentifier();
    }

    getWalletAccess = async () => {
        await webSkel.showLoading();
        try {
            let did = await this.createDID();

            if (this.sourcePage === "#landing-page" || this.sourcePage === "#generate-did-page") {
                this.sourcePage = "#home-page";
            }

            const credential = await setHealthyAuthorizationInfo();
            getPermissionsWatcher(did, async () => {
                await webSkel.appServices.addAccessLog(did);
                await loadPage(this.sourcePage);
            }, credential);
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to initialize wallet", err);
            setTimeout(() => {
                window.disableRefreshSafetyAlert = true;
                window.location.reload()
            }, 2000)
        }
    }
}
