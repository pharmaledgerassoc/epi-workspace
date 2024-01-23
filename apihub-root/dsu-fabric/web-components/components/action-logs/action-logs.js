export class ActionLogs {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.logs = [{
            gtin: "00000000000000",
            batch: "-",
            reason: "Created Product",
            user: "devuser",
            creationTime: "2024-01-23T13:34:37.587Z"
        }];
        let string = "";
        for(let item of this.logs){
            string += `<div class="table-item" style="grid-template-columns: repeat(6, 1fr)">
                            <div>${item.gtin}</div>
                            <div>${item.batch}</div>
                            <div>${item.reason}</div>
                            <div>${item.user}</div>
                            <div>${item.creationTime}</div>
                            <div class="view-details pointer" data-local-action="openActionLogModal">View</div>
                       </div>`;
        }
        this.items = string;
    }
    afterRender(){
        let logs = this.element.querySelector(".logs-section");
        if(this.logs.length === 0){
            logs.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }else {
            let items = this.element.querySelector(".items");
            items.style.gridTemplateColumns = `repeat(8,${this.logs.length}fr)`;
        }
    }
    openActionLogModal(){
        console.log("to be done");
    }
}