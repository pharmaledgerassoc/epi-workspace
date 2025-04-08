export class SidebarMenu {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {
    }

    afterRender() {
        this.highlightCurrentSelection(window.location.hash.slice(1));
    }

    async changePage(_target, page) {
        if (page === 'logout') {
            window.disableRefreshSafetyAlert = true;
            sessionStorage.setItem("initialURL", window.location.href);
            window.top.location = "/logout";
            return;
        }
        await webSkel.changeToDynamicPage(page, `${page}`);
        this.highlightCurrentSelection(page);
    }

    highlightCurrentSelection(page) {
        let element = this.element.querySelector(`#active`);
        if (element) {
            element.removeAttribute("id");
        }
        page = page.split("/")[0];
        if (page) {
            let currentElement = this.element.querySelector(`.${page}`);
            if (currentElement) {
                currentElement.setAttribute("id", "active");
                currentElement.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
            }
        }
    }
}
