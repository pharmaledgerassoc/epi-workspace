import GroupsManager from "./GroupsManager.js";
import constants from "../constants.js";
import utils from "../utils.js";

const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");
const resolver = openDSU.loadAPI("resolver");
const enclaveAPI = openDSU.loadAPI("enclave");

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

    if(enclaveConfig.enclaveName.indexOf("Demiurge")!== -1){
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
    return enclaveRecord;
}

async function createEnclave(enclaveData) {

    const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
    const dsu = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
    const keySSI = await $$.promisify(dsu.getKeySSIAsString)();

    await initSharedEnclave(keySSI, enclaveData);
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

    async needsSetup(){

    }

    async doSetup(){
        return new Promise(async function(resolve, reject){
            webSkel.notificationHandler.reportUserRelevantInfo("Initial setup process has started.");
            let fetchResponse = await fetch("./config/enclaves.json");
            let enclaves;
            try{
                enclaves = await fetchResponse.json();
            }catch(err){
                return reject("Failed to read Enclave Configuration file.", err);
            }

            for(let enclave of enclaves){
                try{
                    await createEnclave(enclave);
                }catch(err){
                    return reject(`Failed to create Enclave: ${enclave.enclaveName}.`, err);
                }
            }
            webSkel.notificationHandler.reportUserRelevantInfo("Created enclaves");

            let groupFetchResponse = await fetch("./config/groups.json");
            let groups;
            try{
                groups = await groupFetchResponse.json();
            }catch(err){
                return reject("Failed to read Groups Configuration file.", err);
            }

            let groupManager = GroupsManager.getInstance();
            for(let group of groups){
                try{
                    await groupManager.createGroup(group);
                }catch(err){
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
function getInstance(){
    if(!instance){
        instance = new SetupMan();
    }
    return instance;
}

export default {getInstance};
