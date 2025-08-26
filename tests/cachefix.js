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

const SmartUrl = require("opendsu").loadApi("utils").SmartUrl;

const openDSU = require("opendsu");
const keyssiSpace = openDSU.loadApi("keyssi");
const resolver = openDSU.loadAPI("resolver");
const fixedUrlUtils = require("../gtin-resolver/lib/mappings/utils.js");

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

const refreshCache = async () => {
    try {
        getConfig();
        getDBService();
        const domain = env.EPI_DOMAIN;
        const subdomain = env.EPI_SUBDOMAIN;

        await removeFixedURLsCache("Fixed-URLS-history", domain, subdomain);
        await recreateFixedUrlsCache("products", domain, subdomain);
        await recreateFixedUrlsCache("batches", domain, subdomain);
        await refreshFixedURLs(domain);
    } catch (e) {
        console.error("Failed to refresh data", e);
        throw e;
    }
}

const getAllRecords = async (dbName, tableName, limit = 250) => {
    let allRecords = [];
    let lastKey = null;
    let hasMore = true;

    const docCount = await dbService.countDocs(dbName);


    while (hasMore) {
        try {
            const result = await dbService.filter(tableName, ["_id > 0"], [{["_id"]: "asc"}], limit, lastKey);
            allRecords = allRecords.concat(result);
            
            if (allRecords.length < docCount) {
                lastKey = allRecords.length;
                console.log(`Last key: ${lastKey}`);
                console.log(`${JSON.stringify(result[result.length - 1], null, 2)}`);
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error("Error fetching records:", error);
            hasMore = false;
        }
    }

    console.log(`Fetched ${allRecords.length} records from table ${tableName}`);

    return allRecords;
}

const createGTIN_SSI = function(domain, bricksDomain, gtin, batch) {
    console.log(`New GTIN_SSI in domain:${domain} and bricksDomain:${bricksDomain}`);
    let hint = {avoidRandom : true};
    if (typeof bricksDomain !== "undefined") {
        hint[openDSU.constants.BRICKS_DOMAIN_KEY] = bricksDomain;
    }
    hint = JSON.stringify(hint);
    let realSSI = keyssiSpace.createArraySSI(domain, [gtin, batch], 'v0', hint);

    return realSSI;
}

const removeFixedURLsCache = async (tableName, domain, subdomain) => {
    console.log("====================================================================================================");
    console.log(`Trying to remove old fixed url cache`);
    console.log("====================================================================================================");

    let dbName = "db_fixedurls-db_history"
    let records;

    try {
        records = await getAllRecords(dbName, dbName);
    } catch (error) {
        console.log("Failed to get records from table", dbName, error);
        records = [];
    }

    let counter = 1;

    console.log("------------------------------------------------------------------------");
    console.log(`Total records found: ${new Set(records.map(record => record.pk)).size} / ${records.length}`);
    console.log("------------------------------------------------------------------------");

    for (const record of records) {
        console.log(`Processing record ${counter++} of ${records.length}`);
        console.log(`PK: ${record.pk}`);
        
        try {
            await dbService.deleteDocument(dbName, record.pk)
        } catch (e) {
            console.error("Failed to refresh fixed url: ", JSON.stringify(record, null, 2), "/n",  e);
        }
    }

    console.log("====================================================================================================");
    console.log(`Finished to remove old fixed url cache`);
    console.log("====================================================================================================");
}

const recreateFixedUrlsCache = async (tableName, domain, subdomain) => {
    console.log("====================================================================================================");
    console.log(`Trying to recreate Fixed URLS for records from table ${tableName}`);
    console.log("====================================================================================================");

    let records;
    let dbName = ["db", "db", domain.replaceAll(".", "-"), subdomain.replaceAll(".", "-"), tableName].join("_");
    
    try {
        records = await getAllRecords(dbName, dbName);
    } catch (error) {
        console.log("Failed to get records from table", dbName, error);
        records = [];
    }

    let counter = 1;

    for (const record of records) {
        console.log(`------------------------------------------------------------------------`)
        console.log(`Processing record ${counter++} of ${records.length}`);
        console.log("Product Code: ", record.productCode);
        if(tableName === "batches") console.log("Batch Number: ", record.batchNumber);
        console.log("Domain: ", domain , " / ", subdomain);
        console.log(`------------------------------------------------------------------------`)

        try {
            console.log(`Restoring metadata fixed url for Domain: ${domain} SubDomain: ${subdomain} Product code:${record.productCode} ${record.batchNumber ? "Batch number: " + record.batchNumber : ""}`);
            await fixedUrlUtils.registerLeafletMetadataFixedUrlByDomainAsync(domain, subdomain, record.productCode, record.batchNumber || undefined);
        
            if(tableName === "products") {
                console.log(`Restoring Gtin Owner fixed url for Domain: ${domain} SubDomain: ${subdomain} Product code:${record.productCode}`);
                await fixedUrlUtils.registerGtinOwnerFixedUrlByDomainAsync(domain, record.productCode);
            }

            const ssi = createGTIN_SSI(domain, undefined, record.productCode, record.batchNumber || undefined);
            const dsu = await $$.promisify(resolver.loadDSU)(ssi);

            const basePath = tableName === "batches"? "/batch" : "/product";

            const leaflet_types = await $$.promisify(dsu.listFolders)(basePath);

            for (const type of leaflet_types) {
                if(type !== "leaflet" && type !== "prescribingInfo") {
                    console.log(`Skipping type: ${type} - Not a leaflet type. Skipping...  `);
                    continue;
                }

                console.log(`Processing type: ${type} - Processing...  `);

                let currPath = basePath + "/" + type

                const lang_folders = await $$.promisify(dsu.listFolders)(currPath);

                for(const lang of lang_folders) {
                    let langFolderPath = `${currPath}/${lang}`;
                    let files = await $$.promisify(dsu.listFiles)(langFolderPath);

                    let hasXml = files.find((item) => {
                        return item.endsWith("xml")
                    })
                    if (hasXml) {                                               
                        await fixedUrlUtils.registerLeafletFixedUrlByDomainAsync(domain, subdomain, type, record.productCode, lang, record.batchNumber, undefined, undefined, undefined);
                    }
                }
            }

            const baseMarketPath = tableName === "batches" ? "/batch/ePI" : "/product/ePI";

            const leaflet_market_types = await $$.promisify(dsu.listFolders)(baseMarketPath)

            for (const marketType of leaflet_market_types) {
                if(marketType !== "leaflet" && marketType !== "prescribingInfo") {
                    console.log(`Skipping Market type: ${marketType} - Not a leaflet type. Skipping...  `);
                    continue;
                }

                console.log(`Processing Market type: ${marketType} - Processing...  `);

                let currMarketPath = baseMarketPath + "/" + marketType
                const lang_market_folders = await $$.promisify(dsu.listFolders)(currMarketPath);

                for (const langMarket of lang_market_folders) {
                    let langMarketFolderPath = `${currMarketPath}/${langMarket}`;
                    let market_folders = await $$.promisify(dsu.listFolders)(langMarketFolderPath);

                    for (const market of market_folders) {
                        let marketFolderPath = `${langMarketFolderPath}/${market}`;
                        let files = await $$.promisify(dsu.listFiles)(marketFolderPath);

                        let hasXml = files.find((item) => {
                            return item.endsWith("xml")
                        })
                        if (hasXml) {
                            await fixedUrlUtils.registerLeafletFixedUrlByDomainAsync(domain, subdomain, marketType, record.productCode, langMarket, undefined, undefined, undefined, market);
                        }
                    }
                }

            }
            
        } catch (e) {
            console.error("Failed to process record: ", JSON.stringify(record, null, 2), "/n",  e);
        }
    }

    console.log("====================================================================================================");
    console.log(`Finish cache recreation for records from table ${tableName}`);
    console.log("====================================================================================================");
}

const refreshFixedURLs = async (domain) => {
    console.log("====================================================================================================");
    console.log(`Trying to refresh Fixed URLS`);
    console.log("====================================================================================================");

    const call = function(endpoints, body, callback){
        function executeRequest(){
            if(endpoints.length === 0){
                const msg = `Not able to activate fixedUrl`;
                console.log(msg);
                return callback(new Error(msg));
            }

            let apihubEndpoint = endpoints.shift();
            apihubEndpoint.doPut(body, {}, (err) => {
            if (err) {
                console.error(err);
                //if we get error we try to make a call to other endpoint if any
                executeRequest();
            } else {
                return callback(undefined, true);
            }
            });
        }

        executeRequest();
    }

    const getReplicasAsSmartUrls = function(targetDomain, callback){
        const BDNS = require("opendsu").loadApi("bdns");
        BDNS.getAnchoringServices(targetDomain, (err, endpoints)=> {
            if (err) {
                return callback(err);
            }
            let replicas = [];
            for(let endpoint of endpoints){
                replicas.push(new SmartUrl(endpoint));
            }
            return callback(undefined, replicas);
        });
    }

    const getDeactivateRelatedFixedURLHandler = function(getReplicasFnc){
        return function deactivateRelatedFixedUrl(domain, callback){
            getReplicasFnc(domain, function(err, replicas){
            if(replicas.length === 0){
                const msg = `Not able to deactivate fixedUrls`;
                console.log(msg);
                return callback(new Error(msg));
            }
            let targets = [];
            for(let replica of replicas){
                targets.push(replica.concatWith("/deactivateFixedURL"));
            }
            const query = ".*"
            call(targets, `url like (${query})`, callback);
            });
        }
    }

    const getActivateRelatedFixedURLHandler = function (getReplicasFnc){
        return function activateRelatedFixedUrl(domain, callback){
            if(typeof callback === "undefined"){
                callback = (err)=>{
                    if(err){
                        console.error(err);
                    }
                }
            }

            let next = async ()=>{
                //we were able to commit the new changes then we should call the fixedUrl endpoints
                getReplicasFnc(domain, function(err, replicas){
                    if(replicas.length === 0){
                        const msg = `Not able to activate fixedUrls`;
                        console.log(msg);
                        return callback(new Error(msg));
                    }
                    let targets = [];
                    for(let replica of replicas){
                        targets.push(replica.concatWith("/activateFixedURL"));
                    }

                    const query = ".*"
                    call(targets, `url like (${query})`, callback);
                });
            }

            next();
        }
    }


    await $$.promisify(getDeactivateRelatedFixedURLHandler(getReplicasAsSmartUrls))(domain);
    await $$.promisify(getActivateRelatedFixedURLHandler(getReplicasAsSmartUrls))(domain);

    console.log("====================================================================================================");
    console.log(`Finish fixed URL refresh`);
    console.log("====================================================================================================");
}


refreshCache().then((res) => {
    console.log("Refresh completed successfully.")
}).catch((err) => {
    console.error("Error during refresh:", err)
})