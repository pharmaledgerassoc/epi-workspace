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

    getFormattedDate(dateObj,isDateFormatYYMMDD){
        if(isDateFormatYYMMDD){
            if(dateObj.day===undefined){
                dateObj.day="01";
            }
            return `20${dateObj.year}-${dateObj.month}-${dateObj.day}`
        }else{
            return `20${dateObj.year}-${dateObj.month}`
        }
    }
    beforeRender() {
        this.batchVersion = this.batch.version || 0;
        this.batchName = this.batch.batch;
        this.packagingSiteName = this.batch.packagingSiteName;
        this.experyDate = this.batch.expiryDate;
        /* yymmdd || yymm */
        let year
        let month
        let day
        if (this.batch.expiryDate.length === 4) {
            this.isDateFormatYYMMDD = false;
            year = this.batch.expiryDate.substring(0, 2);
            month= this.batch.expiryDate.substring(2, 4);
        } else {
            this.isDateFormatYYMMDD = true;
            year = this.batch.expiryDate.substring(0, 2);
            month= this.batch.expiryDate.substring(2, 4);
            day= this.batch.expiryDate.substring(4, 6);
        }
        this.date={
            year:year,
            month:month,
            day:day
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
        }else{
            checkbox.checked=false;
            svg1.style.display = 'block';
            svg2.style.display = 'none';
            newInput.setAttribute('type', 'month');
            newInput.setAttribute('min', new Date().toISOString().split('T')[0].slice(0, 7));
        }
        newInput.value=this.getFormattedDate(this.date,this.isDateFormatYYMMDD);
        newInput.addEventListener('click', function () {
            this.blur();
            if ('showPicker' in this) {
                this.showPicker();
            }
        });
        newInput.addEventListener('change',(e)=>{
            this.updateDate(e.target.value,this.date,this.isDateFormatYYMMDD);
        })
        container.prepend(newInput)
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
                //this.blur();
                if ('showPicker' in this) {
                    this.showPicker();
                }
            });
            newInput.classList.add('pointer');

            if (checkbox.checked) {
                this.isDateFormatYYMMDD = true;
                newInput.setAttribute('type', 'date');
                newInput.min = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
                this.date.day=undefined;
            } else {
                this.isDateFormatYYMMDD= false;
                newInput.setAttribute('type', 'month');
                newInput.setAttribute('min', new Date().toISOString().split('T')[0].slice(0, 7));
            }
            newInput.addEventListener('change',(e)=>{
                this.updateDate(e.target.value,this.date,this.isDateFormatYYMMDD);
            })
            newInput.value=this.getFormattedDate(this.date,this.isDateFormatYYMMDD);
            container.replaceChild(newInput, oldInput);
        });
    }
    updateDate(value,dateRef,isDateFormatYYMMDD){
        const parseData=(dateString)=> {
            const parsedData = dateString.split('-');
            parsedData[0]=parsedData[0].slice(2);
            return parsedData;
        }
        if(isDateFormatYYMMDD){
            [dateRef.year,dateRef.month,dateRef.day]=parseData(value);
        }else{
            [dateRef.year,dateRef.month]=parseData(value);
        }
    }
    async navigateToBatchesPage() {
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }
    async updateBatch(){

    }
    async showAddEPIModal() {
        let modalData = await webSkel.UtilsService.showModalForm(document.querySelector("body"), "add-epi-modal", {presenter: "add-epi-modal"});
        /* if (modalData) {
             await this.handleEPIModalData(modalData);
         }*/
    }
}