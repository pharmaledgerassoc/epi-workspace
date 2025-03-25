const path = require('path');

const axios = require('axios');
const {Reporter} = require('./reporter');
// const jestOpenAPI = require('jest-openapi').default;
// jestOpenAPI(path.join(process.cwd(),"gtin-resolver", "ePI-SOR.json"));

class ApiClient {

    static sharedToken;

    static sharedHeaders = {}

    privateToken;
    privateHeaders = {}

    cached = {}

    constructor(config, testName) {
        this.config = config;
        this.testName = testName;
        this.reporter = new Reporter(this.testName);
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

    async send(endpoint, method, data, step, reference){
        if (typeof data === "object") {
            data = JSON.stringify(data);
        }
        const self = this;
        function referenceFromUrl(url, response = false){
            const name = [method, response ? "response" : "payload",...url.split('/')].join('-');
            const cached = Object.keys(self.cached)
                .filter(k => k.includes(name));

            if (cached.length){
                const arr = self.cached.pop().split('-');
                const last = parseInt(arr[arr.length - 1]);

                self.cached[`${name}-${last + 1}`] = response.data;
                return name;
            }

            self.cached[`${name}-0`] = response.data;
            return name;
        }

        const url = `${this.getBaseURL()}${endpoint}`;
        let response
        switch (method) {
            case 'GET':
                response = await axios.get(url, {headers: this.getHeaders()});
                break;
            case 'POST':
                await this.reporter.outputPayload(step, referenceFromUrl(url), data, "json")
                response = await axios.post(url, data, {headers: this.getHeaders()});
                await this.reporter.outputPayload(step, referenceFromUrl(url, true), response, "json")
                break;
            case 'PUT':
                await this.reporter.outputPayload(step, referenceFromUrl(url), data, "json")
                response = await axios.put(url, data, {headers: this.getHeaders()});
                await this.reporter.outputPayload(step, referenceFromUrl(url,true), response, "json")
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