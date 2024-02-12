export class LeftSidebar {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.selectedSidebarItem = this.element.getAttribute('data-sidebar-selection');
        this.invalidate();

    }

    beforeRender() {
    }

    afterRender() {
        if(this.selectedSidebarItem){
            const desiredSidebarSelection = this.element.querySelector(`[data-id="${this.selectedSidebarItem}"]`);
            if (desiredSidebarSelection) {
                this.activateSidebarSelection(desiredSidebarSelection);
            }
        } else {
            this.changeSidebarFromURL(window.location.hash);
        }
    }
    changeSidebarFromURL(currentPage) {
        let categories = ["home", "my-account", "product", "batch", "audit", "logout"];
        let sidebarItems = document.querySelectorAll(".menu-item");
        if (!sidebarItems) {
            return;
        }
        let elements = {};
        for (let category of categories) {
            elements[category] = Array.from(sidebarItems).find(sidebarItem => sidebarItem.getAttribute("data-category") === category);
        }
        for (let category of categories) {
            if (currentPage.includes(category)) {
                elements[category].id = "active-menu-item";
                return;
            }
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

    async navigateToPage(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        await webSkel.changeToDynamicPage(`${webComponentPage}`, `${webComponentPage}`);
    }
}