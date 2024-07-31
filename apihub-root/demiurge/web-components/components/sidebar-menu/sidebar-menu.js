export class SidebarMenu {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    afterRender() {
        this.highlightCurrentSelection(window.location.hash.slice(1));
    }

    async changePage(_target, page) {
        if (page === 'logout') {
            sessionStorage.setItem("initialURL", window.location.href);
            window.top.location = "/logout";
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
        let currentElement = this.element.querySelector(`.${page}`);
        currentElement.setAttribute("id", "active");
        currentElement.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
    }
}
