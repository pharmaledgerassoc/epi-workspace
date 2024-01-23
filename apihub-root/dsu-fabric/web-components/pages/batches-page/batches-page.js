export class Batches {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate(async ()=>{
            this.batches = await $$.promisify(webSkel.client.listBatches)();
            this.products = await $$.promisify(webSkel.client.listProducts)();
        });

    }

    beforeRender(){
        let string = "";
        for(let item of this.batches){
            let product = this.products.find(prodObj => prodObj.product.productCode === item.batch.productCode)
            string += `
                        <div>${product.product.inventedName}</div>
                        <div>${product.product.nameMedicinalProduct}</div>
                        <div>${item.batch.productCode}</div>
                        <div>${item.batch.batch}</div>
                        <div>${item.batch.expiryDate}</div>
                        <div class="view-details pointer" data-local-action="openDataMatrixModal">View</div>
                        <div>${item.messageTypeVersion}</div>
                        <div class="view-details pointer" data-local-action="navigateToEditBatch">Edit</div>
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
                                        There are no data on any previous batch
                                    </div>
                                    <div class="no-data-instructions">
                                        Start by using one of the right side actions (import or add).
                                    </div>
                                </div>`;
            pageBody.insertAdjacentHTML("beforeend", noData)
        }
    }
    async navigateToManageProductPage(){
        await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }
}
