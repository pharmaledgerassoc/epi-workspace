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

    addAuditLog(logType, auditMessage, callback) {
        _sendRequest(`${getBaseURL()}/audit/${logType}`, 'POST', auditMessage, callback);
    }

    filterAuditLogs(logType, start, number, query, sort, callback) {
        processParametersAndSendRequest(getBaseURL(), `audit/${logType}`, start, number, query, sort, callback);
    }

    async addAccessLog(did) {
        try {
            did = did || await AppManager.getInstance().getDID();

            let auditDetails = {
                payload: {
                    userDID: did,
                    userGroup: constants.EPI_ADMIN_GROUP
                }
            }
            await $$.promisify(webSkel.sorClient.addAuditLog)(constants.AUDIT_LOG_TYPES.USER_ACCESS, auditDetails);
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantWarning(`Audit operation failed. <br> ${e.message}`);
        }

    }

    async getAccessLogs(appName) {
        this.logs = await $$.promisify(webSkel.sorClient.filterAuditLogs)(constants.AUDIT_LOG_TYPES.USER_ACCESS, undefined, this.logsNumber, query, "desc");

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
