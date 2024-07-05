const enclaveInstances = {};
const openDSU = require("opendsu");
const enclaveAPI = openDSU.loadAPI("enclave");
const cryptoAPI = openDSU.loadAPI("crypto");
let keySSIApis = openDSU.loadAPI("keyssi");
let db = openDSU.loadAPI("db");
const getEnclaveInstance = (domain) => {
    if (!enclaveInstances[domain]) {
        // let storageSSI = keySSIApis.createSeedSSI("default");
        // enclaveInstances[domain] =db.getWalletDB(storageSSI, "testDb");
        enclaveInstances[domain] = enclaveAPI.initialiseMemoryEnclave();
    }
    return enclaveInstances[domain];
}

function MockEPISORClient(domain) {
    const TABLES = {
        HEALTH_CHECK: "health_check",
        AUDIT_LOGS: "audit_logs"
    }

    this.uint8ArrayToHexString = (uint8Array) =>  {
        return Array.from(uint8Array)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }
    this.addHealthCheck = (healthCheckDetails, callback) => {
        const pk = this.uint8ArrayToHexString(cryptoAPI.generateRandom(32));
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.HEALTH_CHECK, pk, healthCheckDetails.payload, callback);
    }
    this.filterHealthChecks = (start, number, sort, query, callback) => {
        if (typeof number === "function") {
            callback = number
            query = start
            sort = undefined;
            number = undefined;
            sort = undefined;
        }
        if (typeof sort === "function") {
            callback = sort
            query = number
            sort = undefined;
            start = undefined;
        }
        if (typeof query === "function") {
            callback = query;
            query = sort;
            sort = undefined;
            start = undefined;
            number = undefined;
        }
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.HEALTH_CHECK, query, sort, number, callback);
    }
    this.addAuditLog = (logDetails, callback) => {
        const pk = this.uint8ArrayToHexString(cryptoAPI.generateRandom(32));
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.insertRecord(undefined, TABLES.AUDIT_LOGS, pk, logDetails.payload, callback);
    };

    this.filterAuditLogs = (start, number, sort, query, callback) => {
        if (typeof number === "function") {
            callback = number
            query = start
            sort = undefined;
            number = undefined;
            sort = undefined;
        }
        if (typeof sort === "function") {
            callback = sort
            query = number
            sort = undefined;
            start = undefined;
        }
        if (typeof query === "function") {
            callback = query;
            query = sort;
            sort = undefined;
            start = undefined;
            number = undefined;
        }
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.filter(undefined, TABLES.AUDIT_LOGS, query, sort, number, callback);
    };
}

const instances = {};
const getInstance = (domain) => {
    if (!instances[domain]) {
        instances[domain] = new MockEPISORClient(domain);
    }

    return instances[domain];
}

export{
    getInstance
}
