export class DialogModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;

        this.message = this.element.variables["data-message"];
        this.header = this.element.variables["data-header"];
        this.denyButtonText = this.element.variables["data-denybuttontext"];
        this.acceptButtonText = this.element.variables["data-acceptbuttontext"];

        this.invalidate();
    }

    beforeRender(){

    }

    deny(_target){
        webSkel.closeModal(_target, false);
    }

    accept(_target){
       webSkel.closeModal(_target, true);
    }
}