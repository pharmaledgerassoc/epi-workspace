import {changeSidebarFromURL, navigateToPage} from "../../../utils/utils.js";

export class HomePage {
    constructor(element, invalidate) {
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {

    }

    afterRender() {
        changeSidebarFromURL();
    }

    async navigateToProductsPage() {
        await navigateToPage("products-page");
    }

    async navigateToBatchesPage() {
        await navigateToPage("batches-page");
    }

    async navigateToMyAccountPage() {
        await navigateToPage("my-account-page");
    }

    async showEpiModal() {
        await webSkel.showModal("add-epi-modal");
    }

    async showMarketplaceModal() {
        await webSkel.showModal("markets-management-modal");
    }

}

