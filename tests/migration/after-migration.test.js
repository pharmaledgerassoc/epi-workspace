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

describe(`TRUST-001 Product`, () => {
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

  
});
