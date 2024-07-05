export class RunResultsPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.id = window.location.hash.split("/")[1];
        this.invalidate(async () => {
            this.items = [];
            for (let i = 0; i < 6; i++) {
                this.items.push({
                    id: i,
                    subcomponent: "Security check",
                    status: "Success",
                });
            }
        });
    }
    beforeRender() {
        let string = "";
        for (let item of this.items) {
            string += ` <div class="data-item">${item.subcomponent}</div>
                        <div class="data-item">${item.status}</div>
                        <div class="data-item view-details" data-local-action="navigateToComponentDetailsPage ${item.id}">View Details</div>`;
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
    async navigateToComponentDetailsPage(_target, id){
        await webSkel.changeToDynamicPage("component-details-page", `component-details-page/${this.id}/${id}`);
    }
    async navigateToHealthCheckPage(){
        await webSkel.changeToDynamicPage("health-check-page", "health-check-page");
    }
}