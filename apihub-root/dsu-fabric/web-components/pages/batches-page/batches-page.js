import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class BatchesPage extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.editModeLabel = this.userRights === constants.USER_RIGHTS.READ ? "View" : "Edit";
        this.editBatchLabel = `${this.editModeLabel} Batch`;
        this.products = {};
        this.batchesNumber = 16;
        this.disableNextBtn = true;
        this.firstElementTimestamp = 0;
        this.lastElementTimestamp = undefined;
        this.previousPageFirstElements = [];
        this.loadBatches = (query)=>{
            this.invalidate(async () => {
                this.batches = await webSkel.appServices.getBatches(this.batchesNumber, query);
                for(let batch of this.batches){
                    if(!this.products[batch.productCode]){
                        this.products[batch.productCode] = await $$.promisify(webSkel.client.getProductMetadata)(batch.productCode);
                    }
                }
                if(this.batches.length === this.batchesNumber){
                    this.batches.pop();
                    this.disableNextBtn = false;
                }
                else if(this.batches.length < this.batchesNumber){
                    this.disableNextBtn = true;
                }
                this.lastElementTimestamp = this.batches[this.batches.length-1].__timestamp;
                this.firstElementTimestamp = this.batches[0].__timestamp;
            });
        };
        this.loadBatches();
    }

    addSeparatorToDateString(dateString, separator) {
        return dateString.slice(4, 6) === '00'
            ? [dateString.slice(0, 2), dateString.slice(2, 4)].join(separator)
            : [dateString.slice(0, 2), dateString.slice(2, 4), dateString.slice(4, 6)].join(separator)
    }

    createBatchRowHTML(batch, product, lastRowItem = false) {
        const createClassString = (...classNames) => {
            return classNames.filter(Boolean).join(' ');
        }
        const classCellBorder = "cell-border-bottom";
        const viewEditClass = "view-details pointer";
        return `
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${product.inventedName}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${product.nameMedicinalProduct}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${batch.productCode}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${batch.batchNumber}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${this.addSeparatorToDateString(batch.expiryDate, '/')}</div>
        <div class="${createClassString(viewEditClass, lastRowItem ? "" : classCellBorder)}" data-local-action="openDataMatrixModal ${batch.productCode}">View</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>-</div>
        <div class="${createClassString(viewEditClass, lastRowItem ? "" : classCellBorder)}"
             data-local-action="navigateToEditBatch ${batch.productCode} ${batch.batchNumber}">${this.editModeLabel}</div>`
    }

    beforeRender() {
        let string = "";
        const batchesCount = this.batches.length;
        this.batches.forEach((batch, index) => {
            string += this.createBatchRowHTML(batch, this.products[batch.productCode], index === batchesCount - 1);
        });

        this.items = string;
    }

    afterRender() {
        let pageBody = this.element.querySelector(".page-body");
        let batches = this.element.querySelector(".batches-section");
        if (this.batches.length === 0) {
            let paginationSection = this.element.querySelector(".table-pagination");
            paginationSection.style.display = "none";
            batches.style.display = "none";
            let noData = `<div>
                                    <div class="no-data-label">
                                        There are no data on any previous batch
                                    </div>
                                    <div class="no-data-instructions">
                                        Start by using one of the right side actions (import or add).
                                    </div>
                                </div>`;
            pageBody.insertAdjacentHTML("beforeend", noData)
        }
        this.searchInput = this.element.querySelector("#productCode");
        this.searchInput.value = this.inputValue || "";
        let xMark = this.element.querySelector(".x-mark");

        if (this.boundFnKeypress) {
            this.searchInput.removeEventListener("keypress", this.boundFnKeypress);
        }
        this.boundFnKeypress = this.searchBatch.bind(this);
        this.searchInput.addEventListener("keypress", this.boundFnKeypress);

        if (this.boundFnMouseLeave) {
            this.searchInput.removeEventListener("mouseleave", this.boundFnMouseLeave);
        }
        this.boundFnMouseLeave = this.hideXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseleave", this.boundFnMouseLeave);

        if (this.boundFnMouseEnter) {
            this.searchInput.removeEventListener("mouseenter", this.boundFnMouseEnter);
        }
        this.boundFnMouseEnter = this.showXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseenter", this.boundFnMouseEnter);

        if (this.boundFnFocusout) {
            this.searchInput.removeEventListener("focusout", this.boundFnFocusout);
        }
        this.boundFnFocusout = this.removeFocus.bind(this, xMark);
        this.searchInput.addEventListener("focusout", this.boundFnFocusout);

        if (this.boundFnInput) {
            this.searchInput.removeEventListener("input", this.boundFnInput);
        }
        this.boundFnInput = this.toggleSearchIcons.bind(this, xMark);
        this.searchInput.addEventListener("input", this.boundFnInput);

        if (this.focusInput) {
            this.searchInput.focus();
            xMark.style.display = "block";
            this.focusInput = false;
        }
        let previousBtn = this.element.querySelector("#previous");
        let nextBtn = this.element.querySelector("#next");
        if(this.previousPageFirstElements.length === 0){
            previousBtn.classList.add("disabled");
        }
        if(this.disableNextBtn){
            nextBtn.classList.add("disabled");
        }
    }

    toggleSearchIcons(xMark, event) {
        if (this.searchInput.value === "") {
            xMark.style.display = "none";
        } else {
            xMark.style.display = "block";
        }
    }

    removeFocus(xMark, event) {
        xMark.style.display = "none";
    }

    showXMark(xMark, event) {
        if (this.searchInput.value !== "") {
            xMark.style.display = "block";
        }
    }

    hideXMark(xMark, event) {
        if (document.activeElement !== this.searchInput) {
            xMark.style.display = "none";
        }
    }

    async searchBatch(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            let formData = await webSkel.extractFormInformation(this.searchInput);
            if (formData.isValid) {
                this.inputValue = formData.data.productCode;
                this.batches = await webSkel.appServices.getBatches(undefined,[`productCode = ${this.inputValue}`]);
                if (this.batches.length > 0) {
                    let product = await $$.promisify(webSkel.client.getProductMetadata)(undefined, undefined, [`productCode = ${this.inputValue}`]);
                    this.products = {};
                    this.products[this.batches[0].productCode] = product;
                    this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
                } else {
                    this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
                }
                this.focusInput = true;
                this.invalidate();
            }
        }
    }

    async deleteInput(xMark) {
        this.searchResultIcon = "";
        delete this.inputValue;
        this.invalidate(async () => {
            this.products = {};
            this.batches = await $$.promisify(webSkel.client.listBatches)();
            for(let batch of this.batches){
                if(!this.products[batch.productCode]) {
                    this.products[batch.productCode] = await $$.promisify(webSkel.client.getProductMetadata)(batch.productCode);
                }
            }
        });
    }

    async navigateToAddBatch() {
        await webSkel.changeToDynamicPage("manage-batch-page", `manage-batch-page`);
    }

    async navigateToEditBatch(_target, productCode, batchId) {
        await webSkel.changeToDynamicPage("manage-batch-page", `manage-batch-page?gtin=${productCode}&&batchId=${batchId}`);
    }

    async openDataMatrixModal(_target, productCode) {
        await webSkel.showModal("data-matrix-modal", {["product-code"]: productCode});
    }

    previousTablePage(_target){
        if(!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0){
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            this.loadBatches([`__timestamp <= ${this.firstElementTimestamp}`]);
        }
    }
    nextTablePage(_target){
        if(!_target.classList.contains("disabled")){
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            this.loadBatches([`__timestamp < ${this.firstElementTimestamp}`]);
        }
    }
}
