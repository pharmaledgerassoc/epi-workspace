import utils from "./../../../utils.js";
import AppManager from "./../../../services/AppManager.js";
import {getPermissionsWatcher} from "./../../../services/PermissionsWatcher.js";

export class BootingIdentityPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            let appManager = AppManager.getInstance();
            this.userDetails = await utils.getUserDetails();
            this.username = userDetails.userName;
            if(await appManager.didWasCreated()){
                await this.checkPermissionAndNavigate();
                return;
            }
        });
    }

    beforeRender() {
    }

    afterRender(){
        let appManager = AppManager.getInstance();
        appManager.didWasCreated().then(wasCreated=>{
            if(wasCreated){
                document.querySelector(".create-identity-button").setAttribute("disabled", "disabled");
            }
        });
    }

    async checkPermissionAndNavigate(){
        let appManager = AppManager.getInstance();
        let permissionWatcher = getPermissionsWatcher(await appManager.getDID());
        if(await permissionWatcher.checkAccess()){
            appManager.getWalletAccess("groups-page");
        }else{
            const waitingAccessModal = await webSkel.showModal("waiting-access-modal");
        }
    }

    async createIdentity(_target) {
        _target.classList.add("disabled-btn");
        _target.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:18px; width: 18px; height: 18px;"></i>`;
        _target.classList.add("remove");
        const initialiseIdentityModal = await webSkel.showModal("create-identity-modal");
        let appManager = AppManager.getInstance();

        let identity;
        try {
            identity = await appManager.createIdentity(this.userDetails);
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to create identity", err);
        }
        initialiseIdentityModal.close();
        initialiseIdentityModal.remove();
        if(appManager.firstTimeAndFirstAdmin){
            await webSkel.showModal("break-glass-recovery-code-modal", true);
            await webSkel.changeToDynamicPage("groups-page");
        }else{
            this.checkPermissionAndNavigate();
        }
    }
}