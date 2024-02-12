export class ProductsPage {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate(async ()=>{
            this.products = await $$.promisify(webSkel.client.listProducts)();
        });
    }

     beforeRender(){
        let string = "";
        for(let item of this.products){
            string += `
                        <div>${item.inventedName}</div>
                        <div>${item.nameMedicinalProduct}</div>
                        <div>${item.productCode}</div>
                        <div class="view-details pointer" data-local-action="viewProductDetails ${item.productCode}">View/Edit</div>
                       `;
        }
        this.items = string;
    }
    afterRender(){
        let pageBody = this.element.querySelector(".page-body");
        let products = this.element.querySelector(".products-section");
        if(this.products.length === 0){
            products.style.display = "none";
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

        if(this.boundFnKeypress){
            this.searchInput.removeEventListener("keypress", this.boundFnKeypress);
        }
        this.boundFnKeypress= this.searchProduct.bind(this);
        this.searchInput.addEventListener("keypress", this.boundFnKeypress);

        if(this.boundFnMouseLeave){
            this.searchInput.removeEventListener("mouseleave", this.boundFnMouseLeave);
        }
        this.boundFnMouseLeave = this.hideXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseleave", this.boundFnMouseLeave);

        if(this.boundFnMouseEnter){
            this.searchInput.removeEventListener("mouseenter", this.boundFnMouseEnter);
        }
        this.boundFnMouseEnter = this.showXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseenter", this.boundFnMouseEnter);

        if(this.boundFnFocusout){
            this.searchInput.removeEventListener("focusout", this.boundFnFocusout);
        }
        this.boundFnFocusout = this.removeFocus.bind(this, xMark);
        this.searchInput.addEventListener("focusout", this.boundFnFocusout);

        if(this.boundFnInput){
            this.searchInput.removeEventListener("input", this.boundFnInput);
        }
        this.boundFnInput = this.toggleSearchIcons.bind(this, xMark);
        this.searchInput.addEventListener("input", this.boundFnInput);

        if(this.focusInput){
            this.searchInput.focus();
            xMark.style.display = "block";
            this.focusInput = false;
        }
    }

    toggleSearchIcons(xMark, event){
        if(this.searchInput.value === ""){
            xMark.style.display = "none";
        }else {
            xMark.style.display = "block";
        }
    }
    removeFocus(xMark, event){
        xMark.style.display = "none";
    }
    showXMark(xMark, event){
        if(this.searchInput.value !== ""){
            xMark.style.display = "block";
        }
    }
    hideXMark(xMark, event){
        if(document.activeElement !== this.searchInput){
            xMark.style.display = "none";
        }
    }
    async navigateToManageProductPage(){
       await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }
    async viewProductDetails(_target, productCode){
        await webSkel.changeToDynamicPage("manage-product-page", `manage-product-page?product-code=${productCode}`);
    }

    async searchProduct(event){
        if(event.key === "Enter"){
            event.preventDefault();
            let formData = await webSkel.extractFormInformation(this.searchInput);
            if(formData.isValid){
                this.inputValue = formData.data.productCode;
                let products = await $$.promisify(webSkel.client.listProducts)(undefined, undefined, [`productCode=${this.inputValue}`]);
                if(products.length > 0){
                    this.products = products;
                    this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
                }else {
                    this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
                }
                this.focusInput = true;
                this.invalidate();
            }
        }
    }
    async deleteInput(xMark){
        this.searchResultIcon = "";
        delete this.inputValue;
        this.invalidate(async ()=>{
            this.products = await $$.promisify(webSkel.client.listProducts)();
        });
    }
}
