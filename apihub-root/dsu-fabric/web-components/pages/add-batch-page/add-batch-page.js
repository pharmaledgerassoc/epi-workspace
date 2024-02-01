export class AddBatchPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            this.products = await $$.promisify(webSkel.client.listProducts)(undefined);
        });
    }

    beforeRender() {
        this.batchVersion = 0; //getBatchVersion()
        this.productOptions = "";
        this.products.forEach(product => {
            this.productOptions += `<option value="${product.productCode}"> ${product.productCode} - ${product.inventedName} </option>`
        })
    }

    afterRender() {
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
    }

    async showAddEPIModal() {
        let modalData = await webSkel.UtilsService.showModalForm(document.querySelector("body"), "add-epi-modal", {presenter: "add-epi-modal"});
        if (modalData) {
            //await this.handleEPIModalData(modalData);
        }
    }

    async saveBatch() {
        debugger;
        let formData = await webSkel.UtilsService.extractFormInformation(this.element.querySelector("form"));
        const gtin=formData.data.batch;
        const batchNumber="B116"
        const parts = formData.data.dateWithDay.split('-');
        const formattedDate = parts[0].slice(2) + parts[1] + parts[2];
        const batchDetails={
            "messageType":"Batch",
            "messageTypeVersion":this.batchVersion||1,
            "senderId":"ManualUpload",
            "receiverId":"QPNVS",
            "messageId":"S000001",
            "messageDateTime":"2023-01-11T09:10:01CET",
            "payload":{
                "productCode": formData.data.productCode,
                "batch": batchNumber,
                "packagingSiteName": formData.data.packagingSite,
                "expiryDate":formattedDate
            }
        }
        await $$.promisify(webSkel.client.addBatch)(gtin, batchNumber, batchDetails);
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }

    async navigateToBatchesPage() {
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }
}