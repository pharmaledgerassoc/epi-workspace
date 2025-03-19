
const EnclaveFacade = require("loki-enclave-facade");
const apihubModule = require("apihub");
require("opendsu");
const path = require('path');
const fs = require('fs');

const DBService = EnclaveFacade.DBService;

const config = apihubModule.getServerConfig();
const apihubRootFolder = config.storage;


const DATABASE = "database";
const STORAGE_LOCATION = path.join(apihubRootFolder, "/external-volume/lightDB");
const COUCH_DB_MIGRATED_FILE = STORAGE_LOCATION + "/couchdb.migrated";


const ANCHORS_TABLE_NAME = "anchors_table";
const ANCHORS_TABLE_INDEXES = "scheduled";

const FIXED_URL_TABLE_NAMES = ["history", "tasks"];
const FIXED_URL_TABLE_INDEXES = "url"

let dbService;

const mapRecordToCouchDB = (record) => {
    delete record.meta;
    delete record.$loki;
    record["timestamp"] = record.__timestamp;
    record["_rev"] = record.__version || 0;
    delete record.__timestamp;
    delete record.__version;

    if(!record.timestamp)
        delete record.timestamp;

    return record
}

const migrateTable = async (dbPath, tableName, records) => {

    for (let record of records) {
        try {
            const processedRecord = mapRecordToCouchDB(record)

            await insertRecord(dbPath, tableName, processedRecord.pk, processedRecord);
        } catch (e) {
            console.error("Failed to migrate table", tableName, e);
            throw e;
        }
     
    }


}

const insertRecord = async (dbPath, tableName, pk, record) => {
    try {
        let dbName = await getDbName(dbPath, tableName);
        dbName = dbService.changeDBNameToLowerCaseAndValidate(dbName);
    
        const exists = await dbService.dbExists(dbName);
    
        if (!exists)
            throw new Error(`Database Doesn't exist: ${dbName}! Failed to migrate!`);

        await dbService.insertDocument(dbName, pk, record)
    } catch (e) {
        throw e
    }
}

const createCollection = async (dbPath, tableName, indexes) => {
    try {
        let dbName = await getDbName(dbPath, tableName);
        dbName = dbService.changeDBNameToLowerCaseAndValidate(dbName);
    
        const exists = await dbService.dbExists(dbName);
    
        if (exists)
            throw new Error(`Database already exists: ${dbName}! If DB Exists It means the migration should already happened!`);

        await dbService.createDatabase(dbName, indexes);
    } catch (e) {
        throw e
    }
}

const getDbName = async (dbPath, tableName) => {
    const prefix = dbPath.includes("/")
        ? dbPath.split("/").slice(dbPath.split("/").length -2, dbPath.split("/").length -1)[0]
        : dbPath;

    return ["db", prefix, tableName].filter(e => !!e).join("_");
}


const migrate = async (dbPath) => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const tables = db.collections

    for (let table of tables){
        let indexes = ["pk", "timestamp"];

        if(ANCHORS_TABLE_NAME === table.name)
            indexes.push(ANCHORS_TABLE_INDEXES);

        if(FIXED_URL_TABLE_NAMES.includes(table.name))
            indexes.push(FIXED_URL_TABLE_INDEXES);

        await createCollection(dbPath, table.name, indexes);
        await migrateTable(dbPath, table.name, table.data);
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


    dbService = new DBService( {
        uri: config.db.uri,
        username: config.db.user,
        secret: config.db.secret,
    });

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