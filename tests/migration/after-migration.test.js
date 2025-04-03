const { getConfig } = require("../conf");
const config = getConfig();
const { ModelFactory } = require("../models/factory");
const { IMAGE } = require("./utils");
// const { Product } = require("../models/Product");
const { OAuth } = require("../clients/Oauth");
const { IntegrationClient } = require("../clients/Integration");
const { UtilsService } = require("../clients/utils");
const { FixedUrls } = require("../clients/FixedUrls");
// const { Leaflet } = require("../models/Leaflet");
const { Reporter } = require("../reporting");
// const { ProductAndBatchAuditTest, EPiAuditTest } = require("../utils");
// const { getRandomNumber } = require("../utils");
// const fs = require("node:fs");
// const path = require("path");
const { constants } = require("../constants");
const { AuditLogChecker } = require("../audit/AuditLogChecker");

const isCI = !!process.env.CI; // works for travis, github and gitlab
const multiplier = isCI ? 3 : 1;
jest.setTimeout(multiplier * 60 * 1000);
const timeoutBetweenTests = multiplier * 5 * 1000;

describe(`TRUST-125 After Migration Test`, () => {
  // retrieve integration api client
  const client = new IntegrationClient(config);
  const oauth = new OAuth(config);
  const fixedUrl = new FixedUrls(config);
  // const productUrl = "/product";
  // const listProductsUrl = "/listProducts";

  beforeAll(async () => {
    const token = await oauth.getAccessToken(); // log in to SSO
    // store auth SSO token
    client.setSharedToken(token);
    fixedUrl.setSharedToken(token);
    AuditLogChecker.setApiClient(client);
  });

  afterEach((cb) => {
    console.log(
      `Finished test: ${expect.getState().currentTestName}. waiting for ${
        timeoutBetweenTests / 1000
      }s...`
    );
    setTimeout(() => {
      cb();
    }, timeoutBetweenTests);
  });

  it("STEP 1 - Retrieves a base product and update it", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP1";

    // Retrieve Cached Product Get Response
    const product = reporter.retrievePayload(step, "base-prod");

    // Cache GTIN
    const GTIN = product.productCode;

    // Get Product and compare
    const productResponse1 = await client.getProduct(GTIN);

    expect(productResponse1.data).toEqual(expect.objectContaining(product));
    expect(productResponse1.data.version).toEqual(2);

    // Get audit log and validate
    const audit1 = reporter.retrievePayload(step, "base-prod-created-audit");

    let auditRes1 = await client.filterAuditLogs(
      constants.AUDIT_LOG_TYPES.USER_ACCTION,
      undefined,
      1,
      `timestamp == ${audit1.__timestamp}`,
      "desc"
    );

    expect(auditRes1.data[0]).toEqual(expect.objectContaining(audit1));

    // Get audit log and validate
    const audit2 = reporter.retrievePayload(step, "base-prod-updated-audit");

    let auditRes2 = await client.filterAuditLogs(
      constants.AUDIT_LOG_TYPES.USER_ACCTION,
      undefined,
      1,
      `timestamp == ${audit2.__timestamp}`,
      "desc"
    );

    expect(auditRes2.data[0]).toEqual(expect.objectContaining(audit2));

    // Generate Base Product
    const baseProduct = await ModelFactory.product(
      ticket,
      productResponse1.data
    );

    // Generate Updated Product
    const updatedMedicalName = "After Migration Medical Name";

    const updatedObject = Object.assign({}, productResponse1.data, {
      markets: [],
      strengths: [],
      nameMedicinalProduct: updatedMedicalName,
    });

    const updatedProduct = await ModelFactory.product(ticket, updatedObject);

    // Update Product
    const res2 = await client.updateProduct(GTIN, updatedProduct);
    expect(res2.status).toBe(200);

    // Get Product and compare
    const productResponse2 = await client.getProduct(GTIN);
    expect(productResponse2.data).toEqual(
      expect.objectContaining(updatedProduct)
    );
    expect(productResponse2.data.nameMedicinalProduct).toEqual(
      updatedMedicalName
    );
    expect(productResponse2.data.version).toEqual(3);

    // Get audit log and validate
    const audit3 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.UPDATE_PRODUCT,
      baseProduct,
      updatedProduct,
      false,
      false
    );
  });

  it("STEP 2 - Retrieves a product with strengths and update it", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP2";

    // Retrieve Cached Product Get Response
    const product = reporter.retrievePayload(step, "strengths-prod");

    // Cache GTIN
    const GTIN = product.productCode;

    // Get Product and compare
    const productResponse1 = await client.getProduct(GTIN);

    expect(productResponse1.data).toEqual(expect.objectContaining(product));
    expect(productResponse1.data.version).toEqual(2);

    // Get audit log and validate
    const audit1 = reporter.retrievePayload(
      step,
      "strengths-prod-created-audit"
    );

    let auditRes1 = await client.filterAuditLogs(
      constants.AUDIT_LOG_TYPES.USER_ACCTION,
      undefined,
      1,
      `timestamp == ${audit1.__timestamp}`,
      "desc"
    );

    expect(auditRes1.data[0]).toEqual(expect.objectContaining(audit1));

    // Get audit log and validate
    const audit2 = reporter.retrievePayload(
      step,
      "strengths-prod-updated-audit"
    );

    let auditRes2 = await client.filterAuditLogs(
      constants.AUDIT_LOG_TYPES.USER_ACCTION,
      undefined,
      1,
      `timestamp == ${audit2.__timestamp}`,
      "desc"
    );

    expect(auditRes2.data[0]).toEqual(expect.objectContaining(audit2));

    // Generate Base Product
    const baseProduct = await ModelFactory.product(
      ticket,
      productResponse1.data
    );

    // Generate Updated Product
    const updatedStrengths = [
      {
        substance: "Dipiloma",
        strength: "500mg",
      },
    ];

    const updatedObject = Object.assign({}, productResponse1.data, {
      markets: [],
      strengths: updatedStrengths,
    });

    const updatedProduct = await ModelFactory.product(ticket, updatedObject);

    // Update Product
    const res2 = await client.updateProduct(GTIN, updatedProduct);
    expect(res2.status).toBe(200);

    // Get Product and compare
    const productResponse2 = await client.getProduct(GTIN);
    expect(productResponse2.data).toEqual(
      expect.objectContaining(updatedProduct)
    );
    expect(productResponse2.data.strengths.length).toEqual(1);
    expect(productResponse2.data.strengths[0]).toEqual(
      updatedProduct.strengths[0]
    );
    expect(productResponse2.data.version).toEqual(3);

    // Get audit log and validate
    const audit3 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.UPDATE_PRODUCT,
      baseProduct,
      updatedProduct,
      false,
      false
    );
  });

  it("STEP 3 - Retrieves a product with markets and update it", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP3";

    // Retrieve Cached Product Get Response
    const product = reporter.retrievePayload(step, "markets-prod");

    // Cache GTIN
    const GTIN = product.productCode;

    // Get Product and compare
    const productResponse1 = await client.getProduct(GTIN);

    expect(productResponse1.data).toEqual(expect.objectContaining(product));
    expect(productResponse1.data.version).toEqual(2);

    // Get audit log and validate
    const audit1 = reporter.retrievePayload(step, "markets-prod-created-audit");

    let auditRes1 = await client.filterAuditLogs(
      constants.AUDIT_LOG_TYPES.USER_ACCTION,
      undefined,
      1,
      `timestamp == ${audit1.__timestamp}`,
      "desc"
    );

    expect(auditRes1.data[0]).toEqual(expect.objectContaining(audit1));

    // Get audit log and validate
    const audit2 = reporter.retrievePayload(step, "markets-prod-updated-audit");

    let auditRes2 = await client.filterAuditLogs(
      constants.AUDIT_LOG_TYPES.USER_ACCTION,
      undefined,
      1,
      `timestamp == ${audit2.__timestamp}`,
      "desc"
    );

    expect(auditRes2.data[0]).toEqual(expect.objectContaining(audit2));

    // Generate Base Product
    const baseProduct = await ModelFactory.product(
      ticket,
      productResponse1.data
    );

    // Generate Updated Product
    const updatedMarkets = [
      {
        marketId: "IN",
        nationalCode: "NC001",
        mahAddress: "221B Baker Street",
        mahName: `${ticket} MAH`,
        legalEntityName: `${ticket} Legal Entity`,
      },
    ];

    const updatedObject = Object.assign({}, productResponse1.data, {
      markets: updatedMarkets,
      strengths: [],
    });

    const updatedProduct = await ModelFactory.product(ticket, updatedObject);

    // Update Product
    const res2 = await client.updateProduct(GTIN, updatedProduct);
    expect(res2.status).toBe(200);

    // Get Product and compare
    const productResponse2 = await client.getProduct(GTIN);
    expect(productResponse2.data).toEqual(
      expect.objectContaining(updatedProduct)
    );
    expect(productResponse2.data.markets.length).toEqual(1);
    expect(productResponse2.data.markets[0]).toEqual(updatedProduct.markets[0]);
    expect(productResponse2.data.version).toEqual(3);

    // Get audit log and validate
    const audit3 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.UPDATE_PRODUCT,
      baseProduct,
      updatedProduct,
      false,
      false
    );
  });
});
