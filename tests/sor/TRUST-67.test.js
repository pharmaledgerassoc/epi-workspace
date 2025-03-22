const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {AUDIT_LOG_TYPES} = require("../constants");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");

describe('TRUST-67', () => {

    let product
    let client;

    test(`STEP 1 - Log into appstream - Logging into SSO instead`, async () => {
        const oauth = new OAuth(config);
        const token = await oauth.getAccessToken()
        oauth.setSharedToken(token);
        expect(token).toBeDefined()
        client = new IntegrationClient(config)
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
    })
    test(`STEP 5 - Retrieve audit log for product`, async () => {
       const res = await client.filterAuditLogs(AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, ["timestamp > 0"], "desc");
       expect(res.status).toBe(200)
       // expect(res).toSatisfyApiSpec()
    })
})