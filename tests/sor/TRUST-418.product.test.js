const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const {FixedUrls} = require("../clients/FixedUrls");
const {getRandomNumber} = require("../utils");
const {constants} = require("../constants");
const {AuditLogChecker} = require("../audit/AuditLogChecker");

const isCI = !!process.env.CI; // works for travis, github and gitlab
const multiplier = isCI? 3 : 1;
jest.setTimeout(multiplier * 60 * 1000);
const timeoutBetweenTests = multiplier * 5 * 1000;

const testName = "TRUST-418";

describe(`${testName} Product`, () => {
    // retrieve integration api client
    const client = new IntegrationClient(config, testName);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);
    const productUrl = "/product";
    const listProductsUrl = "/listProducts";

    beforeAll(async () => {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);
        AuditLogChecker.setApiClient(client);
    });

    afterEach((cb) => {
        console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
        setTimeout(() => {
            cb()
        }, timeoutBetweenTests)
    });

    describe(`${productUrl} (POST)`, () => {

        it("SUCCESS 200 - Should create a product properly (TRUST-67, TRUST-109, TRUST-375, TRUST-377)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket, {
                markets: [{
                    marketId: "IN",
                    nationalCode: "NC001",
                    mahAddress: "221B Baker Street",
                    mahName: `${ticket} MAH`,
                    legalEntityName: `${ticket} Legal Entity`
                }],
                strengths: [{
                    substance: "Dipiloma", strength: "500mg"
                }]
            });
            const res = await client.addProduct(product.productCode, product);
            expect(res.status).toBe(200);

            const productResponse = await client.getProduct(product.productCode);
            expect(productResponse.data).toEqual(expect.objectContaining(product));
            expect(productResponse.data.version).toEqual(1);

            await AuditLogChecker.assertAuditLog(constants.OPERATIONS.CREATE_PRODUCT, undefined, product);
        });

        it.skip("SUCCESS 200 - Should create a product with no duplicate strengths", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const strengths = [
                {substance: "Paracetalol", strength: "250mg"},
                {substance: "Paracetalol", strength: "250mg"},
                {substance: "Metformin", strength: "500mg"}
            ];
            const product = await ModelFactory.product(ticket, {strengths: strengths});
            const res = await client.addProduct(product.productCode, product);
            expect(res.status).toBe(200);

            const getProductResponse = await client.getProduct(product.productCode);
            expect(getProductResponse.data).toEqual(expect.objectContaining(product));
            expect(getProductResponse.data.strengths.length).toEqual(2);
        });

        it("FAIL 422 - Should throw for invalid GTIN (TRUST-115, TRUST-182)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket);
            product.productCode = (getRandomNumber() * 100).toString().slice(0, 14);

            try {
                await client.addProduct(product.productCode, product);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
            await AuditLogChecker.assertAuditLogSnapshot();
        });

        it("FAIL 422 - Should throw if GTIN in parameter and body mismatch on create (TRUST-180)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket);
            const product2 = await ModelFactory.product(ticket);

            try {
                await client.addProduct(product.productCode, product2);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
            await AuditLogChecker.assertAuditLogSnapshot();
        });

        it("FAIL 422 - Should throw Unprocessable Entity when mandatory fields are empty (TRUST-69)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket);
            const mandatoryFields = ["productCode", "nameMedicinalProduct", "inventedName"];

            await AuditLogChecker.storeAuditLogSnapshot();
            for (const field of mandatoryFields) {
                const invalidProduct = {...product};
                invalidProduct[field] = undefined; // getRandomNumber().toString();

                try {
                    await client.addProduct(invalidProduct.productCode, invalidProduct);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                    await AuditLogChecker.assertAuditLogSnapshot();
                    continue;
                }
                throw new Error(`Request should have failed with 422 status code when ${field} is empty`);
            }
        });

        it("FAIL 422 - Should throw Unprocessable Entity when invalid property is provided", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket);
            try {
                await client.addProduct(product.productCode, {...product, dummyProperty: "no matter value"});
                throw new Error("Request should have failed with 422 status code");
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
            await AuditLogChecker.assertAuditLogSnapshot();
        });

    });

    describe(`${productUrl} (GET)`, () => {
        let product = new Product();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const createdProduct = await ModelFactory.product(ticket, {
                markets: [{
                    marketId: "IN",
                    nationalCode: "NC001",
                    mahAddress: "001A Baker Street",
                    mahName: `${ticket} MAH`,
                    legalEntityName: `${ticket} Legal Entity`
                }],
                strengths: [{
                    substance: "Metformin", strength: "500mg"
                }]
            });
            const res = await client.addProduct(createdProduct.productCode, createdProduct);
            expect(res.status).toBe(200);
            product = createdProduct;
        });

        it("SUCCESS 200 - Should get a product properly", async () => {
            const getProductResponse = await client.getProduct(product.productCode);
            expect(getProductResponse.data).toEqual(expect.objectContaining(product));
            expect(getProductResponse.data.strengths.length).toEqual(1);
            expect(getProductResponse.data.markets.length).toEqual(1);
        });

    });

    describe(`${productUrl} (PUT)`, () => {
        let product = new Product();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const createdProduct = await ModelFactory.product(ticket, {
                markets: [
                    {
                        marketId: "IN",
                        nationalCode: "NC001",
                        mahAddress: "001A Baker Street",
                        mahName: `${ticket} MAH`,
                        legalEntityName: `${ticket} Legal Entity`
                    },
                    {
                        marketId: "DE",
                        nationalCode: "DE001",
                        mahAddress: "Always Raining Square, 13B",
                        mahName: `${ticket} MAH`,
                        legalEntityName: `${ticket} Legal Entity`
                    }
                ],
                strengths: [{
                    substance: "Metformin", strength: "500mg"
                }]
            });
            const res = await client.addProduct(createdProduct.productCode, createdProduct);
            expect(res.status).toBe(200);
            const {data} = await client.getProduct(createdProduct.productCode);
            product = data;
        });

        it("SUCCESS 200 - Should update a product properly", async () => {
            const {version} = product;
            const productUpdate = new Product({
                ...product,
                internalMaterialCode: "Update internalMaterialCode",
                productRecall: false,
                markets: [{
                    marketId: "BR",
                    nationalCode: "BR001",
                    mahAddress: "Rua das Flores, 411",
                    mahName: `BR MAH`,
                    legalEntityName: `BR Legal Entity`
                }],
                strengths: []
            });
            const updateProductResponse = await client.updateProduct(productUpdate.productCode, productUpdate);
            expect(updateProductResponse.status).toEqual(200);

            const getProductResponse = await client.getProduct(productUpdate.productCode);
            expect(getProductResponse.data).toMatchObject(productUpdate);
            expect(getProductResponse.data.version).toBeGreaterThan(version);
            await AuditLogChecker.assertAuditLog(constants.OPERATIONS.UPDATE_PRODUCT, product, productUpdate);
        });

        it("SUCCESS 200 - Should recall and unrecall a product properly (TRUST-352)", async () => {
            const {data} = await client.getProduct(product.productCode);
            expect(data.productRecall).toBeFalsy();

            await client.updateProduct(product.productCode, new Product({...data, productRecall: true}));
            await AuditLogChecker.assertAuditLog(constants.OPERATIONS.UPDATE_PRODUCT, {...data, productRecall: false}, {...data, productRecall: true});

            const getAfterUpdateTrueRes = await client.getProduct(product.productCode);
            expect(getAfterUpdateTrueRes.data.productCode).toEqual(product.productCode);
            expect(getAfterUpdateTrueRes.data.productRecall).toBeTruthy();

            await client.updateProduct(product.productCode, new Product({...data, productRecall: false}));
            const getAfterUpdateFalseRes = await client.getProduct(product.productCode);
            expect(getAfterUpdateFalseRes.data.productCode).toEqual(product.productCode);
            expect(getAfterUpdateFalseRes.data.productRecall).toBeFalsy();
            await AuditLogChecker.assertAuditLog(constants.OPERATIONS.UPDATE_PRODUCT, {...data, productRecall: true}, {...data, productRecall: false});
        });

        it("SUCCESS 200 - Should update market segment properly (TRUST-104, TRUST-105, TRUST-106, TRUST-375)", async () => {
            const productCode = product.productCode;
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const {data} = await client.getProduct(productCode);
            const updatedProduct = new Product({
                ...data,
                markets: [
                    {
                        marketId: "IN",
                        nationalCode: "NC001",
                        mahAddress: "001A Baker Street",
                        mahName: `${ticket} MAH`,
                        legalEntityName: `${ticket} Legal Entity`
                    },
                    {
                        marketId: "FR",
                        nationalCode: "FR002",
                        mahAddress: "2nd Croissant Corner, 805",
                        mahName: `${ticket} MAH`,
                        legalEntityName: `${ticket} Legal Entity`
                    }
                ]
            });

            expect(Array.isArray(data.markets)).toBeTruthy();
            expect(data.markets.length).toEqual(1);
            expect(data.markets).not.toMatchObject(updatedProduct.markets);

            await client.updateProduct(productCode, updatedProduct);
            const response = await client.getProduct(productCode);
            expect(response.data).toEqual(expect.objectContaining(updatedProduct));
            expect(response.data.markets).toMatchObject(updatedProduct.markets);
            await AuditLogChecker.assertAuditLog(constants.OPERATIONS.UPDATE_PRODUCT, data, updatedProduct);

            const noMarketUpdate = new Product({
                ...response.data,
                markets: []
            });
            await client.updateProduct(productCode, noMarketUpdate);
            const noMarketsUpdateResponse = await client.getProduct(productCode);
            expect(noMarketsUpdateResponse.data).toEqual(expect.objectContaining(noMarketUpdate));
            expect(noMarketsUpdateResponse.data.markets).toEqual([]);
            await AuditLogChecker.assertAuditLog(constants.OPERATIONS.UPDATE_PRODUCT, updatedProduct, noMarketUpdate);
        });

        it("FAIL 422 - Should throw if GTIN in parameter and body mismatch on update (TRUST-181)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const diffProductPayload = await ModelFactory.product(ticket);
            await AuditLogChecker.storeAuditLogSnapshot();

            try {
                await client.updateProduct(product.productCode, diffProductPayload);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
            await AuditLogChecker.assertAuditLogSnapshot();
        });

        it("FAIL 422 - Should not update productCode field", async () => {
            const originalProductCode = product.productCode;
            const fakeProduct = await ModelFactory.product("Fake");
            const fakeProductCode = fakeProduct.productCode;
            await AuditLogChecker.storeAuditLogSnapshot();

            try {
                await client.updateProduct(originalProductCode, {
                    ...product,
                    productCode: fakeProductCode
                });
                throw new Error(`Request should have failed`);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
            await AuditLogChecker.assertAuditLogSnapshot();

            const updatedProduct = await client.getProduct(originalProductCode);
            expect(updatedProduct.data.productCode).toEqual(originalProductCode);

            try {
                await client.getProduct(fakeProductCode);
                throw new Error(`Request should have failed with 404 status code`);
            } catch (e) {
                expect(e.response.status).toBe(404);
            }
            await AuditLogChecker.assertAuditLogSnapshot();
        });

        it("SUCCESS 200 - Should maintain data consistency when making sequential updates (TRUST-375)", async () => {
            const {data} = await client.getProduct(product.productCode);
            const timeBetweenRequests = [100, 100, 100];
            const expectedUpdates = timeBetweenRequests.map((delay, index) => {
                return new Product({
                    ...data,
                    internalMaterialCode: getRandomNumber().toString(),
                    productRecall: (index + 1) % 2 === 0,
                    markets: (index + 1) % 2 === 0 ? [] : [{
                        marketId: "IN",
                        nationalCode: `IN00${index}`,
                        mahAddress: `10${index}, Bakon Avenue`,
                        mahName: `IndianMAH`,
                        legalEntityName: `Indian Legal Entity`
                    }]
                })
            });

            const requests = expectedUpdates.map((update, index) => {
                return new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        try {
                            await client.updateProduct(update.productCode, update);
                        } catch (e) {
                            return reject(e);
                        }
                        const {data} = await client.getProduct(update.productCode); // Fetch the updated product
                        resolve(data);
                    }, timeBetweenRequests[index]);
                })
            });

            const responses = await Promise.allSettled(requests);
            const successReq = responses.filter(({status}) => status === "fulfilled");
            expect(successReq.length).toEqual(1);
            for (const [index, response] of responses.entries()) {
                if (response.status === "fulfilled") {
                    expect(response.value).toEqual(expect.objectContaining(expectedUpdates[index]));
                    await AuditLogChecker.assertAuditLog(constants.OPERATIONS.UPDATE_PRODUCT, data, expectedUpdates[index]);
                }
            }
        });

    });

    describe(`${listProductsUrl} (GET)`, () => {

        it("SUCCESS 200 - List products", async () => {
            const response = await client.listProducts();
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);

            const max = 2;
            const maxResponse = await client.listProducts(max, "asc");
            expect(maxResponse.status).toEqual(200);
            expect(Array.isArray(maxResponse.data)).toBeTruthy();
            expect(maxResponse.data.length).toEqual(max);
            expect(maxResponse.data[1]["__timestamp"]).toBeGreaterThan(maxResponse.data[0]["__timestamp"]);
        });

        it("SUCCESS 200 - Should list products according to the sorted key", async () => {
            const ascOrderResponse = await client.listProducts(100, "asc");
            expect(ascOrderResponse.status).toEqual(200);
            expect(Array.isArray(ascOrderResponse.data)).toBeTruthy();
            expect(ascOrderResponse.data.length).toBeGreaterThan(0);
            for (let i = 0; i < ascOrderResponse.data.length - 1; i++) {
                expect(ascOrderResponse.data[i + 1]["__timestamp"]).toBeGreaterThan(ascOrderResponse.data[i]["__timestamp"]);
            }

            const descOrderResponse = await client.listProducts(100, "desc");
            expect(descOrderResponse.status).toEqual(200);
            expect(Array.isArray(descOrderResponse.data)).toBeTruthy();
            expect(descOrderResponse.data.length).toBeGreaterThan(0);
            for (let i = 0; i < descOrderResponse.data.length - 1; i++) {
                expect(descOrderResponse.data[i + 1]["__timestamp"]).toBeLessThan(descOrderResponse.data[i]["__timestamp"]);
            }
        });

    });

});