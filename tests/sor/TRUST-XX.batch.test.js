const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {Batch} = require("../models/Batch");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const {getYYMMDDDate, getRandomNumber} = require("../utils");
const {FixedUrls} = require("../clients/FixedUrls");

jest.setTimeout(1200000);

describe(`TRUST-002 Batch`, () => {
    let PRODUCT = new Product();

    // retrieve integration api client
    const client = new IntegrationClient(config);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);

    const batchUrl = "/batch";
    const listBatchesUrl = "/listBatches";
    const listBatchLangsUrl = "/listBatchLangs";

    beforeAll(async () => {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);

        const _product = await ModelFactory.product("TRUST-002");
        const res = await client.addProduct(_product.productCode, _product);
        expect(res.status).toBe(200);

        const {data} = await client.getProduct(_product.productCode);
        PRODUCT = data;
    });

    // beforeEach(async () => {
    //     await fixedUrl.waitForCompletion();
    // });

    describe(`${batchUrl} (POST)`, () => {
        it("SUCCESS 200 - Should create a batch properly", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode, {
                packagingSiteName: ticket,
                importLicenseNumber: getRandomNumber().toString(),
                manufacturerAddress1: "1313, Burrito Boulevard, Taco City - Mexico",
                manufacturerAddress2: "411, Bakon Street"
            });
            const res = await client.addBatch(batch.productCode, batch.batchNumber, batch);
            expect(res.status).toBe(200);

            const batchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(batchResponse.data).toEqual(expect.objectContaining(batch));
        });

        it("FAIL 422 - Should throw Unprocessable Entity when mandatory fields are empty", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);

            const mandatoryFields = ["productCode", "batchNumber", "expiryDate"];
            for (const field of mandatoryFields) {
                const invalidBatch = {...batch};
                invalidBatch[field] = undefined;

                try {
                    await client.addBatch(batch.productCode, batch.batchNumber, invalidBatch);
                    throw new Error(`Request should have failed with 422 status code when ${field} is empty`);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                }
            }
        });

        it("FAIL 422 - Should throw Unprocessable Entity when invalid property is provided", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            try {
                await client.addBatch(batch.productCode, batch.batchNumber, {
                    ...batch,
                    dummyProperty: "No matter value"
                });
                throw new Error("Request should have failed with 422 status code");
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
        });

    });

    describe(`${batchUrl} (GET)`, () => {
        let BATCH = new Batch();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            const res = await client.addBatch(batch.productCode, batch.batchNumber, batch);
            expect(res.status).toBe(200);

            const {data} = await client.getBatch(batch.productCode, batch.batchNumber);
            BATCH = data;
        });

        it("SUCCESS 200 - Should get a batch properly", async () => {
            const getProductResponse = await client.getBatch(BATCH.productCode, BATCH.batchNumber);
            expect(getProductResponse.data).toEqual(expect.objectContaining(BATCH));
            expect(Array.isArray(getProductResponse.data.snValid)).toBeTruthy();
            expect(getProductResponse.data.snValid.length).toEqual(0);
        });
    });

    describe(`${batchUrl} (PUT)`, () => {
        let BATCH = new Batch({productCode: PRODUCT.productCode});
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const _batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            const res = await client.addBatch(PRODUCT.productCode, _batch.batchNumber, _batch);
            expect(res.status).toBe(200);

            const {data} = await client.getBatch(_batch.productCode, _batch.batchNumber);
            BATCH = data;
        });

        it("SUCCESS 200 - Should update a batch properly", async () => {
            const batch = new Batch({
                ...BATCH,
                batchRecall: true,
                expiryDate: getYYMMDDDate("2y")
            });
            const updateBatchResponse = await client.updateBatch(batch.productCode, batch.batchNumber, batch);
            expect(updateBatchResponse.status).toEqual(200);

            const getBatchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getBatchResponse.data).toEqual(expect.objectContaining(batch));
        });

        it("SUCCESS 200 - Should maintain data consistency when making sequential updates", async () => {
            const requests = [100, 150, 200, 300].map((delay, index) => new Promise((resolve) => {
                setTimeout(async () => {
                    const updateBatch = new Batch({
                        ...BATCH,
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

        it("FAIL 422 - Immutable fields should remain unchanged", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const {productCode} = await ModelFactory.product(ticket);
            const immutableFields = ["productCode", "batchNumber", "nameMedicinalProduct", "inventedName"];

            for (let field of immutableFields) {
                const invalidBatch = {...BATCH};
                invalidBatch[field] = field === "productCode" ? productCode : getRandomNumber().toString();
                expect(invalidBatch[field]).toBeDefined();

                try {
                    await client.updateBatch(invalidBatch.productCode, invalidBatch.batchNumber, invalidBatch);
                    throw new Error(`Request should have failed with 422 status code`);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                }

                if (["productCode", "batchNumber"].includes(field))
                    await expect(client.getBatch(invalidBatch.productCode, invalidBatch.batchNumber)).rejects.toThrow();
            }
        });


        it("FAIL 200 - Immutable fields should remain unchanged", async () => {
            const immutableFields = ["productCode", "batchNumber", ""];

            for (let field of immutableFields) {

            }


            const fakeProduct = await ModelFactory.product("Fake");
            const fakeProductCode = fakeProduct.productCode;
            const fakeBatchNumber = getRandomNumber().toString();

            try {
                await client.updateBatch(BATCH.productCode, BATCH.batchNumber, {
                    ...BATCH,
                    productCode: fakeProductCode
                });
            } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
            }

            try {
                await client.updateBatch(BATCH.productCode, BATCH.batchNumber, {
                    ...BATCH,
                    batchNumber: fakeBatchNumber
                });
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }

            try {
                await expect(client.getBatch(BATCH.productCode, fakeBatchNumber)).rejects.toThrow();
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