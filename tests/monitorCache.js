const fs = require('fs');
const path = require('path');
const process = require("process");
const nano = require('nano');


let env = {};

const setEnvVars = async () => {
    try {
        const envFile = fs.readFileSync(path.join("../env.json"), 'utf8')
        env = JSON.parse(envFile);
    } catch(e) {
        console.error("Failed to read env", e);
        env = {}
    }
}

setEnvVars();

process.env.PSK_ROOT_INSTALATION_FOLDER = path.resolve(path.join(__dirname));
require(path.join(__dirname, './builds/output/pskWebServer.js'));

let config;

const EnclaveFacade = require("loki-enclave-facade");
const DBService = EnclaveFacade.DBService;
const buildQueryParams = require("../gtin-resolver/lib/utils/buildQueryParams.js").buildQueryParams;

const crypto = require("opendsu").loadAPI("crypto");

let dbService;

const getConfig = async () => {
    if(!config){
        try{
            const configFile = fs.readFileSync(path.join("../apihub-root/external-volume/config/apihub.json"), 'utf8')
            config = JSON.parse(configFile);
        } catch(e) {
            console.error("Failed to read config", e);
            config = {}
        }
    }

    return config
}

const getDBConfig = () => {
    return {
        uri: config.db.uri,
        username: process.env.DB_USER || config.db.user,
        secret: process.env.DB_SECRET || config.db.secret,
        debug: config.db.debug,
        readOnlyMode: process.env.READ_ONLY_MODE || false
    }
}

const getDBService = async () => {
    if (!dbService) {
        dbService = new DBService( {
            uri: config.db.uri,
            username: process.env.DB_USER || config.db.user,
            secret: process.env.DB_SECRET || config.db.secret,
            debug: config.db.debug,
            readOnlyMode: process.env.READ_ONLY_MODE || false
        });
    }

    return dbService;
}

const generateURL = (domain, leaflet_type, gtin, language, batchNumber) => {
  const queryParams = buildQueryParams(gtin, batchNumber, language, leaflet_type, undefined);
  return `/leaflets/${domain}?${queryParams}`;
}

const reason = "Deleted Leaflet";

const monitorCache = async () => {
    try {
        getConfig();
        getDBService();
        const domain = env.EPI_DOMAIN;
        const subdomain = env.EPI_SUBDOMAIN;

        const dbAuditName = ["db", "db", domain.replaceAll(".", "-"), subdomain.replaceAll(".", "-"), "audit"].join("_");
        const dbFixedName = "db_fixedurls-db_history"

        const dbConfig = getDBConfig();

        const dbCon =  nano(
            {
                url: dbConfig.uri,
                requestDefaults: {auth: {username: dbConfig.username, password: dbConfig.secret}}
            }
        );

        const db = dbCon.use(dbAuditName);

        db.changesReader.start({since: 'now', include_docs: true}).on('change', async (change) => {
            console.log("------------------------------------------------------------------------");
            console.log("Change detected", change);

            const record = await dbService.readDocument(dbAuditName, change.id);

            console.log("Processing record", JSON.stringify(record, null, 2));

            const isBatch = record.batchNumber !== undefined && record.batchNumber !== null && record.batchNumber !== ""

            if(record.reason === reason && isBatch) {
                for(leaf of record.details) {
                    console.log(JSON.stringify(leaf, null, 2));
                    const url = generateURL(domain, leaf.epiType, record.itemCode, leaf.epiLanguage, record.batchNumber);
                    const encoded = crypto.base64URLEncode(url);
                    console.log("Deleting old fixed url cache: ", url);
                    console.log("Converting URL to base64URL:", encoded)

                    const read = await dbService.readDocument(dbFixedName, encoded);
                    console.log("Old fixed url cache:", read)
                    await dbService.deleteDocument(dbFixedName, read.pk)
                    console.log("Deleted old fixed url cache:", read.pk)
                }
            }
           
            console.log("Finished processing");
            console.log("------------------------------------------------------------------------");
        }).on("error", (err) => {
            console.error("Failed to start changes reader", err);
        })
        
    } catch (e) {
        console.error("Failed to refresh data", e);
        throw e;
    }
}


monitorCache().then(async (res) => {
    console.log("Starting database hook")
}).catch((err) => {
    console.error("Error during script:", err)
})