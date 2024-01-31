export class EditBatchPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
        });
    }
    beforeRender(){
        this.productVersion=0; //getProductVersion()

    }
}