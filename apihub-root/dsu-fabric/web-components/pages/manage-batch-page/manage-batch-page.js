import {getEpiPreviewModel, getEpitUnit, removeMarkedForDeletion} from "../manage-product-page/manage-product-utils.js";
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
    configureEPIForAddition,
    prefixMonthDate
} from "./manage-batch-utils.js"

export class ManageBatchPage {

    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        ({mode: this.mode, gtin: this.gtin, batchId: this.batchId} = webSkel.getHashParams());
        this.invalidate(async () => {
            await this.initializePageMode(this.mode);
        });
    }

    async initializePageMode(mode) {
        debugger;
        const loadAddData = async () => {
            const products = await $$.promisify(webSkel.client.listProducts)(undefined);
            if (!products) {
                console.error("Encountered an error trying to fetch All Products")
            }
            return products
        }
        const loadEditData = async () => {
            const batch = await $$.promisify(webSkel.client.readBatchMetadata)(this.gtin, this.batchId);
            if (!batch) {
                console.error(`Unable to find batch with ID: ${this.batchId}.`);
                return {batch: undefined, product: undefined};
            }
            const product = await $$.promisify(webSkel.client.readProductMetadata)(this.gtin);
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
                    productCodeInput: `<select name="productCode" id="productCode">
                                            <option selected value id="placeholder-option">Select a product</option>
                                            ${productOptions}
                                        </select>`,
                    penImage: `<img class="pen-square" src="./assets/icons/pen-square.svg" alt="pen-square">`,
                    leafletsInfo: "[]",
                    EPIs: []
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
                let updatedBatch = createObservableObject(this.createNewState(batch, EPIs), this.onChange.bind(this));
                return {
                    pageTitle: "Edit Batch",
                    formFieldStateClass: "disabled-form-field",
                    inputState: "disabled",
                    inputStateDisabledClass: "text-input-disabled",
                    formActionButtonText: "Update Batch",
                    formActionButtonFunction: "updateBatch",
                    batch: batchModel,
                    batchName: batch.batch,
                    batchVersion: batch.__version, //TODO use getBatchVersion API when it becomes available
                    product: product,
                    productCode: product.productCode,
                    productName: product.inventedName,
                    productMedicinalName: product.nameMedicinalProduct,
                    productCodeInput: `<input type="text" class="text-input" name="packagingSite" id="productCode" autocomplete="off" disabled
                                        value="${product.productCode}">`,
                    penImage: "",
                    formActionButtonState: "disabled",
                    leafletsInfo: leafletsInfo,
                    updatedBatch: updatedBatch,
                    EPIs: updatedBatch.EPIs
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
            this.updatedBatch[inputName] = event.target.value;
        }
    }

    afterRender() {
        /*TODO dictionary for each key/attribute(classes,id,etc) and iterate over it */
        /*TODO replace createDateInput with date web component if necessary */

        const dateContainer = this.element.querySelector('#custom-date-icon');
        const enableDayCheckbox = this.element.querySelector('#enable-day-checkbox');
        const svg1 = dateContainer.querySelector('#svg1');
        const svg2 = dateContainer.querySelector('#svg2');

        const pageModes = {
            SHARED: () => {
                this.element.querySelector('#enable-day-checkbox').addEventListener('change', () => {
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
                dateContainer.insertBefore(createDateInput('month'), dateContainer.firstChild);
                this.element.querySelector('#productCode').addEventListener('change', async (event) => {
                    const {value: productCode} = event.target;
                    const {
                        inventedName,
                        nameMedicinalProduct: medicinalProductName
                    } = this.products.find(product => product.productCode === productCode) || {};
                    this.element.querySelector('#name-of-medicinal-product').value = medicinalProductName;
                    this.element.querySelector('#invented-name').value = inventedName;
                    this.element.querySelector('#placeholder-option').disabled = true;
                });
                pageModes.SHARED();
            },
            EDIT: () => {
                const dateType = getDateInputTypeFromDateString(this.batch.expiryDate);
                const expiryDateInput = createDateInput(dateType, reverseInputFormattedDateString(parseDateStringToDateInputValue(this.batch.expiryDate)));
                dateContainer.insertBefore(expiryDateInput, dateContainer.firstChild);
                enableDayCheckbox.checked = dateType === 'date';
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
        let modalData = await webSkel.showModal("add-epi-modal",true);
        if (modalData) {
            await this.handleEPIModalData(modalData);
        }
    }

    async saveInputs() {
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        for (const key in formData.data) {
            if (formData.data[key]) {
                this.updatedBatch[key] = formData.data[key];
            }
        }
    }

    reloadLeafletTab(encodedEPIsData) {
        const leafletTab = this.element.querySelector('epis-tab')
        leafletTab.setAttribute('data-units', encodedEPIsData)
        leafletTab.webSkelPresenter.invalidate();
    }

    updateLeaflet(batchEPIs, EPIData) {
        const existingLeafletIndex = batchEPIs.findIndex(EPI => EPI.language === EPIData.language);
        if (existingLeafletIndex !== -1) {
            batchEPIs[existingLeafletIndex] = EPIData;
        } else {
            batchEPIs.push(EPIData);
        }
    }

    deleteEpi(_target) {
        let EPIUnit = webSkel.getClosestParentElement(_target, ".epi-unit");
        let EPIId = EPIUnit.getAttribute("data-id");
        this.EPIs = this.EPIs.filter(EPI => EPI.id !== EPIId);
        this.reloadLeafletTab(this.getEncodedEPIS(this.EPIs));
    }

    async handleEPIModalData(EPIData) {
        EPIData.id = webSkel.appServices.generateID(16);
        this.updateLeaflet(this.EPIs, EPIData)
        this.reloadLeafletTab(this.getEncodedEPIS(this.EPIs));
    }

    /* TODO Replace console error logging with toasts */
    validateBatch(batchObj) {
        if (!batchObj.productCode) {
            return {valid: false, message: 'Product code is a mandatory field'};

        }
        if (!batchObj.batch) {
            return {valid: false, message: 'Batch number is a mandatory field'};
        }

        if (!/^[A-Za-z0-9]{1,20}$/.test(batchObj.batchNumber)) {
            return {
                valid: false,
                message: 'Batch number can contain only alphanumeric characters and a maximum length of 20'
            };
        }

        if (!batchObj.expiryDate) {
            return {valid: false, message: 'Expiration date is a mandatory field'};
        }

        return {valid: true, message: ''};
    }

    async addBatch() {
        const {data} = (await webSkel.extractFormInformation(this.element.querySelector("form")));
        data.expiryDate = formatBatchExpiryDate(data.expiryDate);
        if(getDateInputTypeFromDateString(data.expiryDate)==='month'){
            data.expiryDate=prefixMonthDate(data.expiryDate);
        }
        const batchObj = {
            "payload": {
                "productCode": data.productCode,
                "batch": data.batchNumber,
                "packagingSiteName": data.packagingSiteName,
                "expiryDate": data.expiryDate
            }
        }
        const batchValidationResult = this.validateBatch(batchObj.payload)
        if (batchValidationResult.valid) {
            await $$.promisify(webSkel.client.addBatch)(data.productCode, data.batchNumber, batchObj);
            for(const EPI of this.EPIs){
                configureEPIForAddition(EPI,data.productCode);
                await $$.promisify(webSkel.client.addEPI)(data.productCode,data.batchNumber,EPI)
            }
            await webSkel.changeToDynamicPage("batches-page", "batches-page");
        } else {
            console.error(batchValidationResult.message);
        }
    }

    async updateBatch() {
        const {data} = (await webSkel.extractFormInformation(this.element.querySelector("form")));
    }

    getDiffs() {
        let result = [];
        try {
            let mappingLogService = mappings.getMappingLogsInstance(this.storageService, new LogService());
            let diffs = mappingLogService.getDiffsForAudit(this.model.batch, this.initialModel.batch);
            let epiDiffs = mappingLogService.getDiffsForAudit(this.model.languageTypeCards, this.initialCards);
            Object.keys(diffs).forEach(key => {
                if (key === "expiry") {
                    return;
                }
                if (key === "expiryForDisplay") {
                    let daySelectionObj = {
                        oldValue: this.initialModel.batch.enableExpiryDay,
                        newValue: this.model.batch.enableExpiryDay
                    }

                    result.push(utils.getDateDiffViewObj(diffs[key], key, daySelectionObj, constants.MODEL_LABELS_MAP.BATCH))
                    return;
                }
                result.push(utils.getPropertyDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.BATCH));

            });
            Object.keys(epiDiffs).forEach(key => {
                result.push(utils.getEpiDiffViewObj(epiDiffs[key]));
            });

        } catch (e) {
            console.log(e);
        }

        return result
    }

}
