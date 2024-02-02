export class DataDiffsModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender(){
    }
    afterRender(){
    }
    closeModal(_target) {
        webSkel.UtilsService.closeModal(_target);
    }
}