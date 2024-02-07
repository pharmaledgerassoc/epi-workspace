export class DataDiffsModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.diffs = JSON.parse(decodeURIComponent(this.element.getAttribute("data-diffs")));
        this.invalidate();
    }

    beforeRender(){
        let stringHTML = "";
        for (let i= 0; i < this.diffs.length; i++){
            let property = this.diffs[i].changedProperty;
            let oldValue = this.diffs[i].oldValue.value;
            let newValue = this.diffs[i].newValue.value;
            if(property === "Product Photo"){
                oldValue = `<img class="photo" src="${oldValue}" alt="oldValue">`;
                newValue = `<img class="photo" src="${newValue}" alt="newValue">`;
            }
            if(newValue.filesCount){
                newValue = `<div class="view-details pointer" data-local-action="viewEPI ${newValue.id}">view</div>`;
            }
            if(oldValue.filesCount){
                oldValue = `<div class="view-details pointer" data-local-action="viewEPI ${newValue.id}">view</div>`;
            }
            if(i === this.diffs.length - 1){
                stringHTML += `
                        <div class="cell border border-radius-left">${property}</div>
                        <div class="cell border">${oldValue}</div>
                        <div class="cell border-radius-right">${newValue}</div>
            `;
            }else {
                stringHTML += `
                        <div class="cell border">${property}</div>
                        <div class="cell border">${oldValue}</div>
                        <div class="cell">${newValue}</div>
            `;
            }
        }
        this.rows = stringHTML;
    }
    afterRender(){
    }
    closeModal(_target) {
        webSkel.closeModal(_target);
    }
    switchModalView(){
        let modal = webSkel.getClosestParentElement(this.element,"dialog");
        if(!modal.getAttribute("data-expanded")){
            modal.setAttribute("data-expanded", "true")
            modal.style.width = "95%";
            modal.style.maxWidth = "95vw";
            this.element.style.marginLeft = "0";
        }else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "75%";
            modal.style.maxWidth = "75vw";
            this.element.style.marginLeft = "240px";
        }
    }
    acceptChanges(_target){
        webSkel.closeModal(_target, true);
    }
    viewEPI(id){
        console.log("to be done");
    }
}