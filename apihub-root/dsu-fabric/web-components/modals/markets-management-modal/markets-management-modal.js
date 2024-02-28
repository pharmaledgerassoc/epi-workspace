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
        this.excludedOptions = JSON.parse(decodeURIComponent(this.element.getAttribute("data-excluded")));
    }
    beforeRender(){
        let countryNames = gtinResolver.Countries.getListAsVM();
        if(this.excludedOptions){
            countryNames = countryNames.filter((country) => !this.excludedOptions.includes(country.value));
        }
        let stringHTML = "";
        for(let country of countryNames){
            stringHTML += `<option value="${country.value}">${country.label}</option>`;
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
        webSkel.closeModal(_target);
    }

    switchModalView(){
        let modal = webSkel.getClosestParentElement(this.element,"dialog");
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
    hasCodeOrHTML(element, formData){
        return !webSkel.appServices.hasCodeOrHTML(element.value);
    }
    async addMarketplace(_target){
        const conditions = {"hasCodeOrHTML": {fn: this.hasCodeOrHTML, errorMessage: "Invalid input!"}};
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"), conditions);
        if(formData.isValid){
            let resultObject = {};
            Object.keys(formData.data).forEach(key=>{
                resultObject[key]= formData.data[key];
            });
            if(this.id){
                resultObject.id = this.id;
            }
            webSkel.closeModal(_target, resultObject);
        }
    }
}