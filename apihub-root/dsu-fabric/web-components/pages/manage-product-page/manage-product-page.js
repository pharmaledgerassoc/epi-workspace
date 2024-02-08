import {createObservableObject, getTextDirection} from "../../../utils/utils.js";

export class ManageProductPage{
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        let productCode = this.element.getAttribute("data-product-code");
        //todo: CODE-REVIEW - why do need to manage already existing dom elements name from controller and why don't use camelcase or other convention that doesn't use space character?!
        this.buttonName = "Save Product";
        this.operationFnName = "saveProduct";
        this.productData = {};
        if (productCode) {
            this.invalidate(async () => {
                let products = await $$.promisify(webSkel.client.listProducts)(undefined, undefined, [`productCode == ${productCode}`]);
                let product = products[0];
                delete product.pk;
                delete product.__version;
                delete product.__timestamp;
                let epiUnits = [];
                let languages = await $$.promisify(webSkel.client.listProductsLangs)(product.productCode);
                if (languages && languages.length > 0) {
                    for (let i = 0; i < languages.length; i++) {
                        let leafletPayload = await $$.promisify(webSkel.client.getEPI)(product.productCode, languages[i]);
                        let leafletFiles = [leafletPayload.xmlFileContent, ...leafletPayload.otherFilesContent];
                        let leafletObj = {
                            id: webSkel.servicesRegistry.UtilsService.generateID(16),
                            language: leafletPayload.language,
                            xmlFileContent: leafletPayload.xmlFileContent,
                            otherFilesContent: leafletPayload.otherFilesContent,
                            filesCount: leafletFiles.length,
                            type: leafletPayload.type
                        };
                        epiUnits.push(leafletObj);
                    }
                }
                let result = await $$.promisify(webSkel.client.getProductPhoto)(product.productCode);
                this.saveInitialState(product, result.imageData, epiUnits, []);
                this.createNewState(product, result.imageData, epiUnits, true, []);
                this.buttonName = "Update Product";
                this.operationFnName = "updateProduct";
            });
        }else {
            this.createNewState({}, "", [], false, []);
        }
        this.invalidate();
    }

    saveInitialState(product, image, epiUnits, marketUnits){
        this.existingProduct =  Object.assign({}, product);
        this.existingProduct.photo = image;
        this.existingProduct.epiUnits = JSON.parse(JSON.stringify(epiUnits));
        this.existingProduct.marketUnits = JSON.parse(JSON.stringify(marketUnits));
    }
    createNewState(product, image, epiUnits, isObservable, marketUnits){
        let productObj = Object.assign({}, product);
        productObj.photo = image;
        productObj.epiUnits = JSON.parse(JSON.stringify(epiUnits));
        productObj.marketUnits = JSON.parse(JSON.stringify(marketUnits));
        if(isObservable){
            this.productData = createObservableObject(productObj,this.onChange.bind(this));
        }else {
            this.productData = productObj;
        }

    }
    onChange(){
        let button = this.element.querySelector("#accept-button");
        button.disabled = JSON.stringify(this.existingProduct) === JSON.stringify(this.productData);
    }
    beforeRender(){
        let tabInfo = this.productData.epiUnits.map((data)=>{
            return {language:data.language, filesCount: data.filesCount, id:data.id, action:data.action, type:data.type};
        });
        tabInfo = encodeURIComponent(JSON.stringify(tabInfo));
        this.leafletTab = `<leaflets-tab data-presenter="leaflets-tab" data-units="${tabInfo}"></leaflets-tab>`;
        let marketsInfo = this.productData.marketUnits.map((data)=>{
            return {country:data.country, mah: data.mah, id:data.id, action:data.action};
        });
        marketsInfo = encodeURIComponent(JSON.stringify(marketsInfo));
        this.marketTab = `<markets-tab data-presenter="markets-tab" data-units="${marketsInfo}"></markets-tab>`;

        if (this.selected === "market") {
          this.tab = this.marketTab;
        }else {
            this.tab = this.leafletTab;
        }
    }
    keys = [
        "productCode",
        "inventedName",
        "nameMedicinalProduct",
        "internalMaterialCode",
        "strength"
    ]
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
        for(const key of this.keys){
            let input = this.element.querySelector(`#${key}`)
            input.value = this.productData[key] || "";
        }
        if(this.existingProduct){
            this.disableProductCode(productCode);
            let button = this.element.querySelector("#accept-button");
            button.disabled = true;
            this.element.removeEventListener("input", this.boundDetectInputChange);
            this.boundDetectInputChange = this.detectInputChange.bind(this);
            this.element.addEventListener("input", this.boundDetectInputChange);
            this.onChange();
        }
        else {
            productCode.removeEventListener("focusout", this.boundValidateProductCode);
            this.boundValidateProductCode = this.validateProductCode.bind(this, productCode);
            productCode.addEventListener("focusout", this.boundValidateProductCode);
            this.validateProductCode(productCode);
        }
        if(this.productData.photo){
            let photo = this.element.querySelector("#photo");
            photo.files = this.fileListPhoto;
            let imgElement = this.element.querySelector(".product-photo");
            imgElement.src = this.productData.photo;
            imgElement.classList.remove("no-image");
        }
    }
    detectInputChange(event){
        let inputName = event.target.name;
        this.productData[inputName] = event.target.value;
    }
    validateProductCode(input, event){
        let gtin = this.element.querySelector(".gtin-validity");
        let inputContainer =  this.element.querySelector(".product-code");
        let gtinValidationResult = gtinResolver.validationUtils.validateGTIN(input.value);
        if(gtinValidationResult.isValid){
            gtin.classList.remove("invalid");
            gtin.classList.add("valid");
            gtin.innerText = "GTIN is valid";
            inputContainer.classList.remove("product-code-invalid");
        }else {
            gtin.classList.add("invalid");
            gtin.classList.remove("valid");
            gtin.innerText = gtinValidationResult.message;
            inputContainer.classList.add("product-code-invalid");
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
        let encodedPhoto = await webSkel.imageUpload(photoInput.files[0]);
        this.fileListPhoto = photoInput.files;
        photoContainer.src = encodedPhoto;
        this.productData.photo = encodedPhoto;
        controller.abort();
    }
    async uploadPhoto(){
        let photoInput = this.element.querySelector("#photo");
        const controller = new AbortController();
        photoInput.addEventListener("input", this.showPhoto.bind(this,controller, photoInput),{signal:controller.signal});
        photoInput.click();
    }
    async saveInputs(){
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        for(const key in formData.data){
            if(formData.data[key]){
                this.productData[key] = formData.data[key];
            }
        }
    }
    async showAddEPIModal(){
        let modalData = await webSkel.showModal("add-epi-modal", { presenter: "add-epi-modal"});
        if(modalData){
            await this.handleEPIModalData(modalData);
        }
        //else closed without submitting
    }
    updateLeaflet(modalData){
        let existingLeafletIndex = this.productData.epiUnits.findIndex(leaflet => leaflet.language === modalData.language);
        if (existingLeafletIndex !== -1) {
            this.productData.epiUnits[existingLeafletIndex] = modalData;
            console.log(`updated leaflet, language: ${modalData.language}`);
            return true;
        }
        return false;
    }
    async handleEPIModalData(data){
        data.id = webSkel.servicesRegistry.UtilsService.generateID(16);
        if(!this.updateLeaflet(data)) {
            this.productData.epiUnits.push(data);
        }
        this.selected = "leaflet";
        this.invalidate(this.saveInputs.bind(this));
    }
    updateMarket(modalData){
        if(!modalData.id){
            return false;
        }
        let existingMarketIndex = this.productData.marketUnits.findIndex(market => market.id === modalData.id);
        if (existingMarketIndex !== -1) {
            this.productData.marketUnits[existingMarketIndex] = modalData;
            console.log(`updated market, country: ${modalData.country}`);
            return true;
        }
        return false;
    }
    async handleMarketModalData(data){
        if(!this.updateMarket(data)) {
            data.id =  webSkel.servicesRegistry.UtilsService.generateID(16);
            this.productData.marketUnits.push(data);
        }
        this.invalidate(this.saveInputs.bind(this));
    }

   async showAddMarketModal(){
        let excludedOptions = this.productData.marketUnits.map(modalData => modalData.data.country);
       let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
       let modalData = await webSkel.showModal("markets-management-modal", { presenter: "markets-management-modal", excluded: encodedExcludedOptions});
       if(modalData){
           await this.handleMarketModalData(modalData);
       }
       //else closed without submitting
    }

    async navigateToProductsPage(){
        await webSkel.changeToDynamicPage("products-page", "products-page");
    }
    productCodeCondition(element, formData) {
        let inputContainer =  webSkel.getClosestParentElement(element, ".product-code");
       return !inputContainer.classList.contains("product-code-invalid");

    }
    async saveProduct(_target){
        const conditions = {"productCodeCondition": {fn:this.productCodeCondition, errorMessage:"GTIN invalid!"} };
        let formData = await webSkel.extractFormInformation(_target, conditions);
        if(formData.isValid){
            for(const key in formData.data){
                if(formData.data[key]){
                    this.productData[key] = formData.data[key];
                }
            }
            await webSkel.servicesRegistry.ProductsService.addProduct(this.productData);
            await this.navigateToProductsPage();
        }
    }
    async updateProduct(){
        let diffs = webSkel.servicesRegistry.ProductsService.getProductDiffs(this.existingProduct, this.productData);
        let encodeDiffs = encodeURIComponent(JSON.stringify(diffs));
        let confirmation = await webSkel.showModal("data-diffs-modal", { presenter: "data-diffs-modal", diffs: encodeDiffs});
        if(confirmation){
            await webSkel.servicesRegistry.ProductsService.updateProduct(this.productData, this.existingProduct.epiUnits);
            this.productData.epiUnits = this.productData.epiUnits.filter(unit => unit.action !== "delete");
            this.productData.marketUnits = this.productData.marketUnits.filter(unit => unit.action !== "delete");
            await this.navigateToProductsPage();
        }
        //else cancel button pressed
    }

    getLeafletUnit(actionElement) {
      let leafletUnit = webSkel.getClosestParentElement(actionElement, ".leaflet-unit");
      let id = leafletUnit.getAttribute("data-id");
      let l_unit = this.productData.epiUnits.find(unit => unit.id === id);
      return l_unit;
    }

    async viewLeaflet(_target) {
      let leafletDataObj = this.getPreviewModel(this.getLeafletUnit(_target));

      await webSkel.showModal("preview-epi-modal",
        {presenter: "preview-epi-modal", epidata: encodeURIComponent(JSON.stringify(leafletDataObj))});
    }

    getPreviewModel(epiObject) {
        let previewModalTitle = `Preview ${gtinResolver.Languages.getLanguageName(epiObject.language)} ${epiObject.type}`;
        let textDirection = getTextDirection(epiObject.language)
        return {
            previewModalTitle,
            "xmlFileContent": epiObject.xmlFileContent,
            "otherFilesContent": epiObject.otherFilesContent,
            "productName": this.productData.inventedName,
            "productDescription": this.productData.nameMedicinalProduct,
            textDirection
        };
      }

    deleteLeaflet(_target){
        let leafletUnit = webSkel.getClosestParentElement(_target, ".leaflet-unit");
        let id = leafletUnit.getAttribute("data-id");
        let epiUnit = this.productData.epiUnits.find(unit => unit.id === id);
        epiUnit.action = "delete";
        //this.productData.epiUnits = this.productData.epiUnits.filter(unit => unit.id !== id);
        this.invalidate();
    }
    deleteMarket(_target){
        let marketUnit = webSkel.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        let selectedMarketUnit = this.productData.epiUnits.find(unit => unit.id === id);
        selectedMarketUnit.action = "delete";
        //this.productData.marketUnits = this.productData.marketUnits.filter(unit => unit.id !== id);
        this.invalidate();
    }
    async viewMarket(_target){
        let marketUnit = webSkel.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        let selectedUnit = this.productData.marketUnits.find(unit => unit.id === id);
        const encodedJSON = encodeURIComponent(JSON.stringify(selectedUnit.data));
        let excludedOptions = this.productData.marketUnits
            .filter(data => data.country !== selectedUnit.country)
            .map(data => data.country);
        let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
        let modalData = await webSkel.showModal(
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
