import GroupsManager from "./GroupsManager.js";
import constants from "../constants.js";
import utils from "../utils.js";

const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");
const resolver = openDSU.loadAPI("resolver");

async function createEnclave(enclaveData) {
    const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
    const dsu = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
    const keySSI = await $$.promisify(dsu.getKeySSIAsString)();

    await utils.initSharedEnclave(keySSI, enclaveData);
}

let didDomain;

async function getDIDDomain() {
    const scAPI = require("opendsu").loadApi("sc");
    if (!didDomain) {
        didDomain = await $$.promisify(scAPI.getDIDDomain)();
    }

    return didDomain;
}

class SetupMan {

    async needsSetup() {

    }

    async doSetup() {
        return new Promise(async function (resolve, reject) {
            webSkel.notificationHandler.reportUserRelevantInfo("Initial setup process has started.");
            let fetchResponse = await fetch("./config/enclaves.json");
            let enclaves;
            try {
                enclaves = await fetchResponse.json();
            } catch (err) {
                return reject("Failed to read Enclave Configuration file.", err);
            }

            for (let enclave of enclaves) {
                try {
                    await createEnclave(enclave);
                } catch (err) {
                    return reject(`Failed to create Enclave: ${enclave.enclaveName}.`, err);
                }
            }
            webSkel.notificationHandler.reportUserRelevantInfo("Created enclaves");

            let groupFetchResponse = await fetch("./config/groups.json");
            let groups;
            try {
                groups = await groupFetchResponse.json();
            } catch (err) {
                return reject("Failed to read Groups Configuration file.", err);
            }

            let groupManager = GroupsManager.getInstance();
            for (let group of groups) {
                try {
                    await groupManager.createGroup(group);
                } catch (err) {
                    return reject(`Failed to create Group: ${group.groupName}.`, err);
                }
            }
            webSkel.notificationHandler.reportUserRelevantInfo("Created groups");
            webSkel.notificationHandler.reportUserRelevantInfo("Initial setup process done.");
            resolve();
        });
    }

    async isFirstAdmin() {
        const scAPI = require("opendsu").loadApi("sc");
        const w3cDID = require("opendsu").loadApi("w3cdid");
        const didDomain = await $$.promisify(scAPI.getDIDDomain)();
        try {
            await $$.promisify(w3cDID.resolveDID)(`did:${constants.SSI_NAME_DID_TYPE}:${didDomain}:${constants.INITIAL_IDENTITY_PUBLIC_NAME}`);
        } catch (e) {
            return true;
        }

        return false;
    }

    async createInitialDID() {
        const w3cDID = require("opendsu").loadApi("w3cdid");
        const _createDID = async () => {
            const didDomain = await getDIDDomain();
            try {
                await $$.promisify(w3cDID.createIdentity)(constants.SSI_NAME_DID_TYPE, didDomain, constants.INITIAL_IDENTITY_PUBLIC_NAME);
            } catch (e) {
                webSkel.notificationHandler.reportUserRelevantWarning(`Failed to create DID. Retrying ...`);
                throw e;
            }
        }

        await utils.retryAsyncFunction(_createDID, 3, 100);
    }

}

let instance;

function getInstance() {
    if (!instance) {
        instance = new SetupMan();
    }
    return instance;
}

export default {getInstance};
