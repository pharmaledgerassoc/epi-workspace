import {getUserDetails} from "./../../../utils.js";
import AppManager from "./../../../services/AppManager.js";

export class BootingIdentityPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async ()=>{
            this.userDetails = await getUserDetails();
            this.username = userDetails.userName;
        });
    }

    async createIdentity(_target) {
        _target.classList.add("disabled-btn");
        _target.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:18px; width: 18px; height: 18px;"></i>`;
        _target.classList.add("remove");
        const initialiseIdentityModal = await webSkel.showModal("create-identity-modal");

        try{
            await AppManager.getInstance().createIdentity(this.userDetails);
        }catch(err){

        }
        initialiseIdentityModal.close();
        initialiseIdentityModal.remove();
        const createdIdentityModal = await webSkel.showModal("break-glass-recovery-code-modal");

            setTimeout(async()=>{
                createdIdentityModal.close();
                createdIdentityModal.remove();
                const waitingAccessModal = await webSkel.showModal("waiting-access-modal");
            },3000)

    }
}