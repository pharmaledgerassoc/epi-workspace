const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {Leaflet} = require("../models/Leaflet");
const {API_MESSAGE_TYPES} = require("../constants");
const fs = require("node:fs");
const path = require("path");
const {FixedUrls} = require("../clients/FixedUrls");

jest.setTimeout(60000);

describe(`TRUST-003 ePI Leaflet`, () => {

    // retrieve integration api client
    const client = new IntegrationClient(config);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);

    let GTIN = "";
    let BATCH_NUMBER = "";
    const EPI_TYPES = Object.values(API_MESSAGE_TYPES.EPI).filter((e) => e !== API_MESSAGE_TYPES.EPI.SMPC);
    const XML_FILE_CONTENT = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_example.txt"), {encoding: 'utf-8'})).trim();
    const XML_FILE_CONTENT_FR = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_example_fr.txt"), {encoding: 'utf-8'})).trim();
    const XML_FILE_WITH_IMG = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_with_img.txt"), {encoding: 'utf-8'})).trim();
    const IMG_FILE_NAME = "figure_010_1295_1485_3620_1050.png";
    const IMG_FILE_CONTENT = (fs.readFileSync(path.join(__dirname, "..", "resources", "figure_010_1295_1485_3620_1050.png.txt"), {encoding: 'utf-8'})).trim();

    const ePIBaseURL = "/epi";

    beforeAll(async () => {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);

        const ticket = "TRUST-XX ePI";
        const product = await ModelFactory.product(ticket, {
            markets: [{
                marketId: "IN",
                nationalCode: "IN001",
                mahAddress: "66B, Cyberpunk Street, Neon District",
                mahName: `${ticket} MAH`,
                legalEntityName: `${ticket} Legal Entity`
            }],
            strengths: [{
                substance: "Debugium", strength: "1500mg"
            }]
        });
        const addProductRes = await client.addProduct(product.productCode, product);
        expect(addProductRes.status).toBe(200);

        const productResponse = await client.getProduct(product.productCode);
        expect(productResponse.status).toBe(200);
        GTIN = productResponse.data.productCode;


        const batch = await ModelFactory.batch(ticket, GTIN);
        const addBatchRes = await client.addBatch(batch.productCode, batch.batchNumber, batch);
        expect(addBatchRes.status).toBe(200);

        const batchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
        expect(batchResponse.status).toBe(200);
        BATCH_NUMBER = batchResponse.data.batchNumber;
    });

    describe(`${ePIBaseURL} (POST)`, () => {
        const LANG = "de";
        it("SUCCESS 200 - Should add a leaflet for a PRODUCT", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: LANG,
                xmlFileContent: XML_FILE_WITH_IMG,
                otherFilesContent: [{
                    filename: IMG_FILE_NAME,
                    fileContent: IMG_FILE_CONTENT
                }]
            });

            for (let leafletType of EPI_TYPES) {
                const res = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, leafletType, undefined, leaflet);
                expect(res.status).toBe(200);
            }
        });

        it("SUCCESS 200 - Should add a leaflet for a PRODUCT in different markets", async () => {
            const markets = ["DE", "PT"];
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            for (let leafletType of EPI_TYPES) {
                for (let market of markets) {
                    const res = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, leafletType, market, leaflet);
                    expect(res.status).toBe(200);
                }
            }
        });

        it("SUCCESS 200 - Should add a leaflet for a BATCH", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                batchNumber: BATCH_NUMBER,
                language: LANG,
                xmlFileContent: XML_FILE_WITH_IMG,
                otherFilesContent: [{
                    filename: IMG_FILE_NAME,
                    fileContent: IMG_FILE_CONTENT
                }]
            });

            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                const res = await client.addLeaflet(leaflet.productCode, BATCH_NUMBER, leaflet.language, leafletType, undefined, leaflet);
                expect(res.status).toBe(200);
            }
        });

        it("FAIL 400 - Should fail when try to add a prescribingInfo leaflet on batch level", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                batchNumber: BATCH_NUMBER,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            try {
                await client.addLeaflet(leaflet.productCode, BATCH_NUMBER, leaflet.language, API_MESSAGE_TYPES.EPI.PRESCRIBING_INFO, undefined, leaflet);
            } catch (e) {
                expect(e.status).toBe(400);
                expect(e.response.data).toEqual(`Invalid epi type: ${API_MESSAGE_TYPES.EPI.PRESCRIBING_INFO}.`);
            }
        });

        it("FAIL 400 - Should fail when try to add a leaflet with ePI Market on batch level", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                batchNumber: BATCH_NUMBER,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            try {
                await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, API_MESSAGE_TYPES.EPI.PRESCRIBING_INFO, "GE", leaflet);
            } catch (e) {
                expect(e.status).toBe(415);
                //expect(e.response.data).toEqual("Markets are not available at the epi batch level.");
            }
        });

        it("FAIL 422 - Should fail when try to add a leaflet without image", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: "it",
                xmlFileContent: XML_FILE_WITH_IMG
            });

            for (let batchNumber of [undefined, BATCH_NUMBER]) {
                try {
                    await client.addLeaflet(leaflet.productCode, batchNumber, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
                    throw new Error("Should have fail");
                } catch (e) {
                    expect(e.status).toBe(422);
                }
            }
        });

        it("FAIL 422 - Should fail when try to add a invalid XML content", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: "it",
                xmlFileContent: XML_FILE_CONTENT + "invalid"
            });

            for (let batchNumber of [undefined, BATCH_NUMBER]) {
                try {
                    await client.addLeaflet(leaflet.productCode, batchNumber, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
                    throw new Error("Should have fail");
                } catch (e) {
                    expect(e.status).toBe(422);
                }
            }
        });

        it("FAIL 422 - Should fail when try to add a invalid otherFiles content", async () => {
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: "pl",
                xmlFileContent: XML_FILE_CONTENT,
                otherFilesContent: [{
                    fileName: "image.jpg",
                    fileContent: IMG_FILE_CONTENT + "INVALID"
                }]
            });

            for (let batchNumber of [undefined, BATCH_NUMBER]) {
                try {
                    await client.addLeaflet(leaflet.productCode, batchNumber, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
                    throw new Error("Should have fail");
                } catch (e) {
                    expect(e.status).toBe(422);
                }
            }
        });

    });

    describe(`${ePIBaseURL} (GET)`, () => {
        const LANG = "fr";
        beforeAll(async () => {
            // add for product
            for (let leafletType of EPI_TYPES) {
                const res = await client.addLeaflet(GTIN, undefined, LANG, leafletType, undefined, new Leaflet({
                    productCode: GTIN,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT
                }));
                expect(res.status).toBe(200);
            }

            // add for batch
            const res = await client.addLeaflet(GTIN, BATCH_NUMBER, LANG, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, new Leaflet({
                productCode: GTIN,
                batchNumber: BATCH_NUMBER,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            }));
            expect(res.status).toBe(200);
        });

        it("SUCCESS 200 - Should get a leaflet for a PRODUCT properly", async () => {
            for (let leafletType of EPI_TYPES) {
                const res = await client.getLeaflet(GTIN, undefined, LANG, leafletType);
                expect(res.status).toBe(200);
                expect(res.data).toMatchObject({
                    otherFilesContent: [],
                    xmlFileContent: XML_FILE_CONTENT
                });
            }
        });

        it("SUCCESS 200 - Should get a leaflet for a BATCH properly", async () => {
            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                const res = await client.getLeaflet(GTIN, BATCH_NUMBER, LANG, leafletType);
                expect(res.status).toBe(200);
                expect(res.data).toMatchObject({
                    xmlFileContent: XML_FILE_CONTENT,
                    otherFilesContent: []
                });
            }
        });
    });

    describe(`${ePIBaseURL} (PUT)`, () => {
        const LANG = "ar";
        beforeAll(async () => {
            // add for product
            for (let leafletType of EPI_TYPES) {
                const res = await client.addLeaflet(GTIN, undefined, LANG, leafletType, undefined, new Leaflet({
                    productCode: GTIN,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT
                }));
                expect(res.status).toBe(200);
            }

            // add for batch
            const res = await client.addLeaflet(GTIN, BATCH_NUMBER, LANG, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, new Leaflet({
                productCode: GTIN,
                batchNumber: BATCH_NUMBER,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            }));
            expect(res.status).toBe(200);
        });

        it("SUCCESS 200 - Should update a leaflet for a PRODUCT properly", async () => {
            for (let leafletType of EPI_TYPES) {
                const payload = new Leaflet({
                    productCode: GTIN,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT_FR
                });
                const res = await client.updateLeaflet(GTIN, undefined, LANG, leafletType, payload);
                expect(res.status).toBe(200);

                const getResponse = await client.getLeaflet(GTIN, undefined, LANG, leafletType);
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
                    batchNumber: BATCH_NUMBER,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT_FR
                });
                const res = await client.updateLeaflet(GTIN, BATCH_NUMBER, LANG, leafletType, payload);
                expect(res.status).toBe(200);

                const getResponse = await client.getLeaflet(GTIN, BATCH_NUMBER, LANG, leafletType);
                expect(getResponse.status).toBe(200);
                expect(getResponse.data).toMatchObject({
                    xmlFileContent: payload.xmlFileContent,
                    otherFilesContent: []
                });
            }
        });

        it("FAIL 422 - Should fail when upload a invalid XML leaflet for PRODUCT", async () => {
            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                try {
                    await client.updateLeaflet(GTIN, undefined, LANG, leafletType, new Leaflet({
                        productCode: GTIN,
                        language: LANG,
                        xmlFileContent: XML_FILE_CONTENT + "product" + leafletType
                    }));
                    throw new Error("Request should have failed with 422 status code");
                } catch (e) {
                    expect(e.status).toBe(422);
                    expect(e.response.data.message).toEqual("Payload validation failed");
                }
            }
        });

        it("FAIL 422 - Should fail when upload a invalid XML leaflet for BATCH", async () => {
            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                try {
                    await client.updateLeaflet(GTIN, BATCH_NUMBER, LANG, leafletType, new Leaflet({
                        productCode: GTIN,
                        batchNumber: BATCH_NUMBER,
                        language: LANG,
                        xmlFileContent: XML_FILE_CONTENT + "batch" + leafletType
                    }));
                    throw new Error("Request should have failed with 422 status code");
                } catch (e) {
                    expect(e.status).toBe(422);
                    expect(e.response.data.message).toEqual("Payload validation failed");
                }
            }
        });
    });

    // describe(`${listBatchLangsUrl} (GET)`, () => {
    //     let batch = new Batch();
    //     beforeAll(async () => {
    //         const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
    //         const _batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
    //         const res = await client.addBatch(_batch.productCode, _batch.batchNumber, _batch);
    //         expect(res.status).toBe(200);
    //
    //         const batchResponse = await client.getBatch(_batch.productCode, _batch.batchNumber);
    //         expect(batchResponse.data).toEqual(expect.objectContaining(_batch));
    //         batch = batchResponse.data;
    //     });
    //
    //     it("SUCCESS 200 - Should list batches langs", async () => {
    //         const response = await client.listBatchesLang(batch.productCode, batch.batchNumber, "leaflet");
    //         expect(response.status).toEqual(200);
    //         expect(Array.isArray(response.data)).toBeTruthy();
    //         expect(response.data.length).toBeGreaterThan(0);
    //     });
    // });

});