export class HomePage {
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

    async showEpiModal(){
        await webSkel.UtilsService.showModal(document.querySelector("body"), "add-epi-modal", { presenter: "add-epi-modal"});
    }
}