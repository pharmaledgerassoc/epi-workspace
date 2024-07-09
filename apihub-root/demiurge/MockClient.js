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
        HEALTH_CHECK_HEADERS: "health_check_headers",
        HEALTH_CHECK_PAYLOADS: "health_check_payloads",
        AUDIT_LOGS: "audit_logs"
    }

    this.uint8ArrayToHexString = (uint8Array) => {
        return Array.from(uint8Array)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    this.getHealthCheckPayload = (pk, callback) => {
        const enclaveInstance = getEnclaveInstance(domain);
        enclaveInstance.getRecord(undefined, TABLES.HEALTH_CHECK_PAYLOADS, pk, (err, payload) => {
            if (err) {
                return callback(err);
            }
            callback(undefined, payload);
        });

    }
    this.filterHealthChecksMetadata = (start, number, sort, query, callback) => {
        processParametersAndSendRequest(`/maintenance`, "getIterationsMetadata", start, number, query, sort, callback);
    }
    this.getHealthCheckPayload = (taskId, callback) => {
        fetch(`/maintenance/getIterationResults?healthCheckRunId=${taskId}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}, message: ${response.message}`);
            }
            response.json().then((data) => {
                return callback("",data);
            });
        });
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
    this.addHealthCheck = (callback) => {
        fetch(`/maintenance/addIteration`, {
            method: "POST",
            body: JSON.stringify({}),
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}, message: ${response.message}`);
            }
            response.text().then((text) => {
                return callback("",text);
            });
        });
    }
    this.checkSecrets = (taskId, callback) => {
        fetch(`/maintenance/checkSecrets?healthCheckRunId=${taskId}`, {
            method: "GET"
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}, message: ${response.message}`);
            }
            response.text().then(text => {
                callback("",text);
            });
        });
    }
    function processParametersAndSendRequest(baseURL, endpoint, start, number, query, sort, callback) {
        if (typeof start === 'function') {
            callback = start;
            start = undefined;
            number = undefined;
            sort = undefined;
            query = undefined;
        }

        if (typeof number === 'function') {
            callback = number;
            number = undefined;
            sort = undefined;
            query = undefined;
        }

        if (typeof query === 'function') {
            callback = query;
            query = undefined;
        }

        if (typeof sort === 'function') {
            callback = sort;
            sort = undefined;
        }

        if (!query) {
            query = "__timestamp > 0";
        }
        let url = `${baseURL}/${endpoint}?query=${query}`;
        if (typeof start !== 'undefined') {
            url += `&start=${start}`;
        }
        if (typeof number !== 'undefined') {
            url += `&number=${number}`;
        }
        if (typeof sort !== 'undefined') {
            url += `&sort=${sort}`;
        }
        fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(response => {
            if (!response.ok) {
                return callback(`HTTP error! status: ${response.status}, message: ${response.message}`);
            }
            response.json().then((data) => {
                return callback("",data);
            });
        });
    }
}

const instances = {};
const getInstance = (domain) => {
    if (!instances[domain]) {
        instances[domain] = new MockEPISORClient(domain);
    }

    return instances[domain];
}

export {
    getInstance
}
