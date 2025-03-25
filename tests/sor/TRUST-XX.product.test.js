const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {AUDIT_LOG_TYPES} = require("../constants");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const path = require("path");

const jestOpenAPI = require('jest-openapi').default;
const openApiPath = path.resolve(__dirname, "ePI-SOR.json");
jestOpenAPI(openApiPath);

jest.setTimeout(60000);

describe('Product', () => {

    let product
    let client;
    let oauth;

    beforeAll(async () => {
        oauth = new OAuth(config);
        const token = await oauth.getAccessToken();
        oauth.setSharedToken(token);
        client = new IntegrationClient(config);
        client.setSharedToken(token);
    })

    describe("TRUST-YYY - PRODUCT POST", () => {
        it("success - create a product", () => {

        })

        it("fail - 422", () => {

        })

        it("fail 422 (TRUST-69, TRUST-79)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

    describe("TRUST-YYY - PRODUCT GET", () => {
        it("success - get a product", () => {

        })

        it("fail - 422", () => {

        })

        it("fail 422 (TRUST-69, TRUST-79)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

    describe("TRUST-YYY - PRODUCT PUT", () => {
        it("success - update a product", () => {

        })

        it("fail - 422", () => {

        })

        it("fail 422 (TRUST-69, TRUST-79)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });


    // test(`Should return Unprocessable Entity for blank mandatory fields`, async () => {
    //     const {ticket} = UtilsService.getTicket(expect.getState().currentTestName);
    //     product = await ModelFactory.product(ticket, {
    //         nameMedicinalProduct: "",
    //         inventedName: ""
    //     });
    //
    //     try {
    //         await client.addProduct(product.productCode, product);
    //         fail('Request should have failed with 422'); // This makes the test fail if it reaches here
    //     } catch (e) {
    //         const response = e?.response || {};
    //         expect(e.status).toEqual(422);
    //         expect(e.statusText).toEqual("Unprocessable Entity");
    //     }
    // });

});