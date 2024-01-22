export class Products {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.obj = [{
            brand:"brand",
            name:"name",
            code: "00000000000000",
        },{
            brand:"brand",
            name:"name",
            code: "00000000000000",
        },{
            brand:"brand",
            name:"name",
            code: "00000000000000",
        }];
        let string = "";
        for(let item of this.obj){
            string += `<div class="table-item" style="grid-template-columns: repeat(4, 1fr)">
                            <div>${item.brand}</div>
                            <div>${item.name}</div>
                            <div>${item.code}</div>
                            <div class="view-details" data-local-action="navigateToManageProductPage">View/Edit</div>
                       </div>`;
        }
        this.items = string;
    }
    afterRender(){
        let table = this.element.querySelector("table-header");
        let header = ["Brand / invented name", "Name of Medicinal Product", "Product Code", "View details"]
        table.setAttribute("data-columns",JSON.stringify(header));
        let items = this.element.querySelector(".items");
        items.style.gridTemplateColumns = `repeat(4,${this.obj.length -1})`;
    }
}
