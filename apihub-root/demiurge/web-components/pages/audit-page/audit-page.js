export class AuditPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {
        if (!this.tab) {
            this.tab = `<demiurge-access-logs data-presenter="demiurge-access-logs"></demiurge-access-logs>`;
        }
    }

    afterRender() {
        if (this.selectedTab) {
            let allTabs = document.querySelectorAll(".tab-section .tab")
            allTabs.forEach(tab => {
                tab.classList.remove("selected");
            })
            document.querySelector(`#${this.selectedTab}`).classList.add("selected");
        }

    }

    switchTab(_target) {
        this.selectedTab = _target.getAttribute("id");
        this.tab = `<${this.selectedTab} data-presenter="${this.selectedTab}"></${this.selectedTab}>`;
        this.invalidate();
    }
}
