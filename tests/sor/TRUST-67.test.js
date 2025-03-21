const {getConfig} = require("../conf");
const config = getConfig();
const {SwaggerClient} = require("../swagger/swagger");
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {AUDIT_LOG_TYPES} = require("../constants");

describe('TRUST-67', () => {

    let product
    let client;

    beforeAll(() => {
        client = new SwaggerClient(config)
    })

    test.skip(`STEP 1 - Log into appstream`, async () => {
        console.log("Logging into appstream does not apply")
    })

    let creationResponse;

    test(`STEP 2create new product`, async () => {
        product = ModelFactory.product()
        const res = await client.addProduct(product.productCode, product)
        expect(res.status).toBe(200)
        creationResponse = res;
    })

    test(`STEP 3 - verify response`, async () => {
        expect(creationResponse).toSatisfyApiSpec()
    })

    test(`STEP 4 - Retrieve new product`, async () => {
        const res = await client.getProduct(product.productCode);
        expect(res.status).toBe(200)
        expect(res).toSatisfyApiSpec()
        const read = new Product(res.data);
        expect(read).toEqual(expect.objectContaining(product))
    })
    test(`STEP 5 - Retrieve audit log for product`, async () => {
       const res = await client.filterAuditLogs(AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, ["timestamp > 0"], "desc");
       expect(res.status).toBe(200)
       expect(res).toSatisfyApiSpec()
    })
})