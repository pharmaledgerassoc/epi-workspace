export class IntegrationPage{
    constructor(element,invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender(){

    }

}