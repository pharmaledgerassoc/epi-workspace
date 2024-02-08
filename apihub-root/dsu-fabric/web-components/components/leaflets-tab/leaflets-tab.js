export class LeafletsTab {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
        this.epis = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
    }
    beforeRender(){
        let stringHTML = "";
        if(this.epis.length > 0 && !this.epis.every(epi => epi.action === "delete")){
            for(let epi of this.epis){
                if(epi.action === "delete"){
                    continue;
                }
                stringHTML+= `<div class="leaflet-unit" data-id="${epi.id}">
                            <div class="leaflet-details">
                                <div class="leaflet-language">${gtinResolver.Languages.getLanguageName(epi.language)} ${epi.type}</div>
                                <div class="leaflet-files">${epi.filesCount} files</div>
                            </div>
                            <div class="leaflet-buttons">
                            <div class="leaflet-button pointer" data-local-action="deleteLeaflet">
                                <img class="leaflet-img" src="./assets/icons/thrash.svg" alt="thrash">
                            </div>
                            <div class="leaflet-button pointer" data-local-action="viewLeaflet">
                                <img class="leaflet-img" src="./assets/icons/eye.svg" alt="eye">
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
