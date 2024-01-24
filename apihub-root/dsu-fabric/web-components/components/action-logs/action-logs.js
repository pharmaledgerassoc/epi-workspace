export class ActionLogs {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate(async ()=>{
            this.logs = await $$.promisify(webSkel.client.filterAuditLogs)(0, undefined, undefined, "__timestamp > 0");
        });
    }
    beforeRender(){
        let string = "";
        for(let item of this.logs){
            let batch = "-";
            if(item.logInfo.messageType === "Batch")
            {
                batch = item.logInfo.payload.batch;
            }
            string += `
                        <div>${item.itemCode}</div>
                        <div>${batch}</div>
                        <div>${item.reason}</div>
                        <div>${item.logInfo.senderId}</div>
                        <div>${item.logInfo.messageDateTime}</div>
                        <div class="view-details pointer" data-local-action="openActionLogModal">View</div>
                      `;
        }
        this.items = string;
    }
    afterRender(){
        let logs = this.element.querySelector(".logs-section");
        if(this.logs.length === 0){
            logs.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }
    }
    openActionLogModal(){
        console.log("to be done");
    }
}