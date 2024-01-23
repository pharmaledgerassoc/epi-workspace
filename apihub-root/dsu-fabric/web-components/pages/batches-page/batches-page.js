export class Batches {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();

    }

    beforeRender(){
        let string = "";
        for(let item of webSkel.batches){
            let product = webSkel.products.find(prodObj => prodObj.product.productCode === item.batch.productCode)
            string += `<div class="table-item" style="grid-template-columns: repeat(8, 1fr)">
                            <div>${product.product.inventedName}</div>
                            <div>${product.product.nameMedicinalProduct}</div>
                            <div>${item.batch.productCode}</div>
                            <div>${item.batch.batch}</div>
                            <div>${item.batch.expiryDate}</div>
                            <div class="view-details pointer" data-local-action="openDataMatrixModal">View</div>
                            <div>${item.messageTypeVersion}</div>
                            <div class="view-details pointer" data-local-action="navigateToEditBatch">Edit</div>
                       </div>`;
        }
        this.items = string;
    }
    afterRender(){
        let pageBody = this.element.querySelector(".page-body");
        let products = this.element.querySelector(".products-section");
        if(webSkel.products.length === 0){
            products.style.display = "none";
            let noData = `<div>
                                    <div class="no-data-label">
                                        There are no data on any previous batch
                                    </div>
                                    <div class="no-data-instructions">
                                        Start by using one of the right side actions (import or add).
                                    </div>
                                </div>`;
            pageBody.insertAdjacentHTML("beforeend", noData)
        }else {
            let items = this.element.querySelector(".items");
            items.style.gridTemplateColumns = `repeat(8,${webSkel.products.length}fr)`;
        }
    }
    async navigateToManageProductPage(){
        await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }
}
