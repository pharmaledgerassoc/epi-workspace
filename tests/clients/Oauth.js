const axios = require('axios');
const { ApiClient } = require("./Client");

class OAuth extends ApiClient {

    tokens = {}

    constructor(config) {
        super(config);
        this.setPrivateHeaders({
            "Content-Type": "application/x-www-form-urlencoded"
        })
    }

    async checkExpiredToken(clientId) {
        if (this.tokens[clientId]) // maybe needed eventually
            return this.tokens[clientId];
        if (this.tokens[clientId])
            delete this.tokens[clientId];
        return this.getAccessToken();
    }

    async getAccessToken() {
        const {tenantId, clientId, clientSecret, scope} = this.config;
        if(clientId in this.tokens) return this.checkExpiredToken(clientId);

        const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

        const params = new URLSearchParams();
        params.append("grant_type", "client_credentials");
        params.append("client_id", clientId);
        params.append("client_secret", clientSecret);
        params.append("scope", scope);

        let data;
        try {
            const response = await axios.post(tokenUrl, params, {headers: this.getHeaders()});


            if (response.status !== 200) {
                const errorText = response.statusText;
                throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
            }

            data = response.data;
        } catch (error) {
            throw new Error(`Error fetching access token: ${error}`);
        }

        if (!data.access_token) {
            throw new Error("Access token not found in the response");
        }
        console.log(`retrieved access token: ${data.access_token} for client ${clientId} at ${new Date()}  `);
        this.tokens[clientId] = data.access_token;
        return this.tokens[clientId];
    }
}

module.exports = {
    OAuth
};