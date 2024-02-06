export class MarketsTab {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
        this.markets = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
    }
    beforeRender(){
        let stringHTML = "";
        if(this.markets.length > 0){
            for(let market of this.markets){
                if(market.action === "delete"){
                    continue;
                }
                stringHTML+= `<div class="market-unit pointer" data-id="${market.id}" data-local-action="viewMarket">
                                <div class="market-details">${market.country} - ${market.mah}</div>
                                    <div class="delete-button pointer" data-local-action="deleteMarket">
                                        <img class="market-img" src="./assets/icons/thrash.svg" alt="thrash">
                                    </div>
                              </div>`;
            }
        }else {
            stringHTML = `<div class="no-data">No markets added yet</div>`;
        }
        this.marketUnits = stringHTML;
    }
    afterRender(){

    }

}