export class ManageProductPage{
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        let productCode = this.element.getAttribute("data-product-code");
        this.buttonName = "Save Product";
        this.operationFnName = "saveProduct";
        if(productCode){
            this.invalidate(async ()=>{
                let products =await $$.promisify(webSkel.client.listProducts)(undefined, undefined, [`productCode == ${productCode}`]);
                this.existingProduct = products[0];
                //let epi = await $$.promisify(webSkel.client.getEPI)(this.existingProduct.productCode, language);
                let result = await $$.promisify(webSkel.client.getProductPhoto)(this.existingProduct.productCode);

                this.existingProductPhoto = result.imageData;
                this.buttonName = "Update Product";
                this.operationFnName = "updateProduct";
            });
        }else {
            this.invalidate();
        }

        this.leafletTab = `<leaflets-tab data-presenter="leaflets-tab" data-units="null"></leaflets-tab>`;
        this.marketTab = `<markets-tab data-presenter="markets-tab" data-units="null"></markets-tab>`;
        this.formData = {};
        this.leafletUnits = [];
        this.marketUnits = [];
    }

    beforeRender(){
        if(this.selected === "market"){
            this.tab = this.marketTab;
        }else {
            this.tab = this.leafletTab;
        }
    }
    mappedKeys = {
        "productCode": "productCode",
        "brandName": "inventedName",
        "medicinalName": "nameMedicinalProduct",
        "materialCode": "internalMaterialCode",
        "strength": "strength"
    }
    highlightTabs(){
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
    }
    disableProductCode(productCode){
        let productCodeContainer = this.element.querySelector(".product-code");
        productCodeContainer.classList.add("disabled-form-field")
        productCode.disabled = true;
    }
    afterRender(){
        this.highlightTabs();

        let productCode = this.element.querySelector("#productCode");
        if(this.existingProduct){
            for(let key in this.mappedKeys){
                let input = this.element.querySelector(`#${key}`);
                input.value = this.existingProduct[this.mappedKeys[key]];
            }
            if(this.existingProductPhoto){
                let imgElement = this.element.querySelector(".product-photo");
                imgElement.src = this.existingProductPhoto;
                imgElement.classList.remove("no-image");
            }
            //else no photo existed previously
            this.disableProductCode(productCode);

            let button = this.element.querySelector("#accept-button");
            button.disabled = true;
            this.element.removeEventListener("input", this.boundDetectInputChange);
            this.boundDetectInputChange = this.detectInputChange.bind(this, button);
            this.element.addEventListener("input", this.boundDetectInputChange);
        }
        else {
            productCode.removeEventListener("focusout", this.boundValidateProductCode);
            this.boundValidateProductCode = this.validateProductCode.bind(this, productCode);
            productCode.addEventListener("focusout", this.boundValidateProductCode);
            this.validateProductCode(productCode);
        }

        for(const key in this.formData){
            if(key === "photo"){
                let photo = this.element.querySelector("#photo");
                photo.files = this.fileListPhoto;
                let imgElement = this.element.querySelector(".product-photo");
                imgElement.src = this.photo;
                imgElement.classList.remove("no-image");
                continue;
            }
            let input = this.element.querySelector(`#${key}`)
            input.value = this.formData[key] || "";
        }
    }
    detectInputChange(button, event){
        let inputName = event.target.name;
        button.disabled = !(event.target.value !== this.existingProduct[this.mappedKeys[inputName]] && inputName !== "photo");

        if(this.photo){
            button.disabled = this.photo === this.existingProductPhoto;
        }
    }
    validateProductCode(input, event){
        let gtin = this.element.querySelector(".gtin-validity");
        let inputContainer =  this.element.querySelector(".product-code");
        const GTINErrorMessage = (value) =>{
            if(/^\d{14}$/.test(value)){
                // if(value !== "00000000000000"){
                //     return "GTIN format invalid";
                // }
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
    async saveInputs(){
        let formData = await webSkel.UtilsService.extractFormInformation(this.element.querySelector("form"));
        for(const key in formData.data){
            if(formData.data[key]){
                this.formData[key] = formData.data[key];
            }
        }
    }
    async showAddEPIModal(){
        let modalData = await webSkel.UtilsService.showModalForm(document.querySelector("body"), "add-epi-modal", { presenter: "add-epi-modal"});
        if(modalData){
            await this.handleEPIModalData(modalData);
        }
        //else closed without submitting
    }
    updateLeaflet(modalData){
        let existingLeafletIndex = this.leafletUnits.findIndex(leaflet => leaflet.data.language === modalData.data.language);
        if (existingLeafletIndex !== -1) {
            this.leafletUnits[existingLeafletIndex] = modalData;
            console.log(`updated leaflet, language: ${modalData.data.language}`);
            return true;
        }
        return false;
    }
    async handleEPIModalData(data){
        data.id = webSkel.servicesRegistry.UtilsService.generateID(16);
        if(!this.updateLeaflet(data)) {
            this.leafletUnits.push(data);
        }
        let tabInfo = this.leafletUnits.map((modalData)=>{
            return {language:modalData.data.language, filesCount: modalData.elements.leaflet.element.files.length, id:modalData.id};
        });
        let container = this.element.querySelector(".leaflet-market-management");
        container.querySelector(".inner-tab").remove();
        this.leafletTab = `<leaflets-tab data-presenter="leaflets-tab" data-units=${JSON.stringify(tabInfo)}></leaflets-tab>`;
        container.insertAdjacentHTML("beforeend", this.leafletTab);
        this.invalidate(this.saveInputs.bind(this));
    }
    updateMarket(modalData){
        if(!modalData.id){
            return false;
        }
        let existingMarketIndex = this.marketUnits.findIndex(market => market.id === modalData.id);
        if (existingMarketIndex !== -1) {
            this.marketUnits[existingMarketIndex] = modalData;
            console.log(`updated market, country: ${modalData.data.country}`);
            return true;
        }
        return false;
    }
    async handleMarketModalData(data){
        if(!this.updateMarket(data)) {
            data.id =  webSkel.servicesRegistry.UtilsService.generateID(16);
            this.marketUnits.push(data);
        }
        let tabInfo = this.marketUnits.map((modalData)=>{
            return {country:modalData.data.country, mah: modalData.data.mah, id:modalData.id};
        });
        let container = this.element.querySelector(".leaflet-market-management");
        container.querySelector(".inner-tab").remove();
        this.marketTab = `<markets-tab data-presenter="markets-tab" data-units=${JSON.stringify(tabInfo)}></markets-tab>`;
        container.insertAdjacentHTML("beforeend", this.marketTab);
        this.invalidate(this.saveInputs.bind(this));
    }

   async showAddMarketModal(){
        let excludedOptions = this.marketUnits.map(modalData => modalData.data.country);
       let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
       let modalData = await webSkel.UtilsService.showModalForm(
           document.querySelector("body"),
           "markets-management-modal",
           { presenter: "markets-management-modal",
               excluded: encodedExcludedOptions
           });
       if(modalData){
           await this.handleMarketModalData(modalData);
       }
       //else closed without submitting
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
            await webSkel.servicesRegistry.ProductsService.addProduct(formData, this.photo, this.leafletUnits, this.marketUnits);
            await this.navigateToProductsPage();
        }
    }
    async updateProduct(){
       let confirmation = await webSkel.UtilsService.showModalForm(
            document.querySelector("body"),
            "data-diffs-modal",
            { presenter: "data-diffs-modal"});
    }
    async viewLeaflet(){
        console.log("to be done");
    }
    deleteLeaflet(_target){
        let leafletUnit = webSkel.UtilsService.getClosestParentElement(_target, ".leaflet-unit");
        let id = leafletUnit.getAttribute("data-id");
        this.leafletUnits = this.leafletUnits.filter(unit => unit.id !== id);
        let tabInfo = this.leafletUnits.map((modalData)=>{
            return {language:modalData.data.language, filesCount: modalData.elements.leaflet.element.files.length, id:modalData.id};
        });
        this.leafletTab = `<leaflets-tab data-presenter="leaflets-tab" data-units=${JSON.stringify(tabInfo)}></leaflets-tab>`;
        this.invalidate();
    }
    deleteMarket(_target){
        let marketUnit = webSkel.UtilsService.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        this.marketUnits = this.marketUnits.filter(unit => unit.id !== id);
        let tabInfo = this.marketUnits.map((modalData)=>{
            return {country:modalData.data.country, mah: modalData.data.mah, id:modalData.id};
        });
        this.marketTab = `<markets-tab data-presenter="markets-tab" data-units=${JSON.stringify(tabInfo)}></markets-tab>`;
        this.invalidate();
    }
    async viewMarket(_target){
        let marketUnit = webSkel.UtilsService.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        let selectedUnit = this.marketUnits.find(unit => unit.id === id);
        const encodedJSON = encodeURIComponent(JSON.stringify(selectedUnit.data));
        let excludedOptions = this.marketUnits
            .filter(modalData => modalData.data.country !== selectedUnit.data.country)
            .map(modalData => modalData.data.country);
        let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
        let modalData = await webSkel.UtilsService.showModalForm(
            document.querySelector("body"),
            "markets-management-modal",
            { presenter: "markets-management-modal",
                ["updateData"]: encodedJSON,
                id: selectedUnit.id,
                excluded: encodedExcludedOptions
            });
        if(modalData){
            await this.handleMarketModalData(modalData);
        }
        //else closed without submitting
    }
}
