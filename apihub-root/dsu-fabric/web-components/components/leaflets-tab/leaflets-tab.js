export class LeafletsTab {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.leaflets = [{language: "English", files:[0,1,2,2,3,4]},{language: "German", files:[0,1,2,2,3,4]}];
        let stringHTML = "";
        if(this.leaflets){
            for(let leaflet of this.leaflets){
                stringHTML+= `<div class="leaflet-unit">
                            <div class="leaflet-details">
                                <div class="leaflet-language">${leaflet.language} Leaflet</div>
                                <div class="leaflet-files">${leaflet.files.length} files</div>
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