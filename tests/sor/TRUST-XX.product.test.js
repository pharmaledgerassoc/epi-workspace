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

    const baseURL = "/product";

    beforeAll(async () => {
        oauth = new OAuth(config);
        const token = await oauth.getAccessToken();
        oauth.setSharedToken(token);
        client = new IntegrationClient(config);
        client.setSharedToken(token);
    })

    describe(`TRUST-YYY - ${baseURL} (POST)`, () => {
        it("success - create a product", () => {

        })

        it("fail - 422", () => {

        })

        it("fail 422 (TRUST-69, TRUST-79)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

    describe(`TRUST-YYY - ${baseURL} (GET)`, () => {
        it("success - get a product", () => {
            "/product/{GTIN}"
        })

        it("fail - 422", () => {

        })

        it("fail 422 (TRUST-69, TRUST-79)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

    describe(`TRUST-YYY - ${baseURL} (PUT)`, () => {
        it("success - update a product", () => {

        })

        it("fail - 422", () => {

        })

        it("fail 422 (TRUST-69, TRUST-79)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

    describe(`TRUST-YYY - ${baseURL} (DELETE)`, () => {
        it("success - delete a product", () => {

        })

        it("fail - 422", () => {

        })

        it("fail 422 (TRUST-69, TRUST-79)", () => {
            const testName = expect.getState().currentConcurrentTestName();

        })
    });

});