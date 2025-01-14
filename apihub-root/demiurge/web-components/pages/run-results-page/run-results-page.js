import constants from "../../../constants.js";

export class RunResultsPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.pk = window.location.hash.split("/")[1];
        this.invalidate(async () => {
            this.check = await webSkel.healthCheckClient.getCheckStatus(this.pk);
        });
    }

    beforeRender() {
        let string = "";

            Object.keys(this.check).forEach(key => {
                string += ` <div class="data-item">${constants.HEALTH_CHECK_COMPONENTS[key]}</div>
                        <div class="data-item">${this.check[key].status}</div>
                        <div class="data-item view-details" data-local-action="navigateToComponentDetailsPage ${key}">View Details</div>`;

            })
        this.items = string;
    }

    afterRender() {
        let table = this.element.querySelector(".table");
        if (this.items.length === 0) {
            table.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }
    }

    async navigateToComponentDetailsPage(_target, name) {
        await webSkel.changeToDynamicPage("component-details-page", `component-details-page/${this.pk}/${name}`);
    }

    async navigateToHealthCheckPage() {
        await webSkel.changeToDynamicPage("health-check-page", "health-check-page");
    }
}
