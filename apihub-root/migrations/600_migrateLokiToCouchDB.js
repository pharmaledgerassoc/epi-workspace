
const EnclaveFacade = require("loki-enclave-facade");
const apihubModule = require("apihub");
require("opendsu");
const path = require('path');
const fs = require('fs');

const apihubRootFolder = apihubModule.getServerConfig().storage;

const DATABASE = "database";
const STORAGE_LOCATION = path.join(apihubRootFolder, "/external-volume/lightDB");
const COUCH_DB_MIGRATED_FILE = STORAGE_LOCATION + "/couchdb.migrated";


const ANCHORS_TABLE_NAME = "anchors_table";
const ANCHORS_TABLE_INDEXES = ["scheduled"];

const FIXED_URL_TABLE_NAMES = ["history", "tasks"];
const FIXED_URL_TABLE_INDEXES = ["url"];

const mapRecordToCouchDB = (record) => {
    delete record.meta;
    delete record.$loki;
    let timestamp = record.__timestamp
    delete record.__timestamp;
    record["timestamp"] = timestamp;

    return record
}

// const migrateTableFromLightDBToCouchDB = async (table, couchDB) => {
//     const records = table.data;

//     for (let record of records) {
//         try {
//             console.log(mapRecordToCouchDB(record))
//             // await $$.promisify(lightDB.insertRecord)($$.SYSTEM_IDENTIFIER, tableName, record.pk, record);
//         } catch (e) {
//             // console.error("Failed to insert record", record, "in table", tableName, e);
//             throw e;
//         }
//     }

    







//     return;

// }

// const migrateAllTablesFromLightDBToCouchDB = async (dbLocation) => {
//     const db = JSON.parse(fs.readFileSync(dbLocation, 'utf8'));
//     const tables = db.collections

//     const couchDB = EnclaveFacade.createCouchDBEnclaveFacadeInstance(dbLocation);

//     for (let table of tables) {
//         try {
//             await migrateTableFromLightDBToCouchDB(table, couchDB);
//         } catch (e) {
//             console.error("Failed to migrate table", table, e);
//             throw e;
//         }
//     }
// }


const migrate = async (dbPath) => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const tables = db.collections

    const couchDB = EnclaveFacade.createCouchDBEnclaveFacadeInstance(dbLocation);

    for (let table of tables){
        let indexes = ["pk", "timestamp"]

        if(ANCHORS_TABLE_NAME === table.name)
            indexes.push(ANCHORS_TABLE_INDEXES)

        if(FIXED_URL_TABLE_NAMES.includes(table.name))
            indexes.push(FIXED_URL_TABLE_INDEXES)

        couchDB.storageDB.createCollection(undefined, table.name, );
        console.log(table.binaryIndices)

    }

}

const migrateLokiToCouchDB = async () => {
    return 
    try {
        fs.mkdirSync(path.dirname(STORAGE_LOCATION), {recursive: true});
    } catch (e) {
        // if folder exists do nothing else throw error
        if (e.code !== "EEXIST") {
            throw e;
        }
    }

    try {
        fs.accessSync(COUCH_DB_MIGRATED_FILE);
        console.log("Already migrated to Couch DB");
        return;
    } catch (e) {
        // continue with migration
    }

    let folders;

    try {
        folders = fs.readdirSync(STORAGE_LOCATION).filter((elementPath => fs.statSync(path.join(STORAGE_LOCATION, elementPath)).isDirectory()));
    } catch (e) {
        console.error("Failed migration to Couch DB");
        throw e;
    }

    for (let folder of folders) {
        const dbPath = path.join(STORAGE_LOCATION, folder, DATABASE)
        if(fs.existsSync(dbPath)) {
            await migrate(dbPath);
        } else {
            console.log("Nothing to migrate in folder: ", folder);
        }
    }


    // MARK AS COMPLETED
}

module.exports = migrateLokiToCouchDB;