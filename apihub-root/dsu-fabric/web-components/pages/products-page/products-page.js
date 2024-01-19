export class Products {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){}
}
