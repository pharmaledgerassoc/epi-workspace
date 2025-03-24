// const Swagger = require('swagger-client')
const path = require('path');

const axios = require("axios")
const {UtilsService} = require("./utils");
const {API_MESSAGE_TYPES} = require("../constants");
const {ApiClient} = require("./Client.js");



class IntegrationClient extends ApiClient {

    constructor(config) {
        super(config);
        this.utils = new UtilsService(this.config);
    }

    getEpiProductUrl(gtin, language, epiType, ePIMarket){
        const baseEndpoint = `${this.getBaseURL()}/epi/${gtin}/${language}/${epiType}`;
        return ePIMarket ? `${baseEndpoint}/${ePIMarket}` : baseEndpoint;
    };

    async addProduct(gtin, product){
        const productMessage = this.utils.initMessage(product, API_MESSAGE_TYPES.PRODUCT)
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'POST', productMessage);
    };

    async updateProduct(gtin, productMessage){
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'PUT', productMessage);
    };

    async getProductMetadata(gtin){
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'GET');
    };

    async addImage(gtin, productPhotoMessage){
        return this.send(`${this.getBaseURL()}/image/${gtin}`, 'POST', productPhotoMessage);
    };

    async updateImage(gtin, productPhotoMessage){
        return this.send(`${this.getBaseURL()}/image/${gtin}`, 'PUT', productPhotoMessage);
    };

    async getProduct(gtin){
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'GET');
    };

    async filterAuditLogs(logType, start, number, query, sort){
        return this.processAndSend(this.getBaseURL(), `audit/${logType}`, start, number, query, sort);
    }

    getBaseURL(){
        return `${this.config.sor_endpoint}/integration`;
    }

    async send(endpoint, method, data, responseType = "json"){
        //add domain and subdomain as query parameters
        //check if the endpoint already has query parameters

        const {domain, subdomain, appName} = this.config;


        if (endpoint.indexOf('?') !== -1) {
            endpoint += '&';
        } else {
            endpoint += '?';
        }
        endpoint += `domain=${encodeURIComponent(domain)}&subdomain=${encodeURIComponent(subdomain)}`;
        if (appName) {
            endpoint += `&appName=${encodeURIComponent(appName)}`
        }

        let response;

        try {
            if (method === 'GET') {
                response = await axios.get(endpoint, {headers: this.getHeaders()});
                if (response.status >= 400) {
                    let reason = response.data;
                    throw {code: response.status, reason}
                }

                if (responseType === "json") {
                    expect(typeof response.data).toEqual("object")
                }

                return response
            } else {
                let body;
                if (method !== 'DELETE' && data) {
                    body = data ? JSON.stringify(data) : undefined;
                }
                switch (method) {
                    case 'POST':
                        response = await axios.post(endpoint, body, {headers: this.getHeaders()});
                        break;
                    case 'PUT':
                        response = await axios.put(endpoint, body, {headers: this.getHeaders()});
                        break;
                    case 'DELETE':
                        response = await axios.delete(endpoint, {headers: this.getHeaders()});
                        break;
                    default:
                        throw new Error(`Unsupported HTTP method: ${method}`);
                }
                if (response.status >= 400) {
                    let reason = response.statusText;
                    throw {code: response.status, reason}
                }

                return response
            }
        } catch (e){
            if (e instanceof Error) {
                throw new Error(`Error sending ${method} request to ${endpoint} - ${e.message}`)
            }
            throw e;
        }
    }
}

module.exports = {
    IntegrationClient
};