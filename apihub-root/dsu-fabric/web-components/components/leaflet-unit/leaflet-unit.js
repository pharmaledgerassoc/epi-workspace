export class LeafletUnit {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {});
    }
    beforeRender(){}
}