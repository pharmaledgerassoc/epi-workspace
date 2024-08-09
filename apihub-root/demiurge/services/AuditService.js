import constants from "../constants.js";
import AppManager from "./AppManager.js";


const getBaseURL = () => {
    const systemAPI = require('opendsu').loadAPI("system");
    return `${systemAPI.getBaseURL()}/integration`;
}

const _sendRequest = async (endpoint, method, data, callback) => {
    if (typeof data === 'function') {
        callback = data;
        data = undefined;
    }

    const http = require('opendsu').loadAPI('http');
    if (method === 'GET') {
        let response;
        try {
            response = await http.fetch(endpoint, {method});
            let reason;
            if (response.status >= 400) {
                reason = await response.text();
                return callback({code: response.status, reason});
            }
            response = await response.json();
        } catch (err) {
            return callback(err);
        }
        callback(undefined, response);
    } else {
        let body;
        if (method !== 'DELETE' && data) {
            body = data ? JSON.stringify(data) : undefined;
        }
        let response;
        try {
            response = await http.fetch(endpoint, {method, body});
            if (response.status >= 400) {
                let reason = await response.text();
                return callback({code: response.status, reason});
            }
            response = await response.text();
        } catch (err) {
            return callback(err);
        }
        callback(undefined, response);
    }
};

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
    _sendRequest(url, 'GET', callback);
}

class AuditService {
    constructor() {
    }

    async addAuditLog(logType, auditDetails) {
        try {
            await $$.promisify(webSkel.demiurgeSorClient.addAuditLog)(logType, auditDetails);
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(`Audit operation failed. ${e.message}`);
        }
    }

    filterAuditLogs(logType, start, number, query, sort, callback) {
        processParametersAndSendRequest(getBaseURL(), `audit/${logType}`, start, number, query, sort, callback);
    }

    async addAccessLog(did) {
        did = did || await AppManager.getInstance().getDID();
        let auditDetails = {
            payload: {
                userDID: did,
                userGroup: constants.EPI_ADMIN_GROUP,
            }
        }
        await this.addAuditLog(constants.AUDIT_LOG_TYPES.USER_ACCESS, auditDetails)
    }

    async addActionLog(action, userDID, group) {
        let auditDetails = {
            payload: {
                userDID: userDID,
                userGroup: group,
                action: action
            }
        }
        await this.addAuditLog(constants.AUDIT_LOG_TYPES.USER_ACTION, auditDetails)
    }

    async getLogs(logType, logsNumber, query, sorClient = "Demiurge") {
        const client = sorClient === "Demiurge" ? webSkel.demiurgeSorClient : webSkel.dsuFabricSorClient;
        const logs = await $$.promisify(client.filterAuditLogs)(logType, undefined, logsNumber, query, "desc");
        return logs;
    }


    objectToArray(item) {
        const action = item.action || 'Access Wallet';
        return [item.username ? `'${item.username}'` : "", `${action}`, item.userDID, item.userGroup, new Date(item.__timestamp).toISOString()];
    }

    convertToCSV(items, type) {
        let headers = ["User", "Action", "User DID", "User Group", "Creation Time"];

        let columnTitles = headers.join(";") + "\n";
        let rows = "";
        for (let item of items) {
            item = this.objectToArray(item, type).join(";");
            rows += item + "\n";
        }
        return [columnTitles + rows];
    }
}

let instance;

function getInstance() {
    if (!instance) {
        instance = new AuditService();
    }
    return instance;
}

export default {getInstance};
