export class Menu {
    constructor(element,invalidate) {
        this.element=element;
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender() {

    }
    activateSidebarSelection(_target){
        const oldLink = this.element.querySelector('#active-menu-item');
        if (oldLink) {
            oldLink.removeAttribute('id');
        }
        const link= _target.querySelector('a');
        link.id="active-menu-item";
    }
    async navigateToMyAccount(_target) {
        this.activateSidebarSelection(_target);
    }

    async navigateToProducts(_target) {
        this.activateSidebarSelection(_target);

    }

    async navigateToBatches(_target) {
        this.activateSidebarSelection(_target);

    }

    async navigateToAudit(_target) {
        this.activateSidebarSelection(_target);

    }

    async navigateToBlockchainStatus(_target) {
        this.activateSidebarSelection(_target);

    }

    async navigateToLogout(_target) {
        this.activateSidebarSelection(_target);

    }
}