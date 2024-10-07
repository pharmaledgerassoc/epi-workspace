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
        if(this.submitStateHandler){
            return;
        }
        this.submitStateHandler = true;
        let submitButton = this.element.querySelector("#submitDataRecoveryKey");
        let changeSubmitState = ()=>{
            if(this.element.querySelector("#recoveryKey").value){
                submitButton.classList.remove("disabled");
                return;
            }
            submitButton.classList.add("disabled");
        };

        this.element.querySelector("#recoveryKey").oninput = changeSubmitState;
        changeSubmitState();
    }

    async submitDataRecoveryKey(target) {
        if(target.classList.contains("disabled")){
            return;
        }
        let {data} = await webSkel.extractFormInformation(this.element.querySelector("form"));
        let {recoveryKey} = data;

        let keyssiApi = require("opendsu").loadAPI("keyssi");
        try {
            keyssiApi.parse(undefined, recoveryKey);
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to validate the Break Glass Code! Check the value that you entered and try again.");
            return;
        }

        let appManager = AppManager.getInstance();

        try {
            let infoModal = await webSkel.showModal("info-modal", {
                title: "Info",
                content: "Your break glass recovery code is being processed. Please wait for the access to be granted."
            });
            webSkel.getClosestParentElement(target, "dialog").style.display = "none"
            await appManager.useBreakGlassCode(recoveryKey);
            infoModal.close();
            infoModal.remove();
            webSkel.closeModal(target);
        } catch (err) {
            webSkel.getClosestParentElement(target, "dialog").style.display = "";
            webSkel.notificationHandler.reportUserRelevantError("Failed to use the Break Glass Code! Check the value that you entered and try again.");
            return;
        }

    }
}
