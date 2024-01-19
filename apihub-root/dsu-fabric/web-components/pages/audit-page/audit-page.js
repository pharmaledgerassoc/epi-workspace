export class Audit {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){}
}
