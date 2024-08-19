import AppManager from "./../../../services/AppManager.js";

export class MyIdentitiesPage{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async ()=>{
            let appManager = AppManager.getInstance();
            try{
                this.did = await appManager.getDID();
            }catch (err){
                this.did = " - ";
                this.preventClick = true;
                return webSkel.notificationHandler.reportUserRelevantError("Failed to read DID", err);
            }
        });
        webSkel.registerAction("copyIdentity", this.copyIdentity);
    }

    beforeRender(){
    }

    afterRender(){
        if(this.preventClick){
            this.element.querySelector("#copy").classList.add("disabled");
            return;
        }
        let input = this.element.querySelector(".did-identity");
        input.value = this.did;
    }

    async copyIdentity(){
        if(this.classList.contains("disabled")){
            //if we fail to display did, we disable the copy mechanism!
            return ;
        }
        let input = this.element.querySelector(".did-identity");
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        await navigator.clipboard.writeText(input.value);
    }
}