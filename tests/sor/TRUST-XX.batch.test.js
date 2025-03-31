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

jest.setTimeout(60000);

const timeoutBetweenTests = 5000;


describe(`TRUST-002 Batch`, () => {
    let PRODUCT = new Product();

    // retrieve integration api client
    const client = new IntegrationClient(config);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);

    const batchUrl = "/batch";
    const listBatchesUrl = "/listBatches";

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

    afterEach((cb) => {
        console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests/1000}s...`);
        setTimeout(() => {
            cb()
        }, timeoutBetweenTests)
    });

    describe(`${batchUrl} (POST)`, () => {
        it("SUCCESS 200 - Should create a batch properly", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode, {
                packagingSiteName: ticket,
                manufacturerAddress1: "1313, Burrito Boulevard, Tao City - Mexico",
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
                throw new Error("Request should have failed");
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
        });

        it("FAIL 422 - Should throw when create a batch for a non existing product", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const {productCode} = await ModelFactory.product(ticket);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);

            try {
                await client.addBatch(productCode, batch.batchNumber, batch);
                throw new Error(`Request should have failed`);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
        });

        it("FAIL 422 - Should throw when save a batch with html tags", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            try {
                await client.addBatch(batch.productCode, batch.batchNumber, new Batch({
                    ...batch,
                    packagingSiteName: "<script>Invalid</script>",
                }));
                throw new Error("Request should have failed with 422 status code");
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }

            try {
                await client.addBatch(batch.productCode, batch.batchNumber, new Batch({
                    ...batch,
                    packagingSiteName: "<html>Invalid</html>",
                }));
                throw new Error("Request should have failed with 422 status code");
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
        });

        it("FAIL 422 - Should throw if batchNumber in parameter and body mismatch on create", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);

            try {
                await client.addBatch(PRODUCT.productCode, getRandomNumber().toString(), batch);
                throw new Error(`Request should have failed`);
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
            expect(getProductResponse.data.batchRecall).toBeFalsy();
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
                batchRecall: false,
                expiryDate: getYYMMDDDate("2y")
            });
            const updateBatchResponse = await client.updateBatch(batch.productCode, batch.batchNumber, batch);
            expect(updateBatchResponse.status).toEqual(200);

            const getBatchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getBatchResponse.data).toEqual(expect.objectContaining(batch));
        });

        it("SUCCESS 200 - Should recall and unrecall a batch properly", async () => {
            const batch = new Batch({
                ...BATCH,
                expiryDate: getYYMMDDDate("2y")
            });

            const currentBatchRes = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(currentBatchRes.data.batchRecall).toBeFalsy();

            await client.updateBatch(batch.productCode, batch.batchNumber, {...batch, batchRecall: true});

            const getAfterUpdateTrueRes = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getAfterUpdateTrueRes.data.productCode).toEqual(batch.productCode);
            expect(getAfterUpdateTrueRes.data.batchNumber).toEqual(batch.batchNumber);
            expect(getAfterUpdateTrueRes.data.batchRecall).toBeTruthy();

            await client.updateBatch(batch.productCode, batch.batchNumber, {...batch, batchRecall: false});
            const getAfterUpdateFalseRes = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getAfterUpdateFalseRes.data.productCode).toEqual(batch.productCode);
            expect(getAfterUpdateFalseRes.data.batchNumber).toEqual(batch.batchNumber);
            expect(getAfterUpdateFalseRes.data.batchRecall).toBeFalsy();
        });

        it.skip("SUCCESS 200 - Should maintain data consistency when making sequential updates", async () => {
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

        it("FAIL 422 - Should throw Unprocessable Entity when mandatory fields are empty", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);

            const mandatoryFields = ["productCode", "batchNumber", "expiryDate"];

            for (const field of mandatoryFields) {
                const invalidBatch = {...batch};
                invalidBatch[field] = undefined;

                try {
                    await client.addBatch(invalidBatch.productCode, batch.batchNumber, invalidBatch);
                    throw new Error(`Request should have failed with 422 status code when ${field} is empty`);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                }
            }
        });

        it("FAIL 422 - Should throw if batchNumber in parameter and body mismatch on update", async () => {
            try {
                await client.updateBatch(PRODUCT.productCode, BATCH.batchNumber, {
                    ...BATCH,
                    batchNumber: getRandomNumber().toString()
                });
                throw new Error(`Request should have failed`);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
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
            expect(ascOrderResponse.data.length).toBeGreaterThan(0);
            for (let i = 0; i < ascOrderResponse.data.length - 1; i++) {
                expect(ascOrderResponse.data[i].productCode).toBeDefined();
                expect(ascOrderResponse.data[i].batchNumber).toBeDefined();
                expect(ascOrderResponse.data[i + 1]["__timestamp"]).toBeGreaterThan(ascOrderResponse.data[i]["__timestamp"]);
            }

            const descOrderResponse = await client.listBatches(100, "desc");
            expect(descOrderResponse.status).toEqual(200);
            expect(Array.isArray(descOrderResponse.data)).toBeTruthy();
            expect(descOrderResponse.data.length).toBeGreaterThan(0);
            for (let i = 0; i < descOrderResponse.data.length - 1; i++) {
                expect(ascOrderResponse.data[i].productCode).toBeDefined();
                expect(ascOrderResponse.data[i].batchNumber).toBeDefined();
                expect(descOrderResponse.data[i + 1]["__timestamp"]).toBeLessThan(descOrderResponse.data[i]["__timestamp"]);
            }
        });
    });

});