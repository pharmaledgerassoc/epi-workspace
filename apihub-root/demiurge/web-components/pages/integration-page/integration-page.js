import utils from "../../../utils.js";
import constants from "../../../constants.js";

export class IntegrationPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {

    }
    hideForm(_target) {
        let formElement = _target.closest("form");
        formElement.classList.add("hidden");
        let successSection = this.element.querySelector(".authorization-success-section");
        successSection.classList.remove("hidden");
    }
    async authorizeRequest(_target) {
        let formData = await webSkel.extractFormInformation(_target);
        if (!formData.isValid) {
            webSkel.renderToast("All inputs are required!!!", "error", 5000);
        }
        let sorUserId = await utils.getSorUserId();
        if (sorUserId && sorUserId !== "") {
            this.hideForm(_target);
        } else {
            this.hideForm(_target);
        }
        const openDSU = require("opendsu");
        const crypto = openDSU.loadAPI("crypto");
        const apiKeyAPI = openDSU.loadAPI("apiKey");
        this.apiKeyClient = apiKeyAPI.getAPIKeysClient();

        //TODO authorisation flow

        const body = {
            clientSecret: formData.data.clientSecret,
            clientId: formData.data.clientId,
            scope: formData.data.scope,
            tokenEndpoint: formData.data.tokenEndpoint
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
            webSkel.notificationHandler.reportUserRelevantError("Failed to authorize the application");
            return;
        }
        if (response.status !== 200) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to authorize the application");
            return;
        }
        const userId = await response.text();
        const apiKey = {
            secret: crypto.sha256JOSE(crypto.generateRandom(32), "base64"),
            scope: constants.WRITE_ACCESS_MODE
        }
        try {
            await this.apiKeyClient.associateAPIKey(constants.APPS.DSU_FABRIC, constants.API_KEY_NAME, userId, JSON.stringify(apiKey));
            await utils.setSorUserId(userId);
        } catch (e) {
            console.log(e)
            webSkel.notificationHandler.reportUserRelevantError("Failed to authorize the application");
            return;
        }
        await utils.addLogMessage(this.did, constants.OPERATIONS.AUTHORIZE, this.groupName);

    }

    async revokeAuthorization(_target) {
        let formElement = this.element.querySelector("form");
        formElement.classList.remove("hidden");
        let successSection = this.element.querySelector(".authorization-success-section");
        successSection.classList.add("hidden");
        const sorUserId = await utils.getSorUserId();
        try {
            await this.apiKeyClient.deleteAPIKey(constants.APPS.DSU_FABRIC, constants.API_KEY_NAME, sorUserId);
        } catch (e) {
            console.log(e)
            webSkel.notificationHandler.reportUserRelevantError("Failed to revoke the authorisation");
            return;
        }
        await utils.setSorUserId("");
        await utils.addLogMessage(this.did, constants.OPERATIONS.REVOKE, this.groupName);
    }
}