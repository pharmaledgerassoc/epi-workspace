import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class BatchesPage extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.editModeLabel = this.userRights === constants.USER_RIGHTS.READ ? "View" : "Edit";
        this.editBatchLabel = `${this.editModeLabel} Batch`;
        this.invalidate(async () => {
            this.batches = await $$.promisify(webSkel.client.listBatches)(undefined, undefined, undefined, "desc");
            this.products = await $$.promisify(webSkel.client.listProducts)();
        });

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
            let product = this.products.find(prodObj => prodObj.productCode === batch.productCode)
            string += this.createBatchRowHTML(batch, product, index === batchesCount - 1);
        });

        this.items = string;
    }

    afterRender() {
        let pageBody = this.element.querySelector(".page-body");
        let batches = this.element.querySelector(".batches-section");
        if (this.batches.length === 0) {
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
                let products = await $$.promisify(webSkel.client.listProducts)(undefined, undefined, [`productCode == ${this.inputValue}`]);
                if (products.length > 0) {
                    this.products = products;
                    this.batches = await $$.promisify(webSkel.client.listBatches)(undefined, undefined, [`productCode == ${this.inputValue}`]);
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
            this.products = await $$.promisify(webSkel.client.listProducts)();
            this.batches = await $$.promisify(webSkel.client.listBatches)();
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
}
