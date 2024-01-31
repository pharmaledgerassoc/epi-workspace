export class MarketsTab {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.markets = [{country: "AF", mah:"mah name"},{country: "US", mah:"mah name"}];
        let stringHTML = "";
        if(this.markets){
            for(let market of this.markets){
                stringHTML+= `<div class="market-unit pointer">
                                <div class="market-details">${market.country} - ${market.mah}</div>
                                    <div class="delete-button pointer">
                                        <img class="market-img" src="./assets/icons/thrash.svg" alt="thrash">
                                    </div>
                              </div>`;
            }
        }else {
            stringHTML = `<div class="no-data">No leaflets added yet</div>`;
        }
        this.marketUnits = stringHTML;
    }
    afterRender(){

    }

}