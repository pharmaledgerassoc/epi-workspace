import IntegrationAuthorizationManager from "../../../services/IntegrationAuthorizationManager.js";

export class IntegrationPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            this.integrationAuthorizationManager = IntegrationAuthorizationManager.getInstance()
            this.state = await this.integrationAuthorizationManager.getCurrentState();
        });

    }

    beforeRender() {
    }

    async authorizeRequest(_target) {
        let formData = await webSkel.extractFormInformation(_target);
        if (!formData.isValid) {
            webSkel.notificationHandler.reportUserRelevantError("All inputs are required!!!");
        }
        let formModel = formData.data;
        try {
            await this.integrationAuthorizationManager.authorize(formModel.clientId, formModel.scope, formModel.clientSecret, formModel.tokenEndpoint)
            this.state = await this.integrationAuthorizationManager.getCurrentState();
            this.invalidate();
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(e.message);
        }
    }

    async revokeAuthorization(_target) {
        try {
            await this.integrationAuthorizationManager.revokeAuthorization()
            this.state = await this.integrationAuthorizationManager.getCurrentState();
            this.invalidate();
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(e.message);
        }
    }
}
