export class Home {
    constructor(element,invalidate) {
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender() {

    }

    async navigateToProductsPage(){

    }
    async navigateToBatchesPage(){

    }
    async navigateToMyAccountPage(){
        await webSkel.changeToDynamicPage("my-account", "my-account");
    }
}