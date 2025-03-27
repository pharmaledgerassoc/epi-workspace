const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {Leaflet} = require("../models/Leaflet");
const {API_MESSAGE_TYPES} = require("../constants");
const fs = require("node:fs");
const path = require("path");
const {Batch} = require("../models/Batch");
const {UtilsService} = require("../clients/utils");

jest.setTimeout(60000);

describe(`TRUST-001 ePI Leaflet`, () => {
    let GTIN = "";
    let BATCH_NUMBER = "";
    const DEFAULT_LANG = "en";
    const EPI_TYPES = Object.values(API_MESSAGE_TYPES.EPI).filter((e) => e !== API_MESSAGE_TYPES.EPI.SMPC);
    let product = new Product({});
    let client = new IntegrationClient({});
    const XML_FILE_CONTENT = fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_example.txt"), {encoding: 'utf-8'});
    const ePIBaseURL = "/epi";

    beforeAll(async () => {
        const oauth = new OAuth(config);
        // log in to SSO
        const token = await oauth.getAccessToken();
        // retrieve integration api client
        client = new IntegrationClient(config);
        // store auth SSO token
        client.setSharedToken(token);

        const res = await client.getProduct("18624862486261");
        // const res = await client.addProduct(product.productCode, product);
        // expect(res.status).toBe(200);

        // GTIN = product.productCode;
        product = res.data;
        GTIN = "18624862486261";

        const batch = await ModelFactory.batch("TRUST-001", GTIN);
        const batchCreatedRes = await client.addBatch(batch.productCode, batch.batchNumber, batch);
        expect(batchCreatedRes.status).toBe(200);

        const batchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
        expect(batchResponse.data).toEqual(expect.objectContaining(batch));
        BATCH_NUMBER = batchResponse.data.batchNumber;
    });

    describe(`${ePIBaseURL} (POST)`, () => {

        it("SUCCESS 200 - Should add a leaflet for a PRODUCT properly", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: DEFAULT_LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            for (let leafletType of EPI_TYPES) {
                const res = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, leafletType, leaflet);
                expect(res.status).toBe(200);
            }
        });

        it("SUCCESS 200 - Should add a leaflet for a BATCH properly", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: DEFAULT_LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                const res = await client.addLeaflet(leaflet.productCode, BATCH_NUMBER, leaflet.language, leafletType, leaflet);
                expect(res.status).toBe(200);
            }
        });

        it("SUCCESS 200 - Should fail when try to add a leaflet with ePI Market on batch level", async () => {

        });

        it("SUCCESS 200 - Should fail when try to add a prescribingInfo leaflet on batch level", async () => {

        });

    });

    describe(`${ePIBaseURL} (GET)`, () => {
        it("SUCCESS 200 - Should get a leaflet for a PRODUCT properly", async () => {
            for (let leafletType of EPI_TYPES) {
                const res = await client.getLeaflet(GTIN, undefined, DEFAULT_LANG, leafletType);
                expect(res.status).toBe(200);
                expect(res.data).toMatchObject({
                    xmlFileContent: XML_FILE_CONTENT,
                    otherFilesContent: []
                });
            }
        });

        it("SUCCESS 200 - Should get a leaflet for a BATCH properly", async () => {
            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                const res = await client.getLeaflet(GTIN, BATCH_NUMBER, DEFAULT_LANG, leafletType);
                expect(res.status).toBe(200);
                expect(res.data).toMatchObject({
                    xmlFileContent: XML_FILE_CONTENT,
                    otherFilesContent: []
                });
            }
        });
    });

    describe(`${ePIBaseURL} (PUT)`, () => {
        it("SUCCESS 200 - Should update a leaflet for a PRODUCT properly", async () => {
            for (let leafletType of EPI_TYPES) {
                const payload = new Leaflet({
                    productCode: GTIN,
                    language: DEFAULT_LANG,
                    xmlFileContent: XML_FILE_CONTENT + "product" + leafletType
                });
                const res = await client.updateLeaflet(GTIN, undefined, DEFAULT_LANG, leafletType, payload);
                expect(res.status).toBe(200);

                const getResponse = await client.getLeaflet(GTIN, undefined, DEFAULT_LANG, leafletType);
                expect(getResponse.status).toBe(200);
                expect(getResponse.data).toMatchObject({
                    xmlFileContent: payload.xmlFileContent,
                    otherFilesContent: []
                });
            }
        });

        it("SUCCESS 200 - Should update a leaflet for a BATCH properly", async () => {
            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                const payload = new Leaflet({
                    productCode: GTIN,
                    language: DEFAULT_LANG,
                    xmlFileContent: XML_FILE_CONTENT + "batch" + leafletType
                });
                const res = await client.updateLeaflet(GTIN, BATCH_NUMBER, DEFAULT_LANG, leafletType, payload);
                expect(res.status).toBe(200);

                const getResponse = await client.getLeaflet(GTIN, BATCH_NUMBER, DEFAULT_LANG, leafletType);
                expect(getResponse.status).toBe(200);
                expect(getResponse.data).toMatchObject({
                    xmlFileContent: payload.xmlFileContent,
                    otherFilesContent: []
                });
            }
        });
    });

    describe(`${listBatchLangsUrl} (GET)`, () => {
        let batch = new Batch();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const _batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            const res = await client.addBatch(_batch.productCode, _batch.batchNumber, _batch);
            expect(res.status).toBe(200);

            const batchResponse = await client.getBatch(_batch.productCode, _batch.batchNumber);
            expect(batchResponse.data).toEqual(expect.objectContaining(_batch));
            batch = batchResponse.data;
        });

        it("SUCCESS 200 - Should list batches langs", async () => {
            const response = await client.listBatchesLang(batch.productCode, batch.batchNumber, "leaflet");
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);
        });
    });

});