const {getConfig} = require("../conf");
const config = getConfig();
const {SwaggerClient} = require("../swagger/swagger");
const {ModelFactory} = require("../models/factory");

describe('TRUST-67', () => {

    let gtin
    let product

    let client;

    beforeAll(() => {
        client = new SwaggerClient(config)
    })

    test.skip(`STEP 1 - Log into appstream`, async () => {
        console.log("Logging into appstream does not apply")
    })

    test(`STEP 2 + 3 - create new product`, async () => {
        product = ModelFactory.product()
        const res = await client.addProduct(product.productCode, product)
        expect(res.status).toBe(200)
        expect(res).toSatisfyApiSpec()
    })

    test(`STEP 4 - Retrieve new product`, async () => {
        console.log("Logging into appstream does not apply")
    })
    test(`STEP 5 - Retrieve audit log`, async () => {
        console.log("Logging into appstream does not apply")
    })
})