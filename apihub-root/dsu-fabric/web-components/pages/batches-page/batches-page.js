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
        let table = this.element.querySelector("table-header");
        let header = ["Brand / invented name", "Name of Medicinal Product", "Product Code", "Batch", "Expiry date(yy/mm/dd)", "2D Data Matrix", "Batch version", "Edit Batch"]
        table.setAttribute("data-columns",JSON.stringify(header));
        let items = this.element.querySelector(".items");
        items.style.gridTemplateColumns = `repeat(8,${webSkel.batches.length}fr)`;
    }
    async navigateToManageProductPage(){
        await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }
}
