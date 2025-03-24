
const EnclaveFacade = require("loki-enclave-facade");
const apihubModule = require("apihub");
require("opendsu");
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const DBService = EnclaveFacade.DBService;

const config = apihubModule.getServerConfig();
const apihubRootFolder = config.storage;


const DATABASE = "database";
const STORAGE_LOCATION = path.join(apihubRootFolder, "/external-volume/lightDB");
const COUCH_DB_MIGRATED_FILE = STORAGE_LOCATION + "/couchdb.migrated";
const GTIN_OWNER_DATABASE_LOCATION = path.join(apihubRootFolder, "/external-volume/gtinOwner/cache/gtinOwners");


const ANCHORS_TABLE_NAME = "anchors_table";
const ANCHORS_TABLE_INDEXES = "scheduled";

const FIXED_URL_TABLE_NAMES = ["history", "tasks"];
const FIXED_URL_TABLE_INDEXES = "url"

let dbService;

const mapRecordToCouchDB = (record) => {
    delete record.meta;
    delete record.$loki;
    record["timestamp"] = record.__timestamp;
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
        console.log("Record Already exists!");
        // throw e
    }
}

const createCollection = async (dbPath, tableName, indexes) => {
    try {
        let dbName = await getDbName(dbPath, tableName);
        dbName = dbService.changeDBNameToLowerCaseAndValidate(dbName);
    
        const exists = await dbService.dbExists(dbName);
    
        if (exists)
            return

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

const extractRecords = async (dbPath, index) => {
    try {
        const readStream = fs.createReadStream(dbPath + "." + index, 'utf8');
        const rl = readline.createInterface({ input: readStream });
    
        let records = [];
    
        for await (const line of rl) {
            let cleanedLine = line;
            cleanedLine = cleanedLine.replaceAll('$<', ''); // Remove words
            records.push(JSON.parse(cleanedLine));
        }

        return records;
    } catch (e) {
        return [];
    }

}


const migrate = async (dbPath) => {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const tables = db.collections

    for (let [index, table] of tables.entries()){
        let indexes = ["pk", "timestamp"];

        if(ANCHORS_TABLE_NAME === table.name)
            indexes.push(ANCHORS_TABLE_INDEXES);

        if(FIXED_URL_TABLE_NAMES.includes(table.name))
            indexes.push(FIXED_URL_TABLE_INDEXES);

        await createCollection(dbPath, table.name, indexes);

        let records = table.data;

        if(!records || records.length < 1)
            records = await extractRecords(dbPath, index);
            
        await migrateTable(dbPath, table.name, records);
    }

}

const migrateLokiToCouchDB = async () => {
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
    const userName = process.env.DB_USER || config.db.user;
    const secret = process.env.DB_SECRET || config.db.secret;

    dbService = new DBService( {
        uri: config.db.uri,
        username: userName,
        secret: secret,
        debug: config.db.debug
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

    try {
        if(fs.existsSync(GTIN_OWNER_DATABASE_LOCATION)) {
            await migrate(GTIN_OWNER_DATABASE_LOCATION)  
        } else {
            console.log("Nothing to migrate in folder: ", GTIN_OWNER_DATABASE_LOCATION);
        }
    } catch (e) {
        console.error("Failed migration to Couch DB");
        throw e;
    }

    // MARK AS COMPLETED
    fs.writeFileSync(COUCH_DB_MIGRATED_FILE, 'Completed couchDB migration!');
}

module.exports = migrateLokiToCouchDB;