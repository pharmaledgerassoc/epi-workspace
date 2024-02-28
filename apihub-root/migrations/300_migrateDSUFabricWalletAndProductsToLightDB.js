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
        try {
            await $$.promisify(lightDBEnclave.insertRecord)($$.SYSTEM_IDENTIFIER, targetTableName, generatePK(record), transformedRecord);
        } catch (e) {
            console.error("Failed to insert record", transformedRecord, "in table", targetTableName, e);
            throw e;
        }
    }
};

const getEpiEnclave = (callback) => {
    const enclaveAPI = openDSU.loadAPI("enclave");
    const walletDBEnclave = enclaveAPI.initialiseWalletDBEnclave(process.env.DEMIURGE_SHARED_ENCLAVE_KEY_SSI);
    walletDBEnclave.on("error", (err) => {
        return callback(err);
    })
    walletDBEnclave.on("initialised", async () => {
        const _enclaves = await $$.promisify(walletDBEnclave.filter)(undefined, "group_databases_table", "enclaveName == epiEnclave");
        const epiEnclave = enclaveAPI.initialiseWalletDBEnclave(_enclaves[0].enclaveKeySSI);
        epiEnclave.on("error", (err) => {
            return callback(err);
        })
        epiEnclave.on("initialised", async () => {
            console.log($$.promisify(epiEnclave.getAllTableNames)(undefined));
            callback(undefined, epiEnclave);
        });
    });
}

const getEpiEnclaveAsync = async () => {
    return $$.promisify(getEpiEnclave)();
}
const getSlotFromEpiEnclave = async (epiEnclave) => {
    const privateKey = await $$.promisify(epiEnclave.getPrivateKeyForSlot)(undefined, 0);
    return privateKey.toString("base64");
}

const getLightDBEnclave = async () => {
    const lightDBPath = path.join(process.env.PSK_ROOT_INSTALATION_FOLDER, config.storage, `/external-volume/lightDB/${generateEnclaveName(process.env.EPI_DOMAIN, process.env.EPI_SUBDOMAIN)}/database`);
    try {
        fs.mkdirSync(path.dirname(lightDBPath), {recursive: true});
    } catch (e) {
        if (e.code !== "EEXIST") throw e;
    }
    const LokiEnclaveFacade = require("loki-enclave-facade");
    const adapters = LokiEnclaveFacade.Adaptors;
    return LokiEnclaveFacade.createLokiEnclaveFacadeInstance(lightDBPath, undefined, adapters.STRUCTURED);
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
        slot = generateSlot();
        await copySlotToSecrets(slot, process.env.EPI_DOMAIN, process.env.EPI_SUBDOMAIN);
        server.close();
        return;
    }
    try {
        slot = await getSlotFromEpiEnclave(epiEnclave);
    } catch (err) {
        slot = generateSlot();
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

    const generateBatchPk = record => {
        return `${record.gtin}_${record.batchNumber}`;
    }
    const noTransform = record => record;

    // Use the generalized migration function for different tables with appropriate transformations
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "products", "products", transformProduct, generateProductPk);
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "batches", "batches", transformBatch, generateBatchPk);
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "logs", "audit", noTransform);
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "login_logs", "user-actions", noTransform);
    await migrateDataToLightDB(epiEnclave, lightDBEnclave, "path-keyssi-private-keys", "path-keyssi-private-keys", noTransform);

    server.close();
}

module.exports = migrateDataFromEpiEnclaveToLightDB;