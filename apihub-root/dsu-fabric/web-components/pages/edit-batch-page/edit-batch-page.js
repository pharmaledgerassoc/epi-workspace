export class EditBatchPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.batchId = this.element.getAttribute("data-batchid");
        this.invalidate(async () => {
            this.batch = (await $$.promisify(webSkel.client.listBatches)(undefined)).find(batch => batch.pk === this.batchId);
            this.product = (await $$.promisify(webSkel.client.listProducts)(undefined)).find(product => product.productCode === this.batch.productCode);

        });
    }

    beforeRender() {
        this.batchVersion = this.batch.version || 0;
        this.batchName = this.batch.batch;
        this.packagingSiteName = this.batch.packagingSiteName;
        this.experyDate = this.batch.expiryDate;
        debugger;
        /* yymmdd || yymm */
        let year
        let month
        let day
        if (this.batch.expiryDate.length === 4) {
            this.isDateFormatYYMMDD = false;
            year = this.batch.expiryDate.substring(0, 2);
            month= this.batch.expiryDate.substring(2, 4);
            this.date=`20${year}-${month}`
        } else {
            this.isDateFormatYYMMDD = true;
            year = this.batch.expiryDate.substring(0, 2);
            month= this.batch.expiryDate.substring(2, 4);
            day= this.batch.expiryDate.substring(4, 6);
            this.date=`20${year}-${month}-${day}`
        }
        this.productCode = this.product.productCode;
        this.inventedProductName = this.product.inventedName;
        this.medicinalProductName = this.product.nameMedicinalProduct
    }
    afterRender(){
        let checkbox = this.element.querySelector('#enable-day-checkbox');
        let container = this.element.querySelector('#custom-date-icon');
        let svg1 = container.querySelector('#svg1');
        let svg2 = container.querySelector('#svg2');
        let newInput = document.createElement('input');
        newInput.id = 'date';
        newInput.classList.add('pointer');
        if(this.isDateFormatYYMMDD){
            checkbox.checked=true;
            svg1.style.display = 'none';
            svg2.style.display = 'block';
            newInput.setAttribute('type', 'date');
            newInput.min = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
            newInput.value=this.date;
        }else{
            checkbox.checked=false;
            svg1.style.display = 'block';
            svg2.style.display = 'none';
            newInput.setAttribute('type', 'month');
            newInput.setAttribute('min', new Date().toISOString().split('T')[0].slice(0, 7));
            newInput.value=this.date;
        }
        newInput.addEventListener('click', function () {
            this.blur();
            if ('showPicker' in this) {
                this.showPicker();
            }
        });
        container.prepend(newInput)
    }

    async navigateToBatchesPage() {
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }

    async showAddEPIModal() {
        let modalData = await webSkel.UtilsService.showModalForm(document.querySelector("body"), "add-epi-modal", {presenter: "add-epi-modal"});
        /* if (modalData) {
             await this.handleEPIModalData(modalData);
         }*/
    }
}