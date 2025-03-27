const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {Batch} = require("../models/Batch");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const {getYYMMDDDate} = require("../utils");

jest.setTimeout(60000);

describe(`TRUST-001 Product`, () => {
    let product = new Product();
    let client = new IntegrationClient({});
    const batchUrl = "/product";
    const listBatchesUrl = "/listBatches";
    const listBatchLangsUrl = "/listBatchLangs";

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
    });

    describe(`${batchUrl} (POST)`, () => {
        it("SUCCESS 200 - Should create a batch properly", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, GTIN);
            const res = await client.addBatch(batch.productCode, batch.batchNumber, batch);
            expect(res.status).toBe(200);

            const batchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(batchResponse.data).toEqual(expect.objectContaining(batch));
        });

        it("FAIL 422 - Should throw Unprocessable Entity when mandatory fields are empty", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, product.productCode);

            const mandatoryFields = ['productCode', 'batchNumber', 'expiryDate'];
            for (const field of mandatoryFields) {
                const invalidBatch = {...batch};
                invalidBatch[field] = undefined;

                try {
                    await client.addBatch(batch.productCode, batch.batchNumber, batch);
                    throw new Error(`Request should have failed with 422 status code when ${field} is empty`);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                }
            }
        });

        it("FAIL 422 - Should throw Unprocessable Entity when additional property is provided", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, product.productCode);
            try {
                await client.addBatch(batch.productCode, batch.batchNumber, new Batch({
                    ...batch,
                    dummyProperty: "No matter value"
                }));
                throw new Error("Request should have failed with 422 status code");
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
        });

    });

    describe(`${batchUrl} (GET)`, () => {
        let batch = new Batch();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const _batch = await ModelFactory.batch(ticket, product.productCode);
            const res = await client.addBatch(_batch.productCode, _batch.batchNumber, _batch);
            expect(res.status).toBe(200);

            const batchResponse = await client.getBatch(_batch.productCode, _batch.batchNumber);
            expect(batchResponse.data).toEqual(expect.objectContaining(_batch));
            batch = batchResponse.data;
        });

        it("SUCCESS 200 - Should get a batch properly", async () => {
            const getProductResponse = await client.getBatch(batch.code, batch.batchNumber);
            expect(getProductResponse.data).toEqual(expect.objectContaining(batch));
            expect(getProductResponse.data.snValid.length).toEqual(0);
        });
    });

    describe(`${batchUrl} (PUT)`, () => {
        let batch = new Batch({productCode: product.productCode});
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const _batch = await ModelFactory.batch(ticket, product.productCode);
            const res = await client.addBatch(product.productCode, _batch.batchNumber, _batch);
            expect(res.status).toBe(200);

            const batchResponse = await client.getBatch(_batch.productCode, _batch.batchNumber);
            expect(batchResponse.data).toEqual(expect.objectContaining(_batch));
            batch = batchResponse.data;
        });

        it("SUCCESS 200 - Should update a batch properly", async () => {
            batch = new Batch({
                ...batch,
                expiryDate: getYYMMDDDate("2y")
            });
            const updateBatchResponse = await client.updateBatch(batch.productCode, batch.batchNumber, batch);
            expect(batch).toMatchObject(updateBatchResponse.data);

            const getBatchResponse = await client.getProduct(batch.productCode);
            expect(batch).toMatchObject(getBatchResponse.data);
        });

        it("SUCCESS 200 - Should maintain data consistency when making sequential updates", async () => {
            const requests = [100, 150, 200, 300].map((delay, index) => new Promise((resolve) => {
                setTimeout(async () => {
                    const updateBatch = new Batch({
                        ...batch,
                        manufacturerName: `Update_${index + 1}`,
                        batchRecall: (index + 1) % 2 === 0
                    });

                    const response = await client.updateBatch(updateBatch.productCode, updateBatch.batchNumber, updateBatch);
                    resolve(response);
                }, delay);
            }));
            await Promise.all(requests);
            // TODO add validation
        });

        it("FAIL 200 - Should not update productCode or batchNumber fields", async () => {
            const fakeProduct = await ModelFactory.product("Fake");
            const fakeProductCode = "18624862486278"; //fakeProduct.productCode;
            const fakeBatchNumber = Math.random().toString().replace(".", "");

            try {
                await client.updateBatch(batch.productCode, batch.batchNumber, {
                    ...batch,
                    productCode: fakeProductCode
                });
            } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
            }

            try {
                await client.updateBatch(batch.productCode, batch.batchNumber, {
                    ...batch,
                    batchNumber: fakeBatchNumber
                });
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }

            try {
                await expect(client.getBatch(batch.productCode, fakeBatchNumber)).rejects.toThrow();
            } catch (error) {
                expect(error.response.status).toBe(404);
            }
        });
    });

    describe(`${listBatchesUrl} (GET)`, () => {
        it("SUCCESS 200 - List batches", async () => {
            const response = await client.listBatches();
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);
            for (let i = 0; i < response.data.length - 1; i++) {
                expect(response.data[i].productCode).toBeDefined();
                expect(response.data[i].batchNumber).toBeDefined();
            }

            const max = 2;
            const maxResponse = await client.listBatches(max, "asc");
            expect(maxResponse.status).toEqual(200);
            expect(Array.isArray(maxResponse.data)).toBeTruthy();
            expect(maxResponse.data.length).toEqual(max);
            expect(maxResponse.data[1]["__timestamp"]).toBeGreaterThan(maxResponse.data[0]["__timestamp"]);
        });

        it("SUCCESS 200 - Should list batches according to the sorted key", async () => {
            const ascOrderResponse = await client.listBatches(100, "asc");
            expect(ascOrderResponse.status).toEqual(200);
            expect(Array.isArray(ascOrderResponse.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);
            for (let i = 0; i < ascOrderResponse.data.length - 1; i++) {
                expect(ascOrderResponse.data[i].productCode).toBeDefined();
                expect(ascOrderResponse.data[i].batchNumber).toBeDefined();
                expect(ascOrderResponse.data[i + 1]["__timestamp"]).toBeGreaterThan(ascOrderResponse.data[i]["__timestamp"]);
            }

            const descOrderResponse = await client.listBatches(100, "desc");
            expect(descOrderResponse.status).toEqual(200);
            expect(Array.isArray(descOrderResponse.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);
            for (let i = 0; i < descOrderResponse.data.length - 1; i++) {
                expect(ascOrderResponse.data[i].productCode).toBeDefined();
                expect(ascOrderResponse.data[i].batchNumber).toBeDefined();
                expect(descOrderResponse.data[i + 1]["__timestamp"]).toBeLessThan(descOrderResponse.data[i]["__timestamp"]);
            }
        });
    });

    describe(`${listBatchLangsUrl} (GET)`, () => {
        let batch = new Batch();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const _batch = await ModelFactory.batch(ticket, product.productCode);
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