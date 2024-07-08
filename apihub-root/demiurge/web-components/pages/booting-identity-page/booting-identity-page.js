export class BootingIdentityPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {
        this.username = "John Doe";
    }

    async createIdentity(_target) {
        _target.classList.add("disabled-btn");
        _target.innerHTML = `<i class="fa fa-circle-o-notch fa-spin" style="font-size:18px; width: 18px; height: 18px;"></i>`;
        _target.classList.add("remove");
        const initialiseIdentityModal = await webSkel.showModal("create-identity-modal");
        setTimeout(async () => {
            initialiseIdentityModal.close();
            initialiseIdentityModal.remove();
            const createdIdentityModal = await webSkel.showModal("break-glass-recovery-code-modal");
        }, 4000); //artificial delay for UI testing

    }
}