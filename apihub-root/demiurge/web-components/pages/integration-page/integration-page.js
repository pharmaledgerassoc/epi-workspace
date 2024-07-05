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
        if(formData.isValid){
           let formElement = _target.closest("form");
           formElement.classList.add("hidden");
           let successSection = this.element.querySelector(".authorization-success-section");
              successSection.classList.remove("hidden");
        }
    }
    revokeAuthorization(_target){
        let formElement = this.element.querySelector("form");
        formElement.classList.remove("hidden");
        let successSection = this.element.querySelector(".authorization-success-section");
        successSection.classList.add("hidden");
    }
}