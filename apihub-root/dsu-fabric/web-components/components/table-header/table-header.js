export class TableHeader {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {
        this.headerNames = JSON.parse(this.element.getAttribute("data-columns"));
        let string = "";
        let i = 0;
        for(let name of this.headerNames){
            if(i === 0){
                string += `<div class="column-header first-column">${name}</div>`;
            }else if(i === this.headerNames.length - 1){
                string += `<div class="column-header last-column">${name}</div>`;
            }else{
                string += `<div class="column-header">${name}</div>`;
            }
            i++;
        }
        this.header = string;
    }

    afterRender() {
        let header = this.element.querySelector(".header-section");
        header.style.gridTemplateColumns = `repeat(${this.headerNames.length}, 1fr)`;
    }

}