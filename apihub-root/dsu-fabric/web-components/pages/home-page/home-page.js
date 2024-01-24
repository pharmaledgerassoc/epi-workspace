export class Home {
    constructor(element,invalidate) {
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender() {

    }

    async navigateToProductsPage(){
        await webSkel.changeToDynamicPage("products-page", "products-page");
    }
    async navigateToBatchesPage(){
        await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }
    async navigateToMyAccountPage(){
        await webSkel.changeToDynamicPage("my-account-page", "my-account-page");
    }
}