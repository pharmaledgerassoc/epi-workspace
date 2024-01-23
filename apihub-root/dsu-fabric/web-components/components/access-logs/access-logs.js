export class AccessLogs {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.logs = [{
            userId: "00000000000000",
            action: "-",
            userDID: "Created Product",
            userGroup: "devuser",
            isoDate: "2024-01-23T13:34:37.587Z"
        }];
        let string = "";
        for(let item of this.logs){
            string += `<div class="table-item" style="grid-template-columns: repeat(5, 1fr)">
                            <div>${item.userId}</div>
                            <div>${item.action}</div>
                            <div>${item.userDID}</div>
                            <div>${item.userGroup}</div>
                            <div>${item.isoDate}</div>
                       </div>`;
        }
        this.items = string;
    }
    afterRender(){

    }
}