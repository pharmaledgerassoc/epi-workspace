import {
    changeSidebarFromURL,
    createObservableObject,
    renderDateInput
} from "../../../utils/utils.js";
import {CommonPresenterClass} from "../../CommonPresenterClass.js";

export class ManageBatchPage extends CommonPresenterClass {
    addresses = [];
    constructor(element, invalidate) {
        super(element, invalidate);

        let params = webSkel.getHashParams();
        this.productCode = params.productCode || "";
        this.batchNumber = params.batchNumber || "";
        this.pageTitle = "";
        this.formFieldStateClass = "";
        this.inputState = "";
        this.inputStateDisabledClass = "";
        this.formActionButtonText = "";
        this.formActionButtonFunction = "";
        this.batch = {};
        this.batchVersion = 0;
        this.product = {};
        this.packagingSiteName = "";
        this.enableExpiryDate = "";
        this.enableExpiryDateCheck = true;
        this.productInventedName = "-";
        this.productMedicinalName = "-";
        this.penImage = "";
        this.formActionButtonState = "";
        this.leafletsInfo = "[]";
        this.updatedBatch = {}
        this.pageMode = this.productCode ? "EDIT_BATCH" : "ADD_BATCH";
        this.mode = this.productCode ? "edit-bach" : "add-batch";
        this.invalidate(async () => {
            await this.initializePageMode(this.pageMode);
        });

    }

    async initializePageMode(pageMode) {
        const initPage = {
            ADD_BATCH: async () => {
                this.products = await webSkel.appServices.getProductsForSelect();
                this.pageTitle = "Add Batch";
                this.formActionButtonText = "Add Batch";
                this.formActionButtonFunction = "addBatch";
                this.enableExpiryDate = "on";
                this.enableExpiryDateCheck = "checked";
                this.penImage = `<img class="pen-square" src="./assets/icons/pen-square.svg" alt="pen-square">`;
                this.updatedBatch = webSkel.appServices.createNewBatch({}, []);
            },
            EDIT_BATCH: async () => {
                let {batch, product, EPIs} = await webSkel.appServices.getBatchData(this.productCode, this.batchNumber);
                this.existingBatch = batch;
                let batchModel = webSkel.appServices.createNewBatch(batch, EPIs);
                let enableExpiryDayCheck = "";
                if (batchModel.enableExpiryDay === "on") {
                    enableExpiryDayCheck = "checked";
                }

                this.pageTitle = "Edit Batch";
                this.formFieldStateClass = "disabled-form-field";
                this.inputState = "disabled";
                this.inputStateDisabledClass = "text-input-disabled";
                this.formActionButtonText = "Update Batch";
                this.formActionButtonFunction = "updateBatch";
                this.batch = batchModel;
                this.batchNumber = batchModel.batchNumber;
                this.batchVersion = batch.version; //TODO use getBatchVersion API when it becomes available
                this.product = product;
                this.productCode = product.productCode;
                this.packagingSiteName = batchModel.packagingSiteName;
                this.expiryDate = batchModel.expiryDate;

                this.enableExpiryDate = batchModel.enableExpiryDay;
                this.enableExpiryDateCheck = enableExpiryDayCheck;
                this.productInventedName = product.inventedName;
                this.productMedicinalName = product.nameMedicinalProduct;
  
                this.importLicenseNumber = batchModel.importLicenseNumber;
                this.manufacturerName = batchModel.manufacturerName;
                this.dateOfManufacturing =  batchModel.dateOfManufacturing;
                this.manufacturerAddress1 = batchModel.manufacturerAddress1;
                this.manufacturerAddress2 = batchModel.manufacturerAddress2;
                this.manufacturerAddress3 = batchModel.manufacturerAddress3;
                this.manufacturerAddress4 = batchModel.manufacturerAddress4;
                this.manufacturerAddress5 = batchModel.manufacturerAddress5; 
                this.getAddressesOnBatch(batchModel);
                this.penImage = "";
                this.formActionButtonState = "disabled";
                this.leafletsInfo = this.getEncodedEPIS(EPIs);
                this.updatedBatch = createObservableObject(webSkel.appServices.createNewBatch(batch, EPIs), this.onChange.bind(this));
                this.gs1Date = this.updatedBatch.expiryDate;

            }
        }
        await initPage[pageMode]();
    }

