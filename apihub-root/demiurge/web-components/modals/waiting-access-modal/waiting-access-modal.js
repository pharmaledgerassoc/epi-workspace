import AppManager from "./../../../services/AppManager.js";
import {getPermissionsWatcher} from "../../../services/PermissionsWatcher.js";

export class WaitingAccessModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            let appManager = AppManager.getInstance();
            this.dataRecoveryKey = await appManager.getDID();
        });
    }

    beforeRender() {

    }

    afterRender() {

    }

    async submitDataRecoveryKey(target) {
        let {data} = await webSkel.extractFormInformation(this.element.querySelector("form"));
        let {recoveryKey} = data;

        let keyssiApi = require("opendsu").loadAPI("keyssi");
        try{
            keyssiApi.parse(undefined, recoveryKey);
        }catch(err){
            webSkel.notificationHandler.reportUserRelevantError("Failed to validate the Break Glass Code! Check the value that you entered and try again.");
            return;
        }

        let appManager = AppManager.getInstance();
        try{
            await appManager.useBreakGlassCode(recoveryKey);
        }catch(err){
            webSkel.notificationHandler.reportUserRelevantError("Failed to use the Break Glass Code! Check the value that you entered and try again.");
            return;
        }
        webSkel.closeModal(target);
        await webSkel.showModal("info-modal", {title: "Info", content: "Your break glass recovery code is being processed. Please wait for the access to be granted."});
    }
}