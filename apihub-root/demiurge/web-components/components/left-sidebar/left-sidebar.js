export class LeftSidebar{
    constructor(element,invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender(){

    }
    async changePage(_target, page){
        await webSkel.changeToDynamicPage(page, `/demiurge/${page}`);
    }
}