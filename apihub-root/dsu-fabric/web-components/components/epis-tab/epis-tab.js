export class EPIsTab{
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
        this.epis = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
    }
    beforeRender(){
        this.epis = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
        let stringHTML = "";
        if(this.epis.length > 0 && !this.epis.every(epi => epi.action === "delete")){
            for(let epi of this.epis){
                if(epi.action === "delete"){
                    continue;
                }
                stringHTML+= `<div class="epi-unit" data-id="${epi.id}">
                            <div class="epi-details">
                                <div class="epi-language">${gtinResolver.Languages.getLanguageName(epi.language)} ${epi.type}</div>
                                <div class="epi-files">${epi.filesCount} files</div>
                            </div>
                            <div class="epi-buttons">
                            <div class="epi-button pointer" data-local-action="deleteEpi">
                                <img class="epi-img" src="./assets/icons/thrash.svg" alt="thrash">
                            </div>
                            <div class="epi-button pointer" data-local-action="viewLeaflet">
                                <img class="epi-img" src="./assets/icons/eye.svg" alt="eye">
                            </div>
                            </div>
                         </div>`
            }
        }else {
            stringHTML = `<div class="no-data">No leaflets added yet</div>`;
        }

        this.epiUnits = stringHTML;
    }
    afterRender(){

    }

}
