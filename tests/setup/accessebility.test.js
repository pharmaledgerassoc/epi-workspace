const {IntegrationClient} = require("../clients/Integration");
const {OAuth} = require("../clients/Oauth");
const {FixedUrls} = require("../clients/FixedUrls");
const data = require("./accessebility-data.json");
const {ModelFactory} = require("../models/factory");


jest.setTimeout(60000);

describe(`Accessibility`, () => {
    // retrieve integration api client
    const client = new IntegrationClient(config);
    const oauth = new OAuth(config);
    const fixedUrl = new FixedUrls(config);
    const productUrl = "/product";
    const listProductsUrl = "/listProducts";

    beforeAll(async () => {
        const token = await oauth.getAccessToken(); // log in to SSO
        // store auth SSO token
        client.setSharedToken(token);
        fixedUrl.setSharedToken(token);
    });

    data.forEach(((item, i) => {
        const {code, batch, expiry} = item;
        it(`should create a product ${item.code}`, async () => {
            const product = await ModelFactory.product(code, {
                inventedName: `Accessibility Test Product ${i}`,
                nameMedicinalProduct: `Accessibility Test Product ${i} - extra info`,
                markets: [{
                    marketId: "IN",
                    nationalCode: "NC001",
                    mahAddress: "221B Baker Street",
                    mahName: `${code} MAH`,
                    legalEntityName: `${code} Legal Entity`
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

        it(`should create batch ${batch} for product ${item.code}`, async () => {
            const createdBatch = await ModelFactory.batch(batch, code, {
                batchNumber: batch,
                expiryDate: expiry,
                packagingSiteName: batch,
                manufacturerAddress1: "1313, Burrito Boulevard, Tao City - Mexico",
                manufacturerAddress2: "411, Bakon Street"
            });
            const res = await client.addBatch(createdBatch.productCode, createdBatch.batchNumber, createdBatch);
            expect(res.status).toBe(200);

            const batchResponse = await client.getBatch(createdBatch.productCode, createdBatch.batchNumber);
            expect(batchResponse.data).toEqual(expect.objectContaining(createdBatch));
        });

        it()
    }));

    describe("screen 1", () => {
        it("creates")
    })
});