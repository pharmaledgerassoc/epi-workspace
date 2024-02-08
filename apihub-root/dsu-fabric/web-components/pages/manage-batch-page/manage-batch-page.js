export class ManageBatchPage {

    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.mode = this.element.getAttribute('data-pageMode');
        this.batchId = this.element.getAttribute('data-batchId') || undefined;
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
            const batch = (await $$.promisify(webSkel.client.listBatches)(undefined)).find(batch => batch.pk === this.batchId);
            if (!batch) {
                console.error(`Unable to find batch with ID: ${this.batchId}.`);
                return {batch: undefined, product: undefined};
            }
            const product = (await $$.promisify(webSkel.client.listProducts)(undefined)).find(product => product.productCode === batch.productCode);
            if (!product) {
                console.error(`Unable to find product with product code: ${batch.productCode} for batch ID: ${this.batchId}.`);
                return {batch, product: undefined};
            }
            return {batch, product};
        };

        let pageModes = {
            ADD: async () => {
                const products = await loadAddData();
                return {
                    pageTitle: "Add Batch",
                    formFieldStateClass: "",
                    inputState: "",
                    inputStateDisabledClass: "",
                    formActionButtonText: "Add Batch",
                    formActionButtonFunction: "addBatch",
                    batchVersion: 0,
                    products: products,
                    productOptions: products.map(product => {
                        return `<option value="${product.productCode}"> ${product.productCode} - ${product.inventedName} </option>`
                    }).join("")
                }
            },
            EDIT: async () => {
                const {batch, product} = await loadEditData();
                return {
                    pageTitle: "Edit Batch",
                    formFieldStateClass: "disabled-form-field",
                    inputState: "disabled",
                    inputStateDisabledClass: "text-input-disabled",
                    formActionButtonText: "Update Batch",
                    formActionButtonFunction: "updateBatch",
                    batch: batch,
                    batchVersion: batch.__version,
                    product: product
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
        const createDateInput=(dateFormatType,assignDateValue=null)=>{
            let dateInput = document.createElement('input');

            dateInput.id = 'date';
            dateInput.classList.add('pointer');
            dateInput.classList.add('date-format-remover');
            dateInput.classList.add('form-control');
            dateInput.setAttribute('name', 'date');
            dateInput.setAttribute('type', dateFormatType);
            if(assignDateValue) {
                dateInput.value = assignDateValue
            }

            dateInput.addEventListener('click', function () {
                this.blur();
                if ('showPicker' in this) {
                    this.showPicker();
                }
            });
            return dateInput
        }
        const dateContainer=this.element.querySelector('#custom-date-icon');
        const enableDayCheckbox=this.element.querySelector('#enable-day-checkbox');
        const svg1 = dateContainer.querySelector('#svg1');
        const svg2 = dateContainer.querySelector('#svg2');
        const pageModes = {
            SHARED: () => {
                this.element.querySelector('#enable-day-checkbox').addEventListener('change', () => {
                    if (enableDayCheckbox.checked) {
                        svg1.style.display = 'none';
                        svg2.style.display = 'block';
                    } else {
                        svg1.style.display = 'block';
                        svg2.style.display = 'none';
                    }
                    let oldDateInput = dateContainer.querySelector('#date');
                    let newDateInput=createDateInput('date',"16-01-2022")
                    dateContainer.replaceChild(newDateInput, oldDateInput);
                });
            },
            ADD: () => {
                dateContainer.insertBefore(createDateInput('month'),dateContainer.firstChild);
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
                pageModes.SHARED()
            }
        }
        pageModes[this.mode]();
    }

    async navigateToBatchesPage() {
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }

    async showAddEPIModal() {
        let modalData = await webSkel.showModal("add-epi-modal",);
        if (modalData) {
            //await this.handleEPIModalData(modalData);
        }
    }
}
