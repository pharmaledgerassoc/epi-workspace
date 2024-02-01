export class MarketsManagementModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.id = this.element.getAttribute("data-id");
        let encodedData = this.element.getAttribute("data-updateData");
        this.buttonName = "Accept";
        if(encodedData){
            this.existingData = JSON.parse(decodeURIComponent(encodedData));
            this.buttonName = "Update Marketplace";
        }
        this.invalidate();
    }
    beforeRender(){
        this.countryNames = ["Romania", "UK", "US"];
        let stringHTML = "";
        for(let country of this.countryNames){
            stringHTML += `<option value="${country}">${country}</option>`;
        }
        this.countries = stringHTML;
    }
    afterRender(){
        if(this.existingData){
            let keys = ["nationalCode", "mah", "entityName"];
            for(let key of keys){
                let input = this.element.querySelector(`#${key}`);
                input.value = this.existingData[key];
            }
            let option = this.element.querySelector(`option[value = ${this.existingData.country}]`);
            option.selected = true;
        }
    }
    closeModal(_target) {
        webSkel.UtilsService.closeModal(_target);
    }

    switchModalView(){
        let modal = webSkel.UtilsService.getClosestParentElement(this.element,"dialog");
        if(!modal.getAttribute("data-expanded")){
            modal.setAttribute("data-expanded", "true")
            modal.style.width = "95%";
            modal.style.maxWidth = "95vw";
            this.element.style.marginLeft = "0";
        }else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "75%";
            modal.style.maxWidth = "75vw";
            this.element.style.marginLeft = "240px";
        }
    }
    async addMarketplace(_target){
        let formData = await webSkel.UtilsService.extractFormInformation(this.element.querySelector("form"));
        if(formData.isValid){
            if(this.id){
                formData.id = this.id;
            }
            webSkel.UtilsService.closeModal(_target, formData);
        }
    }
}