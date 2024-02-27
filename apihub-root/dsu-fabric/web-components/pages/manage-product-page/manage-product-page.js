import {createObservableObject, navigateToPage} from "../../../utils/utils.js";
import {CommonPresenterClass} from "../../CommonPresenterClass.js";

export class ManageProductPage extends CommonPresenterClass{
    constructor(element, invalidate) {
        super(element,invalidate);
        this.invalidate(async () => {
            await this.initModel();
        });
    }

    async initModel() {
        let params = webSkel.getHashParams();
        this.buttonName = "Save Product";
        this.operationFnName = "saveProduct";
        this.productData = webSkel.appServices.createNewProduct();

        if (params["product-code"]) {
            this.buttonName = "Update Product";
            this.operationFnName = "updateProduct";
            let {
                productPayload,
                productPhotoPayload,
                EPIs
            } = await webSkel.appServices.getProductData(params["product-code"]);
            let productModel = webSkel.appServices.createNewProduct(productPayload, productPhotoPayload, EPIs, []);
            if(!productModel.photo.startsWith("data:image")){
                productModel.photo = "./assets/images/no-picture.png";
            }
            //save initial state
            this.existingProduct = JSON.parse(JSON.stringify(productModel));
            //observe changes for diffs
            this.productData = createObservableObject(productModel, this.onChange.bind(this));
        }
    }

    beforeRender() {
        let tabInfo = this.productData.epiUnits.map((data) => {
            return {
                language: data.language,
                filesCount: data.filesCount,
                id: data.id,
                action: data.action,
                type: data.type
            };
        });
        tabInfo = encodeURIComponent(JSON.stringify(tabInfo));
        this.epiTab = `<epis-tab data-presenter="epis-tab" data-units="${tabInfo}"></epis-tab>`;
        let marketsInfo = this.productData.marketUnits.map((data) => {
            return {country: data.country, mah: data.mah, id: data.id, action: data.action};
        });
        marketsInfo = encodeURIComponent(JSON.stringify(marketsInfo));
        this.marketTab = `<markets-tab data-presenter="markets-tab" data-units="${marketsInfo}"></markets-tab>`;

        if (this.selected === "market") {
            this.tab = this.marketTab;
        } else {
            this.tab = this.epiTab;
        }
    }

    afterRender() {
        this.highlightTabs();
        let productCode = this.element.querySelector("#productCode");
        for (const key of webSkel.appServices.productInputFieldNames()) {
            let input = this.element.querySelector(`#${key}`)
            input.value = this.productData[key] || "";
        }
        this.element.removeEventListener("input", this.boundDetectInputChange);
        this.boundDetectInputChange = this.detectInputChange.bind(this);
        this.element.addEventListener("input", this.boundDetectInputChange);
        if (this.existingProduct) {
            this.disableProductCode(productCode);
            let button = this.element.querySelector("#accept-button");
            button.disabled = true;
            this.onChange();
        } else {
            productCode.removeEventListener("focusout", this.boundValidateProductCode);
            this.boundValidateProductCode = this.validateProductCode.bind(this, productCode);
            productCode.addEventListener("focusout", this.boundValidateProductCode);
            this.validateProductCode(productCode);
        }
        if (this.productData.photo.startsWith("data:image")) {
            let photo = this.element.querySelector("#photo");
            photo.files = this.fileListPhoto;
            let imgElement = this.element.querySelector(".product-photo");
            imgElement.src = this.productData.photo;
            imgElement.classList.remove("no-image");
        }
    }

    onChange() {
        let button = this.element.querySelector("#accept-button");
        button.disabled = JSON.stringify(this.existingProduct) === JSON.stringify(this.productData, webSkel.appServices.removeMarkedForDeletion);
    }

    highlightTabs() {
        let epi = this.element.querySelector("#epi");
        let market = this.element.querySelector("#market");
        if (this.selected === "market") {
            market.classList.remove("inactive");
            market.classList.add("highlighted");
            epi.classList.add("inactive");
            epi.classList.remove("highlighted");
        } else {
            epi.classList.remove("inactive");
            epi.classList.add("highlighted");
            market.classList.add("inactive");
            market.classList.remove("highlighted");
        }
    }

    switchTab(_target) {
        if (this.selected !== _target.getAttribute("id")) {
            this.selected = _target.getAttribute("id");
            let tabName = _target.getAttribute("id");
            let container = this.element.querySelector(".inner-tab");
            container.innerHTML = "";
            if (tabName === "epi") {
                this.tab = this.epiTab;
                this.selected = "epi";
                container.innerHTML = this.tab;
            } else {
                this.tab = this.marketTab;
                this.selected = "market";
                container.innerHTML = this.tab;
            }
            this.afterRender();
        }
    }

    disableProductCode(productCode) {
        let productCodeContainer = this.element.querySelector(".product-code");
        productCodeContainer.classList.add("disabled-form-field")
        productCode.disabled = true;
    }


    detectInputChange(event) {
        let inputName = event.target.name;
        this.productData[inputName] = event.target.value;
    }

    validateProductCode(input, event) {
        let gtin = this.element.querySelector(".gtin-validity");
        let inputContainer = this.element.querySelector(".product-code");
        let gtinValidationResult = gtinResolver.validationUtils.validateGTIN(input.value);
        if (gtinValidationResult.isValid) {
            gtin.classList.remove("invalid");
            gtin.classList.add("valid");
            gtin.innerText = "GTIN is valid";
            inputContainer.classList.remove("product-code-invalid");
        } else {
            gtin.classList.add("invalid");
            gtin.classList.remove("valid");
            gtin.innerText = gtinValidationResult.message;
            inputContainer.classList.add("product-code-invalid");
        }
    }


