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
const {constants} = require("../constants");
const {AuditLogChecker} = require("../audit/AuditLogChecker");

const isCI = !!process.env.CI; // works for travis, github and gitlab
const multiplier = isCI? 4 : 1;
jest.setTimeout(multiplier * 60 * 1000);
const timeoutBetweenTests = multiplier * 5 * 1000;

const testName = "TRUST-419";

describe(`${testName} Batch`, () => {
    let PRODUCT = new Product();

    // retrieve integration api client
    const client = new IntegrationClient(config, testName);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);

    const batchUrl = "/batch";
    const listBatchesUrl = "/listBatches";

    beforeAll(async () => {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);
        AuditLogChecker.setApiClient(client);

        const _product = await ModelFactory.product(testName);
        const res = await client.addProduct(_product.productCode, _product);
        expect(res.status).toBe(200);

        const {data} = await client.getProduct(_product.productCode);
        PRODUCT = data;
    });

    afterEach((cb) => {
        console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${timeoutBetweenTests / 1000}s...`);
        setTimeout(() => {
            cb()
        }, timeoutBetweenTests)
    });

    describe(`${batchUrl} (POST)`, () => {
        it("SUCCESS 200 - Should create a batch properly (TRUST-109, TRUST-378)", async () => {
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
            expect(batchResponse.data.version).toEqual(1);

            await AuditLogChecker.assertAuditLog(batch.productCode,batch.batchNumber, "POST", constants.OPERATIONS.CREATE_BATCH, undefined, batch);
        });

        it("FAIL 422 - Should throw Unprocessable Entity when mandatory fields are empty (TRUST-110)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);

            const mandatoryFields = ["productCode", "batchNumber", "expiryDate"];
            await AuditLogChecker.storeAuditLogSnapshot();
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
                    await AuditLogChecker.assertAuditLogSnapshot();
                }
            }
        });

        it("FAIL 422 - Should throw Unprocessable Entity when invalid property is provided (TRUST-410)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            await AuditLogChecker.storeAuditLogSnapshot();

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
                await AuditLogChecker.assertAuditLogSnapshot();
            }
        });

        it("FAIL 404 - Should throw when create a batch for a non existing product (TRUST-178)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const productCode = "99999999999997";
            const batch = await ModelFactory.batch(ticket, productCode);
            await AuditLogChecker.storeAuditLogSnapshot();

            try {
                await client.addBatch(productCode, batch.batchNumber, batch);
                throw new Error(`Request should have failed`);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(404);
                await AuditLogChecker.assertAuditLogSnapshot();
            }
        });

        it("FAIL 422 - Should throw when save a batch with html tags", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            await AuditLogChecker.storeAuditLogSnapshot();

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
                await AuditLogChecker.assertAuditLogSnapshot();
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
                await AuditLogChecker.assertAuditLogSnapshot();
            }
        });

        it("FAIL 422 - Should throw if batchNumber in parameter and body mismatch on create (TRUST-170)", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            await AuditLogChecker.storeAuditLogSnapshot();

            try {
                await client.addBatch(PRODUCT.productCode, getRandomNumber().toString(), batch);
                throw new Error(`Request should have failed`);
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
                await AuditLogChecker.assertAuditLogSnapshot();
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

        it("SUCCESS 200 - Should update a batch properly (TRUST-112)", async () => {
            const batch = new Batch({
                ...BATCH,
                batchRecall: false,
                packagingSiteName: "www.product.com",
                expiryDate: getYYMMDDDate("2y")
            });
            const updateBatchResponse = await client.updateBatch(batch.productCode, batch.batchNumber, batch);
            expect(updateBatchResponse.status).toEqual(200);

            const getBatchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getBatchResponse.data).toEqual(expect.objectContaining(batch));
            expect(getBatchResponse.data.version).toBeGreaterThan(1);
            await AuditLogChecker.assertAuditLog(batch.productCode, batch.batchNumber, "PUT", constants.OPERATIONS.UPDATE_BATCH, {...BATCH}, batch);
        });

        it("SUCCESS 200 - Should update a batch according to India data specification (TRUST-376)", async () => {
            const batch = new Batch({
                ...BATCH,
                batchRecall: false,
                packagingSiteName: "www.product.com",
                expiryDate: getYYMMDDDate("2y"),
                importLicenseNumber: getRandomNumber().toString(36),
                dateOfManufacturing: getYYMMDDDate("1y"),
                manufacturerName: "India MAH SA",
                manufacturerAddress1: "SOMEADD1",
                manufacturerAddress2: "SOMEADD2",
                manufacturerAddress3: "SOMEADD3",
                manufacturerAddress4: "SOMEADD4",
                manufacturerAddress5: "SOMEADD5"
            });
            const updateBatchResponse = await client.updateBatch(batch.productCode, batch.batchNumber, batch);
            expect(updateBatchResponse.status).toEqual(200);

            const getBatchResponse = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getBatchResponse.data).toEqual(expect.objectContaining(batch));
            await AuditLogChecker.assertAuditLog(batch.productCode, batch.batchNumber, "PUT",constants.OPERATIONS.UPDATE_BATCH, {...BATCH}, getBatchResponse.data);
        });

        it("SUCCESS 200 - Should recall and unrecall a batch properly (TRUST-352)", async () => {
            const currentBatchRes = await client.getBatch(BATCH.productCode, BATCH.batchNumber);
            expect(currentBatchRes.data.batchRecall).toBeFalsy();
            const batch = new Batch({...currentBatchRes.data, batchRecall: true});

            await client.updateBatch(batch.productCode, batch.batchNumber, batch);
            try {
                await AuditLogChecker.assertAuditLog(batch.productCode, batch.batchNumber, "PUT", constants.OPERATIONS.UPDATE_BATCH, {
                    ...batch,
                    batchRecall: false
                }, {...batch, batchRecall: true});
            } catch (e) {
                throw e;
            }

            const getAfterUpdateTrueRes = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getAfterUpdateTrueRes.data.productCode).toEqual(batch.productCode);
            expect(getAfterUpdateTrueRes.data.batchNumber).toEqual(batch.batchNumber);
            expect(getAfterUpdateTrueRes.data.batchRecall).toBeTruthy();

            await client.updateBatch(batch.productCode, batch.batchNumber, {...batch, batchRecall: false});
            try {
                await AuditLogChecker.assertAuditLog(batch.productCode, batch.batchNumber, "PUT", constants.OPERATIONS.UPDATE_BATCH, {
                    ...batch,
                    batchRecall: true
                }, {...batch, batchRecall: false});
            } catch (e) {
                throw e;
            }

            const getAfterUpdateFalseRes = await client.getBatch(batch.productCode, batch.batchNumber);
            expect(getAfterUpdateFalseRes.data.productCode).toEqual(batch.productCode);
            expect(getAfterUpdateFalseRes.data.batchNumber).toEqual(batch.batchNumber);
            expect(getAfterUpdateFalseRes.data.batchRecall).toBeFalsy();
        });

        it("SUCCESS 200 - Should maintain data consistency when making sequential updates (TRUST-375)", async () => {
            const {data} = await client.getBatch(BATCH.productCode, BATCH.batchNumber);

            const timeBetweenRequests = [100, 100, 100];
            const expectedUpdates = timeBetweenRequests.map((delay, index) => {
                return new Batch({
                    ...data,
                    manufacturerName: `Update_${index + 1}`,
                    batchRecall: (index + 1) % 2 === 0
                });
            });

            const requests = expectedUpdates.map((updateBatch, index) => {
                return new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        try {
                            await client.updateBatch(updateBatch.productCode, updateBatch.batchNumber, updateBatch);
                        } catch (e) {
                            return reject(e);
                        }
                        const response = await client.getBatch(updateBatch.productCode, updateBatch.batchNumber); // Fetch the updated batch
                        resolve(response.data);
                    }, timeBetweenRequests[index]);
                })
            });

            const responses = await Promise.allSettled(requests);
            const successReq = responses.filter(({status}) => status === "fulfilled");
            expect(successReq.length).toEqual(1);
            responses.forEach((response, index) => {
                if (response.status === "fulfilled") {
                    expect(response.value).toEqual(expect.objectContaining(expectedUpdates[index]));
                }
            });
        });

        it("FAIL 422 - Immutable fields should remain unchanged", async () => {
            const productCode = "89999999999990";
            const immutableFields = ["productCode", "batchNumber", "nameMedicinalProduct", "inventedName"];
            await AuditLogChecker.storeAuditLogSnapshot();

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

                await AuditLogChecker.assertAuditLogSnapshot();
            }
        });

        it("FAIL 422 - Should throw Unprocessable Entity for invalid values (TRUST-116)", async () => {
            const invalidValues = ["YYMMdd", "20250229", "000000", "20250431", "ABCDEF", "20250101", "2501100"];
            await AuditLogChecker.storeAuditLogSnapshot();
            for (let expiryDate of invalidValues) {
                const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
                const batch = await ModelFactory.batch(ticket, PRODUCT.productCode, {
                    expiryDate: expiryDate
                    // packagingSiteName: "<script>console.log('test')</script>"
                });

                try {
                    await client.updateBatch(batch.productCode, batch.batchNumber, batch);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                    await AuditLogChecker.assertAuditLogSnapshot();
                    continue;
                }
                throw new Error(`Request should have failed for value ${expiryDate}`);
            }
        });

        it("FAIL 400 - Should throw Unprocessable Entity when mandatory fields are empty", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const batch = await ModelFactory.batch(ticket, PRODUCT.productCode);
            const mandatoryFields = ["productCode", "batchNumber", "expiryDate"];
            await AuditLogChecker.storeAuditLogSnapshot();

            for (const field of mandatoryFields) {
                const invalidBatch = {...batch};
                invalidBatch[field] = undefined;

                try {
                    await client.addBatch(invalidBatch.productCode, batch.batchNumber, invalidBatch);
                    throw new Error(`Request should have failed when ${field} is empty`);
                } catch (e) {
                    const response = e?.response || {};
                    if (["productCode"].includes(field)) {
                        expect(response.status).toEqual(400);
                        expect(response.statusText).toEqual("Bad Request");
                        continue;
                    }
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                }
                await AuditLogChecker.assertAuditLogSnapshot();
            }
        });

        it("FAIL 422 - Should throw if batchNumber in parameter and body mismatch on update (TRUST-170)", async () => {
            await AuditLogChecker.storeAuditLogSnapshot();
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
            await AuditLogChecker.assertAuditLogSnapshot();
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