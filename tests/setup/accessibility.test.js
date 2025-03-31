const {IntegrationClient} = require("../clients/Integration");
const {OAuth} = require("../clients/Oauth");
const {FixedUrls} = require("../clients/FixedUrls");
const {ModelFactory} = require("../models/factory");
const {convertLeafletFolderToObject, getYYMMDDDate} = require("../utils");
const path = require("path")
const {Leaflet} = require("../models/Leaflet");
const {API_MESSAGE_TYPES} = require("../constants");
const {Product} = require("../models/Product");
const {Batch} = require("../models/Batch");
const {getConfig} = require("../conf");
const config = getConfig();
const data = require("./accessibility-data.json");

jest.setTimeout(60000);

describe(`Accessibility`, () => {
    // retrieve integration api client
    const client = new IntegrationClient(config);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);

    const products = [];
    const batches = {};

    beforeAll(async () => {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);
    });

    data.forEach(async (item, i) => {

        it(`should create a product ${item.code}`, async () => {
            let {code} = item;

            const product = await ModelFactory.product(code, {
                inventedName: `Accessibility Test Product ${i}`,
                nameMedicinalProduct: `Accessibility Test Product ${i} - extra info`,
                markets: [{
                    marketId: "IN",
                    nationalCode: "NC001",
                    mahAddress: "221B Baker Street",
                    mahName: `${code} MAH`,
                    legalEntityName: `${code} Legal Entity`
                }],
                strengths: [{
                    substance: "Dipiloma", strength: "500mg"
                }]
            });
            const res = await client.addProduct(product.productCode, product);
            expect(res.status).toBe(200);

            const productResponse = await client.getProduct(product.productCode);
            expect(productResponse.data).toEqual(expect.objectContaining(product));

            products.push(productResponse.data);
        });

        it(`should create batch ${item.batch} for product ${item.code}`, async () => {
            let {code, batch, expiry} = item;

            code = products[i].productCode
            const createdBatch = await ModelFactory.batch(batch, code, {
                batchNumber: batch,
                expiryDate: expiry,
                packagingSiteName: batch,
                manufacturerAddress1: "1313, Burrito Boulevard, Tao City - Mexico",
                manufacturerAddress2: "411, Bakon Street"
            });
            const res = await client.addBatch(createdBatch.productCode, createdBatch.batchNumber, createdBatch);
            expect(res.status).toBe(200);

            const batchResponse = await client.getBatch(createdBatch.productCode, createdBatch.batchNumber);
            expect(batchResponse.data).toEqual(expect.objectContaining(createdBatch));
            batches[code] = batchResponse.data;
        });

    });

    describe("screen 1 - creates leaflet and HCP for india screen popup", () => {

        it(`should add a default leaflet for product ${data[0].code}`, async () => {
            const code = products[0].productCode;
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
            expect(res.status).toBe(200);
        })

        it(`should add a default HCP for product ${data[0].code}`, async () => {
            const code = products[0].productCode;
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/hcp"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.PRESCRIBING_INFO, undefined, leaflet);
            expect(res.status).toBe(200);
        })
    })

    describe("screen 2 - creates leaflet and HCP for india screen popup", () => {
        console.log("nothing to do in this case. why isn't this the same product as before?")
    })

    describe("screen 3 - adds 3 leaflets. no country, Brazil and France", () => {

        it(`should add a default leaflet for product ${data[2].code} - no market`, async () => {
            const {code} = data[2]
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
            expect(res.status).toBe(200);
        })

        it(`should add a default leaflet for product ${data[2].code} - brazil market`, async () => {
            const {code} = data[2]
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.LEAFLET, "br", leaflet);
            expect(res.status).toBe(200);
        })

        it(`should add a default leaflet for product ${data[2].code} - france market`, async () => {
            const {code} = data[2]
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.LEAFLET, "fr", leaflet);
            expect(res.status).toBe(200);
        })
    })

    describe("screen 4 - adds leaflet. marks product as recalled", () => {

        it(`should add a default leaflet for product ${data[3].code}`, async () => {
            const {code} = data[3]
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
            expect(res.status).toBe(200);
        })

        it("should recall the product", async () => {
           let product = products[3]
            product = new Product({
                ...product,
                productRecall: true
            });
            const updateProductResponse = await client.updateProduct(product.productCode, product);
            expect(updateProductResponse.status).toEqual(200);
        });
    })

    describe("screen 5 - adds leaflet. marks batch as recalled", () => {


        it(`should add a default leaflet for product ${data[4].code}`, async () => {
            const {code} = data[4]
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
            expect(res.status).toBe(200);
        })

        it("should recall the batch", async () => {
            const {code} = data[4]
            let batch = batches[code];
            batch = new Batch({
                ...batch,
                batchRecall: true
            });
            const updateBatchResponse = await client.updateBatch(code, batch.batchNumber, batch);
            expect(updateBatchResponse.status).toEqual(200);
        });
    })

    describe("screen 6 - adds leaflet. marks batch as recalled", () => {
        console.log("nothing to do in this case. why isn't this the same product as screen 1?")
    })

    describe("screen 7 - adds 3 leaflets. spanish, korean, portuguese", () => {
        ["es", "pt", "ko"].forEach((language) => {
            it(`should add a default leaflet for product ${data[6].code} - spanish`, async () => {
                const {code} = data[6];
                const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
                const leaflet = new Leaflet({
                    productCode: code,
                    language: language,
                    xmlFileContent: payload.payload.xmlFileContent,
                    otherFilesContent: payload.payload.otherFilesContent
                });

                const res = await client.addLeaflet(code, undefined, language, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
                expect(res.status).toBe(200);
            })
        })
    })

    describe("screen 8 - creates leaflet and marks batch expiry to yesterday", () => {

        it(`should add a default leaflet for product ${data[7].code}`, async () => {
            const {code} = data[7]
            const payload = convertLeafletFolderToObject(path.join(process.cwd(), "tests/resources/accessibility"));
            const leaflet = new Leaflet({
                productCode: code,
                language: "en",
                xmlFileContent: payload.payload.xmlFileContent,
                otherFilesContent: payload.payload.otherFilesContent
            });

            const res = await client.addLeaflet(code, undefined, "en", API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet);
            expect(res.status).toBe(200);
        })

        it("should mark the batch as expired", async () => {
            const {code} = data[7]
            let batch = batches[code];
            batch = new Batch({
                ...batch,
                expiryDate: "250329"
            });
            const updateBatchResponse = await client.updateBatch(code, batch.batchNumber, batch);
            expect(updateBatchResponse.status).toEqual(200);
        });
    })

    describe("screen 9 - get un unrecognized product", () => {
        console.log("do nothing. just scan a bad gtin")
    })

});