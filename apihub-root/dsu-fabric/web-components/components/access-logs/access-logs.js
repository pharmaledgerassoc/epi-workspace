export class AccessLogs {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.logs = [{
            userId: "devuser",
            action: "Access wallet",
            userDID: "did:ssi:name:vault:DSU_Fabric/devuser",
            userGroup: "ePI_Write_Group",
            isoDate: "2024-01-23T13:28:17.706Z"
        }];
        let string = "";
        for(let item of this.logs){
            string += ` <div>${item.userId}</div>
                        <div>${item.action}</div>
                        <div>${item.userDID}</div>
                        <div>${item.userGroup}</div>
                        <div>${item.isoDate}</div>`;
        }
        this.items = string;
    }
    afterRender(){

    }
}