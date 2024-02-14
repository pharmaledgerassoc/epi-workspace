import {
    getEpiPreviewModel,
    getEpitUnit,
} from "../manage-product-page/manage-product-utils.js";

import {
    createObservableObject,
    getTextDirection
} from "../../../utils/utils.js";

import {
    reverseInputFormattedDateString,
    getLastDayOfMonth,
    createDateInput,
    parseDateStringToDateInputValue,
    getDateInputTypeFromDateString,
    formatBatchExpiryDate,
    prefixMonthDate,
    removeMarkedForDeletion
} from "./manage-batch-utils.js"

export class ManageBatchPage {

    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        ({gtin: this.gtin, batchId: this.batchId} = webSkel.getHashParams());
        if (this.gtin) {
            this.mode = "EDIT";
        } else {
            this.mode = "ADD";
        }
        this.invalidate(async () => {
            await this.initializePageMode(this.mode);
        });
    }

    async initializePageMode(mode) {
        const loadAddData = async () => {
            const products = await $$.promisify(webSkel.client.listProducts)();
            if (!products) {
                console.error("Encountered an error trying to fetch All Products")
            }
            return products;
        }
        const loadEditData = async () => {
            const batch = await $$.promisify(webSkel.client.getBatchMetadata)(this.gtin, this.batchId);
            if (!batch) {
                console.error(`Unable to find batch with ID: ${this.batchId}.`);
                return {batch: undefined, product: undefined};
            }
            const product = await $$.promisify(webSkel.client.getProductMetadata)(this.gtin);
            if (!product) {
                console.error(`Unable to find product with product code: ${batch.productCode} for batch ID: ${this.batchId}.`);
                return {batch, product: undefined};
            }
            return {batch, product};
        };
        const formatBatchForDiffProcess = (batch) => {
            Object.keys(batch).forEach(batchKey => {
                if (batchKey.startsWith("__")) {
                    delete batch[batchKey];
                }
            });
            delete batch["pk"];
        }
        const formatEPIsForDiffProcess = (EPIs) => {
            return EPIs.map(EPI => {
                Object.keys(EPI).forEach(key => {
                    if (key.startsWith("__")) {
                        delete EPI[key];
                    }
                });
                delete EPI["pk"];
                EPI.id = webSkel.appServices.generateID(16);
                return EPI;
            });
        }
        let pageModes = {
            ADD: async () => {
                const products = await loadAddData();
                const productOptions = products.map(product => {
                    return `<option value="${product.productCode}"> ${product.productCode} - ${product.inventedName} </option>`;
                }).join("");

                return {
                    pageTitle: "Add Batch",
                    formFieldStateClass: "",
                    inputState: "",
                    inputStateDisabledClass: "",
                    formActionButtonText: "Add Batch",
                    formActionButtonFunction: "addBatch",
                    batchVersion: 0,
                    products: products,
                    productMedicinalName: "-",
                    enableExpiryDate: "on",
                    enableExpiryDateCheck: "checked",
                    productCodeInput: `<select name="productCode" id="productCode">
                                            <option selected value id="placeholder-option">Select a product</option>
                                            ${productOptions}
                                        </select>`,
                    penImage: `<img class="pen-square" src="./assets/icons/pen-square.svg" alt="pen-square">`,
                    leafletsInfo: "[]",
                    EPIs: [],
                    updatedEPIs: []
                }
            },
            EDIT: async () => {
                let {batch, product} = await loadEditData();
                formatBatchForDiffProcess(batch);
                let EPIs = []
                const batchLanguages = await $$.promisify(webSkel.client.listBatchLangs)(this.gtin, this.batchId);
                const leafletPromises = batchLanguages.map(batchLang =>
                    $$.promisify(webSkel.client.getEPI)(this.gtin, batchLang, this.batchId)
                );
                const leaflets = await Promise.all(leafletPromises);
                EPIs.push(...leaflets);
                formatEPIsForDiffProcess(EPIs);

                const leafletsInfo = this.getEncodedEPIS(EPIs);
                let batchModel = this.createNewState(batch, EPIs);
                let enableExpiryDayCheck = "";
                if (batchModel.enableExpiryDay === "on") {
                    enableExpiryDayCheck = "checked";
                }
                return {
                    pageTitle: "Edit Batch",
                    formFieldStateClass: "disabled-form-field",
                    inputState: "disabled",
                    inputStateDisabledClass: "text-input-disabled",
                    formActionButtonText: "Update Batch",
                    formActionButtonFunction: "updateBatch",
                    batch: batchModel,
                    batchName: batchModel.batch,
                    batchVersion: batchModel.__version, //TODO use getBatchVersion API when it becomes available
                    product: product,
                    productCode: product.productCode,
                    packagingSiteName: batchModel.packagingSiteName,
                    enableExpiryDate: batchModel.enableExpiryDay,
                    enableExpiryDateCheck: enableExpiryDayCheck,
                    productName: product.inventedName,
                    productMedicinalName: product.nameMedicinalProduct,
                    productCodeInput: `<input type="text" class="text-input" name="productCode" id="productCode" autocomplete="off" disabled
                                        value="${product.productCode}">`,
                    penImage: "",
                    formActionButtonState: "disabled",
                    leafletsInfo: leafletsInfo,
                    updatedBatch: createObservableObject(this.createNewState(batch, EPIs), this.onChange.bind(this)),
                };
            }
        };
        if (pageModes[mode]) {
            const modeConfig = await pageModes[mode]();
            Object.keys(modeConfig).forEach(key => {
                this[key] = modeConfig[key];
            });
        } else {
            console.error("Invalid Page Mode:", mode);
        }
    }

    getEncodedEPIS(EPIsObj) {
        let formattedEPIs = EPIsObj.map((data) => {
            return {
                language: data.language,
                filesCount: data.otherFilesContent.length + 1,
                id: data.id,
                action: data.action,
                type: data.type
            };
        });
        return encodeURIComponent(JSON.stringify(formattedEPIs));
    }

    createNewState(batchRef = {}, EPIs = []) {
        let batchObj = Object.assign({}, batchRef);
        batchObj.EPIs = JSON.parse(JSON.stringify(EPIs));
        return batchObj;
    }

    beforeRender() {
    }

    onChange() {
        this.element.querySelector("#formActionButton").disabled =
            JSON.stringify(this.batch) === JSON.stringify(this.updatedBatch, removeMarkedForDeletion);
    }

    detectInputChange(event) {
        let inputName = event.target.name;
        if (inputName === "expiryDate") {
            this.updatedBatch.expiryDate = formatBatchExpiryDate(event.target.value);
        } else {
            if (inputName === "enableExpiryDay") {
                event.target.value = event.target.checked ? "on" : "off";
            }
            this.updatedBatch[inputName] = event.target.value;
        }
    }

    afterRender() {
        /*TODO dictionary for each key/attribute(classes,id,etc) and iterate over it */
        /*TODO replace createDateInput with date web component if necessary */

        const dateContainer = this.element.querySelector('#custom-date-icon');
        const enableDayCheckbox = this.element.querySelector('#enableExpiryDay');
        const svg1 = dateContainer.querySelector('#svg1');
        const svg2 = dateContainer.querySelector('#svg2');

        const pageModes = {
            SHARED: () => {
                this.element.querySelector('#enableExpiryDay').addEventListener('change', () => {
                    const oldDateInput = dateContainer.querySelector('#date');
                    const isChecked = enableDayCheckbox.checked;
                    svg1.style.display = isChecked ? 'none' : 'block';
                    svg2.style.display = isChecked ? 'block' : 'none';
                    let newDateInput;
                    if (isChecked) {
                        /* MM-YYYY -> DD-MM-YYYY */
                        const [year, month] = oldDateInput.value.split('-');
                        const assignValue = `${year}-${month}-${getLastDayOfMonth(year, month)}`;
                        newDateInput = createDateInput('date', assignValue);
                    } else {
                        /* DD-MM-YYYY -> MM-YYYY */
                        const assignValue = oldDateInput.value.slice(0, 7);
                        newDateInput = createDateInput('month', assignValue);
                    }
                    dateContainer.replaceChild(newDateInput, oldDateInput);
                });
            },
            ADD: () => {
                dateContainer.insertBefore(createDateInput('date'), dateContainer.firstChild);
                this.element.querySelector('#productCode').addEventListener('change', async (event) => {
                    const {value: productCode} = event.target;
                    const {
                        inventedName,
                        nameMedicinalProduct: medicinalProductName
                    } = this.products.find(product => product.productCode === productCode) || {};
                    this.element.querySelector('#nameMedicinalProduct').value = medicinalProductName;
                    this.element.querySelector('#inventedName').value = inventedName;
                    this.element.querySelector('#placeholder-option').disabled = true;
                });
                pageModes.SHARED();
            },
            EDIT: () => {
                const dateType = getDateInputTypeFromDateString(this.batch.expiryDate);
                const expiryDateInput = createDateInput(dateType, reverseInputFormattedDateString(parseDateStringToDateInputValue(this.batch.expiryDate)));
                dateContainer.insertBefore(expiryDateInput, dateContainer.firstChild);
                this.element.removeEventListener("input", this.boundDetectInputChange);
                this.boundDetectInputChange = this.detectInputChange.bind(this);
                this.element.addEventListener("input", this.boundDetectInputChange);
                pageModes.SHARED();
            }

        }
        pageModes[this.mode]();
    }

    async navigateToBatchesPage() {
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }

    async showAddEPIModal() {
        let modalData = await webSkel.showModal("add-epi-modal", true);
        if (modalData) {
            await this.handleEPIModalData(modalData);
        }
    }

    async saveInputs() {
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        for (const key in formData.data) {
            if (this.updatedBatch[key]) {
                this.updatedBatch[key] = formData.data[key];
            }
        }
    }

    reloadLeafletTab(encodedEPIsData) {
        const leafletTab = this.element.querySelector('epis-tab')
        leafletTab.setAttribute('data-units', encodedEPIsData)
        leafletTab.webSkelPresenter.invalidate();
    }

    deleteEpi(_target) {
        let EPIUnit = webSkel.getClosestParentElement(_target, ".epi-unit");
        let EPIId = EPIUnit.getAttribute("data-id");
        let deletedEPI = this.updatedBatch.EPIs.find(epi => epi.id === EPIId);
        deletedEPI.action = "delete";
        this.reloadLeafletTab(this.getEncodedEPIS(this.updatedBatch.EPIs));
    }

    addOrUpdateEpi(EPIData) {
        const existingLeafletIndex = (this.updatedBatch.EPIs || []).findIndex(epi => epi.language === EPIData.language);
        if (existingLeafletIndex !== -1) {
            /* epi already exists */
            if (this.updatedBatch.EPIs[existingLeafletIndex].action === "add") {
                /* previously added epi */
                EPIData.action = "add"
            } else {
                /* previously existent epi */
                EPIData.action = "update"
            }
            this.updatedBatch.EPIs[existingLeafletIndex] = EPIData;
            console.log(`Updated epi, language: ${EPIData.language}`);
        } else {
            /* newly added epi */
            EPIData.action = "add";
            this.updatedBatch.EPIs.push(EPIData);
        }
    }

    async handleEPIModalData(EPIData) {
        EPIData.id = webSkel.appServices.generateID(16);
        this.addOrUpdateEpi(EPIData);
        this.onChange();
        this.reloadLeafletTab(this.getEncodedEPIS(this.updatedBatch.EPIs));
    }


    async addBatch() {
        const {data} = (await webSkel.extractFormInformation(this.element.querySelector("form")));
        data.expiryDate = formatBatchExpiryDate(data.expiryDate);
        if (getDateInputTypeFromDateString(data.expiryDate) === 'month') {
            data.expiryDate = prefixMonthDate(data.expiryDate);
        }
        if (await webSkel.appServices.addBatch(data, this.updatedBatch.EPIs) === true) {
            await webSkel.changeToDynamicPage("batches-page", "batches-page");
        }
    }

    async updateBatch() {
        const {data} = (await webSkel.extractFormInformation(this.element.querySelector("form")));
        let expiryDate = formatBatchExpiryDate(data.expiryDate);
        if (getDateInputTypeFromDateString(expiryDate) === 'month') {
            expiryDate = prefixMonthDate(expiryDate);
        }
        this.updatedBatch.expiryDate = expiryDate;
        this.updatedBatch.enableExpiryDay = data.enableExpiryDay;
        let diffs = webSkel.appServices.getBatchDiffs(this.batch, this.updatedBatch);
        let encodeDiffs = encodeURIComponent(JSON.stringify(diffs));
        let confirmation = await webSkel.showModal("data-diffs-modal", {diffs: encodeDiffs}, true);
        if (confirmation) {
            if (await webSkel.appServices.updateBatch(this.batch.EPIs, this.updatedBatch) === true) {
                await webSkel.changeToDynamicPage("batches-page", "batches-page");
            }
        }
    }

    async viewLeaflet(_target) {
        let epiObject = getEpitUnit(_target, this.batch.EPIs);
        let epiPreviewModel = getEpiPreviewModel(epiObject,);
        await webSkel.showModal("preview-epi-modal", {epidata: encodeURIComponent(JSON.stringify(epiPreviewModel))});
    }


}
