export class ManageProductPage{
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
        this.leafletTab = `<div class="leaflet-tab inner-tab">
                    <div class="inner-container">
                        <div class="no-data">No leaflets added yet</div>
                        <button class="add-epi-button pointer">+ Add ePI</button>
                    </div>
                </div>`;
    }

    beforeRender(){
        if(!this.selected){
            this.tab = this.leafletTab;
        }
    }
    afterRender(){
        let leaflet = this.element.querySelector("#leaflet");
        let market = this.element.querySelector("#market");
        if(this.selected === "market"){
            market.classList.remove("inactive");
            market.classList.add("highlighted");
        }else {
            leaflet.classList.remove("inactive");
            leaflet.classList.add("highlighted");
        }
    }
    switchTab(_target){
        this.selected = _target.getAttribute("id");
        let tabName = _target.getAttribute("id");
        let container = this.element.querySelector(".leaflet-market-management");
        if(tabName === "leaflet"){
            container.querySelector(".inner-tab").remove();
            this.tab = this.leafletTab;
            this.selected = "leaflet";
            container.insertAdjacentHTML("beforeend", this.tab);
        }else {
            this.tab = ``;
        }
        this.afterRender();
    }
    uploadPhoto(){

    }
}
