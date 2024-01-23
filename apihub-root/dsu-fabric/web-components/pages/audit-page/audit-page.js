export class Audit {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){}
    afterRender(){
        this.selectedTab = this.element.querySelector(".highlighted");
    }
    switchTab(_target){
        let selected = this.element.querySelector(".highlighted");
        selected.classList.remove("highlighted");
        selected.classList.add("inactive");
        _target.classList.remove("inactive");
        _target.classList.add("highlighted")
    }
}
