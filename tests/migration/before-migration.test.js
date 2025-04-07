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

describe(`TRUST-125 Before Migration Test`, () => {
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

  it("STEP 1 - Creates and updates a base product", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP1";

    // Generate Product
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [],
    });

    // Cache GTIN
    const GTIN = product.productCode;

    // Create Product
    const res1 = await client.addProduct(GTIN, product);
    expect(res1.status).toBe(200);

    // Get Product and compare
    const productResponse1 = await client.getProduct(GTIN);
    expect(productResponse1.data).toEqual(expect.objectContaining(product));
    expect(productResponse1.data.version).toEqual(1);

    // Get audit log and validate
    const audit1 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.CREATE_PRODUCT,
      undefined,
      product,
      false,
      false
    );

    // Save audit information
    reporter.outputJSON(step, "base-prod-created-audit", audit1);

    // Generate Updated Product
    const updatedMedicalName = "Updated Medical Name";

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
    expect(productResponse2.data.version).toEqual(2);

    // Get audit log and validate
    const audit2 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.UPDATE_PRODUCT,
      product,
      updatedProduct,
      false,
      false
    );

    // Save audit information
    reporter.outputJSON(step, "base-prod-updated-audit", audit2);

    // Save updated product information
    reporter.outputJSON(step, "base-prod", productResponse2.data);
  });

  it("STEP 2 - Creates and updates a product with strengths", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP2";

    // Generate Product
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [
        {
          substance: "Dipiloma",
          strength: "500mg",
        },
        {
          substance: "Paracetomol",
          strength: "200mg",
        },
      ],
    });

    // Cache GTIN
    const GTIN = product.productCode;

    // Create Product
    const res1 = await client.addProduct(GTIN, product);
    expect(res1.status).toBe(200);

    // Get Product and compare
    const productResponse1 = await client.getProduct(GTIN);
    expect(productResponse1.data).toEqual(expect.objectContaining(product));
    expect(productResponse1.data.version).toEqual(1);
    expect(productResponse1.data.strengths.length).toEqual(2);
    expect(productResponse1.data.strengths[0]).toEqual(product.strengths[0]);
    expect(productResponse1.data.strengths[1]).toEqual(product.strengths[1]);

    // Get audit log and validate
    const audit1 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.CREATE_PRODUCT,
      undefined,
      product,
      false,
      false
    );

    // Save audit information
    reporter.outputJSON(step, "strengths-prod-created-audit", audit1);

    // Generate Updated Product
    const updatedStrengths = [
      {
        substance: "Dipiloma",
        strength: "500mg",
      },
      {
        substance: "Paracetomol",
        strength: "200mg",
      },
      {
        substance: "Paracetomil",
        strength: "200mg",
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
    expect(productResponse2.data.strengths.length).toEqual(3);
    expect(productResponse2.data.strengths[0]).toEqual(
      updatedProduct.strengths[0]
    );
    expect(productResponse2.data.strengths[1]).toEqual(
      updatedProduct.strengths[1]
    );
    expect(productResponse2.data.strengths[2]).toEqual(
      updatedProduct.strengths[2]
    );
    expect(productResponse2.data.version).toEqual(2);

    // Get audit log and validate
    const audit2 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.UPDATE_PRODUCT,
      product,
      updatedProduct,
      false,
      false
    );

    // Save audit information
    reporter.outputJSON(step, "strengths-prod-updated-audit", audit2);

    // Save updated product information
    reporter.outputJSON(step, "strengths-prod", productResponse2.data);
  });

  it("STEP 3 - Creates and updates a product with markets", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP3";

    // Generate Product
    const product = await ModelFactory.product(ticket, {
      markets: [
        {
          marketId: "IN",
          nationalCode: "NC001",
          mahAddress: "221B Baker Street",
          mahName: `${ticket} MAH`,
          legalEntityName: `${ticket} Legal Entity`,
        },
        {
          marketId: "BR",
          nationalCode: "NC001",
          mahAddress: "221B Baker Street",
          mahName: `${ticket} MAH`,
          legalEntityName: `${ticket} Legal Entity`,
        },
      ],
      strengths: [],
    });

    // Cache GTIN
    const GTIN = product.productCode;

    // Create Product
    const res1 = await client.addProduct(GTIN, product);
    expect(res1.status).toBe(200);

    // Get Product and compare
    const productResponse1 = await client.getProduct(GTIN);
    expect(productResponse1.data).toEqual(expect.objectContaining(product));
    expect(productResponse1.data.version).toEqual(1);
    expect(productResponse1.data.markets.length).toEqual(2);
    expect(productResponse1.data.markets[0]).toEqual(product.markets[0]);
    expect(productResponse1.data.markets[1]).toEqual(product.markets[1]);

    // Get audit log and validate
    const audit1 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.CREATE_PRODUCT,
      undefined,
      product,
      false,
      false
    );

    // Save audit information
    reporter.outputJSON(step, "markets-prod-created-audit", audit1);

    // Generate Updated Product
    const updatedMarkets = [
      {
        marketId: "IN",
        nationalCode: "NC001",
        mahAddress: "221B Baker Street",
        mahName: `${ticket} MAH`,
        legalEntityName: `${ticket} Legal Entity`,
      },
      {
        marketId: "BR",
        nationalCode: "NC001",
        mahAddress: "221B Baker Street",
        mahName: `${ticket} MAH`,
        legalEntityName: `${ticket} Legal Entity`,
      },
      {
        marketId: "CA",
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
    expect(productResponse2.data.markets.length).toEqual(3);
    expect(productResponse2.data.markets[0]).toEqual(updatedProduct.markets[0]);
    expect(productResponse2.data.markets[1]).toEqual(updatedProduct.markets[1]);
    expect(productResponse2.data.markets[2]).toEqual(updatedProduct.markets[2]);
    expect(productResponse2.data.version).toEqual(2);

    // Get audit log and validate
    const audit2 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.UPDATE_PRODUCT,
      product,
      updatedProduct,
      false,
      false
    );

    // Save audit information
    reporter.outputJSON(step, "markets-prod-updated-audit", audit2);

    // Save updated product information
    reporter.outputJSON(step, "markets-prod", productResponse2.data);
  });

  it("STEP 4 - Creates a product with a photo", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP4";

    // Generate Product
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [],
    });

    // Cache GTIN
    const GTIN = product.productCode;

    // Create Product
    const res1 = await client.addProduct(GTIN, product);
    expect(res1.status).toBe(200);

    // Get Product and compare
    const productResponse1 = await client.getProduct(GTIN);
    expect(productResponse1.data).toEqual(expect.objectContaining(product));
    expect(productResponse1.data.version).toEqual(1);

    // Get audit log and validate
    const audit1 = await AuditLogChecker.assertAuditLog(
      GTIN,
      undefined,
      step,
      constants.OPERATIONS.CREATE_PRODUCT,
      undefined,
      product,
      false,
      false
    );

    // Save audit information
    reporter.outputJSON(step, "photo-prod-created-audit", audit1);

    // Create image payload
    const imagePayload = {
      productCode: GTIN,
      imageData: IMAGE,
    };

    // Add image to product
    const photoRes = await client.addImage(GTIN, imagePayload);
    expect(photoRes.status).toBe(200);

    // Get audit
    const auditRes = await client.filterAuditLogs(
      constants.AUDIT_LOG_TYPES.USER_ACCTION,
      undefined,
      1,
      "timestamp > 0",
      "desc"
    );

    const audit2 = auditRes.data[0];

    // Save audit
    reporter.outputJSON(step, "photo-prod-add-image-audit", audit2);

    // Get Product and see if version is correct
    const productResponse2 = await client.getProduct(GTIN);
    expect(productResponse2.data).toEqual(expect.objectContaining(product));
    expect(productResponse2.data.version).toEqual(2);

    // Get Photo
    const resPhoto = await client.get(`/image/${GTIN}?version=2`, "string");

    // Compare photo
    expect(resPhoto.data).toEqual(IMAGE);

    // Save photo
    reporter.outputJSON(step, "photo-prod-photo-download", {
      data: resPhoto.data,
    });

    // Save updated product information
    reporter.outputJSON(step, "photo-prod", productResponse1.data);
  });

  // it.skip("STEP 5 - Creates product with epi", async () => {
  //   const { ticket } = UtilsService.getTicketId(
  //     expect.getState().currentTestName
  //   );

  //   // Set up reporter
  //   const reporter = new Reporter(ticket);
  //   const step = "STEP5";

  //   // Generate Product
  //   const product = await ModelFactory.product(ticket, {
  //     markets: [],
  //     strengths: [],
  //   });

  //   // Create Product
  //   let res = await client.addProduct(product.productCode, product);
  //   expect(res.status).toBe(200);

  //   // Get Product and compare
  //   let productResponse = await client.getProduct(product.productCode);
  //   expect(productResponse.data).toEqual(expect.objectContaining(product));

  //   // Get Audit and validate
  //   let audit = await ProductAndBatchAuditTest(
  //     client,
  //     constants.OPERATIONS.CREATE_PRODUCT,
  //     undefined,
  //     productResponse.data
  //   );

  //   // Save audit information
  //   reporter.outputJSON(step, "epi-prod-created-audit", audit);

  //   // Save updated product information
  //   reporter.outputJSON(step, "epi-prod", product);

  //   const LANG = "en";
  //   const XML_FILE_WITH_IMG = fs
  //     .readFileSync(
  //       path.join(__dirname, "..", "resources", "xml_content_with_img.txt"),
  //       { encoding: "utf-8" }
  //     )
  //     .trim();
  //   const IMG_FILE_NAME = "figure_010_1295_1485_3620_1050.png";
  //   const IMG_FILE_CONTENT = fs
  //     .readFileSync(
  //       path.join(
  //         __dirname,
  //         "..",
  //         "resources",
  //         "figure_010_1295_1485_3620_1050.png.txt"
  //       ),
  //       { encoding: "utf-8" }
  //     )
  //     .trim();

  //   const leaflet = new Leaflet({
  //     productCode: product.productCode,
  //     language: LANG,
  //     xmlFileContent: XML_FILE_WITH_IMG,
  //     otherFilesContent: [
  //       {
  //         filename: IMG_FILE_NAME,
  //         fileContent: IMG_FILE_CONTENT,
  //       },
  //     ],
  //   });

  //   const resleaf = await client.addLeaflet(
  //     leaflet.productCode,
  //     undefined,
  //     leaflet.language,
  //     "leaflet",
  //     undefined,
  //     leaflet
  //   );
  //   expect(resleaf.status).toBe(200);

  //   reporter.outputJSON(step, "epi-prod-leaflet", leaflet);

  //   let auditRes = await client.filterAuditLogs(
  //     constants.AUDIT_LOG_TYPES.USER_ACCTION,
  //     undefined,
  //     1,
  //     "timestamp > 0",
  //     "desc"
  //   );
  //   audit = auditRes.data[0];
  //   expect(audit.reason).toEqual(constants.EPI_ACTIONS.ADD);

  //   const details = audit.details[0];

  //   expect(details.epiLanguage).toEqual(epiLanguage);
  //   expect(details.epiType).toEqual(epiType);

  //   reporter.outputJSON(step, "epi-prod-leaflet-audit", audit);
  // });

  // it("SUCCESS 200 - Should create a basic batch properly", async () => {
  //   const { ticket } = UtilsService.getTicketId(
  //     expect.getState().currentTestName
  //   );
  //   const batch = await ModelFactory.batch(
  //     ticket,
  //     report.leafletProduct.productCode,
  //     {
  //       packagingSiteName: ticket,
  //     }
  //   );
  //   const res = await client.addBatch(
  //     batch.productCode,
  //     batch.batchNumber,
  //     batch
  //   );
  //   expect(res.status).toBe(200);

  //   delete batch.manufacturerName;

  //   report.baseBatch = batch;

  //   const batchResponse = await client.getBatch(
  //     batch.productCode,
  //     batch.batchNumber
  //   );
  //   expect(batchResponse.data).toEqual(expect.objectContaining(batch));

  //   //TODO: validate audit
  // });

  // it("SUCCESS 200 - Should create a leaflet batch properly", async () => {
  //   const { ticket } = UtilsService.getTicketId(
  //     expect.getState().currentTestName
  //   );
  //   const batch = await ModelFactory.batch(
  //     ticket,
  //     report.leafletProduct.productCode,
  //     {
  //       packagingSiteName: ticket,
  //     }
  //   );
  //   const res = await client.addBatch(
  //     batch.productCode,
  //     batch.batchNumber,
  //     batch
  //   );
  //   expect(res.status).toBe(200);

  //   delete batch.manufacturerName;

  //   report.leafletBatch = batch;

  //   const batchResponse = await client.getBatch(
  //     batch.productCode,
  //     batch.batchNumber
  //   );
  //   expect(batchResponse.data).toEqual(expect.objectContaining(batch));

  //   //TODO: validate audit batch and leaflet

  //   const LANG = "en";
  //   const XML_FILE_WITH_IMG = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_with_img.txt"), {encoding: 'utf-8'})).trim();
  //   const IMG_FILE_NAME = "figure_010_1295_1485_3620_1050.png";
  //   const IMG_FILE_CONTENT = (fs.readFileSync(path.join(__dirname, "..", "resources", "figure_010_1295_1485_3620_1050.png.txt"), {encoding: 'utf-8'})).trim();

  //   const leaflet = new Leaflet({
  //     productCode: batch.productCode,
  //     batchNumber: batch.batchNumber,
  //     language: LANG,
  //     xmlFileContent: XML_FILE_WITH_IMG,
  //     otherFilesContent: [{
  //         filename: IMG_FILE_NAME,
  //         fileContent: IMG_FILE_CONTENT
  //     }]
  //   });

  //   const resleaflet = await client.addLeaflet(leaflet.productCode, leaflet.batchNumber, leaflet.language, "leaflet", undefined, leaflet);
  //   expect(resleaflet.status).toBe(200);

  // });

  // it("SUCCESS 200 - Should create a base product properly", async () => {

  // const p = reporter.generatePath("step1");

  // fs.mkdirSync(p, { recursive: true });

  // reporter.outputJSON("step1", "report", report);
  // });
});
