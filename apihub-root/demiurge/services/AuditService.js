const _sendRequest = async (endpoint, method, data, callback) => {
    if (typeof data === 'function') {
        callback = data;
        data = undefined;
    }

    const http = require('opendsu').loadAPI('http');
    if (method === 'GET') {
        let response;
        try{
            response = await http.fetch(endpoint, {method});
            let reason;
            if (response.status >= 400) {
                reason = await response.text();
                return callback({code: response.status, reason});
            }
            response = await response.json();
        }catch(err){
            return callback(err);
        }
        callback(undefined, response);
    } else {
        let body;
        if (method !== 'DELETE' && data) {
            body = data ? JSON.stringify(data) : undefined;
        }
        let response;
        try{
            response = await http.fetch(endpoint, {method, body});
            if (response.status >= 400) {
                let reason = await response.text();
                return callback({code: response.status, reason});
            }
            response = await response.text();
        }catch(err){
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

export class AuditService{
    convertToCSV(items, type) {
        let headers;
        if (type === "action") {
            headers = ["Product Code", "Batch number", "Reason", "User", "Creation Time", "Data"];
        }
        if (type === "access") {
            headers = ["User", "Action", "User DID", "User Group", "Creation Time"];
        }
        let columnTitles = headers.join(";") + "\n";
        let rows = "";
        for (let item of items) {
            item = this.objectToArray(item, type).join(";");
            rows += item + "\n";
        }
        return [columnTitles + rows];
    }
    objectToArray(item, type) {
        if (type === "action") {
            return [`'${item.itemCode}'`, item.batchNumber ? `'${item.batchNumber}'` : "-", item.reason, item.username ? `'${item.username}'` : "", new Date(item.__timestamp).toISOString(), JSON.stringify(item.details)];
        }

        if (type === "access") {
            return [item.username ? `'${item.username}'` : "", "Access Wallet", item.userDID, item.userGroup, new Date(item.__timestamp).toISOString()];

        }
        /*  let details = {logInfo: itemCopy};
          arr.push(JSON.stringify(details));*/
        return [];
    }

    addAuditLog (logType, auditMessage, callback) {
        _sendRequest(`${getBaseURL()}/audit/${logType}`, 'POST', auditMessage, callback);
    }

    filterAuditLogs (logType, start, number, query, sort, callback) {
        processParametersAndSendRequest(getBaseURL(), `audit/${logType}`, start, number, query, sort, callback);
    }
}
