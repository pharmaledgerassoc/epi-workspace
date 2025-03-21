const {getConfig} = require("./conf");

let tokens = {}

async function checkExpiredToken(clientId) {
    if (tokens[clientId]) // maybe needed eventually
        return tokens[clientId];
    if (tokens[clientId])
        delete tokens[clientId];
    return getAccessToken();
}

async function getAccessToken() {
    const {tenantId, clientId, clientSecret, scope} = getConfig();
    if(clientId in tokens) return checkExpiredToken(clientId);

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("scope", scope);

    let data;
    try {
        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
        }

        data = await response.json();
    } catch (error) {
        throw new Error(`Error fetching access token: ${error}`);
    }

    if (!data.access_token) {
        throw new Error("Access token not found in the response");
    }
    console.log(`retrieved access token: ${data.access_token} for client ${clientId} at ${new Date()}  `);
    tokens[clientId] = data.access_token;
    return tokens[clientId];
}

module.exports = {
    getAccessToken
}