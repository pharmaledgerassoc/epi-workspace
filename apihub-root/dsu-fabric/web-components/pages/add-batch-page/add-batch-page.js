export class AddBatchPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            this.products = await $$.promisify(webSkel.client.listProducts)(undefined);
        });
        this.leafletUnits = [];
    }

    beforeRender() {
        this.isDateFormatDDMMYYYY = false;
        this.batchVersion = 0; //getBatchVersion()
        this.productOptions = "";
        this.products.forEach(product => {
            this.productOptions += `<option value="${product.productCode}"> ${product.productCode} - ${product.inventedName} </option>`
        })
    }

    afterRender() {
        this.element.querySelector('#date').setAttribute('min', new Date().toISOString().split('T')[0].slice(0, 7));
        this.element.querySelector('#productCode').addEventListener('change', async (event) => {
            let productCode = event.target.value;
            let selectedProduct = (await $$.promisify(webSkel.client.listProducts)(undefined)).find(product => {
                return product.productCode === productCode;
            });
            let [productName, medicinalProductName] = [selectedProduct.inventedName, selectedProduct.inventedName];
            let medicinalNameField = this.element.querySelector('#name-of-medicinal-product');
            let inventedNameField = this.element.querySelector('#invented-name');
            let placeholderOption = this.element.querySelector('#placeholder-option')

            medicinalNameField.value = medicinalProductName;
            inventedNameField.value = productName;
            placeholderOption.disabled = true;
        });
        this.element.querySelector('#enable-day-checkbox').addEventListener('change', () => {
            let container = this.element.querySelector('#custom-date-icon');

            let svg1 = container.querySelector('#svg1');
            let svg2 = container.querySelector('#svg2');

            let checkbox = this.element.querySelector('#enable-day-checkbox');
            if (checkbox.checked) {
                svg1.style.display = 'none';
                svg2.style.display = 'block';
            } else {
                svg1.style.display = 'block';
                svg2.style.display = 'none';
            }
            let oldInput = container.querySelector('#date');

            let newInput = document.createElement('input');
            newInput.setAttribute('name', 'date');
            newInput.id = 'date';
            newInput.addEventListener('click', function () {
                this.blur();
                if ('showPicker' in this) {
                    this.showPicker();
                }
            });
            newInput.classList.add('pointer');

            if (checkbox.checked) {
                this.isDateFormatDDMMYYYY = true;
                newInput.setAttribute('type', 'date');
                newInput.min = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
            } else {
                this.isDateFormatDDMMYYYY = false;
                newInput.setAttribute('type', 'month');
                newInput.setAttribute('min', new Date().toISOString().split('T')[0].slice(0, 7));
            }
            container.replaceChild(newInput, oldInput);
        });
    }

    updateLeaflet(modalData) {
        let existingLeafletIndex = this.leafletUnits.findIndex(leaflet => leaflet.data.language === modalData.data.language);
        if (existingLeafletIndex !== -1) {
            this.leafletUnits[existingLeafletIndex] = modalData;
            console.log(`updated leaflet, language: ${modalData.data.language}`);
            return true;
        }
        return false;
    }

    async showAddEPIModal() {
        let modalData = await webSkel.UtilsService.showModalForm(document.querySelector("body"), "add-epi-modal", {presenter: "add-epi-modal"});
        debugger
        if (modalData) {
            await this.handleEPIModalData(modalData);
        }
    }

    deleteLeaflet(_target) {
        let leafletUnit = webSkel.UtilsService.getClosestParentElement(_target, ".leaflet-unit");
        let id = leafletUnit.getAttribute("data-id");
        this.leafletUnits = this.leafletUnits.filter(unit => unit.id !== id);
        let tabInfo = this.leafletUnits.map((modalData) => {
            return {
                language: modalData.data.language,
                filesCount: modalData.elements.leaflet.element.files.length,
                id: modalData.id
            };
        });
        this.leafletTab = `<leaflets-tab data-presenter="leaflets-tab" data-units=${JSON.stringify(tabInfo)}></leaflets-tab>`;
        this.invalidate();
    }

    async handleEPIModalData(data) {
        data.id = webSkel.servicesRegistry.UtilsService.generateID(16);
        if (!this.updateLeaflet(data)) {
            this.leafletUnits.push(data);
        }
        let tabInfo = this.leafletUnits.map((modalData) => {
            return {
                language: modalData.data.language,
                filesCount: modalData.elements.leaflet.element.files.length,
                id: modalData.id
            };
        });
        let container = this.element.querySelector('#leaflet-container');

        this.leafletTab = `<leaflets-tab data-presenter="leaflets-tab" data-units=${JSON.stringify(tabInfo)}></leaflets-tab>`;
        container.insertAdjacentHTML("beforeend", this.leafletTab);
        this.invalidate(this.saveInputs.bind(this));
    }

    async saveBatch() {
        let formData = await webSkel.UtilsService.extractFormInformation(this.element.querySelector("form"));
        const gtin = formData.data.batch;
        const batchNumber = "B116"
        const parts = formData.data.date.split('-');
        let formattedDate;

        if (this.isDateFormatDDMMYYYY) {
            formattedDate = parts[0].slice(2) + parts[1] + parts[2];
        } else {
            formattedDate = parts[0].slice(2) + parts[1];
        }
        const batchDetails = {
            "messageType": "Batch",
            "messageTypeVersion": this.batchVersion || 1,
            "senderId": "ManualUpload",
            "receiverId": "QPNVS",
            "messageId": "S000001",
            "messageDateTime": "2023-01-11T09:10:01CET",
            "payload": {
                "productCode": formData.data.productCode,
                "batch": batchNumber,
                "packagingSiteName": formData.data.packagingSite,
                "expiryDate": formattedDate
            }
        }
        await $$.promisify(webSkel.client.addBatch)(gtin, batchNumber, batchDetails);
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }

    async navigateToBatchesPage() {
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }
}