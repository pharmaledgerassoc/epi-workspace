export class ManageProductPage{
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
        this.leafletTab = `<leaflets-tab data-presenter="leaflets-tab"></leaflets-tab>`;
        this.marketTab = `<markets-tab data-presenter="markets-tab"></markets-tab>`;
        webSkel.observeChange("manage-product-page", this.invalidate);
        this.formData = {};
    }

    beforeRender(){
        if(!this.selected){
            this.tab = this.leafletTab;
        }
    }
    afterRender(){
        let leaflet = this.element.querySelector("#leaflet");
        let market = this.element.querySelector("#market");
        if(this.selected === "market"){
            market.classList.remove("inactive");
            market.classList.add("highlighted");
            leaflet.classList.add("inactive");
            leaflet.classList.remove("highlighted");
        }else {
            leaflet.classList.remove("inactive");
            leaflet.classList.add("highlighted");
            market.classList.add("inactive");
            market.classList.remove("highlighted");
        }
        for(const key in this.formData){
            if(key === "photo"){
                let photo = this.element.querySelector("#photo");
                photo.files = this.fileListPhoto;
                let photoContainer = this.element.querySelector(".product-photo");
                photoContainer.src = this.photo;
                continue;
            }
            let input = this.element.querySelector(`#${key}`)
            input.value = this.formData[key] || "";
        }
        let productCode = this.element.querySelector("#productCode");
        productCode.removeEventListener("focusout", this.boundValidateProductCode);
        this.boundValidateProductCode = this.validateProductCode.bind(this, productCode);
        productCode.addEventListener("focusout", this.boundValidateProductCode);
        this.validateProductCode(productCode);
    }
    validateProductCode(input, event){
        let gtin = this.element.querySelector(".gtin-validity");
        let inputContainer =  this.element.querySelector(".product-code");
        const GTINErrorMessage = (value) =>{
            if(/^\d{14}$/.test(value)){
                if(value !== "00000000000000"){
                    return "GTIN format invalid";
                }
                return;
            }
            return "GTIN length should be 14";
        };
        let msg = GTINErrorMessage(input.value);
        if(msg){
            gtin.classList.add("invalid");
            gtin.classList.remove("valid");
            gtin.innerText = msg;
            inputContainer.classList.add("product-code-invalid");
        }else {
            gtin.classList.remove("invalid");
            gtin.classList.add("valid");
            gtin.innerText = "GTIN is valid";
            inputContainer.classList.remove("product-code-invalid");
        }
    }
    switchTab(_target){
        if(this.selected !== _target.getAttribute("id")){
            this.selected = _target.getAttribute("id");
            let tabName = _target.getAttribute("id");
            let container = this.element.querySelector(".leaflet-market-management");
            container.querySelector(".inner-tab").remove();
            if(tabName === "leaflet"){
                this.tab = this.leafletTab;
                this.selected = "leaflet";
                container.insertAdjacentHTML("beforeend", this.tab);
            }else {
                this.tab = this.marketTab;
                this.selected = "market";
                container.insertAdjacentHTML("beforeend", this.tab);
            }
            this.afterRender();
        }
    }
    async showPhoto(controller, photoInput, event){
        let photoContainer = this.element.querySelector(".product-photo");
        let encodedPhoto = await webSkel.UtilsService.imageUpload(photoInput.files[0]);
        this.fileListPhoto = photoInput.files;
        photoContainer.src = encodedPhoto;
        this.photo = encodedPhoto;
        controller.abort();
    }
    async uploadPhoto(){
        let photoInput = this.element.querySelector("#photo");
        const controller = new AbortController();
        photoInput.addEventListener("input", this.showPhoto.bind(this,controller, photoInput),{signal:controller.signal});
        photoInput.click();
    }
    async showAddEPIModal(){
        let formData = await webSkel.UtilsService.extractFormInformation(this.element.querySelector("form"));
        for(const key in formData.data){
            if(formData.data[key]){
                this.formData[key] = formData.data[key];
            }
        }
        await webSkel.UtilsService.showModal(document.querySelector("body"), "add-epi-modal", { presenter: "add-epi-modal"});
    }
   async showAddMarketModal(){
       let formData = await webSkel.UtilsService.extractFormInformation(this.element.querySelector("form"));
       for(const key in formData.data){
           if(formData.data[key]){
               this.formData[key] = formData.data[key];
           }
       }
        await webSkel.UtilsService.showModal(document.querySelector("body"), "markets-management-modal", { presenter: "markets-management-modal"});
    }
    refresh(){
        this.invalidate();
    }
    async navigateToProductsPage(){
        await webSkel.changeToDynamicPage("products-page", "products-page");
    }
    productCodeCondition(element, formData) {
        let inputContainer =  webSkel.UtilsService.getClosestParentElement(element, ".product-code");
       return !inputContainer.classList.contains("product-code-invalid");

    }
    async saveProduct(_target){
        const conditions = {"productCodeCondition": {fn:this.productCodeCondition, errorMessage:"GTIN invalid!"} };
        let formData = await webSkel.UtilsService.extractFormInformation(_target, conditions);
        if(formData.isValid){
            console.log("form is valid");
        }
    }
}
