export class LeafletsTab {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
        this.leaflets = JSON.parse(this.element.getAttribute("data-units"));
    }
    beforeRender(){
        let stringHTML = "";
        if(this.leaflets){
            for(let leaflet of this.leaflets){
                stringHTML+= `<div class="leaflet-unit">
                            <div class="leaflet-details">
                                <div class="leaflet-language">${leaflet.language} Leaflet</div>
                                <div class="leaflet-files">${leaflet.filesCount} files</div>
                            </div>
                            <div class="leaflet-buttons">
                            <div class="leaflet-button pointer">
                                <img class="leaflet-img" src="./assets/icons/thrash.svg" alt="thrash">
                            </div>
                            <div class="leaflet-button pointer">
                                <img class="leaflet-img" src="./assets/icons/eye.svg" alt="eye">
                            </div>
                            </div>
                         </div>`
            }
        }else {
            stringHTML = `<div class="no-data">No leaflets added yet</div>`;
        }

        this.leafletUnits = stringHTML;
    }
    afterRender(){

    }

}