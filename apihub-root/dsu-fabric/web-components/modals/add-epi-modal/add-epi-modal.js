export class AddEpiModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.pk = this.element.getAttribute("data-pk");
        this.invalidate();
    }
    beforeRender(){

    }
    afterRender(){

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
        }else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "70%";
            modal.style.maxWidth = "70vw";
        }
    }
}