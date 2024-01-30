export class AddEpiModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender(){

    }
    afterRender(){

    }
    closeModal(_target) {
        webSkel.UtilsService.closeModal(_target);
    }

    switchModalView(){
        let modal = webSkel.UtilsService.getClosestParentElement(this.element,"dialog");
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
    displaySelectedFiles(input, event) {
        const files = input.files;
        const container = this.element.querySelector('.files-table');
        if ('webkitdirectory' in input) {
            let stringHMTL = "";
            for (let i = 0; i < files.length; i++) {
                stringHMTL += `<div class="file-item">
                                    <button class="default-button small-padding" data-local-action="removeFile" data-name="${files[i].name}">&times;</button>
                                    <div class="file-name">${files[i].name}</div>
                               </div>`;
            }
            container.insertAdjacentHTML("beforeend", stringHMTL);
        } else {
            container.textContent = 'This browser does not support selecting directories.';
        }
        let button = this.element.querySelector("#accept-button");
        button.disabled = false;
    }
    uploadFiles(){
        let inputFile = this.element.querySelector("#leaflet");
        inputFile.removeEventListener("input", this.boundFn);
        this.boundFn = this.displaySelectedFiles.bind(this, inputFile);
        inputFile.addEventListener("input", this.boundFn);
        inputFile.click();
    }
    removeFile(_target){
        let inputFile = this.element.querySelector("#leaflet");
        let fileName = _target.getAttribute("data-name");
        let filteredFiles= Array.from(inputFile.files).filter(file => file.name !== fileName);
        let dataTransfer = new DataTransfer();

        filteredFiles.forEach(file => {
            dataTransfer.items.add(file);
        });

        inputFile.files = dataTransfer.files;
        let item = webSkel.UtilsService.getClosestParentElement(_target, ".file-item");
        item.remove();
    }

    addEPI(_target){
        webSkel.notifyObservers("manage-product-page");
        this.closeModal(_target);
    }
}