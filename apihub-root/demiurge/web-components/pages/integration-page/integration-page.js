export class IntegrationPage{
    constructor(element,invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender(){

    }
    async authorizeRequest(_target){
        let formData = await webSkel.extractFormInformation(_target);
        if(!formData.isValid){
            webSkel.notificationHandler.reportUserRelevantError("Please fill in all the fields");
        }
    }
}