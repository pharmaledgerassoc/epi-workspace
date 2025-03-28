const { getConfig } = require("../conf");
const config = getConfig();
const { ModelFactory } = require("../models/factory");
const { Product } = require("../models/Product");
const { OAuth } = require("../clients/Oauth");
const { IntegrationClient } = require("../clients/Integration");
const { UtilsService } = require("../clients/utils");
const { FixedUrls } = require("../clients/FixedUrls");
const { getRandomNumber } = require("../utils");

jest.setTimeout(60000);

describe(`TRUST-125 Before Migration Test`, () => {
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

  const report = {
    baseProduct: undefined,
    strengthProduct: undefined,
    marketProduct: undefined,
    leafletProduct: undefined,
    photoProduct: undefined,
    baseBatch: undefined,
    leafletBatch: undefined,
  };

  it("SUCCESS 200 - Should create a base product properly", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [],
    });

    report.baseProduct = product;

    const res = await client.addProduct(product.productCode, product);
    expect(res.status).toBe(200);

    const productResponse = await client.getProduct(product.productCode);
    expect(productResponse.data).toEqual(expect.objectContaining(product));

    //TODO: Check audit validate
  });

  it("SUCCESS 200 - Should create a strength product properly", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [
        {
          substance: "Dipiloma",
          strength: "500mg",
        },
      ],
    });

    report.strengthProduct = product;

    const res = await client.addProduct(product.productCode, product);
    expect(res.status).toBe(200);

    const productResponse = await client.getProduct(product.productCode);
    expect(productResponse.data).toEqual(expect.objectContaining(product));

    //TODO: Check audit validate
  });

  it("SUCCESS 200 - Should create a market product properly", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );
    const product = await ModelFactory.product(ticket, {
      markets: [
        {
          marketId: "IN",
          nationalCode: "NC001",
          mahAddress: "221B Baker Street",
          mahName: `${ticket} MAH`,
          legalEntityName: `${ticket} Legal Entity`,
        },
      ],
      strengths: [],
    });

    report.marketProduct = product;

    const res = await client.addProduct(product.productCode, product);
    expect(res.status).toBe(200);

    const productResponse = await client.getProduct(product.productCode);
    expect(productResponse.data).toEqual(expect.objectContaining(product));

    //TODO: Check audit validate
  });

  it("SUCCESS 200 - Should create a photo product properly", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [],
    });

    report.photoProduct = product;

    const res = await client.addProduct(product.productCode, product);
    expect(res.status).toBe(200);

    const productResponse = await client.getProduct(product.productCode);
    expect(productResponse.data).toEqual(expect.objectContaining(product));

    //TODO: Check audit validate Add photo and cache it
  });

  it("SUCCESS 200 - Should create a leaflet product properly", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [],
    });

    report.leafletProduct = product;

    const res = await client.addProduct(product.productCode, product);
    expect(res.status).toBe(200);

    const productResponse = await client.getProduct(product.productCode);
    expect(productResponse.data).toEqual(expect.objectContaining(product));

    //TODO: Check audit validate Add leaflet  and cache it
  });

  it("SUCCESS 200 - Should create a basic batch properly", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );
    const batch = await ModelFactory.batch(
      ticket,
      report.leafletProduct.productCode,
      {
        packagingSiteName: ticket,
      }
    );
    const res = await client.addBatch(
      batch.productCode,
      batch.batchNumber,
      batch
    );
    expect(res.status).toBe(200);

    delete batch.manufacturerName;

    report.baseBatch = batch;

    const batchResponse = await client.getBatch(
      batch.productCode,
      batch.batchNumber
    );
    expect(batchResponse.data).toEqual(expect.objectContaining(batch));

    //TODO: validate audit
  });

  it("SUCCESS 200 - Should create a basic batch properly", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );
    const batch = await ModelFactory.batch(
      ticket,
      report.leafletProduct.productCode,
      {
        packagingSiteName: ticket,
      }
    );
    const res = await client.addBatch(
      batch.productCode,
      batch.batchNumber,
      batch
    );
    expect(res.status).toBe(200);

    delete batch.manufacturerName;

    report.leafletBatch = batch;

    const batchResponse = await client.getBatch(
      batch.productCode,
      batch.batchNumber
    );
    expect(batchResponse.data).toEqual(expect.objectContaining(batch));

    //TODO: validate audit add leaflet
  });
});
