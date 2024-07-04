export class SidebarMenu {
    constructor(element,invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender(){
    }
    afterRender(){
        this.highlightCurrentSelection(window.location.hash.slice(1));
    }
    async changePage(_target, page){
        await webSkel.changeToDynamicPage(page, `${page}`);
        this.highlightCurrentSelection(page);
    }
    highlightCurrentSelection(page){
        let element = this.element.querySelector(`#active`);
        if(element){
            element.removeAttribute("id");
        }
        this.element.querySelector(`.${page}`).setAttribute("id", "active");
    }
}