export class Products {
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
            string += `<div class="table-item" style="grid-template-columns: repeat(4, 1fr)">
                            <div>${item.product.inventedName}</div>
                            <div>${item.product.nameMedicinalProduct}</div>
                            <div>${item.product.productCode}</div>
                            <div class="view-details pointer" data-local-action="navigateToManageProductPage">View/Edit</div>
                       </div>`;
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
        }else {
            let items = this.element.querySelector(".items");
            items.style.gridTemplateColumns = `repeat(4,${this.products.length}fr)`;
        }
    }
    async navigateToManageProductPage(){
       await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }
}
