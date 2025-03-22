const {APPS, WRITE_ACCESS_MODE, API_KEY_NAME} = require('../constants');

class IntegrationAuthorizationManager {
    async authorize(clientId, scope, clientSecret, tokenEndpoint) {
        {
            const body = {
                clientSecret,
                clientId,
                scope,
                tokenEndpoint
            }

            let response;
            try {
                response = await fetch("/clientAuthenticationProxy/getUserId", {
                    method: 'POST',
                    headers: {
                        'Cookie': localStorage.getItem("accessTokenCookie"),
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body)
                })
            } catch (e) {
                console.log(e)
                throw new Error("Failed to authorize the application");
            }
            if (response.status !== 200) {
                throw new Error("Failed to authorize the application")
            }
            const userId = await response.text();
            const apiKey = {
                secret: crypto.sha256JOSE(crypto.generateRandom(32), "base64"),
                scope: WRITE_ACCESS_MODE
            }
            try {
                const apiKeyClient = this.getApiKeyClient();
                await apiKeyClient.associateAPIKey(APPS.DSU_FABRIC, API_KEY_NAME, userId, JSON.stringify(apiKey));
                await utils.setSorUserId(userId);
            } catch (e) {
                throw new Error(`Failed to authorize the application: ${e}`);

            }
            let did = await AppManager.getInstance().getDID();
            await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.AUTHORIZE, did, constants.EPI_ADMIN_GROUP)
        }
    }

    async revokeAuthorization() {
        const sorUserId = await utils.getSorUserId();
        try {
            const apiKeyClient = this.getApiKeyClient();
            await apiKeyClient.deleteAPIKey(APPS.DSU_FABRIC, API_KEY_NAME, sorUserId);
        } catch (e) {
            throw new Error(`Failed to revoke the authorisation: ${e}`);
        }
        let did = await AppManager.getInstance().getDID();
        await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.REVOKE, did, constants.EPI_ADMIN_GROUP);
    }

    async getCurrentState() {
        const sorUserId = await utils.getSorUserId();
        if (!sorUserId) {
            return "authorize";
        }
        const apiKeyClient = this.getApiKeyClient();
        if (await apiKeyClient.userHasAccess(constants.APPS.DSU_FABRIC, constants.WRITE_ACCESS_MODE, sorUserId)) {
            return "revoke-authorisation";
        } else {
            return "authorize";
        }
    }

    getApiKeyClient() {
        const apiKeyAPI = openDSU.loadAPI("apiKey");
        const apiKeyClient = apiKeyAPI.getAPIKeysClient();
        return apiKeyClient;
    }
}

let instance;

function getInstance() {
    if (!instance) {
        instance = new IntegrationAuthorizationManager();
    }
    return instance;
}

export default {getInstance};

