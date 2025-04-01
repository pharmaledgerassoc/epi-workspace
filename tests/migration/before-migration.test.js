const { getConfig } = require("../conf");
const config = getConfig();
const { ModelFactory } = require("../models/factory");
// const { Product } = require("../models/Product");
const { OAuth } = require("../clients/Oauth");
const { IntegrationClient } = require("../clients/Integration");
const { UtilsService } = require("../clients/utils");
const { FixedUrls } = require("../clients/FixedUrls");
const {Leaflet} = require("../models/Leaflet");
const {Reporter} = require("../reporting");
const {userActionAuditTest} = require("../utils");
// const { getRandomNumber } = require("../utils");
const fs = require("node:fs");
const path = require("path");
const {constants} = require("../constants");

jest.setTimeout(60000);

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

  });


  it("STEP 1 - Creates and updates a base product", async () => {
    const { ticket } = UtilsService.getTicketId(
      expect.getState().currentTestName
    );

    // Set up reporter
    const reporter = new Reporter(ticket);
    const step = "STEP1"

    // Generate Product
    const product = await ModelFactory.product(ticket, {
      markets: [],
      strengths: [],
    });

    // Create Product
    let res = await client.addProduct(product.productCode, product);
    expect(res.status).toBe(200);

    // Get Product and compare
    let productResponse = await client.getProduct(product.productCode);
    expect(productResponse.data).toEqual(expect.objectContaining(product));
    
    const oldProd = productResponse.data;

    // Get Audit and validate
    let audit = await userActionAuditTest(client, constants.OPERATIONS.CREATE_PRODUCT, undefined, productResponse.data);
    
    // Save audit information
    reporter.outputJSON(step, "base-prod-created-audit", audit);

    const updatedMedicalName = "Updated Medical Name"
    product.nameMedicinalProduct = updatedMedicalName;

    // Update Product
    res = await client.updateProduct(product.productCode, product);
    expect(res.status).toBe(200);

    // Get Product and compare
    productResponse = await client.getProduct(product.productCode);
    expect(productResponse.data).toEqual(expect.objectContaining(product));
    expect(productResponse.data.nameMedicinalProduct).toEqual(updatedMedicalName);

    // Get Audit and validate
    audit = await userActionAuditTest(client, constants.OPERATIONS.UPDATE_PRODUCT, oldProd, productResponse.data);

    // Save audit information
    reporter.outputJSON(step, "base-prod-updated-audit", audit);

    // Save updated product information
    reporter.outputJSON(step, "base-prod", product);
  });

  // it("STEP 2 - Creates a product strengths", async () => {
  //   const { ticket } = UtilsService.getTicketId(
  //     expect.getState().currentTestName
  //   );

  //   // Set up reporter
  //   const reporter = new Reporter(ticket);

  //   // Generate Product
  //   const product = await ModelFactory.product(ticket, {
  //     markets: [],
  //     strengths: [
  //       {
  //         substance: "Dipiloma",
  //         strength: "500mg",
  //       },
  //       {
  //         substance: "Paracetomol",
  //         strength: "200mg",
  //       }
  //     ],
  //   });

  //   // Create Product
  //   const res = await client.addProduct(product.productCode, product);
  //   expect(res.status).toBe(200);

  //   // Get Product and compare
  //   const productResponse = await client.getProduct(product.productCode);
  //   expect(productResponse.data).toEqual(expect.objectContaining(product));
  //   expect(productResponse.data.strengths.length).toEqual(2);
  //   expect(productResponse.data.strengths[0]).toEqual(product.strengths[0]);
  //   expect(productResponse.data.strengths[1]).toEqual(product.strengths[1]);



  //   //TODO: Check audit validate

  //   // Create Report
  //   const step = "STEP2"
  //   const p = reporter.generatePath(step);

  //   fs.mkdirSync(p, { recursive: true });

  //   reporter.outputJSON(step, "strengths-prod", product);
  // });

  // it("SUCCESS 200 - Should create a market product properly", async () => {
  //   const { ticket } = UtilsService.getTicketId(
  //     expect.getState().currentTestName
  //   );
  //   const product = await ModelFactory.product(ticket, {
  //     markets: [
  //       {
  //         marketId: "IN",
  //         nationalCode: "NC001",
  //         mahAddress: "221B Baker Street",
  //         mahName: `${ticket} MAH`,
  //         legalEntityName: `${ticket} Legal Entity`,
  //       },
  //     ],
  //     strengths: [],
  //   });

  //   report.marketProduct = product;

  //   const res = await client.addProduct(product.productCode, product);
  //   expect(res.status).toBe(200);

  //   const productResponse = await client.getProduct(product.productCode);
  //   expect(productResponse.data).toEqual(expect.objectContaining(product));

  //   //TODO: Check audit validate
  // });

  // it("SUCCESS 200 - Should create a photo product properly", async () => {
  //   const { ticket } = UtilsService.getTicketId(
  //     expect.getState().currentTestName
  //   );
  //   const product = await ModelFactory.product(ticket, {
  //     markets: [],
  //     strengths: [],
  //   });

  //   report.photoProduct = product;

  //   const res = await client.addProduct(product.productCode, product);
  //   expect(res.status).toBe(200);

  //   const productResponse = await client.getProduct(product.productCode);
  //   expect(productResponse.data).toEqual(expect.objectContaining(product));

  //   //TODO: Check audit validate Add photo and cache it
  // });

  // it("SUCCESS 200 - Should create a leaflet product properly", async () => {
  //   const { ticket } = UtilsService.getTicketId(
  //     expect.getState().currentTestName
  //   );
  //   const product = await ModelFactory.product(ticket, {
  //     markets: [],
  //     strengths: [],
  //   });

  //   report.leafletProduct = product;

  //   const res = await client.addProduct(product.productCode, product);
  //   expect(res.status).toBe(200);

  //   const productResponse = await client.getProduct(product.productCode);
  //   expect(productResponse.data).toEqual(expect.objectContaining(product));

  //   //TODO: Check audit for product and leaflet validate and cache it

  //   const LANG = "en";
  //   const XML_FILE_WITH_IMG = (fs.readFileSync(path.join(__dirname, "..", "resources", "xml_content_with_img.txt"), {encoding: 'utf-8'})).trim();
  //   const IMG_FILE_NAME = "figure_010_1295_1485_3620_1050.png";
  //   const IMG_FILE_CONTENT = (fs.readFileSync(path.join(__dirname, "..", "resources", "figure_010_1295_1485_3620_1050.png.txt"), {encoding: 'utf-8'})).trim();
    

  //   const leaflet = new Leaflet({
  //     productCode: product.productCode,
  //     language: LANG,
  //     xmlFileContent: XML_FILE_WITH_IMG,
  //     otherFilesContent: [{
  //         filename: IMG_FILE_NAME,
  //         fileContent: IMG_FILE_CONTENT
  //     }]
  //   });

  //   const resleaf = await client.addLeaflet(leaflet.productCode, undefined, leaflet.language, "leaflet", undefined, leaflet);
  //   expect(resleaf.status).toBe(200);
    


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
