export class ManageBatchPage {

    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.mode = this.element.getAttribute('data-pageMode');
        this.invalidate(async () => {
            await this.initializePageMode(this.mode);
        });
    }

    async initializePageMode(mode) {
        const loadAddData = async () => {
            const products = await $$.promisify(webSkel.client.listProducts)(undefined);
            if (!products) {
                console.error("Encountered an error trying to fetch All Products")
            }
            return products
        }
        const loadEditData = async () => {
            const gtin=""
            const batchNumber=""
            const batch = webSkel.client.readBatchMetadata(gtin,batchNumber);
            if (!batch) {
                console.error(`Unable to find batch with ID: ${this.batchId}.`);
                return {batch: undefined, product: undefined};
            }
            const product= webSkel.client.readProductMetadata(gtin);
            if (!product) {
                console.error(`Unable to find product with product code: ${batch.productCode} for batch ID: ${this.batchId}.`);
                return {batch, product: undefined};
            }
            return {batch, product};
        };

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
                    penImage: `<img class="pen-square" src="./assets/icons/pen-square.svg" alt="pen-square">`
                }
            },
            EDIT: async () => {
                this.batchId = this.element.getAttribute('data-batchId') || undefined;
                const {batch, product} = await loadEditData();
                return {
                    pageTitle: "Edit Batch",
                    formFieldStateClass: "disabled-form-field",
                    inputState: "disabled",
                    inputStateDisabledClass: "text-input-disabled",
                    formActionButtonText: "Update Batch",
                    formActionButtonFunction: "updateBatch",
                    batch: batch,
                    batchName: batch.batch,
                    batchVersion: batch.__version,
                    product: product,
                    productCode: product.productCode,
                    productName: product.inventedName,
                    productMedicinalName: product.nameMedicinalProduct,
                    productCodeInput: `<input type="text" class="text-input" name="packagingSite" id="productCode" autocomplete="off" disabled
                                        value="${product.productCode}">`,
                    penImage: "",
                    formActionButtonState: "disabled"
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

    beforeRender() {
    }

    afterRender() {
        /*TODO dictionary for each key/attribute(classes,id,etc) and iterate over it */
        /*TODO replace createDateInput with date web component if necessary */
        const getDateInputTypeFromDateString = (dateValueString) => {
            /* YYYY-MM-DD || YYYYMMDD || YYYY-MM|| YYYYMM */
            return dateValueString.length === 10 || dateValueString.length === 6 ? "date" : "month";
        }
        const getFirstTwoDigitsOfYear = () => {
            const year = new Date().getFullYear();
            const yearString = year.toString();
            return yearString.slice(0, 2);
        }
        /* converts the 'YYMMDD'     | 'YYMM' string of batch expiryDate to a value that is assignable to an HTML input date or month field
                     -> 'YYYY-MM-DD' | 'YYYY-MM'
        */
        const parseDateStringToDateInputValue = (dateValueString) => {
            let inputStringDate = "";
            const separator = '-'
            if (getDateInputTypeFromDateString(dateValueString) === "date") {
                /* returns 'DD-MM-YYYY' */
                inputStringDate = dateValueString.slice(4, 6) +
                    separator +
                    dateValueString.slice(2, 4) +
                    separator +
                    getFirstTwoDigitsOfYear() +
                    dateValueString.slice(0, 2)
            } else {
                /* returns 'MM-YYYY' */
                inputStringDate = dateValueString.slice(2, 4) +
                    separator +
                    getFirstTwoDigitsOfYear() +
                    dateValueString.slice(0, 2)
            }
            return inputStringDate;
        }
        const createDateInput = (dateInputType, assignDateValue = null) => {
            let dateInput = document.createElement('input');
            dateInput.id = 'date';
            dateInput.classList.add('pointer');
            dateInput.classList.add('date-format-remover');
            dateInput.classList.add('form-control');
            dateInput.setAttribute('name', 'expiryDate');
            dateInput.setAttribute('type', dateInputType);
            if (assignDateValue) {
                dateInput.setAttribute('data-date', reverseInputFormattedDateString(assignDateValue));
                dateInput.value=assignDateValue;
                if(!dateInput.value){
                    console.error(`${assignDateValue} is not a valid date. Input type: ${dateInput}`)
                }
            }
            dateInput.addEventListener('click', function () {
                this.blur();
                if ('showPicker' in this) {
                    this.showPicker();
                }
            });
            dateInput.addEventListener('change', function (event) {
                updateUIDate(this, event.target.value);
            })
            return dateInput
        }
        const getLastDayOfMonth = (year, month) => {
                if(typeof year==="string" && typeof month==="string") {
                    [year, month] = [parseInt(year), parseInt(month)];
                }
                return new Date(year, month, 0).getDate();
            }
        /* 'DD-MM-YYYY' -> 'YYYY-MM-DD' || 'MM-YYYY' -> 'YYYY-MM' */
        const reverseInputFormattedDateString = (dateString) => {
            const dateParts = dateString.split('-');
            return getDateInputTypeFromDateString(dateString) === 'date' ? dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0] : dateParts[1] + '-' + dateParts[0];
        }

        const updateUIDate = (dateInputElementRef, assignDateValue) => {
            dateInputElementRef.setAttribute('data-date', reverseInputFormattedDateString(assignDateValue));
            dateInputElementRef.value=assignDateValue;
        }
        const dateContainer = this.element.querySelector('#custom-date-icon');
        const enableDayCheckbox = this.element.querySelector('#enable-day-checkbox');
        const svg1 = dateContainer.querySelector('#svg1');
        const svg2 = dateContainer.querySelector('#svg2');

        const pageModes = {
            SHARED: () => {
                this.element.querySelector('#enable-day-checkbox').addEventListener('change', () => {
                    const oldDateInput = dateContainer.querySelector('#date');
                    let newDateInput;
                    debugger;
                    if (enableDayCheckbox.checked) {
                        /* MM-YYYY -> DD-MM-YYYY */
                        svg1.style.display = 'none';
                        svg2.style.display = 'block';
                        const [year,month]=[oldDateInput.value.slice(0,4),oldDateInput.value.slice(6,8)]
                        const assignValue = oldDateInput.value+'-'+getLastDayOfMonth(year,month)
                        newDateInput = createDateInput('date',assignValue);
                    } else {
                        /* DD-MM-YYYY -> MM-YYYY */
                        svg1.style.display = 'block';
                        svg2.style.display = 'none';
                        const assignValue = oldDateInput.value.slice(0,7);
                        newDateInput = createDateInput('month',assignValue);
                    }
                    dateContainer.replaceChild(newDateInput, oldDateInput);
                });
            },
            ADD: () => {
                dateContainer.insertBefore(createDateInput('month'), dateContainer.firstChild);
                this.element.querySelector('#productCode').addEventListener('change', async (event) => {
                    let productCode = event.target.value;
                    let selectedProduct = this.products.find(product => {
                        return product.productCode === productCode;
                    });
                    let [productName, medicinalProductName] = [selectedProduct.inventedName, selectedProduct.nameMedicinalProduct];
                    let medicinalNameField = this.element.querySelector('#name-of-medicinal-product');
                    let inventedNameField = this.element.querySelector('#invented-name');
                    let placeholderOption = this.element.querySelector('#placeholder-option')
                    medicinalNameField.value = medicinalProductName;
                    inventedNameField.value = productName;
                    placeholderOption.disabled = true;
                });
                pageModes.SHARED()

            },
            EDIT: () => {
                dateContainer.insertBefore(createDateInput(getDateInputTypeFromDateString(this.batch.expiryDate), reverseInputFormattedDateString(parseDateStringToDateInputValue(this.batch.expiryDate))), dateContainer.firstChild);
                getDateInputTypeFromDateString(this.batch.expiryDate)==='date'?enableDayCheckbox.checked=true:enableDayCheckbox.checked=false;
                pageModes.SHARED()
            }
        }
        pageModes[this.mode]();
    }

    async navigateToBatchesPage() {
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }

    async showAddEPIModal() {
        let modalData = await webSkel.showModal("add-epi-modal");
        if (modalData) {
            //await this.handleEPIModalData(modalData);
        }
    }
    validateBatch (batchObj){
        if (!batchObj.batchNumber) {
            return 'Batch number is mandatory field';
        }

        if (!/^[A-Za-z0-9]{1,20}$/.test(batchObj.batchNumber)) {
            return 'Batch number can contain only alphanumeric characters and a maximum length of 20';
        }

        if (!batchObj.expiryForDisplay) {
            return 'Expiration date is a mandatory field.';
        }
        return undefined;
    }
    getCurrentDateTimeCET() {
        const date = new Date();

        const offset = -60;
        const cetDate = new Date(date.getTime() + (offset * 60 * 1000));

        const year = cetDate.getFullYear();
        const month = (cetDate.getMonth() + 1).toString().padStart(2, '0');
        const day = cetDate.getDate().toString().padStart(2, '0');
        const hours = cetDate.getHours().toString().padStart(2, '0');
        const minutes = cetDate.getMinutes().toString().padStart(2, '0');
        const seconds = cetDate.getSeconds().toString().padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}CET`;
    }
    async addBatch(){
        const formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        const data=formData.data;
        /* YYYY-MM-DD -> YYMMDD */
        const formatBatchExpiryDate= (dateString)=>{
            return dateString.split('-').map((part, index) => index === 0 ? part.slice(2) : part).join('');
        }
        const batchObj={
            "messageType": "Batch",
            "messageTypeVersion": 1,
            "senderId": "ManualUpload",
            "receiverId": "QPNVS",
            "messageId": "S000001",
            "messageDateTime":this.getCurrentDateTimeCET(),
            "payload": {
                "productCode": data.productCode,
                "batch": data.batchId,
                "packagingSiteName": data.packagingSite,
                "expiryDate": formatBatchExpiryDate(data.expiryDate)
            }
        }
        await $$.promisify(webSkel.client.addBatch)(data.productCode, data.batchId, batchObj);
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }
    async updateBatch(){
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        const data=formData.data;

        await $$.promisify(webSkel.client.updateBatch)(data.productCode, data.batchId, batchObj);
    }
}
