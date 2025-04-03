// const Swagger = require('swagger-client')
const path = require('path');

const axios = require("axios")
const {UtilsService} = require("./utils");
const {API_MESSAGE_TYPES} = require("../constants");
const {ApiClient} = require("./Client.js");
const {Reporter} = require("../reporting");


class IntegrationClient extends ApiClient {

    constructor(config, testName) {
        super(config);
        this.utils = new UtilsService(this.config);
        this.testName = testName;
        this.reporter = new Reporter(this.testName);
        this.step = undefined;
    }

    setStep(step) {
        this.step = step;
    }

    async get (endpoint){
        return this.send(`${this.getBaseURL()}${endpoint}`, 'GET');
    }

    getEpiProductUrl(gtin, language, epiType, ePIMarket) {
        const baseEndpoint = `${this.getBaseURL()}/epi/${gtin}/${language}/${epiType}`;
        return ePIMarket ? `${baseEndpoint}/${ePIMarket}` : baseEndpoint;
    };

    async addProduct(gtin, product) {
        const productMessage = this.utils.initMessage(product, API_MESSAGE_TYPES.PRODUCT);
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'POST', productMessage);
    };

    async updateProduct(gtin, payload) {
        const productMessage = this.utils.initMessage(payload, API_MESSAGE_TYPES.PRODUCT);
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'PUT', productMessage);
    };

    async getProductMetadata(gtin) {
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'GET');
    };

    async addImage(gtin, payload) {
        const productPhotoMessage = this.utils.initMessage(payload, API_MESSAGE_TYPES.PRODUCT_PHOTO);
        return this.send(`${this.getBaseURL()}/image/${gtin}`, 'POST', productPhotoMessage);
    };

    async updateImage(gtin, productPhotoMessage) {
        return this.send(`${this.getBaseURL()}/image/${gtin}`, 'PUT', productPhotoMessage);
    };

    async getProduct(gtin) {
        return this.send(`${this.getBaseURL()}/product/${gtin}`, 'GET');
    };

    /**
     * Retrieves a list of products with optional sorting and limit.
     *
     * @param {number} [number=100] - The number of products to retrieve.
     * @param {"asc" | "desc"} [sort="desc"] - Sorting order
     * @returns {Promise<any>} A promise resolving with the list of products.
     */
    async listProducts(number = 100, sort = "desc") {
        return this.send(`${this.getBaseURL()}/listProducts?query=__timestamp%20%3E%200&number=${number}&sort=${sort}`, 'GET');
    }

    /**
     * Retrieves product language details by GTIN and EPI type.
     *
     * @param {string} gtin - The GTIN of the product.
     * @param {string} epiType - The type of ePI.
     * @returns {Promise<any>} A promise resolving with the list of ePI product languages
     */
    async listProductLangs(gtin, epiType) {
        return this.send(`${this.getBaseURL()}/listProductLangs/${gtin}/${epiType}`, 'GET');
    }

    /**
     * Retrieves product market details by GTIN and EPI type.
     *
     * @param {string} gtin - The GTIN of the product.
     * @param {string} epiType - The type of ePI.
     * @returns {Promise<any>} A promise resolving with the list of ePI product markets
     */
    async listProductMarkets(gtin, epiType) {
        return this.send(`${this.getBaseURL()}/listProductMarkets/${gtin}/${epiType}`, 'GET');
    }

    /**
     * Retrieves a list of batches with optional sorting and limit.
     *
     * @param {number} [number=100] - The number of batches to retrieve.
     * @param {"asc" | "desc"} [sort="desc"] - Sorting order
     * @returns {Promise<any>} A promise resolving with the list of batches.
     */
    async listBatches(number = 100, sort = "desc") {
        return this.send(`${this.getBaseURL()}/listBatches?query=__timestamp%20%3E%200&number=${number}&sort=${sort}`, 'GET');
    }

    /**
     * Retrieves batch language details by GTIN, batch number, and EPI type.
     *
     * @param {string} gtin - The GTIN of the product.
     * @param {string} batchNumber - The batch number of the product.
     * @param {string} epiType - The type of ePI.
     * @returns {Promise<any>} A promise resolving with the batch language details.
     */
    async listBatchesLang(gtin, batchNumber, epiType) {
        return this.send(`${this.getBaseURL()}/listBatchLangs/${gtin}/${batchNumber}/${epiType}`, 'GET');
    }

    async filterAuditLogs(logType, start, number, query, sort) {
        return this.processAndSend(this.getBaseURL(), `audit/${logType}`, start, number, query, sort);
    }

    async addLeaflet(gtin, batchNumber, epiLang, epiType, epiMarket, leafletPayload) {
        const epiMessage = this.utils.initMessage(leafletPayload, API_MESSAGE_TYPES.EPI.LEAFLET)
        let path = batchNumber ? `${batchNumber}/${epiLang}/${epiType}` : `${epiLang}/${epiType}`
        path = epiMarket ? path + `/${epiMarket}` : path;
        return this.send(`${this.getBaseURL()}/epi/${gtin}/${path}`, 'POST', epiMessage);
    }

    async getLeaflet(gtin, batchNumber, epiLang, epiType, epiMarket) {
        let path = batchNumber ? `${batchNumber}/${epiLang}/${epiType}` : `${epiLang}/${epiType}`;
        path = epiMarket ? path + `/${epiMarket}` : path;
        return this.send(`${this.getBaseURL()}/epi/${gtin}/${path}`, 'GET');
    }

    async updateLeaflet(gtin, batchNumber, epiLang, epiType, leafletPayload) {
        const epiMessage = this.utils.initMessage(leafletPayload, API_MESSAGE_TYPES.EPI.LEAFLET)
        const path = batchNumber ? `${batchNumber}/${epiLang}/${epiType}` : `${epiLang}/${epiType}`;
        return this.send(`${this.getBaseURL()}/epi/${gtin}/${path}`, 'PUT', epiMessage);
    }

    async deleteLeaflet(gtin, batchNumber, epiLang, epiType, epiMarket) {
        let path = batchNumber ? `${batchNumber}/${epiLang}/${epiType}` : `${epiLang}/${epiType}`;
        path = epiMarket ? path + `/${epiMarket}` : path;
        return this.send(`${this.getBaseURL()}/epi/${gtin}/${path}`, 'DELETE');
    }

    async addBatch(gtin, batchNumber, payload) {
        const batchMessage = this.utils.initMessage(payload, API_MESSAGE_TYPES.BATCH)
        return this.send(`${this.getBaseURL()}/batch/${gtin}/${batchNumber}`, 'POST', batchMessage);
    };

    async updateBatch(gtin, batchNumber, payload) {
        const batchMessage = this.utils.initMessage(payload, API_MESSAGE_TYPES.BATCH)
        return this.send(`${this.getBaseURL()}/batch/${gtin}/${batchNumber}`, 'PUT', batchMessage);
    };

    async getBatch(gtin, batchNumber) {
        return this.send(`${this.getBaseURL()}/batch/${gtin}/${batchNumber}`, 'GET');
    };

    getBaseURL() {
        return `${this.config.sor_endpoint}/integration`;
    }

    async send(endpoint, method, data, responseType = "json") {
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

                const self = this;

                function referenceFromUrl(url, response = false) {
                    const name = [method, response ? "response" : "payload", ...url.split('/')].join('-');
                    const cached = Object.keys(self.cached)
                        .filter(k => k.includes(name));

                    if (cached.length) {
                        const arr = cached.pop().split('-');
                        const last = parseInt(arr[arr.length - 1]);

                        self.cached[`${name}-${last + 1}`] = response.data;
                        return name;
                    }

                    self.cached[`${name}-0`] = response.data;
                    return name;
                }

                let body;
                if (method !== 'DELETE' && data) {
                    body = data ? JSON.stringify(data) : undefined;
                }
                switch (method) {
                    case 'POST':
                        await this.reporter.outputPayload(this.step || "", referenceFromUrl(endpoint), data, "json")
                        response = await axios.post(endpoint, data, {headers: this.getHeaders()});
                        await this.reporter.outputPayload(this.step || "", referenceFromUrl(endpoint, true), response, "json", true)
                        break;
                    case 'PUT':
                        await this.reporter.outputPayload(this.step || "", referenceFromUrl(endpoint), data, "json")
                        response = await axios.put(endpoint, data, {headers: this.getHeaders()});
                        await this.reporter.outputPayload(this.step || "", referenceFromUrl(endpoint, true), response, "json", true)
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
        } catch (e) {
            // if (e instanceof Error) {
            //     throw new Error(`Error sending ${method} request to ${endpoint} - ${e.message}`)
            // }
            throw e;
        }
    }
}

module.exports = {
    IntegrationClient
};