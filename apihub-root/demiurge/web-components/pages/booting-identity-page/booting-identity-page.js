export class BootingIdentityPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {

    }

    async createIdentity() {
        const initialiseIdentityModal = await webSkel.showModal("create-identity-modal");
        setTimeout(async () => {
            initialiseIdentityModal.close();
            initialiseIdentityModal.remove();
            const createdIdentityModal = await webSkel.showModal("break-glass-recovery-code-modal");
        }, 4000); //artificial delay for UI testing

    }
}