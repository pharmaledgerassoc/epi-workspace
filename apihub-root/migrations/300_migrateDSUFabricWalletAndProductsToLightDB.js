const path = require("path");
const process = require("process");
process.env.PSK_ROOT_INSTALATION_FOLDER = path.resolve(path.join(__dirname, "../../opendsu-sdk"));
require(path.join(__dirname, '../../opendsu-sdk/builds/output/pskWebServer.js'));
const fs = require('fs');
const API_HUB = require('apihub');
const openDSU = require("opendsu");

let config = API_HUB.getServerConfig();

const PREFIX = 'DB_';
const generateEnclaveName = (domain, subdomain) => `${PREFIX}${domain}_${subdomain}`;

const copySlotToSecrets = async (slot, domain, subdomain) => {
    const secretsServiceInstance = await API_HUB.getSecretsServiceInstanceAsync(config.storage);
    console.log("PUTTING SECRET", slot);
    console.log("PUTTING SECRET", JSON.stringify($$.Buffer.from(slot, "base64")));
    await secretsServiceInstance.putSecretAsync("default", generateEnclaveName(domain, subdomain), slot);
}

// Generalized migration function
const migrateDataToLightDB = async (epiEnclave, lightDBEnclave, sourceTableName, targetTableName, transformRecord = record => record, generatePK = record => record.pk) => {
    let records;
    try {
        records = await $$.promisify(epiEnclave.getAllRecords)(undefined, sourceTableName);
    } catch (e) {
        console.error("Failed to get records from table", sourceTableName, e);
        throw e;
    }

    for (let record of records) {
        const transformedRecord = transformRecord(record);
        let existingRecord;
        try {
            existingRecord = await $$.promisify(lightDBEnclave.getRecord)($$.SYSTEM_IDENTIFIER, targetTableName, generatePK(record));
        } catch (e) {
            //table does not exist
        }

        if (!existingRecord) {
            try {
                await $$.promisify(lightDBEnclave.insertRecord)($$.SYSTEM_IDENTIFIER, targetTableName, generatePK(record), transformedRecord);
            } catch (e) {
                console.error("Failed to insert record", transformedRecord, "in table", targetTableName, e);
                throw e;
            }
        }
    }
};

function base58DID(did){
    const opendsu = require("opendsu");
    const crypto = opendsu.loadApi("crypto");
    if(typeof did === "object"){
        did = did.getIdentifier();
    }
    return crypto.encodeBase58(did);
}

const getDemiurgeSharedEnclaveKeySSI = async () => {
    const SECRET_NAME = "mqMigration";
    const w3cdid = require("opendsu").loadApi("w3cdid");
    const migrationDID = await $$.promisify(w3cdid.getKeyDIDFromSecret)("Migration_2023.2.0");
    const secretsServiceInstance = await API_HUB.getSecretsServiceInstanceAsync(config.storage);
    const migrationDIDIdentifier = base58DID(migrationDID);
    const secret = secretsServiceInstance.getSecretSync(SECRET_NAME, migrationDIDIdentifier);
    return JSON.parse(secret).enclave;
}
const getEpiEnclave = (callback) => {
    const enclaveAPI = openDSU.loadAPI("enclave");
    getDemiurgeSharedEnclaveKeySSI().then((keySSI) => {
        const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave(keySSI);
        walletDBEnclave.on("error", (err) => {
            return callback(err);
        })
        walletDBEnclave.on("initialised", async () => {
            let epiEnclave;
            try {
                const enclaves = await $$.promisify(walletDBEnclave.filter)(undefined, "group_databases_table", "enclaveName == epiEnclave");
                epiEnclave = enclaveAPI.initialiseWalletDBEnclave(enclaves[0].enclaveKeySSI);
            } catch (e) {
                return callback(e);
            }
            epiEnclave.on("error", (err) => {
                return callback(err);
            })
            epiEnclave.on("initialised", async () => {
                console.log($$.promisify(epiEnclave.getAllTableNames)(undefined));
                callback(undefined, epiEnclave);
            });
        });
    }).catch((err) => {
        console.error(err);
        return callback(err);
    })
}

