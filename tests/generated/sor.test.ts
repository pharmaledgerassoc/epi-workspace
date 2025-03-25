import { OpenAPIV3 } from 'openapi-types';
import { validateOpenAPISpec } from '../utils/openapi-validator';

describe('ePI SOR Integration OpenAPI Specification', () => {
  let openApiSpec: OpenAPIV3.Document;

  before(() => {
    openApiSpec = require('../../gtin-resolver/ePI-SOR.json');
  });

it('should successfully create a new product when valid GTIN and product data are provided', async () => {
  const gtin = '02113111111164';
  const productData = {
    messageType: 'Product',
    messageTypeVersion: 1,
    senderId: 'SOR User',
    messageId: 'S000001',
    payload: {
      productCode: gtin,
      inventedName: 'TestProduct',
      nameMedicinalProduct: 'TestMedicine',
      internal_MaterialCode: 'IM001',
      productRecall: false,
      strengths: [
        {
          substance: 'TestSubstance',
          strength: '10mg'
        }
      ],
      markets: [
        {
          marketId: 'M001',
          nationalCode: 'NC001',
          mahAddress: 'Test Address',
          mahName: 'Test MAH',
          legalEntityName: 'Test Legal Entity'
        }
      ]
    }
  };

  const response = await request(app)
    .post(`/integration/product/${gtin}`)
    .send(productData)
    .expect(200);

  expect(response.body).to.deep.equal({ message: 'Product created successfully' });

  // Verify that the product was actually created
  const createdProduct = await Product.findOne({ gtin: gtin });
  expect(createdProduct).to.not.be.null;
  expect(createdProduct.inventedName).to.equal('TestProduct');
  expect(createdProduct.nameMedicinalProduct).to.equal('TestMedicine');
});
<<<
it('Should return a 404 error when trying to retrieve a non-existent product', async () => {
  const nonExistentGtin = '00000000000000';
  const response = await request(app)
    .get(`/integration/product/${nonExistentGtin}`)
    .expect(404);

  expect(response.body).to.deep.equal({
    error: 'Product not found'
  });
});

it('should correctly update an existing product\'s information when valid changes are submitted', async () => {
  const gtin = '02113111111164';
  const updatedProduct = {
    messageType: 'Product',
    messageTypeVersion: 1,
    senderId: 'SOR User',
    messageId: 'S000002',
    payload: {
      productCode: gtin,
      inventedName: 'Updated Product Name',
      nameMedicinalProduct: 'Updated Medicinal Name',
      internalMaterialCode: 'UPD123',
      productRecall: true,
      strengths: [
        { substance: 'Updated Substance', strength: '20mg' }
      ],
      markets: [
        {
          marketId: 'US',
          nationalCode: 'UPD456',
          mahAddress: 'Updated Address',
          mahName: 'Updated MAH',
          legalEntityName: 'Updated Legal Entity'
        }
      ]
    }
  };

  const response = await request(app)
    .post(`/integration/product/${gtin}`)
    .send(updatedProduct)
    .expect(200);

  expect(response.body).to.deep.equal({ message: 'Product updated successfully' });

  const updatedProductResponse = await request(app)
    .get(`/integration/product/${gtin}`)
    .expect(200);

  expect(updatedProductResponse.body).to.deep.equal(updatedProduct.payload);
});

it('should return a list of supported languages for a specific product and ePI type', async () => {
  const gtin = '00000000000000';
  const epiType = 'leaflet';
  const mockLanguages = ['en', 'fr', 'de'];

  const response = {
    status: 200,
    json: sinon.stub().resolves(mockLanguages),
  };

  const fetchStub = sinon.stub(global, 'fetch').resolves(response as any);

  const result = await openApiSpec.paths['/integration/listProductsLangs/{gtin}/{epiType}'].get.responses['200'].content['application/json'].schema;

  expect(result).to.deep.equal(mockLanguages);

  expect(fetchStub.calledOnce).to.be.true;
  expect(fetchStub.firstCall.args[0]).to.equal(`/integration/listProductsLangs/${gtin}/${epiType}`);

  fetchStub.restore();

it('should successfully add a new ePI (leaflet) to an existing product', async () => {
  const gtin = '02113111111164';
  const language = 'en';
  const epiType = 'leaflet';
  const leafletData = {
    messageType: 'Product',
    messageTypeVersion: 1,
    senderId: 'SOR User',
    messageId: 'S000002',
    payload: {
      language: 'en',
      productCode: '02113111111164',
      xmlFileContent: '<xml>Test leaflet content</xml>',
      otherFilesContent: [
        {
          filename: 'image.jpg',
          fileContent: 'base64encodedcontent'
        }
      ]
    }
  };

  const response = await request(app)
    .post(`/integration/epi/${gtin}/${language}/${epiType}`)
    .send(leafletData)
    .expect(200);

  expect(response.body).to.deep.equal({ description: 'Successful Operation' });
});>>>

it('Should return a 422 error when trying to create a batch with invalid expiry date format', async () => {
  const gtin = '02113111111164';
  const batchNumber = 'BATCH123';
  const invalidBatchData = {
    messageType: 'Product',
    messageTypeVersion: 1,
    senderId: 'SOR User',
    messageId: 'S000001',
    payload: {
      productCode: gtin,
      batchNumber: batchNumber,
      expiryDate: '2023-12-31', // Invalid format, should be YYMMDD
      batchRecall: false,
      dateOfManufacturing: '230101',
      manufacturerName: 'Test Manufacturer'
    }
  };

  const response = await request(app)
    .post(`/integration/batch/${gtin}/${batchNumber}`)
    .send(invalidBatchData)
    .expect(422);

  expect(response.body).to.have.property('error');
  expect(response.body.error).to.include('Invalid expiry date format');
});

it('should correctly retrieve and return the image associated with a specific product', async () => {
  const gtin = '12345678901234';
  const expectedImageData = 'base64encodedimagedata';

  const response = {
    status: 200,
    json: sinon.stub().resolves({
      payload: {
        imageData: expectedImageData
      }
    })
  };

  const fetchStub = sinon.stub().resolves(response);
  global.fetch = fetchStub;

  const result = await getProductImage(gtin);

  expect(fetchStub.calledOnce).to.be.true;
  expect(fetchStub.firstCall.args[0]).to.equal(`/integration/image/${gtin}`);
  expect(fetchStub.firstCall.args[1]).to.deep.equal({
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  expect(result).to.equal(expectedImageData);
});


it('should successfully create an audit log entry for a user action', async () => {
  const logType = 'userAction';
  const auditLogData = {
    username: 'testUser',
    reason: 'Test action',
    itemCode: 'TEST123',
    diffs: { before: 'old', after: 'new' },
    anchorId: 'anchor123',
    hashLink: 'hash456',
    metadata: { key: 'value' },
    logInfo: { timestamp: Date.now() }
  };

  const response = await request(app)
    .post(`/audit/${logType}`)
    .send(auditLogData)
    .expect(200);

  expect(response.body).to.deep.equal({ message: 'Audit log entry created successfully' });

  // Verify that the audit log entry was actually created in the database
  const createdLog = await AuditLog.findOne({ username: 'testUser', reason: 'Test action' });
  expect(createdLog).to.not.be.null;
  expect(createdLog.itemCode).to.equal('TEST123');
  expect(createdLog.diffs).to.deep.equal({ before: 'old', after: 'new' });
});

it('should return a paginated list of products when using the listProducts endpoint', async () => {
  const start = 0;
  const number = 10;
  const sort = 'asc';
  const filter = 'gtin == 00000000000000';

  const response = await request(app)
    .get(`/integration/listProducts/${start}/${number}/${sort}/${filter}`)
    .expect(200);

  expect(response.body).to.be.an('array');
  expect(response.body.length).to.be.at.most(number);

  response.body.forEach((product) => {
    expect(product).to.have.property('productCode');
    expect(product).to.have.property('inventedName');
    expect(product).to.have.property('nameMedicinalProduct');
  });

  if (response.body.length > 1) {
    const sortedProductCodes = response.body.map(p => p.productCode).sort();
    expect(response.body.map(p => p.productCode)).to.deep.equal(sortedProductCodes);
  }

  if (filter) {
    response.body.forEach((product) => {
      expect(product.productCode).to.equal('00000000000000');
    });
  }

});
