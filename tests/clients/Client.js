const path = require('path');

const axios = require('axios');
// const jestOpenAPI = require('jest-openapi').default;
// jestOpenAPI(path.join(process.cwd(),"gtin-resolver", "ePI-SOR.json"));

class ApiClient {

    static sharedToken;

    static sharedHeaders = {}

    privateToken;
    privateHeaders = {}

    constructor(config) {
        this.config = config;
    }

    getToken(){
        return this.privateToken || ApiClient.sharedToken;
    }

    getHeaders(){
        const headers = {...ApiClient.sharedHeaders, ...this.privateHeaders,}
        if (this.getToken()){
            headers.Authorization = `Bearer ${this.getToken()}`;
        }
        return headers;
    }

    setSharedHeaders(headers) {
        ApiClient.sharedHeaders = headers;
    }

    setSharedToken(token) {
        ApiClient.sharedToken = token
    }

    setPrivateToken(token) {
        this.privateToken = token
    }

    setPrivateHeaders(headers) {
        this.privateHeaders = headers;
    }

    getBaseURL(){
        return `${this.config.sor_endpoint}/integration`;
    }

    async send(endpoint, method, data){
        if (typeof data === "object") {
            data = JSON.stringify(data);
        }

        const url = `${this.getBaseURL()}${endpoint}`;
        let response
        switch (method) {
            case 'GET':
                response = await axios.get(url, {headers: this.getHeaders()});
                break;
            case 'POST':
                response = await axios.post(url, data, {headers: this.getHeaders()});
                break;
            case 'PUT':
                response = await axios.put(url, data, {headers: this.getHeaders()});
                break;
            case 'DELETE':
                response = await axios.delete(url, {headers: this.getHeaders()});
                break;
            default:
                throw new Error(`Unsupported HTTP method: ${method}`);
        }

        if (!((response.ok || response.statusText === "OK" || response.status === 200))) {
            throw new Error(`Failed to fetch ${endpoint} with status ${response.status}`);
        }
        return response.data;
    }

    async processAndSend(baseURL, endpoint, start, number, query, sort){
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

        return axios.get(url, {headers: this.getHeaders()});
    }

}

module.exports = {
    ApiClient
};