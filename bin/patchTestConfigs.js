const fs = require('fs');
const path = require('path');

// Paths
const testsConfigFile = path.resolve("tests/config/test.config.json");
const browserStackConfigFile = path.resolve("browserstack.yml");
const ssoTokenPath = path.resolve(".ssotoken");
const browserstackTokenPath = path.resolve(".browserstack");

const {patchJSONFile, patchFile} = require('./patchingUtils');

// Local values for replacement
const localValues = {
    logout_url: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/logout",
    client_secret: fs.existsSync(ssoTokenPath) ? fs.readFileSync(ssoTokenPath, 'utf8').trim() : '',
    client_id: "e65a2002-324f-48f2-b32f-a40b76d5f821",
    tenant_id: "cbfd70ab-7873-4375-bf63-334828046900",
    token_endpoint: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/v2.0/token",
    authorization_endpoint: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/v2.0/authorize",
    issuer: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/v2.0/",
    oauth_jwks_endpoint: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/discovery/v2.0/keys",
    scope: "api://e65a2002-324f-48f2-b32f-a40b76d5f821/.default",
    lwa_endpoint: "http://localhost:8080/lwa",
    gtin_persistence: true,
    senderId: "auto-tester@pdmfc.com",
    browserstack_token: fs.existsSync(browserstackTokenPath) ? fs.readFileSync(browserstackTokenPath, 'utf8').trim() : '',
};


patchJSONFile(testsConfigFile, localValues);
patchFile(browserStackConfigFile, localValues)
