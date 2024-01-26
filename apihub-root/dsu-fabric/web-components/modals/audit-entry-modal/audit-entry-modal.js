export class AuditEntryModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.pk = this.element.getAttribute("data-pk");
        this.invalidate(async ()=>{
            let entries = await $$.promisify(webSkel.client.filterAuditLogs)(undefined, undefined, [`pk == ${this.pk}`]);
            this.entry = entries[0];
        });
    }
    JSONstringifyOrder(obj) {
        const objToDisplay = {};
        let displayKeys = ["username", "reason", "status", "itemCode", "diffs", "anchorId", "hashLink", "metadata", "logInfo"];
        displayKeys.forEach(key => {
            objToDisplay[key] = obj[key];
        })
        return objToDisplay;
    }
    beforeRender(){
        this.data = JSON.stringify(this.JSONstringifyOrder(this.entry),null, 4);
    }
    closeModal(_target) {
        webSkel.UtilsService.closeModal(_target);
    }

    switchModalView(){
        let modal = webSkel.UtilsService.getClosestParentElement(this.element,"dialog");
        if(!modal.getAttribute("data-expanded")){
            modal.setAttribute("data-expanded", "true")
            modal.style.width = "95%";
            modal.style.maxWidth = "95vw";
            this.element.style.marginLeft = "0";
        }else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "75%";
            modal.style.maxWidth = "75vw";
            this.element.style.marginLeft = "240px";
        }
    }

    downloadJSON(){
        let string = JSON.stringify(this.JSONstringifyOrder(this.entry),null, 4);
        const blob = new Blob([string], { type: 'application/json' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${this.entry.reason}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }
}