export class Products {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();

    }

    beforeRender(){
        let string = "";
        for(let item of webSkel.products){
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
        let table = this.element.querySelector("table-header");
        let header = ["Brand / invented name", "Name of Medicinal Product", "Product Code", "View details"]
        table.setAttribute("data-columns",JSON.stringify(header));
        let items = this.element.querySelector(".items");
        items.style.gridTemplateColumns = `repeat(4,${webSkel.products.length -1})`;
    }
    async navigateToManageProductPage(){
       await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }
}
