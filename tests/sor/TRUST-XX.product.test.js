const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {AUDIT_LOG_TYPES} = require("../constants");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const path = require("path");

jest.setTimeout(60000);

const issueId = "TRUST-YYY";
describe(`${issueId} Product`, () => {

    let client;

    const productUrl = "/product";
    const listProductsUrl = "/listProducts";
    const listProductMarketsUrl = "/listProductMarkets";
    const listProductLangsUrl = "/listProductLangs";

    beforeAll(async () => {
        // log in to SSO
        const token = await client.getAccessToken();
        // retrieve integration api client
        client = new IntegrationClient(config);
        // store auth SSO token
        client.setSharedToken(token);
    });

    describe(`${productUrl} (POST)`, () => {
        it("SUCCESS 200 - Create a product", () => {

        });

        it("FAIL 422 - Unprocessable Entity", () => {

        });

        it("FAIL 422 - Unprocessable Entity (TRUST-69)", async () => {
            const {ticket} = UtilsService.getTicket(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket, {nameMedicinalProduct: "", inventedName: ""});

            try {
                await client.addProduct(product.productCode, product);
                fail("Request should have failed with 422 status code");
            } catch (e) {
                const response = e?.response || {};
                expect(e.status).toEqual(422);
                expect(e.statusText).toEqual("Unprocessable Entity");
            }
        });
    });

    describe(`${productUrl} (GET)`, () => {
        it("SUCCESS 200 - Get a product", () => {
            "/product/{GTIN}"
        })

        it("FAIL 422 - Unprocessable Entity", () => {

        })

        it("FAIL 422 - Unprocessable Entity (TRUST-XX, TRUST-XY)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

    describe(`${productUrl} (PUT)`, () => {
        it("SUCCESS 200 - Update a product", () => {

        })

        it("FAIL 422 - Unprocessable Entity", () => {

        })

        it("FAIL 422 - Unprocessable Entity (TRUST-XX, TRUST-XY)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

    describe(`${productUrl} (DELETE)`, () => {
        it("SUCCESS 200 - Delete a product", () => {

        })

        it("FAIL 422 - Unprocessable Entity", () => {

        })

        it("FAIL 422 - Unprocessable Entity (TRUST-XX, TRUST-XY)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });


    describe(`${listProductsUrl} (GET)`, () => {
        it("SUCCESS 200 - List products", () => {

        });

        it("FAIL 422 - Unprocessable Entity (TRUST-XX, TRUST-XY)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        });

        it("FAIL 500 - Internal Server Error", () => {

        });
    });

    describe(`${listProductMarketsUrl} (GET)`, () => {
        it("SUCCESS 200 - list products", () => {

        });

        it("FAIL 422 - Unprocessable Entity (TRUST-XX, TRUST-XY)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        });

        it("FAIL 500 - Internal Server Error", () => {

        });
    });

    describe(`${listProductLangsUrl} (GET)`, () => {
        it("SUCCESS 200 - list products", () => {

        });

        it("FAIL 422 - Unprocessable Entity (TRUST-XX, TRUST-XY)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        });

        it("FAIL 500 - Internal Server Error", () => {

        });

    });

});