const getEpiEnclaveAsync = async () => {
    return $$.promisify(getEpiEnclave)();
}
const getSlotFromEpiEnclave = async (epiEnclave) => {
    const privateKey = await $$.promisify(epiEnclave.getPrivateKeyForSlot)(undefined, 0);
    return privateKey.toString("base64");
}

const getLightDBEnclave = async () => {
    const lightDBPath = path.join(process.env.PSK_ROOT_INSTALATION_FOLDER, config.storage, `external-volume/lightDB/${generateEnclaveName(process.env.EPI_DOMAIN, process.env.EPI_SUBDOMAIN)}/database`);
    try {
        fs.mkdirSync(path.dirname(lightDBPath), {recursive: true});
    } catch (e) {
        if (e.code !== "EEXIST") throw e;
    }
    const LokiEnclaveFacade = require("loki-enclave-facade");
    return LokiEnclaveFacade.createLokiEnclaveFacadeInstance(lightDBPath);
}

const startServer = async () => {
    const listeningPort = Number.parseInt(config.port);
    const rootFolder = path.resolve(config.storage);
    return API_HUB.createInstance(listeningPort, rootFolder);
}

const generateSlot = () => {
    const crypto = require('opendsu').loadAPI('crypto');
    return crypto.generateRandom(32).toString('base64');
}
const migrateDataFromEpiEnclaveToLightDB = async () => {
    const server = await startServer();
    let slot;
    let epiEnclave;
    try {
        epiEnclave = await getEpiEnclaveAsync();
    } catch (e) {
        console.error("Failed to get epi enclave", e);
        slot = generateSlot();
        console.log("GENERATING NEW SLOT", slot);
        await copySlotToSecrets(slot, process.env.EPI_DOMAIN, process.env.EPI_SUBDOMAIN);
        server.close();
        return;
    }
    try {
        slot = await getSlotFromEpiEnclave(epiEnclave);
    } catch (err) {
        console.error("Failed to get slot from epi enclave", err);
        slot = generateSlot();
        console.log("GENERATING NEW SLOT", slot)
    }
    await copySlotToSecrets(slot, process.env.EPI_DOMAIN, process.env.EPI_SUBDOMAIN);
    const lightDBEnclave = await getLightDBEnclave();

    // Define transformations for specific tables
    const transformProduct = record => {
        delete record.pk;
        record.productCode = record.gtin;
        record.inventedName = record.name;
        record.nameMedicinalProduct = record.description;
        return record;
    };

    const generateProductPk = record => record.gtin;
    const transformBatch = record => {
        delete record.pk;
        record.inventedName = record.productName;
        record.nameMedicinalProduct = record.productDescription;
        record.productCode = record.gtin;
        record.expiryDate = record.expiry;
        return record;
    }

    const transformAuditLog = record => {
        if (record.logType === "BATCH_LOG") {
            record.batchNumber = record.itemCode;
            record.itemCode = record.gtin;
        }

        if(record.logType === "LEAFLET_LOG"){
            if (record.metadata && record.metadata.attachedTo === "BATCH") {
                record.batchNumber = record.metadata.batch;
                record.itemCode = record.metadata.gtin;
            }
        }

        return record;
    }
    const generateBatchPk = record => {
        return `${record.gtin}_${record.batchNumber}`;
    }
    const noTransform = record => record;

    // Use the generalized migration function for different tables with appropriate transformations
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "products", "products", transformProduct, generateProductPk);
    console.log("Products migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "batches", "batches", transformBatch, generateBatchPk);
    console.log("Batches migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "logs", "audit", transformAuditLog);
    console.log("Audit migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "login_logs", "user-actions", noTransform);
    console.log("User actions migrated")
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "path-keyssi-private-keys", "path-keyssi-private-keys", noTransform);
    console.log("Path keyssi private keys migrated")

    function timeout(delay) {
        return new Promise((resolve) => setTimeout(resolve, delay));
    }
    await timeout(10000);
    await lightDBEnclave.close();
    await $$.promisify(server.close)();
    console.log("=============================================================")
    console.log("Migration of old wallet completed");
    console.log("=============================================================")
}

module.exports = migrateDataFromEpiEnclaveToLightDB;