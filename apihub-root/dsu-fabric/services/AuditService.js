export class AuditService{
    constructor() {
    }
    objectToArray(item){
        let itemCopy = Object.assign({}, item);
        delete itemCopy.__version;
        delete itemCopy.pk;
        delete itemCopy.__timestamp;
        let batch = "-";
        if(itemCopy.logInfo.payload.batch){
            batch = itemCopy.logInfo.payload.batch;
            delete itemCopy.logInfo.payload.batch;
        }
        let arr = [itemCopy.itemCode, batch, itemCopy.reason, itemCopy.logInfo.senderId, itemCopy.logInfo.messageDateTime];
        let details = {logInfo: itemCopy};
        arr.push(JSON.stringify(details));
        return arr;
    }
    convertToCSV(items){
        let headers = ["gtin","batch","reason","username","creationTime","details"];
        let columnTitles = headers.join(",") + "\n";
        let rows = "";
        for (let item of items) {
            item = this.objectToArray(item).join(",");
            rows += item + "\n";
        }
        return [columnTitles + rows];
    }
}