    getEncodedEPIS(EPIs) {
        return encodeURIComponent(JSON.stringify(EPIs));
    }


    beforeRender() {
    }

    onChange() {
        console.log(this.updatedBatch);
        this.element.querySelector("#formActionButton").disabled =
            JSON.stringify(this.batch) === JSON.stringify(this.updatedBatch, webSkel.appServices.removeEPIForDeletion);
    }

    detectInputChange(event) {
        const {target} = event;
        const inputName = target.name;
        if(inputName) {
            
            if (inputName === "expiryDate" && event.target.value) {
                this.updatedBatch.expiryDate = webSkel.appServices.formatBatchExpiryDate(event.target.value);
                //to do format with 00 if no day in date
                this.element.querySelector("label.gs1-date").innerHTML = `GS1 format (${this.updatedBatch.expiryDate.length === 4 ? this.updatedBatch.expiryDate + "00" : this.updatedBatch.expiryDate})`
            } else {
                if (inputName === "enableExpiryDay") 
                    event.target.value = event.target.checked ? "on" : "off";
                
                this.updatedBatch[inputName] = inputName === "batchRecall" ? 
                    event.target.checked : event.target.value; 
            }
        }
    };

    addAddress(target) {
       const input = target.closest('.form-field').querySelector('input');
       if(input.value.length) {
         this.createAddressLine(input.value);
         input.value = '';
       }
    };

    getAddressesOnBatch(batchModel) {
        Object.entries(batchModel).forEach(([key, value]) => {
            if(key.includes('manufacturerAddress') && (value || "")?.length)
                this.addresses.push({name: key, value})
        });
    };

    createAddressLine(value) {
        const element = this.element;
        const index = this.addresses?.length + 1;
        const name = `manufacturerAddress${index}`;
        const item = {value, name};

        this.addresses = [... this.addresses, item];
        const disableInput = this.addresses.length === 5;
        
        element.querySelector('#buttonAddAddress').disabled = disableInput;
        element.querySelector('#inputAddAddress').disabled = disableInput;

        const container = this.element.querySelector('#addressContainers');
      
        const field = container.querySelector('#sampleAddressField').cloneNode(true);
        const label = field.querySelector('label');
        const input = field.querySelector('input');
        
        field.classList.add('card', 'form-field');
        label.textContent = `Address Line ${index}`;
        label.setAttribute('for', name);
        input.id = input.name = name;
        input.hidden = false;
        input.value = value;

        const fieldsContainer = container.querySelector('#fields')
        fieldsContainer.append(field);
        field.querySelector('.edit').addEventListener('click', (event) => {
            const {field} = this.getAddressLineElements(event.target);
            field.classList.remove('card');
        });
        
        this.updatedBatch[item.name] = item.value;

        field.querySelector('.remove').addEventListener('click', (event) => this.removeAddressLine(event.target));
        field.querySelector('.save').addEventListener('click', (event) => this.updateAddressLine(event.target));        

        // if(!fieldsContainer.classList.contains('.sortable')) {
        //     fieldsContainer.classList.add('sortable');
        //     new Sortable(fieldsContainer, {
        //         animation: 150,
        //         ghostClass: 'dragging-ghost',
        //         handle: ".card",
        //         onEnd: (event) => {
        //             console.log(fieldsContainer);
        //             console.log(`element sorted`);
        //             this.updateAddressOrder(fieldsContainer);
        //         }
        //     });
        // }
    };

    updateAddressOrder(container) {
        const fields = container.querySelectorAll('.card');
        this.addresses = [];
        container.innerHTML = "";
        fields.forEach(field =>  this.createAddressLine(field.querySelector('input').value));
        
        console.log(this.addresses);
    };

