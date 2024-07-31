import utils from "./../../../utils.js";
import AppManager from "./../../../services/AppManager.js";

export class BootingIdentityPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            let appManager = AppManager.getInstance();
            if(await appManager.didWasCreated()){
                await webSkel.changeToDynamicPage("groups-page", "groups-page");
                return;
            }
            this.userDetails = await utils.getUserDetails();
            this.username = userDetails.userName;
        });
    }

    beforeRender() {
    }

    async createIdentity(_target) {
        _target.classList.add("disabled-btn");
        _target.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:18px; width: 18px; height: 18px;"></i>`;
        _target.classList.add("remove");
        const initialiseIdentityModal = await webSkel.showModal("create-identity-modal");
        let appManager = AppManager.getInstance();

        try {
            await appManager.createIdentity(this.userDetails);
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to create identity", err);
        }
        initialiseIdentityModal.close();
        initialiseIdentityModal.remove();
        if(appManager.firstTimeAndFirstAdmin){
            await webSkel.showModal("break-glass-recovery-code-modal", true);
            await webSkel.changeToDynamicPage("groups-page");
        }else{
            appManager.getWalletAccess("groups-page");
        }

        /*setTimeout(async () => {
            createdIdentityModal.close();
            createdIdentityModal.remove();
            const waitingAccessModal = await webSkel.showModal("waiting-access-modal");
        }, 3000);*/
    }
}