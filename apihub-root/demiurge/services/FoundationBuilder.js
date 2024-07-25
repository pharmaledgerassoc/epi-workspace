import GroupsManager from "./GroupsManager.js";

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
        return notificationHandler.reportUserRelevantWarning('Failed to begin batch on enclave: ', e)
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
                    return notificationHandler.reportUserRelevantWarning('Failed to cancel batch on enclave: ', error, addIndexError)
                }
                return notificationHandler.reportUserRelevantWarning('Failed to add index on enclave: ', addIndexError);
            }
        }
    }

    try {
        await enclave.commitBatchAsync(bID);
    } catch (e) {
        return notificationHandler.reportUserRelevantWarning('Failed to commit batch on enclave: ', e)
    }

    const enclaveRecord = {
        enclaveType: enclaveConfig.enclaveType,
        enclaveDID,
        enclaveKeySSI,
        enclaveName: enclaveConfig.enclaveName,
    };

    /* todo: this part will be done on the client side....
           let batchId = await enclaveDB.startOrAttachBatchAsync();
            await enclaveDB.writeKeyAsync(enclaveConfig.enclaveName, enclaveRecord);
            await enclaveDB.insertRecordAsync(constants.TABLES.GROUP_ENCLAVES, enclaveRecord.enclaveDID, enclaveRecord);
            await enclaveDB.commitBatchAsync(batchId);*/
    return enclaveRecord;
}

async function createEnclave(enclaveData) {
    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    const resolver = openDSU.loadAPI("resolver");

    const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
    const dsu = await $$.promisify(resolver.createSeedDSU)(vaultDomain);
    const keySSI = await $$.promisify(dsu.getKeySSIAsString)();

    await initSharedEnclave(keySSI, enclaveData);
}

class FoundationBuilder {
    checkStatus(){

    }

    async createFoundation(){
        return new Promise(async function(resolve, reject){
            let fetchResponse = await fetch("./../config/enclaves.json");
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

            let groupFetchResponse = await fetch("./../config/groups.json");
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
        });
    }
}
let instance;
export function getInstance(){
    if(!instance){
        instance = new FoundationBuilder();
    }
    return instance;
}