    getAddressLineElements(target) {
        const element = this.element;
        const container = element.querySelector('#addressContainers');
        const field = target.closest('.form-field');
        const input = field.querySelector('input');

        return {component: element, container, field, input};
    };

    updateAddressLine(target) {
        const {field, input} = this.getAddressLineElements(target);
        this.addresses.forEach((item) => {
            if(item.name === input.name) 
                item.value = input.value;
        });

        field.classList.add('card');
    };

    getteAddressLinesObject() {
        let result = {};
        if(this.addresses?.length) {
            this.addresses.forEach(item => {
                result[item.name] = item.value;       
            });
        }
        return result;
    }

    removeAddressLine(target) {
       const {input, container} = this.getAddressLineElements(target);
       const addresses = this.addresses.filter((item) => item.name !== input.name);
       container.querySelector('#fields').innerHTML = "";

       this.addresses = [];
       this.updatedBatch[input.name] = "";

       
       if(addresses.length) {
            addresses.push({
                name: input.name,
                value: ""
            });
            addresses.forEach(item => this.createAddressLine(item.value));
       }
    };


    attachEventListeners() {
        let newDateInput;
        const element = this.element;
        element.querySelector('#buttonAddAddress').addEventListener('click', (event) => this.addAddress(event.target));
        element.querySelector('#enableExpiryDay').addEventListener('change', () => {
            console.log(element);
            const dateContainer = element.querySelector('#expiryDateContainer');
            const enableDayCheckbox = element.querySelector('#enableExpiryDay');
            const svg1 = dateContainer.querySelector('#svg1');
            const svg2 = dateContainer.querySelector('#svg2');
            const oldDateInput = dateContainer.querySelector('input');
            const isChecked = enableDayCheckbox.checked;
            svg1.style.display = isChecked ? 'none' : 'block';
            svg2.style.display = isChecked ? 'block' : 'none';

            if (isChecked) {
                /* MM-YYYY -> DD-MM-YYYY */
                const [year, month] = oldDateInput.value.split('-');
                let assignValue = `${year}-${month}-${webSkel.appServices.getLastDayOfMonth(year, month)}`;
                assignValue = assignValue.split("-").join("/");
                newDateInput = webSkel.appServices.createDateInput('date', 'expiryDate', assignValue);
            } else {
                /* DD-MM-YYYY -> MM-YYYY */
                let assignValue = oldDateInput.value.slice(0, 7);
                assignValue = assignValue.split("-").join("/");
                newDateInput = webSkel.appServices.createDateInput('month', 'expiryDate', assignValue);
            }
            dateContainer.replaceChild(newDateInput, oldDateInput);
            let newGS1value = webSkel.appServices.formatBatchExpiryDate(newDateInput.value);
            newGS1value = newGS1value.length === 4 ? newGS1value + "00" : newGS1value;
            this.element.querySelector("label.gs1-date").innerHTML = `GS1 format (${newGS1value})`

        });
        this.element.removeEventListener("input", this.boundDetectInputChange);
        this.boundDetectInputChange = this.detectInputChange.bind(this);
        this.element.addEventListener("input", this.boundDetectInputChange);
    }

