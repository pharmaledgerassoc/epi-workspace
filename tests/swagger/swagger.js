// const Swagger = require('swagger-client')
const path = require('path');
const jestOpenAPI = require('jest-openapi').default;
jestOpenAPI(path.join(process.cwd(),"gtin-resolver", "ePI-SOR.json"));

const axios = require("axios")
const {UtilsService} = require("./utils");
const {API_MESSAGE_TYPE} = require("../constants");

function processParametersAndSendRequest(baseURL, endpoint, start, number, query, sort) {
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

    return axios.get(url)
}

function sendRequest(endpoint, method, data, responseType = "json"){
    //add domain and subdomain as query parameters
    //check if the endpoint already has query parameters
    if (endpoint.indexOf('?') !== -1) {
        endpoint += '&';
    } else {
        endpoint += '?';
    }
    endpoint += `domain=${encodeURIComponent(domain)}&subdomain=${encodeURIComponent(subdomain)}`;
    if (appName) {
        endpoint += `&appName=${encodeURIComponent(appName)}`
    }
    const http = require('opendsu').loadAPI('http');
    if (method === 'GET') {
        let promise = http.fetch(endpoint, {method})
            .then(async response => {
                if (response.status >= 400) {
                    let reason = await response.text();
                    throw {code: response.status, reason}
                }
                return response
            })

        if (responseType === "json") {
            promise.then(response => response.json())
                .then(response => callback(undefined, response))
                .catch(error => callback(error))

        } else {
            promise.then(response => response.text())
                .then(response => callback(undefined, response))
                .catch(error => callback(error))
        }

        //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
    } else {
        let body;
        if (method !== 'DELETE' && data) {
            body = data ? JSON.stringify(data) : undefined;
        }
        http.fetch(endpoint, {method, body})
            .then(async response => {
                if (response.status >= 400) {
                    let reason = await response.text();
                    throw {code: response.status, reason}
                }
                return response
            })
            .then(response => response.text())
            .then(response => callback(undefined, response))
            .catch(error => callback(error))
        //TODO: CODE-REVIEW - double callback call if the callback code is throwing errors...
    }
};


class SwaggerClient {
    config;
    utils;

    constructor(config) {
        this.config = config;
        this.utils = new UtilsService(this.config);
    }

    getEpiProductUrl(gtin, language, epiType, ePIMarket){
        const baseEndpoint = `${this.getBaseURL()}/epi/${gtin}/${language}/${epiType}`;
        return ePIMarket ? `${baseEndpoint}/${ePIMarket}` : baseEndpoint;
    };

    addProduct(gtin, product){
        const productMessage = this.utils.initMessage(product, API_MESSAGE_TYPE.PRODUCT)
        return sendRequest(`${this.getBaseURL()}/product/${gtin}`, 'POST', productMessage);
    };

    updateProduct(gtin, productMessage){
        return sendRequest(`${this.getBaseURL()}/product/${gtin}`, 'PUT', productMessage);
    };

    getProductMetadata(gtin){
        return sendRequest(`${this.getBaseURL()}/product/${gtin}`, 'GET');
    };

    addImage(gtin, productPhotoMessage){
        return sendRequest(`${this.getBaseURL()}/image/${gtin}`, 'POST', productPhotoMessage);
    };

    updateImage(gtin, productPhotoMessage){
        return sendRequest(`${this.getBaseURL()}/image/${gtin}`, 'PUT', productPhotoMessage);
    };

    getBaseURL(){
        return `${this.config.sor_endpoint}/integration`;
    }
}

module.exports = {
    SwaggerClient
};