import utils from "../utils.js";
import constants from "../constants.js";
import AuditService from "./AuditService.js";
import AppManager from "./AppManager.js";
const openDSU = require("opendsu");
const crypto = openDSU.loadAPI("crypto");

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
                scope: constants.WRITE_ACCESS_MODE
            }
            try {
                const apiKeyClient = this.getApiKeyClient();
                await apiKeyClient.associateAPIKey(constants.APPS.DSU_FABRIC, constants.API_KEY_NAME, userId, JSON.stringify(apiKey));
                await utils.setSorUserId(userId);
            } catch (e) {
                console.log(e)
                throw new Error("Failed to authorize the application");
            }
            let did = await AppManager.getInstance().getDID();
            await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.AUTHORIZE, did, constants.EPI_ADMIN_GROUP)
        }
    }

    async revokeAuthorization() {
        const sorUserId = await utils.getSorUserId();
        try {
            const apiKeyClient = this.getApiKeyClient();
            await apiKeyClient.deleteAPIKey(constants.APPS.DSU_FABRIC, constants.API_KEY_NAME, sorUserId);
        } catch (e) {
            console.log(e)
            throw new Error("Failed to revoke the authorisation");
        }
        await utils.setSorUserId("");
        /*
            * TODO add audit log
            * */
        // await utils.addLogMessage(this.did, constants.AUDIT_OPERATIONS.REVOKE, this.groupName);

    }

    async getCurrentState() {
        let sorUserId = await utils.getSorUserId();

        if (sorUserId && sorUserId !== "") {
            return "authorize"
        } else {
            return "revoke-authorisation"
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

