const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {AUDIT_LOG_TYPES} = require("../constants");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const {FixedUrls} = require("../clients/FixedUrls");

jest.setTimeout(600000);

describe('TRUST-67', () => {

    let product
    let client;
    let oauth;
    let fixed;

    beforeAll(async () => {
        oauth = new OAuth(config);
        const token = await oauth.getAccessToken()
        oauth.setSharedToken(token);
        client = new IntegrationClient(config)
        fixed = new FixedUrls(config)
    })

    test(`STEP 1 - Log into appstream - Logging into SSO instead`, async () => {
        expect(oauth.getToken()).toBeDefined()
    })

    let creationResponse;

    test(`STEP 2 - create new product`, async () => {
        const {ticket} = UtilsService.getTicket(expect.getState().currentTestName)
        product = await ModelFactory.product(ticket)
        const res = await client.addProduct(product.productCode, product)
        expect(res.status).toBe(200)
        creationResponse = res;
    })

    test(`STEP 3 - verify response`, async () => {
        expect(creationResponse.status).toBe(200)
    })

    test(`STEP 4 - Retrieve new product`, async () => {
        const res = await client.getProduct(product.productCode);
        expect(res.status).toBe(200)
        // expect(res).toSatisfyApiSpec()
        const read = new Product(res.data);
        expect(read).toEqual(expect.objectContaining(product))
        product = read;
    })
    test(`STEP 5 - Retrieve audit log for product`, async () => {
       await fixed.waitForCompletion()
         const res = await client.filterAuditLogs(AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, "timestamp > 0", "desc");
       expect(res.status).toBe(200)
       const audit = res.data[0];
       expect(audit.itemCode).toEqual(product.productCode)
       expect(audit.username).toBeDefined();
       expect(audit.username.includes(config.senderId)).toBeTruthy();

       const {diffs} = audit.details[0]

        Object.entries(diffs).forEach(([key, value]) => {
            if (key === "epiProtocol")
                return true
            expect(value.oldValue).toEqual("");
            expect(value.newValue).toEqual(product[key]);
        })
    })
})