const fs = require('fs');
const path = require('path');

// Paths
const apihubJsonPath = path.resolve("apihub-root/external-volume/config/apihub.json");
const ssoTokenPath = path.resolve(".ssotoken");

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
    enable_oauth: true
};

/**
 * Replaces placeholders in the format ${Variable} within a string.
 *
 * @param {string} input - The input string containing placeholders.
 * @param {Object} values - A mapping of placeholder names to their replacement values.
 * @returns {string} - The string with placeholders replaced.
 */
function replacePlaceholders(input, values) {
    return input.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (match, variable) => values[variable] || match);
}

/**
 * Configures and updates the apihub.json file.
 */
function configureApiHubJson() {
    try {
        // Check if the apihub.json file exists
        if (!fs.existsSync(apihubJsonPath)) {
            console.error(`Error: File not found at path "${apihubJsonPath}".`);
            return;
        }

        // Read and replace placeholders in the JSON file
        const jsonString = fs.readFileSync(apihubJsonPath, 'utf8');
        const updatedJsonString = replacePlaceholders(jsonString, localValues);

        // Parse the JSON and apply additional updates
        const jsonData = JSON.parse(updatedJsonString);

        // Update specific configuration settings
        jsonData.oauthConfig = jsonData.oauthConfig || {};
        jsonData.oauthConfig.client = jsonData.oauthConfig.client || {};
        jsonData.oauthConfig.client.postLogoutRedirectUrl = "http://localhost:8080/?logout=true";
        jsonData.oauthConfig.client.redirectPath = "http://localhost:8080/?root=true";

        // Write the updated JSON back to the file
        fs.writeFileSync(apihubJsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
        console.log(`Successfully updated "${apihubJsonPath}".`);
    } catch (error) {
        console.error(`Error updating JSON file: ${error.message}`);
    }
}

// Execute the configuration
configureApiHubJson();
