const {UtilsService} = require("../clients/utils");
const {ModelFactory} = require("../models/factory");
const {IntegrationClient} = require("../clients/Integration");
const {OAuth} = require("../clients/Oauth");
const {FixedUrls} = require("../clients/FixedUrls");
const {AuditLogChecker} = require("../audit/AuditLogChecker");
const {API_MESSAGE_TYPES} = require("../constants");
const {Leaflet} = require("../models/Leaflet");
const {convertLeafletFolderToObject} = require("../utils");
const path = require("path");
const {Reporter} = require("../reporting");


const isCI = !!process.env.CI; // works for travis, github and gitlab
const multiplier = isCI ? 3 : 1;
jest.setTimeout(multiplier * 60 * 1000);

const config = require("../conf").getConfig();

const SLEEP_INTERVAL = 0;
const SEQUENTIAL_REQUESTS = 100;
const MAX_TRIES = 2;

const testName = "TRUST-329"

const client = new IntegrationClient(config, testName);
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

    const Stats = {
        successes: [],
        failures: []
    }

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

            Stats.successes.push({
                timeTaken: timeTaken,
                batchNumber: batchNumber
            });
            resolve(res);
        });

    }

    async function addProduct(ticket){
        const product = await ModelFactory.product(ticket);
        await client.addProduct(product.productCode, product);
        return product;
    }

    async function addBatch(gtin, batchNumber, i){
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
        const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
        const product = await addProduct(ticket);
        productCode = product.productCode;
    })

    afterAll(() => {
        const totalEndTime = Date.now();
        console.log(`Total time to complete all ${TOTAL_REQUESTS} requests: ${(totalEndTime - startTime) / 1000} seconds`);
        reporter.outputMDTable("Results", "performance-results", Object.entries(Stats).reduce((accum, [key, val]) => {
            accum[key] = {
                timeTaken: val.timeTaken / 1000,
                accumTime: val.accumTime / 1000,
                errors: val.errors
            }
            return accum;
        }, {}), [
            `Performance Results for ${TOTAL_REQUESTS}`,
            `Divided into ${ProcessingIntervals.length} stages with ${INTERVAL_BEFORE_SLEEP} requests divided into ${INTERVAL_BEFORE_SLEEP/CONCURRENT_REQUESTS} bursts of ${CONCURRENT_REQUESTS} concurrent requests`
        ], [
            "Segment",
            "Time Taken (s)",
            "Accumulated Time",
            "Errors"
        ], [
            "timeTaken",
            "accumTime",
            "errors"
        ]);
    })

    for (let i = 0; i < SEQUENTIAL_REQUESTS; i++) {
        it(`Creates batch #${i + 1} in sequence with timeout between requests ${SLEEP_INTERVAL}`, async () => {
            return new Promise(async (resolve, reject) => {
                const batchNumber = Date.now().toString(36).replace(".", "").toUpperCase()

                function callback(err){
                    if (err)
                        return reject(err);
                    return resolve()
                }

                startTime = Date.now()
                let timeTaken;

                let err;
                try {
                    const batch = await addBatch(productCode, batchNumber, i);
                    timeTaken = Date.now() - startTime;
                    Stats.successes.push({
                        timeTaken: timeTaken,
                        batchNumber: batchNumber
                    });
                } catch (e) {
                    console.log(`Failed to create batch ${i + 1} - ${batchNumber}. Adding to failures`);
                    timeTaken = Date.now() - startTime;
                    Stats.errors.push({
                        timeTaken: timeTaken,
                        batchNumber: batchNumber,
                        error: e
                    });
                    err = e;
                }

                if (i === SEQUENTIAL_REQUESTS - 1 || !SLEEP_INTERVAL){
                    callback(err);
                } else {
                    setTimeout(() => {
                        callback(err)
                    }, SLEEP_INTERVAL * 1000)
                }
            })
        })
    }

    for (let i = 0; i < Stats.failures.length; i++) {
        it(`Retries batch #${i + 1} in sequence with timeout between requests ${SLEEP_INTERVAL}`, async () => {
            return new Promise(async (resolve, reject) => {
                const batchNumber = Date.now().toString(36).replace(".", "").toUpperCase()

                function callback(err) {
                    if (err)
                        return reject(err);
                    return resolve()
                }

                startTime = Date.now()

                let err;
                try {
                    const batch = await addBatch(productCode, batchNumber, i);
                } catch (e) {
                    console.log(`Failed to create batch ${i + 1} - ${batchNumber}. Retrying..`);
                    err = e;
                }

                if (i === SEQUENTIAL_REQUESTS - 1 || !SLEEP_INTERVAL) {
                    callback(err);
                } else {
                    setTimeout(() => {
                        callback(err)
                    }, SLEEP_INTERVAL * 1000)
                }
            })

        });
    }
})