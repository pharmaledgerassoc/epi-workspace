const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const {FixedUrls} = require("../clients/FixedUrls");
const {getRandomNumber, ProductAndBatchAuditTest, getYYMMDDDate} = require("../utils");
const {constants} = require("../constants");
const {Batch} = require("../models/Batch");

jest.setTimeout(60000);

const timeoutBetweenTests = 5000;

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
    });

    afterEach((cb) => {
        console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
        setTimeout(() => {
            cb()
        }, timeoutBetweenTests)
    });

    describe(`${productUrl} (POST)`, () => {

        it("SUCCESS 200 - Should create a product properly (TRUST-67, TRUST-109, TRUST-375)", async () => {
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

            await ProductAndBatchAuditTest(client, constants.OPERATIONS.CREATE_PRODUCT, undefined, product);
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
        });

        it("FAIL 422 - Should throw if GTIN in parameter and body mismatch on create (TRUST-180)", async () => {
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
        });

        it("FAIL 422 - Should throw Unprocessable Entity when mandatory fields are empty (TRUST-69)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket);

            const mandatoryFields = ["productCode", "nameMedicinalProduct", "inventedName"];

            for (const field of mandatoryFields) {
                const invalidProduct = {...product};
                invalidProduct[field] = undefined; // getRandomNumber().toString();

                try {
                    await client.addProduct(invalidProduct.productCode, invalidProduct);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                    continue;
                }
                throw new Error(`Request should have failed with 422 status code when ${field} is empty`);
            }
        });

        it("FAIL 422 - Should throw Unprocessable Entity when invalid property is provided", async () => {
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
            product = new Product({
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
            const updateProductResponse = await client.updateProduct(product.productCode, product);
            expect(updateProductResponse.status).toEqual(200);

            const getProductResponse = await client.getProduct(product.productCode);
            expect(getProductResponse.data).toMatchObject(product);
            expect(getProductResponse.data.version).toBeGreaterThan(version);
        });

        it("SUCCESS 200 - Should recall and unrecall a product properly (TRUST-352)", async () => {
            const currentProductRes = await client.getProduct(product.productCode);
            expect(currentProductRes.data.productRecall).toBeFalsy();

            await client.updateProduct(product.productCode, {...product, productRecall: true});

            const getAfterUpdateTrueRes = await client.getProduct(product.productCode);
            expect(getAfterUpdateTrueRes.data.productCode).toEqual(product.productCode);
            expect(getAfterUpdateTrueRes.data.productRecall).toBeTruthy();

            await client.updateProduct(product.productCode, {...product, productRecall: false});
            const getAfterUpdateFalseRes = await client.getProduct(product.productCode);
            expect(getAfterUpdateFalseRes.data.productCode).toEqual(product.productCode);
            expect(getAfterUpdateFalseRes.data.productRecall).toBeFalsy();
        });

        it("SUCCESS 200 - Should update market segment properly (TRUST-104, TRUST-105, TRUST-106, TRUST-375)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const updatedProduct = new Product({
                ...product,
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

            const beforeUpdateResponse = await client.getProduct(product.productCode);
            expect(beforeUpdateResponse.data.markets).toMatchObject([
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
            ]);

            await client.updateProduct(updatedProduct.productCode, updatedProduct);
            const response = await client.getProduct(product.productCode);
            expect(response.data).toEqual(expect.objectContaining(updatedProduct));
            expect(response.data.markets).toMatchObject(updatedProduct.markets);

            updatedProduct.markets = [];
            await client.updateProduct(updatedProduct.productCode, updatedProduct);
            const noMarketsUpdateResponse = await client.getProduct(product.productCode);
            expect(noMarketsUpdateResponse.data).toEqual(expect.objectContaining(updatedProduct));
            expect(noMarketsUpdateResponse.data.markets).toEqual([]);
        });

        it("SUCCESS 200 - Should maintain data consistency when making sequential updates (TRUST-375)", async () => {
            const timeBetweenRequests = [1000, 2000, 3000];
            const expectedUpdates = timeBetweenRequests.map((delay, index) => {
                return new Product({
                    ...product,
                    internalMaterialCode: `${Math.random().toString().replace(",", "")}`,
                    markets: (index + 1) % 2 === 0 ? [] : [{
                        marketId: "IN",
                        nationalCode: `IN00${index}`,
                        mahAddress: `10${index}, Bakon Avenue`,
                        mahName: `IndianMAH`,
                        legalEntityName: `Indian Legal Entity`
                    }]
                })
            });

            const requests = expectedUpdates.map((update, index) =>
                new Promise((resolve) => {
                    setTimeout(async () => {
                        const updatedProduct = new Product({
                            ...product,
                            ...update
                        });

                        await client.updateProduct(updatedProduct.productCode, updatedProduct);
                        const response = await client.getProduct(product.productCode); // Fetch the updated product
                        resolve(response.data);
                    }, timeBetweenRequests[index]);
                })
            );

            const responses = await Promise.all(requests);
            responses.forEach((response, index) => {
                expect(response).toEqual(expect.objectContaining(expectedUpdates[index]));
            });
        });

        it("FAIL 422 - Should throw if GTIN in parameter and body mismatch on update (TRUST-181)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const diffProductPayload = await ModelFactory.product(ticket);

            try {
                await client.updateProduct(product.productCode, diffProductPayload);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
        });

        it("FAIL 422 - Should not update productCode field", async () => {
            const originalProductCode = product.productCode;
            const fakeProduct = await ModelFactory.product("Fake");
            const fakeProductCode = fakeProduct.productCode;

            try {
                await client.updateProduct(originalProductCode, {
                    ...product,
                    productCode: fakeProductCode
                });
                throw new Error(`Request should have failed with 422 status code`);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }

            const updatedProduct = await client.getProduct(originalProductCode);
            expect(updatedProduct.data.productCode).toEqual(originalProductCode);

            try {
                await client.getProduct(fakeProductCode);
                throw new Error(`Request should have failed with 404 status code`);
            } catch (e) {
                expect(e.response.status).toBe(404);
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