    afterRender() {
        changeSidebarFromURL();
        document.addEventListener('keypress', function (event) {
            if (event.key === 'Enter' && event.currentTarget.activeElement.tagName.toLowerCase() === "input") {
                event.stopImmediatePropagation();
                event.preventDefault();
                event.currentTarget.activeElement.blur();
            }
        });
        /*TODO dictionary for each key/attribute(classes,id,etc) and iterate over it */
        /*TODO replace webSkel.appServices.createDateInput with date web component if necessary */

        const expiryDateContainer = this.element.querySelector('#expiryDateContainer');
        const dateOfManufacturingContainer = this.element.querySelector('#dateOfManufacturingContainer');

        const pageModes = {

            ADD_BATCH: () => {
                let selectInput = this.element.querySelector("select#productCode");
                this.products.forEach(product => {
                    let option = document.createElement("option");
                    option.value = product.productCode;
                    option.text = `${product.productCode} - ${product.inventedName}`;
                    selectInput.appendChild(option);
                });
                renderDateInput(dateOfManufacturingContainer, false);
                renderDateInput(expiryDateContainer, true);
                // expiryDateContainer.insertBefore(webSkel.appServices.createDateInput('date'), expiryDateContainer.firstChild);
                this.element.querySelector('#productCode').addEventListener('change', async (event) => {
                    const {value: productCode} = event.target;
                    const {
                        inventedName,
                        nameMedicinalProduct: medicinalproductInventedName
                    } = this.products.find(product => product.productCode === productCode) || {};
                    this.element.querySelector('#nameMedicinalProduct').value = medicinalproductInventedName;
                    this.element.querySelector('#inventedName').value = inventedName;
                    this.element.querySelector('#placeholder-option').disabled = true;
                });
            },
            EDIT_BATCH: () => {
                if(this.addresses?.length) {
                    const addresses = [... this.addresses];
                    this.addresses = [];
                    addresses.forEach(item => this.createAddressLine(item.value));
                    this.element.querySelector('#inputAddAddress').value = "";
                }
                const dateType = webSkel.appServices.getDateInputTypeFromDateString(this.batch.expiryDate, this.enableExpiryDateCheck);
                const expiryDateInput = webSkel.appServices.createDateInput(dateType, 'expiryDate', webSkel.appServices.reverseSeparatedDateString(webSkel.appServices.parseDateStringToDateInputValue(this.batch.expiryDate), "-"));
                renderDateInput(dateOfManufacturingContainer, false, null, this.batch.dateOfManufacturing);
                renderDateInput(expiryDateContainer, true, expiryDateInput);
                if(this.existingBatch?.batchRecall === true)
                    this.element.querySelector('#batchRecall').checked = true;
            }

        }
        
        pageModes[this.pageMode]();
        this.attachEventListeners();
        if(this.pageMode === "ADD_BATCH") 
            this.element.querySelector('#enableExpiryDay').dispatchEvent(new Event('change'));
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

    reloadLeafletTab(encodedEPIsData) {
        const leafletTab = this.element.querySelector('epis-tab')
        leafletTab.setAttribute('data-units', encodedEPIsData)
        leafletTab.webSkelPresenter.invalidate();
    }

    deleteEpi(_target) {
        let epiUnit = webSkel.appServices.deleteEPI(_target, this.updatedBatch.EPIs);
        //trigger on change for epis
        if (!this.batch || !this.batch.EPIs || !this.batch.EPIs.find(item => item.language === epiUnit.language && item.type === epiUnit.type)) {
            this.updatedBatch.EPIs = this.updatedBatch.EPIs.filter(item => item.language !== epiUnit.language || item.type !== epiUnit.type)
        }
        this.updatedBatch.EPIs = JSON.parse(JSON.stringify(this.updatedBatch.EPIs));
        this.reloadLeafletTab(this.getEncodedEPIS(this.updatedBatch.EPIs));
    }

    async addOrUpdateEpi(EPIData) {
        const existingLeafletIndex = (this.updatedBatch.EPIs || []).findIndex(epi => epi.language === EPIData.language);
        if (existingLeafletIndex !== -1) {
            /* epi already exists */
            if (this.updatedBatch.EPIs[existingLeafletIndex].action === "add") {
                /* previously added epi */
                EPIData.action = "add"
            } else {
                let accept = await webSkel.showModal("dialog-modal", {
                    header: "Warning!!!",
                    message: `This action will replace ${EPIData.languageLabel} ${EPIData.type}`,
                    denyButtonText: "Cancel",
                    acceptButtonText: "Proceed"
                }, true);
                if (accept) {
                    EPIData.action = "update"
                } else {
                    return
                }

            }
            this.updatedBatch.EPIs[existingLeafletIndex] = EPIData;
            console.log(`Updated epi, language: ${EPIData.language}`);
        } else {
            /* newly added epi */
            EPIData.action = "add";
            this.updatedBatch.EPIs.push(EPIData);
        }
        this.onChange();
        this.reloadLeafletTab(this.getEncodedEPIS(this.updatedBatch.EPIs));
    }

    async handleEPIModalData(EPIData) {
        EPIData.id = webSkel.appServices.generateID(16);
        await this.addOrUpdateEpi(EPIData);
    }

    productCodeCondition(element) {
        let inputContainer = webSkel.getClosestParentElement(element, "#productCode");
        return inputContainer.value !== "no-selection"
    }

    otherFieldsCondition(element) {
        return !webSkel.appServices.hasCodeOrHTML(element.value);
    }

    validateFormData(data) {
        const errors = [];
        if (!data.productCode || data.productCode === "no-selection") {
            errors.push('No selection for Product Code.');
        }

        if (!/^[a-zA-Z0-9/-]{1,20}$/.test(data.batchNumber)) {
            errors.push('Batch number is a mandatory field and can contain only alphanumeric characters and a maximum length of 20');
        }

        if (!data.expiryDate) {
            errors.push('Expiration date is a mandatory field.');
        }
        return {isValid: errors.length === 0, validationErrors: errors}
    }

    async addBatch(_target) {
        let formData = await webSkel.extractFormInformation(_target);
        formData.data.batchRecall = formData.elements.batchRecall.element.checked;
        let validationResult = this.validateFormData(formData.data);
        if (validationResult.isValid) {
            formData.data.expiryDate = webSkel.appServices.formatBatchExpiryDate(formData.data.expiryDate);
            if (webSkel.appServices.getDateInputTypeFromDateString(formData.data.expiryDate) === 'month') {
                formData.data.expiryDate = webSkel.appServices.prefixMonthDate(formData.data.expiryDate);
            }
            formData.data.EPIs = this.updatedBatch.EPIs;
            await webSkel.appServices.saveBatch(formData.data);
        } else {
            validationResult.validationErrors.forEach((err) => {
                webSkel.notificationHandler.reportUserRelevantError(err);
            })
        }

    }

    async updateBatch() {
        const formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        let validationResult = this.validateFormData(this.updatedBatch);
        if (validationResult.isValid) {
            let expiryDate = webSkel.appServices.formatBatchExpiryDate(formData.data.expiryDate);
            if (webSkel.appServices.getDateInputTypeFromDateString(expiryDate) === 'month') {
                expiryDate = webSkel.appServices.prefixMonthDate(expiryDate);
            }
            this.updatedBatch.expiryDate = expiryDate;
            this.updatedBatch.enableExpiryDay = formData.data.enableExpiryDay;
            let diffs = webSkel.appServices.getBatchDiffs(this.batch, this.updatedBatch);
            let selectedProduct = {
                inventedName: this.productInventedName,
                nameMedicinalProduct: this.productMedicinalName
            }
            let confirmation = await webSkel.showModal("data-diffs-modal", {
                diffs: encodeURIComponent(JSON.stringify(diffs)),
                productData: encodeURIComponent(JSON.stringify(selectedProduct))
            }, true);
            if (confirmation) {

                let shouldSkipMetadataUpdate = false;
                if (!diffs.needsMetadataUpdate) {
                    shouldSkipMetadataUpdate = true;
                }

                await webSkel.appServices.saveBatch(this.updatedBatch, true, shouldSkipMetadataUpdate);
            }
        } else {
            validationResult.validationErrors.forEach((err) => {
                webSkel.notificationHandler.reportUserRelevantError(err);
            })
        }
    }

    async viewLeaflet(_target) {
        let epiObject = webSkel.appServices.getEpitUnit(_target, this.updatedBatch.EPIs);
        let selectedProduct = {
            inventedName: this.element.querySelector('#inventedName').value,
            nameMedicinalProduct: this.element.querySelector('#nameMedicinalProduct').value
        }

        let epiPreviewModel = webSkel.appServices.getEpiPreviewModel(epiObject, selectedProduct);
        await webSkel.showModal("preview-epi-modal", {epidata: encodeURIComponent(JSON.stringify(epiPreviewModel))});
    }


}
