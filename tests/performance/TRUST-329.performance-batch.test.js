const {UtilsService} = require("../clients/utils");
const {ModelFactory} = require("../models/factory");
const {IntegrationClient} = require("../clients/Integration");
const {OAuth} = require("../clients/Oauth");
const {FixedUrls} = require("../clients/FixedUrls");
const {AuditLogChecker} = require("../audit/AuditLogChecker");
const {Reporter} = require("../reporting");


const isCI = !!process.env.CI; // works for travis, github and gitlab
const multiplier = parseInt(process.env["TIMEOUT_MULTIPLIER"] || "0") || (isCI ? 3 : 1);
jest.setTimeout(multiplier * 60 * 1000);

const config = require("../conf").getConfig();

const SLEEP_INTERVAL = parseInt(process.env["SLEEP_INTERVAL"] || "0") || 0;
const SEQUENTIAL_REQUESTS = parseInt(process.env["SEQUENTIAL_REQUESTS"] || "0") || 100;

const testName = "TRUST-329"

const client = new IntegrationClient(config, testName);
const reporter = new Reporter(testName)
const oauth = new OAuth(config);
const fixedUrl = new FixedUrls(config);

async function refreshAuth(){
    try {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);
        AuditLogChecker.setApiClient(client);
    } catch (e) {
        console.error("Failed to refresh auth token. Retrying..");
        throw e
    }
}

describe(`${testName} - Performance tests for batches`, () => {

    const reporter = new Reporter(testName);

    let productCode, elapsed;

    const Stats = []
    const Stats2 = []

    async function iterator(func, batchNumber){
        return new Promise(async (resolve, reject) => {

            let res;
            try {
                res = await func();
            } catch (e) {
                if (e.status === 401) {
                    console.log("Failed due to token expiration. Retrying..");
                    await refreshAuth();
                    return resolve(await iterator(func, batchNumber));
                }
                return reject(e);
            }

            resolve(res);
        });

    }

    async function addProduct(ticket){
        const product = await ModelFactory.product(ticket);
        await client.addProduct(product.productCode, product);
        return product;
    }

    async function addBatch(gtin, batchNumber){
        const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
        const batch = await ModelFactory.batch(ticket, gtin, {
            batchNumber: batchNumber
        });
        await iterator(async () => await client.addBatch(gtin, batch.batchNumber, batch), batch.batchNumber);
        return batch;
    }

    let startTime;

    beforeAll(async () => {
        await refreshAuth()
        const product = await addProduct(testName);
        productCode = product.productCode;
    })

    describe("First Pass - Creation of batches in sequence", () => {

        afterAll(async () => {
            await reporter.outputMDTable("Results", "performance-results", Stats.map((el, i) => {
                return {
                    index: i + 1,
                    batchNumber: el.batchNumber,
                    timeTaken: el.timeTaken / 1000,
                    errors: el.errors
                }

            }), [
                `Performance Results for ${SEQUENTIAL_REQUESTS} batch creation`,
                `For product ${productCode} with no leaflets`
            ], [
                "index",
                "Batch Number",
                "Time Taken (s)",
                "Errors"
            ], [
                "batchNumber",
                "timeTaken",
                "errors"
            ]);
        })

        for (let i = 0; i < SEQUENTIAL_REQUESTS; i++) {
            it(`Creates batch #${i + 1} in sequence with timeout between requests ${SLEEP_INTERVAL}`, async () => {
                console.log(`STATUS: ${i}/${SEQUENTIAL_REQUESTS}`);
                const batchNumber = Date.now().toString(36).replace(".", "").toUpperCase()

                startTime = Date.now()
                let timeTaken;

                let err;
                try {
                    const batch = await addBatch(productCode, batchNumber);
                    timeTaken = Date.now() - startTime;
                    Stats.push({
                        timeTaken: timeTaken,
                        batchNumber: batchNumber
                    });
                } catch (e) {
                    console.log(`Failed to create batch ${i + 1} - ${batchNumber}. Adding to failures`);
                    timeTaken = Date.now() - startTime;
                    Stats.push({
                        timeTaken: timeTaken,
                        batchNumber: batchNumber,
                        error: e
                    });
                    err = e;
                }


                if (i === SEQUENTIAL_REQUESTS - 1 || !SLEEP_INTERVAL) {
                    if (err) throw err;
                } else {
                    await new Promise(resolve => setTimeout(resolve, SLEEP_INTERVAL * 1000));
                    if (err) throw err;
                }
            })
        }
    })

    describe("Second pass. Retries failures and retrieves object status for repeat failures", () => {

        afterAll(async() => {
            if (Stats2.length)
                await reporter.outputMDTable("Retry", "performance-results", Stats2.reduce((accum, [key, val]) => {
                    accum[key] = {
                        batchNumber: val.batchNumber,
                        timeTaken: val.timeTaken / 1000,
                        errors: val.errors
                    }
                    return accum;
                }, {}), [
                    `Performance Results for ${SEQUENTIAL_REQUESTS} batch creation - Retry failures`,
                    `For product ${productCode} with no leaflets`
                ], [
                    "index",
                    "Batch Number",
                    "Time Taken (s)",
                    "Errors"
                ], [
                    "batchNumber",
                    "timeTaken",
                    "errors"
                ]);
        })

        const filteredStats = Stats.filter(el =>!!el.error);

        for (let i = 0; i < filteredStats.length; i++) {
            it(`Retries batch #${filteredStats[i].batchNumber} in sequence with timeout between requests ${SLEEP_INTERVAL}`, async () => {
                console.log(`STATUS: ${i}/${filteredStats.length}`);
                startTime = Date.now()
                let timeTaken;

                let err;
                try {
                    const batch = await addBatch(productCode, filteredStats[i].batchNumber);
                    timeTaken = Date.now() - startTime;
                    Stats2.push({
                        timeTaken: timeTaken,
                        batchNumber: filteredStats[i].batchNumber
                    });
                } catch (e) {
                    console.log(`Failed to create batch ${filteredStats[i].batchNumber} for the second time`);
                    timeTaken = Date.now() - startTime;
                    Stats2.push({
                        timeTaken: timeTaken,
                        batchNumber: filteredStats[i].batchNumber,
                        error: e
                    });
                    console.log(`Retrieving ObjectStatus for batch ${filteredStats[i].batchNumber}`);
                    try {
                        const status = await client.getObjectStatus(productCode, filteredStats[i].batchNumber);
                        await reporter.outputPayload("ObjectStatus", `object-status-${filteredStats[i].batchNumber}`, status, "json");
                    } catch (er) {
                        console.log(`Failed to get ObjectStatus for batch ${filteredStats[i].batchNumber}`);
                        err = e;
                    }
                }

                if (i === SEQUENTIAL_REQUESTS - 1 || !SLEEP_INTERVAL) {
                    if (err) throw err;
                } else {
                    await new Promise(resolve => setTimeout(resolve, SLEEP_INTERVAL * 1000));
                    if (err) throw err;            }
            });
        }
    })

    it("waits until fixedUrls is finished", async () => {
        startTime = Date.now()
        await fixedUrl.waitForCompletion();
        elapsed = Date.now() - startTime;
    })
})