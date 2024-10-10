const LokiEnclaveFacade = require("loki-enclave-facade");
const apihubModule = require("apihub");
require("opendsu")
const adapters = LokiEnclaveFacade.Adapters;
const path = require('path');
const fs = require('fs');
const apihubRootFolder = apihubModule.getServerConfig().storage;
const DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_NAME = 'dsu-fabric-enclave-renamed';
const DSU_FABRIC_ENCLAVE_FOLDER_NAME = `DB_${process.env.EPI_DOMAIN}_${process.env.EPI_SUBDOMAIN}`;
const DSU_FABRIC_ENCLAVE_FOLDER_PATH = path.join(apihubRootFolder, "external-volume/lightDB", DSU_FABRIC_ENCLAVE_FOLDER_NAME);
const DSU_FABRIC_ENCLAVE_PATH = path.join(DSU_FABRIC_ENCLAVE_FOLDER_PATH, "database");
const DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_PATH = path.join(apihubRootFolder, "external-volume/lightDB", DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_NAME);
const DSU_FABRIC_ENCLAVE_RENAMED_PATH = path.join(DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_PATH, "database");
const DSU_FABRIC_ENCLAVE_MIGRATED_PATH = `${DSU_FABRIC_ENCLAVE_FOLDER_PATH}.migrated`;

const migrateTable = async (structuredLokiEnclaveFacadeInstance, tableName, partitionedLokiEnclaveFacadeInstance) => {
    let records;
    try {
        records = await $$.promisify(structuredLokiEnclaveFacadeInstance.getAllRecords)(undefined, tableName);
    } catch (e) {
        console.error("Failed to get records from table", tableName, e);
        throw e;
    }

    if (records && records.length > 0) {
        console.log(records.map(record => record.$loki));
    }

    for (let record of records) {
        try {
            delete record.meta;
            delete record.$loki;
            await $$.promisify(partitionedLokiEnclaveFacadeInstance.insertRecord)($$.SYSTEM_IDENTIFIER, tableName, record.pk, record);
        } catch (e) {
            console.error("Failed to insert record", record, "in table", tableName, e);
            throw e;
        }
    }
}
const migrateAllTables = async (structuredLokiEnclaveFacadeInstance, partitionedLokiEnclaveFacadeInstance) => {
    const tables = await $$.promisify(structuredLokiEnclaveFacadeInstance.getCollections)($$.SYSTEM_IDENTIFIER);
    for (let table of tables) {
        try {
            await migrateTable(structuredLokiEnclaveFacadeInstance, table, partitionedLokiEnclaveFacadeInstance);
        } catch (e) {
            console.error("Failed to migrate table", table, e);
            throw e;
        }
    }
}

const migrateStructuredAdapterToPartitionedAdapter = async () => {
    try {
        fs.accessSync(DSU_FABRIC_ENCLAVE_MIGRATED_PATH);
        console.log("DSU Fabric Enclave already migrated");
        return;
    } catch (e) {
        // continue with migration
    }
    //check if the enclave folder exists
    try {
        fs.accessSync(DSU_FABRIC_ENCLAVE_FOLDER_PATH);
    } catch (e) {
        // nothing to migrate
        fs.writeFileSync(DSU_FABRIC_ENCLAVE_MIGRATED_PATH, "");
        return;
    }
    // rename the folder to avoid conflicts
    try {
        fs.renameSync(DSU_FABRIC_ENCLAVE_FOLDER_PATH, DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_PATH);
    } catch (e) {
        console.error("Failed to rename folder", DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_PATH, e);
        return;
    }
    // replace the filename in database file
    const fileContent = fs.readFileSync(DSU_FABRIC_ENCLAVE_RENAMED_PATH);
    const newContent = fileContent.toString().replace(DSU_FABRIC_ENCLAVE_FOLDER_NAME, DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_NAME);
    fs.writeFileSync(DSU_FABRIC_ENCLAVE_RENAMED_PATH, newContent);

    const structuredLokiEnclaveFacade = LokiEnclaveFacade.createLokiEnclaveFacadeInstance(DSU_FABRIC_ENCLAVE_RENAMED_PATH, undefined, adapters.STRUCTURED);

    try {
        fs.mkdirSync(DSU_FABRIC_ENCLAVE_FOLDER_PATH, {recursive: true});
    } catch (e) {
        // if folder exists do nothing else throw error
        if (e.code !== "EEXIST") {
            throw e;
        }
    }

    const partitionedLokiEnclaveFacade = LokiEnclaveFacade.createLokiEnclaveFacadeInstance(DSU_FABRIC_ENCLAVE_PATH, undefined, adapters.PARTITIONED);
    await migrateAllTables(structuredLokiEnclaveFacade, partitionedLokiEnclaveFacade);
    await $$.promisify(partitionedLokiEnclaveFacade.saveDatabase)($$.SYSTEM_IDENTIFIER);
    // fs.rmSync(DSU_FABRIC_ENCLAVE_RENAMED_FOLDER_PATH, {recursive: true});
    fs.writeFileSync(DSU_FABRIC_ENCLAVE_MIGRATED_PATH, "");
    console.info(0x333, "DSU Fabric Enclave migration completed");
}

module.exports = migrateStructuredAdapterToPartitionedAdapter;

