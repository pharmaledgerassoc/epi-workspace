import constants from "../../../constants.js";

export class RunResultsPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.pk = window.location.hash.split("/")[1];
        this.invalidate(async () => {
            debugger
            this.check = await $$.promisify(webSkel.client.getHealthCheckPayload)(this.pk);
        });
    }
    beforeRender() {
        let string = "";
        debugger
        for (let item of this.check) {
            string += ` <div class="data-item">${constants.HEALTH_CHECK_COMPONENTS[item.name]}</div>
                        <div class="data-item">${item.status}</div>
                        <div class="data-item view-details" data-local-action="navigateToComponentDetailsPage ${item.name}">View Details</div>`;
        }
        this.items = string;
    }
    afterRender() {
        let table = this.element.querySelector(".table");
        if(this.items.length === 0){
            table.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }
    }
    async navigateToComponentDetailsPage(_target, name){
        await webSkel.changeToDynamicPage("component-details-page", `component-details-page/${this.pk}/${name}`);
    }
    async navigateToHealthCheckPage(){
        await webSkel.changeToDynamicPage("health-check-page", "health-check-page");
    }
}