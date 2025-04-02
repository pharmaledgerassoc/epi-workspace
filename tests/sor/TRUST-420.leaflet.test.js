const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {Leaflet} = require("../models/Leaflet");
const {API_MESSAGE_TYPES, constants} = require("../constants");
const fs = require("node:fs");
const path = require("path");
const {FixedUrls} = require("../clients/FixedUrls");
const {AuditLogChecker} = require("../audit/AuditLogChecker");

const isCI = !!process.env.CI; // works for travis, github and gitlab
const multiplier = isCI? 4 : 1;
jest.setTimeout(multiplier * 60 * 1000);
const timeoutBetweenTests = multiplier * 15 * 1000;

const testName = "TRUST-420";

describe(`${testName} ePI Leaflet`, () => {
    // retrieve integration api client
    const client = new IntegrationClient(config, testName);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);
    const listProductLangsUrl = "/listProductLangs";
    const listProductMarketsUrl = "/listProductMarkets";
    const listBatchLangsUrl = "/listBatchLangs";

    let GTIN = "";
    let BATCH_NUMBER = "";
    const EPI_TYPES = Object.values(API_MESSAGE_TYPES.EPI).filter((e) => e !== API_MESSAGE_TYPES.EPI.SMPC);
    const XML_FILE_CONTENT = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_example.txt"), {encoding: 'utf-8'})).trim();
    const XML_FILE_CONTENT_FR = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_example_fr.txt"), {encoding: 'utf-8'})).trim();
    const XML_FILE_WITH_IMG = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_with_img.txt"), {encoding: 'utf-8'})).trim();
    const IMG_FILE_NAME = "figure_010_1295_1485_3620_1050.png";
    const IMG_FILE_CONTENT = (fs.readFileSync(path.join(__dirname, "..", "resources", `${IMG_FILE_NAME}.txt`), {encoding: 'utf-8'})).trim();

    const ePIBaseURL = "/epi";

    beforeAll(async () => {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);
        AuditLogChecker.setApiClient(client);

        const ticket = testName
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

    afterEach((cb) => {
        console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
        setTimeout(() => {
            cb()
        }, timeoutBetweenTests)
    });

    describe(`${ePIBaseURL} (POST)`, () => {

        afterEach((cb) => {
            console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
            setTimeout(() => {
                cb()
            }, timeoutBetweenTests)
        });

        const LANG = "de";
        it("SUCCESS 200 - Should add a leaflet for a PRODUCT (TRUST-111, TRUST-392, TRUST-393)", async () => {
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
                await AuditLogChecker.assertEPIAuditLog("POST", GTIN, constants.OPERATIONS.ADD_LEAFLET, leaflet.language, leafletType);
            }


        });

        it("SUCCESS 200 - Should kept existing leaflets when adding a new one", async () => {
            const res1 = await client.addLeaflet(GTIN, undefined, "mk", API_MESSAGE_TYPES.EPI.LEAFLET, undefined, new Leaflet({
                productCode: GTIN,
                language: "mk",
                xmlFileContent: XML_FILE_CONTENT
            }));
            expect(res1.status).toBe(200);

            await AuditLogChecker.assertEPIAuditLog("POST", GTIN, constants.OPERATIONS.ADD_LEAFLET, "mk", API_MESSAGE_TYPES.EPI.LEAFLET);

            const res2 = await client.addLeaflet(GTIN, undefined, "no", API_MESSAGE_TYPES.EPI.LEAFLET, undefined, new Leaflet({
                productCode: GTIN,
                language: "no",
                xmlFileContent: XML_FILE_CONTENT
            }));
            expect(res2.status).toBe(200);

            await AuditLogChecker.assertEPIAuditLog("POST", GTIN, constants.OPERATIONS.ADD_LEAFLET, "no", API_MESSAGE_TYPES.EPI.LEAFLET);

            const getResponse = await client.getLeaflet(GTIN, undefined, "mk", API_MESSAGE_TYPES.EPI.LEAFLET);
            expect(getResponse.status).toBe(200);
        });

        it("SUCCESS 200 - Should add a leaflet for a PRODUCT in different markets (TRUST-391)", async () => {
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
                    await AuditLogChecker.assertEPIAuditLog("POST", GTIN, constants.OPERATIONS.ADD_LEAFLET, leaflet.language, leafletType, market)
                }
            }
        });

        it("SUCCESS 200 - Should add a leaflet for a BATCH (TRUST-111)", async () => {
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
                await AuditLogChecker.assertEPIAuditLog("POST", GTIN, constants.OPERATIONS.ADD_LEAFLET, leaflet.language, leafletType, undefined, BATCH_NUMBER);
            }
        });

        it("FAIL 415 - Should throw when mandatory fields are empty (TRUST-193)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            const mandatoryFields = ["productCode", "language"]; //, "xmlFileContent"];
            for (const field of mandatoryFields) {
                const invalidLeaflet = {...leaflet};
                invalidLeaflet[field] = undefined;

                try {
                    await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, invalidLeaflet);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(415);
                    await AuditLogChecker.assertAuditLogSnapshot();
                    continue;
                }
                throw new Error(`Request should have failed with 422 status code when ${field} is empty`);
            }
        });

        it("FAIL 400 - Should fail when try to add a prescribingInfo leaflet on batch level (TRUST-392)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const leaflet = new Leaflet({
                productCode: GTIN,
                batchNumber: BATCH_NUMBER,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            try {
                await client.addLeaflet(leaflet.productCode, BATCH_NUMBER, leaflet.language, API_MESSAGE_TYPES.EPI.PRESCRIBING_INFO, undefined, leaflet);
                throw new Error("Request should have failed");
            } catch (e) {
                expect(e.status).toBe(400);
                expect(e.response.data).toEqual(`Invalid epi type: ${API_MESSAGE_TYPES.EPI.PRESCRIBING_INFO}.`);
            }
            await AuditLogChecker.assertAuditLogSnapshot();
        });

        it("FAIL 400 - Should fail when try to add a leaflet with ePI Market on batch level (TRUST-391)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const leaflet = new Leaflet({
                productCode: GTIN,
                batchNumber: BATCH_NUMBER,
                language: LANG,
                xmlFileContent: XML_FILE_CONTENT
            });

            try {
                await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, API_MESSAGE_TYPES.EPI.PRESCRIBING_INFO, "GE", leaflet);
                throw new Error("Request should have failed");
            } catch (e) {
                expect(e.status).toBe(415);
                await AuditLogChecker.assertAuditLogSnapshot();
                //expect(e.response.data).toEqual("Markets are not available at the epi batch level.");
            }
        });

        it("FAIL 422 - Should fail when try to add a leaflet without image", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: "it",
                xmlFileContent: XML_FILE_WITH_IMG
            });

            for (let batchNumber of [undefined, BATCH_NUMBER]) {
                try {
                    await client.addLeaflet(leaflet.productCode, batchNumber, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
                    throw new Error("Request should have failed");
                } catch (e) {
                    expect(e.status).toBeGreaterThanOrEqual(415);
                    expect(e.status).toBeLessThan(500);
                    await AuditLogChecker.assertAuditLogSnapshot();
                }
            }
        });

        it("FAIL 422 - Should fail when try to add a invalid XML content (TRUST-191)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const leaflet = new Leaflet({
                productCode: GTIN,
                language: "it",
                xmlFileContent: XML_FILE_CONTENT + "invalid"
            });

            for (let batchNumber of [undefined, BATCH_NUMBER]) {
                try {
                    await client.addLeaflet(leaflet.productCode, batchNumber, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
                    throw new Error("Request should have failed");
                } catch (e) {
                    expect(e.status).toBeGreaterThanOrEqual(415);
                    expect(e.status).toBeLessThan(500);
                    await AuditLogChecker.assertAuditLogSnapshot();
                }
            }
        });

        it("FAIL 422 - Should fail when try to add a invalid otherFiles content (TRUST-193)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
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
                    throw new Error("Request should have failed");
                } catch (e) {
                    expect(e.status).toBeGreaterThanOrEqual(415);
                    expect(e.status).toBeLessThan(500);
                    await AuditLogChecker.assertAuditLogSnapshot();
                }
            }
        });

    });

    describe(`${ePIBaseURL} (GET)`, () => {

        afterEach((cb) => {
            console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
            setTimeout(() => {
                cb()
            }, timeoutBetweenTests)
        });

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

        afterEach((cb) => {
            console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
            setTimeout(() => {
                cb()
            }, timeoutBetweenTests)
        });

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

        it("SUCCESS 200 - Should update a leaflet for a PRODUCT properly (TRUST-117, TRUST-354)", async () => {
            for (let leafletType of EPI_TYPES) {
                const payload = new Leaflet({
                    productCode: GTIN,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT_FR
                });
                const res = await client.updateLeaflet(GTIN, undefined, LANG, leafletType, payload);
                expect(res.status).toBe(200);

                await AuditLogChecker.assertEPIAuditLog("PUT", GTIN, constants.OPERATIONS.UPDATE_LEAFLET, LANG, leafletType, undefined);

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

                await AuditLogChecker.assertEPIAuditLog("PUT", GTIN, constants.OPERATIONS.UPDATE_LEAFLET, LANG, leafletType, undefined, BATCH_NUMBER);


                const getResponse = await client.getLeaflet(GTIN, BATCH_NUMBER, LANG, leafletType);
                expect(getResponse.status).toBe(200);
                expect(getResponse.data).toMatchObject({
                    xmlFileContent: payload.xmlFileContent,
                    otherFilesContent: []
                });
            }
        });

        it("FAIL 422 - Should fail when upload a invalid XML leaflet for PRODUCT", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                try {
                    await client.updateLeaflet(GTIN, undefined, LANG, leafletType, new Leaflet({
                        productCode: GTIN,
                        language: LANG,
                        xmlFileContent: XML_FILE_CONTENT + "product" + leafletType
                    }));
                    throw new Error("Request should have failed");
                } catch (e) {
                    expect(e.status).toBe(422);
                    expect(e.response.data.message).toEqual("Payload validation failed");
                    await AuditLogChecker.assertAuditLogSnapshot();
                }
            }
        });

        it("FAIL 422 - Should fail when upload a invalid XML leaflet for BATCH", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            for (let leafletType of [API_MESSAGE_TYPES.EPI.LEAFLET]) {
                try {
                    await client.updateLeaflet(GTIN, BATCH_NUMBER, LANG, leafletType, new Leaflet({
                        productCode: GTIN,
                        batchNumber: BATCH_NUMBER,
                        language: LANG,
                        xmlFileContent: XML_FILE_CONTENT + "batch" + leafletType
                    }));
                    throw new Error("Request should have failed");
                } catch (e) {
                    expect(e.status).toBe(422);
                    expect(e.response.data.message).toEqual("Payload validation failed");
                    await AuditLogChecker.assertAuditLogSnapshot();
                }
            }
        });
    });

    describe(`${ePIBaseURL} (DELETE)`, () => {

        const LANG = "hi";
        const MARKET = "BR";
        beforeAll(async () => {
            // add for product
            for (let leafletType of EPI_TYPES) {
                const leafetProductResponse = await client.addLeaflet(GTIN, undefined, LANG, leafletType, undefined, new Leaflet({
                    productCode: GTIN,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT
                }));
                expect(leafetProductResponse.status).toBe(200);

                const leafetMarketResponse = await client.addLeaflet(GTIN, undefined, LANG, leafletType, MARKET, new Leaflet({
                    productCode: GTIN,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT
                }));
                expect(leafetMarketResponse.status).toBe(200);

                // add for batch
                const leafletBatchResponse = await client.addLeaflet(GTIN, BATCH_NUMBER, LANG, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, new Leaflet({
                    productCode: GTIN,
                    batchNumber: BATCH_NUMBER,
                    language: LANG,
                    xmlFileContent: XML_FILE_CONTENT
                }));
                expect(leafletBatchResponse.status).toBe(200);
            }
        });

        // beforeEach(async () => {
        //     await fixedUrl.waitForCompletion();
        // });

        afterEach((cb) => {
            console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
            setTimeout(() => {
                cb()
            }, timeoutBetweenTests)
        });

        it("SUCCESS 200 - Should delete a leaflet from a PRODUCT properly (TRUST-118)", async () => {
            for (let leafletType of EPI_TYPES) {
                const res = await client.deleteLeaflet(GTIN, undefined, LANG, leafletType);
                expect(res.status).toBe(200);

                await AuditLogChecker.assertEPIAuditLog("DELETE", GTIN, constants.OPERATIONS.DELETE_LEAFLET, LANG, leafletType, undefined);

                try {
                    await client.getLeaflet(GTIN, undefined, LANG, leafletType);
                    throw new Error(`Should throw for /${GTIN}/${LANG}/${leafletType}`)
                } catch (e) {
                    expect(e.status).toEqual(404);
                }
            }
        });

        it("SUCCESS 200 - Should delete a leaflet market from a PRODUCT properly (TRUST-118)", async () => {
            for (let leafletType of EPI_TYPES) {
                const res = await client.deleteLeaflet(GTIN, undefined, LANG, leafletType, MARKET);
                expect(res.status).toBe(200);

                await AuditLogChecker.assertEPIAuditLog("DELETE", GTIN, constants.OPERATIONS.DELETE_LEAFLET, LANG, leafletType, MARKET);

                try {
                    const leaflet = await client.getLeaflet(GTIN, undefined, LANG, leafletType);
                    throw new Error(`Should throw for /${GTIN}/${LANG}/${leafletType}/${MARKET}`)
                } catch (e) {
                    expect(e.status).toEqual(404);
                }
            }
        });

        it("SUCCESS 200 - Should delete a leaflet from a BATCH properly (TRUST-118)", async () => {
            const res = await client.deleteLeaflet(GTIN, BATCH_NUMBER, LANG, API_MESSAGE_TYPES.EPI.LEAFLET);
            expect(res.status).toBe(200);

            await AuditLogChecker.assertEPIAuditLog("DELETE", GTIN, constants.OPERATIONS.DELETE_LEAFLET, LANG, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, BATCH_NUMBER);


            try {
                await client.getLeaflet(GTIN, BATCH_NUMBER, LANG, API_MESSAGE_TYPES.EPI.LEAFLET);
                throw new Error(`Should throw for /${GTIN}/${BATCH_NUMBER}/${LANG}/${API_MESSAGE_TYPES.EPI.LEAFLET}`)
            } catch (e) {
                expect(e.status).toEqual(404);
            }
        });
    });

    describe(`${listProductLangsUrl} (GET)`, () => {
        let GTIN = "";

        beforeAll(async () => {
            const ticket = "TRUST-XX ePI";
            const product = await ModelFactory.product(ticket);
            const addProductRes = await client.addProduct(product.productCode, product);
            expect(addProductRes.status).toBe(200);
            GTIN = product.productCode;

            for (let leafletType of EPI_TYPES) {
                const leaflet = new Leaflet({
                    productCode: GTIN,
                    language: "sk",
                    xmlFileContent: XML_FILE_CONTENT
                });

                const res1 = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, leafletType, undefined, leaflet);
                expect(res1.status).toBe(200);

                leaflet.language = "pl";
                const res2 = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, leafletType, undefined, leaflet);
                expect(res2.status).toBe(200);
            }
        });

        it("SUCCESS 200 - Should list product langs", async () => {
            for (let leafletType of EPI_TYPES) {
                const response = await client.listProductLangs(GTIN, leafletType);
                expect(response.status).toEqual(200);
                expect(Array.isArray(response.data)).toBeTruthy();
                expect(response.data.length).toBeGreaterThan(1);
                expect(response.data).toMatchObject(["sk", "pl"]);
            }
        });
    });

    describe(`${listProductMarketsUrl} (GET)`, () => {
        let GTIN = "";
        const MARKETS = ["AF", "AL"];

        beforeAll(async () => {
            const ticket = "TRUST-XX ePI Market";
            const product = await ModelFactory.product(ticket);
            const addProductRes = await client.addProduct(product.productCode, product);
            expect(addProductRes.status).toBe(200);
            GTIN = product.productCode;

            for (let leafletType of EPI_TYPES) {
                for (let epiMarket of MARKETS) {
                    const leaflet = new Leaflet({
                        productCode: GTIN,
                        language: "el",
                        xmlFileContent: XML_FILE_CONTENT
                    });

                    const res1 = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, leafletType, epiMarket, leaflet);
                    expect(res1.status).toBe(200);


                    leaflet.language = "pl";
                    const res2 = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, leafletType, epiMarket, leaflet);
                    expect(res2.status).toBe(200);
                }
            }
        });

        beforeEach(async () => {
            await fixedUrl.waitForCompletion();
        });

        it("SUCCESS 200 - Should list product markets", async () => {
            for (let leafletType of EPI_TYPES) {
                for (const epiMarket of MARKETS) {
                    const response = await client.listProductMarkets(GTIN, leafletType);
                    expect(response.status).toEqual(200);
                    expect(Object.keys(response.data)).toMatchObject(["el", "pl"]);
                    expect(response.data["el"]).toMatchObject(["AF", "AL"]);
                    expect(response.data["pl"]).toMatchObject(["AF", "AL"]);
                }
            }
        });
    });

    describe(`${listBatchLangsUrl} (GET)`, () => {
        let GTIN = "";
        let BATCH_NUMBER = "";
        beforeAll(async () => {
            const ticket = `${testName} ePI`;
            const product = await ModelFactory.product(ticket);
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

            const leaflet = new Leaflet({
                productCode: GTIN,
                language: "tr",
                batchNumber: BATCH_NUMBER,
                xmlFileContent: XML_FILE_CONTENT
            });

            const res1 = await client.addLeaflet(leaflet.productCode, leaflet.batchNumber, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
            expect(res1.status).toBe(200);

            leaflet.language = "ja";
            const res2 = await client.addLeaflet(leaflet.productCode, leaflet.batchNumber, leaflet.language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
            expect(res2.status).toBe(200);
        });

        it("SUCCESS 200 - Should list batches langs", async () => {
            const response = await client.listBatchesLang(GTIN, BATCH_NUMBER, API_MESSAGE_TYPES.EPI.LEAFLET);
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(1);
            expect(response.data).toEqual(["tr", "ja"]);
        });
    });

});
