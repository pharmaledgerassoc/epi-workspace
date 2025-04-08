const {ApiClient} = require("./Client");

class APIKeysClient extends ApiClient {

    constructor(config) {
        super(config);
    }
    
    async send(endpoint, method, data, headers){
        if (typeof data === "object") {
            data = JSON.stringify(data);
        }

        const options = {
            method,
            headers,
            body: data
        }

        if (method === "GET" || method === "DELETE") {
            delete options.body;
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint} with status ${response.status}`);
        }
        return response.text();
    }

    async becomeSysAdmin(apiKey, headers){
        return await this.send(`/becomeSysAdmin`, "PUT", apiKey, headers);
    }

    async makeSysAdmin(userId, apiKey, headers){
        return await this.send(`/makeSysAdmin/${encodeURIComponent(userId)}`, "PUT", apiKey, headers);
    }

    async deleteAdmin(userId, headers){
        return await this.send(`/deleteAdmin/${encodeURIComponent(userId)}`, "DELETE", undefined, headers);
    }

    async associateAPIKey(appName, name, userId, apiKey, headers){
        return await this.send(`/associateAPIKey/${encodeURIComponent(appName)}/${encodeURIComponent(name)}/${encodeURIComponent(userId)}`, "PUT", apiKey, headers);
    }

    async deleteAPIKey(appName, name, userId, headers){
        return await this.send(`/deleteAPIKey/${encodeURIComponent(appName)}/${encodeURIComponent(name)}/${encodeURIComponent(userId)}`, "DELETE", undefined, headers);
    }

    async getAPIKey(appName, name, userId, headers){
        return await this.send(`/getAPIKey/${encodeURIComponent(appName)}/${encodeURIComponent(name)}/${encodeURIComponent(userId)}`, "GET", undefined, headers);
    }

    async userHasAccess(appName, scope, userId, headers) {
        const response = await this.send(`/userHasAccess/${encodeURIComponent(appName)}/${encodeURIComponent(scope)}/${encodeURIComponent(userId)}`, "GET", undefined, headers);
        return response === "true";
    }
}

module.exports = APIKeysClient;