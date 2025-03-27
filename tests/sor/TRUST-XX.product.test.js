const {getConfig} = require("../conf");
const config = getConfig();
const {ModelFactory} = require("../models/factory");
const {Product} = require("../models/Product");
const {OAuth} = require("../clients/Oauth");
const {IntegrationClient} = require("../clients/Integration");
const {UtilsService} = require("../clients/utils");
const {FixedUrls} = require("../clients/FixedUrls");

jest.setTimeout(60000);

describe(`TRUST-001 Product`, () => {
    let client = new IntegrationClient({});
    const fixedUrl = new FixedUrls(config);
    const productUrl = "/product";
    const listProductsUrl = "/listProducts";
    const listProductMarketsUrl = "/listProductMarkets";
    const listProductLangsUrl = "/listProductLangs";

    beforeAll(async () => {
        const oauth = new OAuth(config);
        // log in to SSO
        const token = await oauth.getAccessToken();
        // retrieve integration api client
        client = new IntegrationClient(config);
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);
    });

    afterEach(async () => {
        await fixedUrl.waitForCompletion();
    });

    describe(`${productUrl} (POST)`, () => {
        it("SUCCESS 200 - Should create a product properly", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket, {
                markets: [{
                    marketId: "IN",
                    nationalCode: "NC001",
                    mahAddress: "221B Baker Street",
                    mahName: `${ticket} MAH`,
                    legalEntityName: `${ticket} Legal Entity`
                }],
                strengths: [{
                    substance: "Dipiloma", strength: "500mg"
                }]
            });
            const res = await client.addProduct(product.productCode, product);
            expect(res.status).toBe(200);

            const productResponse = await client.getProduct(product.productCode);
            expect(productResponse.data).toEqual(expect.objectContaining(product));
        });

        it("SUCCESS 200 - Should create a product with no duplicate strengths", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const strengths = [
                {substance: "Paracetalol", strength: "250mg"},
                {substance: "Paracetalol", strength: "250mg"},
                {substance: "Metformin", strength: "500mg"}
            ];
            const product = await ModelFactory.product(ticket, {strengths: strengths});
            const res = await client.addProduct(product.productCode, product);
            expect(res.status).toBe(200);

            const getProductResponse = await client.getProduct(product.productCode);
            expect(getProductResponse.data).toEqual(expect.objectContaining(product));
            expect(getProductResponse.data.strengths.length).toEqual(2);
        });

        it("FAIL 422 - Should throw Unprocessable Entity when mandatory fields are empty", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket);

            const mandatoryFields = ["productCode", "nameMedicinalProduct", "inventedName"];

            for (const field of mandatoryFields) {
                const invalidProduct = {...product};
                invalidProduct[field] = undefined;

                try {
                    await client.addProduct(invalidProduct.productCode, invalidProduct);
                    throw new Error(`Request should have failed with 422 status code when ${field} is empty`);
                } catch (e) {
                    const response = e?.response || {};
                    expect(response.status).toEqual(422);
                    expect(response.statusText).toEqual("Unprocessable Entity");
                }
            }
        });

        it("FAIL 422 - Should throw Unprocessable Entity when invalid property is provided", async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const product = await ModelFactory.product(ticket);
            try {
                await client.addProduct(product.productCode, {...product, dummyProperty: "no matter value"});
                throw new Error("Request should have failed with 422 status code");
            } catch (e) {
                const response = e?.response || {};
                expect(response.status).toEqual(422);
                expect(response.statusText).toEqual("Unprocessable Entity");
            }
        });

    });

    describe(`${productUrl} (GET)`, () => {
        let product = new Product();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const createdProduct = await ModelFactory.product(ticket, {
                markets: [{
                    marketId: "IN",
                    nationalCode: "NC001",
                    mahAddress: "001A Baker Street",
                    mahName: `${ticket} MAH`,
                    legalEntityName: `${ticket} Legal Entity`
                }],
                strengths: [{
                    substance: "Metformin", strength: "500mg"
                }]
            });
            const res = await client.addProduct(createdProduct.productCode, createdProduct);
            expect(res.status).toBe(200);
            product = createdProduct;
        });

        it("SUCCESS 200 - Should get a product properly", async () => {
            const getProductResponse = await client.getProduct(product.productCode);
            expect(getProductResponse.data).toEqual(expect.objectContaining(product));
            expect(getProductResponse.data.strengths.length).toEqual(1);
            expect(getProductResponse.data.markets.length).toEqual(1);
        });
    });

    describe(`${productUrl} (PUT)`, () => {
        let product = new Product();
        beforeAll(async () => {
            const {ticket} = UtilsService.getTicketId(expect.getState().currentTestName);
            const createdProduct = await ModelFactory.product(ticket);
            const res = await client.addProduct(createdProduct.productCode, createdProduct);
            expect(res.status).toBe(200);
            product = createdProduct;
        });

        it("SUCCESS 200 - Should update a product properly", async () => {
            product = new Product({
                ...product,
                internalMaterialCode: "Update internalMaterialCode"
            });
            const updateProductResponse = await client.updateProduct(product.productCode, product);
            expect(product).toMatchObject(updateProductResponse.data);

            const getProductResponse = await client.getProduct(product.productCode);
            expect(product).toMatchObject(getProductResponse.data);
        });

        it("SUCCESS 200 - Should maintain data consistency when making sequential updates", async () => {
            const requests = [100, 150, 200, 300].map((delay, index) => new Promise((resolve) => {
                setTimeout(async () => {
                    const updatedProduct = new Product({
                        ...product,
                        internalMaterialCode: `Update_${index + 1}_${product.internalMaterialCode}`,
                        markets: (index + 1) % 2 === 0 ? [] : [{
                            marketId: "IN", nationalCode: "", mahAddress: "", mahName: "", legalEntityName: ""
                        }]
                    });

                    const response = await client.updateProduct(updatedProduct.productCode, updatedProduct);
                    resolve(response);
                }, delay);
            }));
            await Promise.all(requests);
            // TODO validate
        });

        it("FAIL 200 - Should not update productCode field", async () => {
            const originalProductCode = product.productCode;
            const fakeProduct = ModelFactory.product("Fake");
            const fakeProductCode = fakeProduct.productCode;

            await client.updateProduct(originalProductCode, {
                ...product,
                productCode: fakeProductCode
            });

            const updatedProduct = await client.getProduct(originalProductCode);
            expect(updatedProduct.data.productCode).toEqual(originalProductCode);

            try {
                await expect(client.getProduct(fakeProductCode)).rejects.toThrow();
            } catch (error) {
                expect(error.response.status).toBe(404);
            }
        });
    });

    describe(`${listProductsUrl} (GET)`, () => {
        it("SUCCESS 200 - List products", async () => {
            const response = await client.listProducts();
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);

            const max = 2;
            const maxResponse = await client.listProducts(max, "asc");
            expect(maxResponse.status).toEqual(200);
            expect(Array.isArray(maxResponse.data)).toBeTruthy();
            expect(maxResponse.data.length).toEqual(max);
            expect(maxResponse.data[1]["__timestamp"]).toBeGreaterThan(maxResponse.data[0]["__timestamp"]);
        });

        it("SUCCESS 200 - Should list products according to the sorted key", async () => {
            const ascOrderResponse = await client.listProducts(100, "asc");
            expect(ascOrderResponse.status).toEqual(200);
            expect(Array.isArray(ascOrderResponse.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);
            for (let i = 0; i < ascOrderResponse.data.length - 1; i++) {
                expect(ascOrderResponse.data[i + 1]["__timestamp"]).toBeGreaterThan(ascOrderResponse.data[i]["__timestamp"]);
            }

            const descOrderResponse = await client.listProducts(100, "desc");
            expect(descOrderResponse.status).toEqual(200);
            expect(Array.isArray(descOrderResponse.data)).toBeTruthy();
            expect(response.data.length).toBeGreaterThan(0);
            for (let i = 0; i < descOrderResponse.data.length - 1; i++) {
                expect(descOrderResponse.data[i + 1]["__timestamp"]).toBeLessThan(descOrderResponse.data[i]["__timestamp"]);
            }
        });
    });

    describe(`${listProductMarketsUrl} (GET)`, () => {
        it("SUCCESS 200", () => {
            throw new Erro("No implemented");
        });
    });

    describe(`${listProductLangsUrl} (GET)`, () => {
        it("SUCCESS 200", () => {
            throw new Erro("No implemented");
        });
    });

});