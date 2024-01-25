import {closeModal} from "../../../imports.js"
export class AuditEntryModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.pk = this.element.getAttribute("data-pk");
        this.invalidate(async ()=>{
            this.entry = await $$.promisify(webSkel.client.filterAuditLogs)(undefined, undefined, [`pk == ${this.pk}`]);
        });
    }
    beforeRender(){
        let cleanObject = function JSONstringifyOrder(obj) {
            const objToDisplay = {};
            let displayKeys = ["username", "reason", "status", "itemCode", "diffs", "anchorId", "hashLink", "metadata", "logInfo"];
            displayKeys.forEach(key => {
                objToDisplay[key] = obj[key];
            })

            return objToDisplay
        }
        this.data = JSON.stringify(cleanObject(this.entry[0]),null, 4);
    }
    closeModal(_target) {
        closeModal(_target);
    }

    switchModalView(){
        let modal = webSkel.UtilsService.getClosestParentElement(this.element,"dialog");
        if(!modal.getAttribute("data-expanded")){
            modal.setAttribute("data-expanded", "true")
            modal.style.width = "95%";
            modal.style.maxWidth = "95vw";
        }else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "70%";
            modal.style.maxWidth = "70vw";
        }
    }
}