    async showPhoto(controller, photoInput, event) {
        let photoContainer = this.element.querySelector(".product-photo");
        let encodedPhoto = await webSkel.imageUpload(photoInput.files[0]);
        this.fileListPhoto = photoInput.files;
        photoContainer.src = encodedPhoto;
        this.productData.photo = encodedPhoto;
        controller.abort();
    }

    async uploadPhoto() {
        let photoInput = this.element.querySelector("#photo");
        const controller = new AbortController();
        photoInput.addEventListener("input", this.showPhoto.bind(this, controller, photoInput), {signal: controller.signal});
        photoInput.click();
    }

    async showAddEPIModal() {
        let modalData = await webSkel.showModal("add-epi-modal", true);
        if (modalData) {
            await this.handleEPIModalData(modalData);
        }
        //else closed without submitting
    }

    deleteEpi(_target) {
        webSkel.appServices.deleteEPI(_target, this.productData.epiUnits);
        this.invalidate();
    }

    addOrUpdateEpi(modalData) {
        const existingLeafletIndex = this.productData.epiUnits.findIndex(epi => epi.language === modalData.language);
        if (existingLeafletIndex !== -1) {
            /* epi already exists */
            if (this.productData.epiUnits[existingLeafletIndex].action === "add") {
                /* previously added epi */
                modalData.action = "add"
            } else {
                /* previously existent epi */
                modalData.action = "update"
            }
            this.productData.epiUnits[existingLeafletIndex] = modalData;
            console.log(`Updated epi, language: ${modalData.language}`);
        } else {
            /* newly added epi */
            modalData.action = "add";
            this.productData.epiUnits.push(modalData);
        }
    }

    async handleEPIModalData(data) {
        data.id = webSkel.appServices.generateID(16);
        this.addOrUpdateEpi(data)
        this.selected = "epi";
        this.invalidate();
    }

    updateMarket(modalData) {
        if (!modalData.id) {
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

    async handleMarketModalData(data) {
        if (!this.updateMarket(data)) {
            data.id = webSkel.appServices.generateID(16);
            this.productData.marketUnits.push(data);
        }
        this.invalidate();
    }

    async showAddMarketModal() {
        let excludedOptions = this.productData.marketUnits.filter(data => data.action !== "delete")
            .map(data => data.country);
        let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
        let modalData = await webSkel.showModal("markets-management-modal", {excluded: encodedExcludedOptions}, true);
        if (modalData) {
            await this.handleMarketModalData(modalData);
        }
        //else closed without submitting
    }

    productCodeCondition(element, formData) {
        let inputContainer = webSkel.getClosestParentElement(element, ".product-code");
        return !inputContainer.classList.contains("product-code-invalid");

    }

    async saveProduct(_target) {
        const conditions = {"productCodeCondition": {fn: this.productCodeCondition, errorMessage: "Invalid GTIN!"}};
        let formData = await webSkel.extractFormInformation(_target, conditions);
        if (formData.isValid) {
            for (const key in formData.data) {
                if (formData.data[key]) {
                    this.productData[key] = formData.data[key];
                }
            }
            let modal = await webSkel.showModal("progress-info-modal", {header: "Info", message: "Saving Product..."},);
            await webSkel.appServices.addProduct(this.productData);
            await webSkel.closeModal(modal);
            await navigateToPage("products-page");
        }
    }

    async updateProduct() {
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        if (formData.isValid) {
            let diffs = webSkel.appServices.getProductDiffs(this.existingProduct, this.productData);
            let confirmation = await webSkel.showModal("data-diffs-modal", {
                diffs: encodeURIComponent(JSON.stringify(diffs)),
                productData: encodeURIComponent(JSON.stringify(this.productData))
            }, true);
            if (confirmation) {
                let modal = await webSkel.showModal("progress-info-modal", {
                    header: "Info",
                    message: "Saving Product..."
                });
                await webSkel.appServices.updateProduct(this.productData, this.existingProduct.epiUnits);
                await webSkel.closeModal(modal);
                await navigateToPage("products-page");
            }
            //else cancel button pressed
        }
    }

    async viewLeaflet(_target) {
        let epiObject = webSkel.appServices.getEpitUnit(_target, this.productData.epiUnits);
        let epiPreviewModel = webSkel.appServices.getEpiPreviewModel(epiObject, this.productData);
        await webSkel.showModal("preview-epi-modal", {epidata: encodeURIComponent(JSON.stringify(epiPreviewModel))});
    }

    deleteMarket(_target) {
        let marketUnit = webSkel.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        let selectedMarketUnit = this.productData.marketUnits.find(unit => unit.id === id);
        selectedMarketUnit.action = "delete";
        //this.productData.marketUnits = this.productData.marketUnits.filter(unit => unit.id !== id);
        this.invalidate();
    }

    async viewMarket(_target) {
        let marketUnit = webSkel.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        let selectedUnit = this.productData.marketUnits.find(unit => unit.id === id);
        const encodedJSON = encodeURIComponent(JSON.stringify(selectedUnit));
        let excludedOptions = this.productData.marketUnits
            .filter(data => data.country !== selectedUnit.country && data.action !== "delete")
            .map(data => data.country);
        let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
        let modalData = await webSkel.showModal(
            "markets-management-modal",
            {
                ["updateData"]: encodedJSON,
                id: selectedUnit.id,
                excluded: encodedExcludedOptions
            }, true);
        if (modalData) {
            await this.handleMarketModalData(modalData);
        }
        //else closed without submitting
    }

    async navigateToProductsPage() {
        await navigateToPage("products-page");
    }
}
