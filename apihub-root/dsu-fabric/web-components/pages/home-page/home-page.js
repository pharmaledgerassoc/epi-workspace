export class HomePage {
    constructor(element, invalidate) {
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {

    }

    async navigateToProductsPage() {
        let menuItem = document.querySelector(".left-sidebar-menu-item a[data-id='products-page']");
        menuItem.click();
        //  await webSkel.changeToDynamicPage("products-page", "products-page");
    }

    async navigateToBatchesPage() {
        let menuItem = document.querySelector(".left-sidebar-menu-item a[data-id='batches-page']");
        menuItem.click();
        // await webSkel.changeToDynamicPage("batches-page", "batches-page");
    }

    async navigateToMyAccountPage() {
        let menuItem = document.querySelector(".left-sidebar-menu-item a[data-id='my-account-page']");
        menuItem.click();
        // await webSkel.changeToDynamicPage("my-account-page", "my-account-page");
    }

    async showEpiModal() {
        await webSkel.showModal("add-epi-modal");
    }

    async showMarketplaceModal() {
        await webSkel.showModal("markets-management-modal");
    }

}

