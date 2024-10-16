const LokiEnclaveFacade = require("loki-enclave-facade");
const path = require('path');
const fs = require('fs');
const apihubModule = require("apihub");

// Utility function for checking if migration is already done
const isMigrationDone = (migratedPath) => {
    try {
        fs.accessSync(migratedPath);
        console.log(`${path.basename(migratedPath)} already migrated`);
        return true;
    } catch (e) {
        return false;  // Continue migration
    }
};

// Utility function for renaming folders and updating file contents
const renameFolderAndUpdateFile = (sourcePath, renamedPath, folderName, renamedFolderName) => {
    // check if the source folder is empty
    let files;
    try {
        files = fs.readdirSync(sourcePath);
    } catch (e) {
        console.error(`Failed to read folder ${sourcePath}`, e);
        throw e;
    }
    // If the folder is empty, do not proceed with renaming
    if (files.length === 0) {
        return;
    }

    try {
        fs.renameSync(sourcePath, renamedPath);
    } catch (e) {
        console.error(`Failed to rename folder ${renamedPath}`, e);
        throw e;
    }

    const filePath = path.join(renamedPath, 'database');
    const fileContent = fs.readFileSync(filePath);
    const newContent = fileContent.toString().replace(folderName, renamedFolderName);
    fs.writeFileSync(filePath, newContent);
};

// Utility function for migrating a table from one database to another
const migrateTable = async (structuredLokiEnclaveFacadeInstance, tableName, partitionedLokiEnclaveFacadeInstance) => {
    let records;
    try {
        records = await $$.promisify(structuredLokiEnclaveFacadeInstance.getAllRecords)(undefined, tableName);
    } catch (e) {
        console.error(`Failed to get records from table ${tableName}`, e);
        throw e;
    }

    for (let record of records) {
        try {
            delete record.meta;
            delete record.$loki;
            await $$.promisify(partitionedLokiEnclaveFacadeInstance.insertRecord)($$.SYSTEM_IDENTIFIER, tableName, record.pk, record);
        } catch (e) {
            console.error(`Failed to insert record in table ${tableName}`, e);
            throw e;
        }
    }
};

// Utility function for migrating all tables
const migrateAllTables = async (structuredLokiEnclaveFacadeInstance, partitionedLokiEnclaveFacadeInstance) => {
    const tables = await $$.promisify(structuredLokiEnclaveFacadeInstance.getCollections)($$.SYSTEM_IDENTIFIER);
    for (let table of tables) {
        await migrateTable(structuredLokiEnclaveFacadeInstance, table, partitionedLokiEnclaveFacadeInstance);
    }
};

// Utility function to handle the migration of any database
const migrateDatabase = async (folderPath, renamedFolderPath, migratedPath, folderName, renamedFolderName) => {
    if (isMigrationDone(migratedPath)) {
        return;
    }

    try {
        fs.accessSync(folderPath);
    } catch (e) {
        // No folder to migrate, create a migrated file
        fs.writeFileSync(migratedPath, "");
        return;
    }

    renameFolderAndUpdateFile(folderPath, renamedFolderPath, folderName, renamedFolderName);

    const structuredLokiEnclaveFacade = LokiEnclaveFacade.createLokiEnclaveFacadeInstance(path.join(renamedFolderPath, 'database'), undefined, LokiEnclaveFacade.Adapters.STRUCTURED);
    const partitionedLokiEnclaveFacade = LokiEnclaveFacade.createLokiEnclaveFacadeInstance(path.join(folderPath, 'database'), undefined, LokiEnclaveFacade.Adapters.FS);

    await migrateAllTables(structuredLokiEnclaveFacade, partitionedLokiEnclaveFacade);
    await $$.promisify(partitionedLokiEnclaveFacade.saveDatabase)($$.SYSTEM_IDENTIFIER);

    fs.writeFileSync(migratedPath, "");
    console.info(`${folderName} migration completed`);
};

const apihubRootFolder = apihubModule.getServerConfig().storage;
const lightDBPath = path.join(apihubRootFolder, "external-volume/lightDB");
// Specific migration processes for DSU_Fabric and FixedUrls.db
const migrateDSUFabric = async () => {
    const dsuFolderName = `DB_${process.env.EPI_DOMAIN}_${process.env.EPI_SUBDOMAIN}`;
    const dsuRenamedFolderName = 'dsu-fabric-enclave-renamed';

    const dsuFolderPath = path.join(lightDBPath, dsuFolderName);
    const dsuRenamedFolderPath = path.join(lightDBPath, dsuRenamedFolderName);
    const dsuMigratedPath = `${dsuFolderPath}.migrated`;

    await migrateDatabase(dsuFolderPath, dsuRenamedFolderPath, dsuMigratedPath, dsuFolderName, dsuRenamedFolderName);
};

const migrateFixedUrlsDB = async () => {
    const fixedUrlsFolderName = 'FixedUrls.db';
    const fixedUrlsRenamedFolderName = 'FixedUrls.db-renamed';

    const fixedUrlsFolderPath = path.join(lightDBPath, fixedUrlsFolderName);
    const fixedUrlsRenamedFolderPath = path.join(lightDBPath, fixedUrlsRenamedFolderName);
    const fixedUrlsMigratedPath = `${fixedUrlsFolderPath}.migrated`;

    await migrateDatabase(fixedUrlsFolderPath, fixedUrlsRenamedFolderPath, fixedUrlsMigratedPath, fixedUrlsFolderName, fixedUrlsRenamedFolderName);
};

// Combined Migration Process
const migrateAll = async () => {
    await migrateDSUFabric();
    await migrateFixedUrlsDB();
    console.info(0x333, "Both DSU Fabric and FixedUrls.db migrations completed.");
};

module.exports = migrateAll;

