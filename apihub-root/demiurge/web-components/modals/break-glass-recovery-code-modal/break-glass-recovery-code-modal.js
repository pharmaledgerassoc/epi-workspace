import AppManager from "./../../../services/AppManager.js";

export class BreakGlassRecoveryCodeModal{
    constructor(element,invalidate) {
        this.element=element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            let appManager = AppManager.getInstance();
            try{
                this.dataRecoveryKey = await appManager.getBreakGlassCode();
            }catch(err){
                return webSkel.notificationHandler.reportUserRelevantError("Failed to retrieve the break glass code", err);
            }
        });
    }
    beforeRender(){
    }
    afterRender(){
    }
}