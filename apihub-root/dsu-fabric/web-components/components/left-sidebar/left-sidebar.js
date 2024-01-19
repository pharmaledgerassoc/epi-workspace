export class Menu {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.selectedSidebarItem = this.element.getAttribute('data-sidebar-selection');
        this.invalidate();

    }

    beforeRender() {
    }

    afterRender() {
        const desiredSidebarSelection = this.element.querySelector(`[data-id="${this.selectedSidebarItem}"]`);
        if (desiredSidebarSelection) {
            this.activateSidebarSelection(desiredSidebarSelection);
        }
    }

    activateSidebarSelection(clickTargetElement) {
        const oldSidebarSelection = this.element.querySelector('#active-menu-item');
        if (oldSidebarSelection) {
            oldSidebarSelection.removeAttribute('id');
        }
        const newSidebarSelection = clickTargetElement;
        newSidebarSelection.id = "active-menu-item";
        return newSidebarSelection.getAttribute('data-id');
    }

    async navigateToMyAccount(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        webSkel.changeToDynamicPage(`${webComponentPage}`, `${webComponentPage}`);
    }

    async navigateToProducts(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        webSkel.changeToDynamicPage(`${webComponentPage}`, `${webComponentPage}`);
    }

    async navigateToBatches(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        webSkel.changeToDynamicPage(`${webComponentPage}`, `${webComponentPage}`);

    }

    async navigateToAudit(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        webSkel.changeToDynamicPage(`${webComponentPage}`,`${webComponentPage}`);
    }

    async navigateToBlockchainStatus(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        webSkel.changeToDynamicPage(`${webComponentPage}`,`${webComponentPage}`);
    }

    async navigateToLogout(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        webSkel.changeToDynamicPage(`${webComponentPage}`,`${webComponentPage}`);
    }
}