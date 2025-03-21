const fs = require('fs');
const path = require('path');

// Paths
const apihubJsonPath = path.resolve("apihub-root/external-volume/config/apihub.json");
const ssoTokenPath = path.resolve(".ssotoken");

const {patchJSONFile} = require('./patchingUtils');

// Local values for replacement
const localValues = {
    server_authentication: true,
    dns_name: "localhost:8080",
    logout_url: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/logout",
    client_secret: fs.existsSync(ssoTokenPath) ? fs.readFileSync(ssoTokenPath, 'utf8').trim() : '',
    client_id: "e65a2002-324f-48f2-b32f-a40b76d5f821",
    token_endpoint: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/v2.0/token",
    authorization_endpoint: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/v2.0/authorize",
    issuer: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/oauth2/v2.0/",
    whitelist: "https://login.microsoftonline.com",
    oauth_jwks_endpoint: "https://login.microsoftonline.com/cbfd70ab-7873-4375-bf63-334828046900/discovery/v2.0/keys",
    enable_oauth: true,
    db_uri: "http://localhost:5984",
    db_user: "admin",
    db_secret: "adminpw",
    db_debug: true
};


patchJSONFile(apihubJsonPath, localValues, (jsonData) => {
    // Update specific configuration settings
    jsonData.oauthConfig = jsonData.oauthConfig || {};
    jsonData.oauthConfig.client = jsonData.oauthConfig.client || {};
    jsonData.oauthConfig.client.postLogoutRedirectUrl = "http://localhost:8080/?logout=true";
    jsonData.oauthConfig.client.redirectPath = "http://localhost:8080/?root=true";

    return jsonData;
});
