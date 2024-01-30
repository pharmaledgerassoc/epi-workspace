export class ManageProductPage{
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
        this.leafletTab = `<div class="inner-tab">
                    <div class="inner-container">
                        <div class="no-data">No leaflets added yet</div>
                        <button class="tab-button pointer" data-local-action="showAddEPIModal">+ Add ePI</button>
                    </div>
                </div>`;
        this.marketTab = `<div class="inner-tab">
                        <div class="no-data">No markets added yet</div>
                        <button class="tab-button pointer" data-local-action="showAddMarketModal">+ Add Market</button>
                </div>`;
        webSkel.observeChange("manage-product-page", this.invalidate);
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
            leaflet.classList.add("inactive");
            leaflet.classList.remove("highlighted");
        }else {
            leaflet.classList.remove("inactive");
            leaflet.classList.add("highlighted");
            market.classList.add("inactive");
            market.classList.remove("highlighted");
        }
        let productCode = this.element.querySelector("#productCode");
        productCode.value = this.productCode || "";
        let brandName = this.element.querySelector("#brandName");
        brandName.value = this.brandName || "";
        let medicinalName = this.element.querySelector("#medicinalName");
        medicinalName.value = this.medicinalName || "";

        let photo = this.element.querySelector("#photo");
        if(this.encodedPhoto){
            photo.files = this.fileListPhoto;
            let photoContainer = this.element.querySelector(".product-photo");
            photoContainer.src = this.encodedPhoto;
        }
    }
    switchTab(_target){
        this.selected = _target.getAttribute("id");
        let tabName = _target.getAttribute("id");
        let container = this.element.querySelector(".leaflet-market-management");
        container.querySelector(".inner-tab").remove();
        if(tabName === "leaflet"){
            this.tab = this.leafletTab;
            this.selected = "leaflet";
            container.insertAdjacentHTML("beforeend", this.tab);
        }else {
            this.tab = this.marketTab;
            this.selected = "market";
            container.insertAdjacentHTML("beforeend", this.tab);
        }
        this.afterRender();
    }
    async showPhoto(controller, photoInput, event){
        let photoContainer = this.element.querySelector(".product-photo");
        let encodedPhoto = await webSkel.UtilsService.imageUpload(photoInput.files[0]);
        this.fileListPhoto = photoInput.files;
        photoContainer.src = encodedPhoto;
        this.encodedPhoto = encodedPhoto;
        controller.abort();
    }
    async uploadPhoto(){
        let photoInput = this.element.querySelector("#photo");
        const controller = new AbortController();
        photoInput.addEventListener("input", this.showPhoto.bind(this,controller, photoInput),{signal:controller.signal});
        photoInput.click();
    }
    async showAddEPIModal(){
        await webSkel.UtilsService.showModal(document.querySelector("body"), "add-epi-modal", { presenter: "add-epi-modal"});
    }
   async showAddMarketModal(){
        await webSkel.UtilsService.showModal(document.querySelector("body"), "markets-management-modal", { presenter: "markets-management-modal"});
    }
    refresh(){
        this.invalidate();
    }
}
