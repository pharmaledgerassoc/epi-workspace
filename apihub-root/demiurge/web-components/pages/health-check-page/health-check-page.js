export class HealthCheckPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate(async () => {
            this.healthChecks = [];
            for (let i = 0; i < 20; i++) {
                this.healthChecks.push({
                    id: i,
                    date: i,
                    status: "did:demo:123",
                });
            }
        });
    }

    beforeRender() {
        let string = "";
        for (let item of this.healthChecks) {
            string += ` <div class="data-item">${item.date}</div>
                        <div class="data-item">${item.status}</div>
                        <div class="data-item view-details" data-local-action="navigateToHealthCheckRun ${item.id}">View Details</div>`;
        }
        this.items = string;
    }
    afterRender() {
        let table = this.element.querySelector(".table");
        if(this.healthChecks.length === 0){
            table.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }
    }
    async navigateToHealthCheckRun(_target, id){
        await webSkel.changeToDynamicPage("run-results-page", `run-results-page/${id}`);
    }
}