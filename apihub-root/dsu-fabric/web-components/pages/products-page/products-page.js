import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class ProductsPage extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.editModeLabel = this.userRights === constants.USER_RIGHTS.READ ? "View" : "View/Edit";
        this.productsNumber = 16;
        this.disableNextBtn = true;
        this.firstElementTimestamp = 0;
        this.lastElementTimestamp = undefined;
        this.previousPageFirstElements = [];
        this.loadProducts = (query)=>{
            this.invalidate(async () => {
                this.products = await webSkel.appServices.getProducts(this.productsNumber, query);
                if(this.products.length === this.productsNumber){
                    this.products.pop();
                    this.disableNextBtn = false;
                }
                else if(this.products.length < this.productsNumber){
                    this.disableNextBtn = true;
                }
                this.lastElementTimestamp = this.products[this.products.length-1].__timestamp;
                this.firstElementTimestamp = this.products[0].__timestamp;
            });
        };
        this.loadProducts();
    }

    createProductRowHTML(product, lastRowItem = false) {
        const createClassString = (...classNames) => {
            return classNames.filter(Boolean).join(' ');
        }
        const classCellBorder = "cell-border-bottom";
        const viewEditClass = "view-details pointer";
        return `
            <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${product.inventedName}</div>
            <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${product.nameMedicinalProduct}</div>
            <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${product.productCode}</div>
            <div class="${createClassString(viewEditClass, lastRowItem ? "" : classCellBorder)}" data-local-action="viewProductDetails ${product.productCode}">${this.editModeLabel}</div>
        `;
    }

    beforeRender() {
        let string = "";
        const productsCount = this.products.length;
        this.products.forEach((product, index) => {
            string += this.createProductRowHTML(product, index === productsCount - 1);
        });
        this.items = string;
    }

    afterRender() {
        let pageBody = this.element.querySelector(".page-body");
        let products = this.element.querySelector(".products-section");
        if (this.products.length === 0) {
            products.style.display = "none";
            let paginationSection = this.element.querySelector(".table-pagination");
            paginationSection.style.display = "none";
            let noData = `<div>
                                    <div class="no-data-label">
                                        There are no data on any previous product
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
        this.boundFnKeypress = this.searchProduct.bind(this);
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

    async navigateToManageProductPage() {
        await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }

    async viewProductDetails(_target, productCode) {
        await webSkel.changeToDynamicPage("manage-product-page", `manage-product-page?product-code=${productCode}`);
    }

    async searchProduct(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            let formData = await webSkel.extractFormInformation(this.searchInput);
            if (formData.isValid) {
                this.inputValue = formData.data.productCode;
                let products = await webSkel.appServices.getProducts(undefined, [`productCode == ${this.inputValue}`]);
                if (products.length > 0) {
                    this.products = products;
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
        this.loadProducts();
    }

    previousTablePage(_target){
        if(!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0){
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            this.loadProducts([`__timestamp <= ${this.firstElementTimestamp}`]);
        }
    }
    nextTablePage(_target){
        if(!_target.classList.contains("disabled")){
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            this.loadProducts([`__timestamp < ${this.firstElementTimestamp}`]);
        }
    }
}
