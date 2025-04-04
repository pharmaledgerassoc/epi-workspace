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
const multiplier = parseInt(process.env["TIMEOUT_MULTIPLIER"] || "0") || (isCI ? 3 : 1);
jest.setTimeout(multiplier * 60 * 10 * 1000);

const config = require("../conf").getConfig();

const SLEEP_INTERVAL = parseInt(process.env["SLEEP_INTERVAL"] || "0") || 60
const REQUESTS_BEFORE_SLEEP = parseInt(process.env["REQUESTS_BEFORE_SLEEP"] || "0") || 100;
const TOTAL_REQUESTS = parseInt(process.env["TOTAL_REQUESTS"] || "0") || 1000;
const CONCURRENT_REQUESTS = parseInt(process.env["CONCURRENT_REQUESTS"] || "0") || 10;
const PATH_TO_LEAFLET_FOLDER = "tests/resources/performance"
const MAX_TRIES = parseInt(process.env["MAX_TRIES"] || "0") || 3;

const PRODUCTS = {
    PRODUCT_A: "productA",
    PRODUCT_B: "productB",
    PRODUCT_C: "productC",
}

const chosenLeaflet = PRODUCTS.PRODUCT_C;

const testName = "TRUST-356"

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

describe(`${testName} - Performance tests`, () => {

    const ProcessingIntervals = new Array(TOTAL_REQUESTS/REQUESTS_BEFORE_SLEEP).fill(0).map((_, i) => (i + 1) * REQUESTS_BEFORE_SLEEP);

    const reporter = new Reporter(testName);

    const Stats = ProcessingIntervals.reduce((acc, interval) => {
        acc[interval] = {
            timeTaken: 0,
            accumTime: 0,
            errors: 0
        }
        return acc;
    }, {})


    async function iterator(func, count = 0){
        return new Promise(async (resolve, reject) => {
            let res;
            try {
                res = await func();
            } catch (e) {
                if (e.status === 401) {
                    console.log("Failed due to token expiration. Retrying..");
                    await refreshAuth();
                    return resolve(await iterator(func, count));
                } else if(count < MAX_TRIES){
                    console.log(`Failed due to error. Retrying attempt ${count+1} of ${MAX_TRIES} in ${SLEEP_INTERVAL/10}s...`);
                    return setTimeout(async () => {
                        resolve(await iterator(func, count + 1));
                    }, SLEEP_INTERVAL * 100)
                }
                return reject(e);
            }
            resolve(res);
        });

    }

    async function addProduct(ticket){
        const product = await ModelFactory.product(ticket);
        await iterator(async () => await client.addProduct(product.productCode, product));
        return product;
    }

    async function addBatch(gtin){
        const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
        const batch = await ModelFactory.batch(ticket, gtin);
        await iterator(async () => await client.addBatch(gtin, batch.batchNumber, batch));
        return batch;
    }

    async function addLeaflet(gtin, lang){
        let payload = convertLeafletFolderToObject(path.join(process.cwd(), PATH_TO_LEAFLET_FOLDER, chosenLeaflet));
        let leaflet = new Leaflet({
            productCode: gtin,
            language: lang,
            xmlFileContent: payload.payload.xmlFileContent,
            otherFilesContent: payload.payload.otherFilesContent
        });

        await iterator(async () => await client.addLeaflet(gtin, undefined, lang, API_MESSAGE_TYPES.EPI.LEAFLET, undefined, leaflet));
        return leaflet;
    }

    const startTime = Date.now(); // Start time tracking
    let timePerHundredRequests = startTime;

    beforeAll(async () => {
        await refreshAuth()
    })

    afterAll(async () => {
        const totalEndTime = Date.now();
        console.log(`Total time to complete all ${TOTAL_REQUESTS} requests: ${(totalEndTime - startTime) / 1000} seconds`);
        await reporter.outputMDTable("Results", "performance-results", Object.entries(Stats).reduce((accum, [key, val]) => {
            accum[key] = {
                timeTaken: val.timeTaken / 1000,
                accumTime: val.accumTime / 1000,
                errors: val.errors
            }
            return accum;
        }, {}), [
            `Performance Results for ${TOTAL_REQUESTS}`,
            `Divided into ${ProcessingIntervals.length} stages with ${REQUESTS_BEFORE_SLEEP} requests divided into ${REQUESTS_BEFORE_SLEEP/CONCURRENT_REQUESTS} bursts of ${CONCURRENT_REQUESTS} concurrent requests`
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

    for(let i = 0; i < ProcessingIntervals.length; i++) {
        const stage = ProcessingIntervals[i];

        describe(`STEP ${i + 1} - Processing stage ${i + 1} with ${stage - i * REQUESTS_BEFORE_SLEEP} records`, () => {

            for(let e = 0; e < (stage - i * REQUESTS_BEFORE_SLEEP)/CONCURRENT_REQUESTS; e++) {
                it(`Processing batch ${e + 1} with ${CONCURRENT_REQUESTS} concurrent requests`, async () => {
                    return new Promise(async (resolve, reject) => {
                        const vals = new Array(CONCURRENT_REQUESTS).fill(0).map((e, i) => i + 1);

                        const process = await Promise.allSettled(vals.map(async (val) => {
                            let product;
                            try {
                                const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
                                product = await addProduct(ticket)
                                let leaflet = await addLeaflet(product.productCode, "en");
                                let leaflet2 = await addLeaflet(product.productCode, "fr");
                                const batch = await addBatch(product.productCode);
                                console.log(`Processed request ${val} of batch ${e + 1} of stage ${i + 1}: gtin ${product.productCode}, batch ${batch.batchNumber}`);
                            } catch (e){
                                Stats[stage].errors++;
                                console.error(`Error processing request ${val} of batch ${e + 1} of stage ${i + 1}`);
                            }
                        }))

                        const endTime = Date.now();
                        const timeTaken = (endTime - timePerHundredRequests) / 1000;
                        console.log(`Completed ${stage} requests in ${timeTaken} seconds with ${Stats[stage].errors} errors`);
                        Stats[stage].timeTaken = timeTaken;
                        Stats[stage].accumTime = Stats[stage].accumTime + Stats[stage].timeTaken;
                        console.log(`Finished test: ${expect.getState().currentTestName}. waiting for ${SLEEP_INTERVAL}s...`);

                        function callback(err){
                            timePerHundredRequests = Date.now();
                            if (err)
                                return reject(err);
                            return resolve()
                        }

                        const errs = process.map((p,i) => ({p: p, i: i}))
                            .filter((p) => p.p.status !== "fulfilled").map(p => p.i);

                        const error = errs.length ? new Error(`Requests ${errs.join(", ")} have failed`) : undefined;

                        if (e === (stage - i * REQUESTS_BEFORE_SLEEP)/CONCURRENT_REQUESTS - 1 && i === ProcessingIntervals.length - 1){
                            callback(error);
                        } else {
                            setTimeout(() => {
                                callback(error)
                            }, SLEEP_INTERVAL * 1000)
                        }
                    })
                })

            }
        })
    }
})