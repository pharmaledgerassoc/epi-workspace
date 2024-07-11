export class HealthCheckPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.setPaginationDefaultValues = ()=>{
            this.itemsNumber = 16;
            this.disableNextBtn = true;
            this.firstElementTimestamp = 0;
            this.lastElementTimestamp = undefined;
            this.previousPageFirstElements = [];
        };
        this.setPaginationDefaultValues();
        this.loadRuns = (query) => {
            this.invalidate(async () => {
                this.healthChecks = await $$.promisify(webSkel.client.filterHealthChecksMetadata)(undefined, this.itemsNumber, "dsc", query);
                if (this.healthChecks && this.healthChecks.length > 0) {
                    if (this.healthChecks.length === this.itemsNumber) {
                        this.healthChecks.pop();
                        this.disableNextBtn = false;
                    } else if (this.healthChecks.length < this.itemsNumber) {
                        this.disableNextBtn = true;
                    }
                    this.lastElementTimestamp = this.healthChecks[this.healthChecks.length - 1].__timestamp;
                    this.firstElementTimestamp = this.healthChecks[0].__timestamp;
                }
            });
        };
        this.loadRuns(["__timestamp > 0"]);
    }

    beforeRender() {
        let string = "";
        for (let item of this.healthChecks) {
            string += ` <div class="data-item">${new Date(item.date).toISOString()}</div>
                        <div class="data-item">${item.status}</div>
                        <div class="data-item view-details" data-local-action="navigateToHealthCheckRun ${item.pk}">View Details</div>`;
        }
        this.items = string;
    }
    afterRender() {
        let pageBody = this.element.querySelector(".page-body");
        if(this.healthChecks.length === 0){
            pageBody.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }
        let previousBtn = this.element.querySelector("#previous");
        let nextBtn = this.element.querySelector("#next");
        if (this.previousPageFirstElements.length === 0 && previousBtn) {
            previousBtn.classList.add("disabled");
        }
        if (this.disableNextBtn && nextBtn) {
            nextBtn.classList.add("disabled");
        }
    }
    previousTablePage(_target) {
        if (!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0) {
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            //TODO to <= after changing storage strategy
            let query = [`__timestamp <= ${this.firstElementTimestamp}`];
            this.loadRuns(query);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            //TODO to < after changing storage strategy
            let query = [`__timestamp < ${this.firstElementTimestamp}`];
            this.loadRuns(query);
        }
    }
    async navigateToHealthCheckRun(_target, pk){
        await webSkel.changeToDynamicPage("run-results-page", `run-results-page/${pk}`);
    }
    async runHealthCheck(_target){
        let taskPK = await $$.promisify(webSkel.client.addHealthCheck)();
        let runPromises = [];
        runPromises.push($$.promisify(webSkel.client.checkSecrets)(taskPK));
        runPromises.push($$.promisify(webSkel.client.checkInstallInfo)(taskPK));
        runPromises.push($$.promisify(webSkel.client.checkSystemHealth)(taskPK));
        runPromises.push($$.promisify(webSkel.client.checkConfigsInfo)(taskPK));
        runPromises.push($$.promisify(webSkel.client.checkWallets)(taskPK));
        let results;
        try {
           results = await Promise.all(runPromises);
        }catch (e) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to run health check", e);
        }
        let failedChecks = 0;
        for(let result of results){
            if(result.status === "failed"){
                failedChecks++;
            }
        }
        let checkStatus = failedChecks === 0 ? "success" : "failed";
        await $$.promisify(webSkel.client.markIterationCompletion)(taskPK, checkStatus, failedChecks);
        this.loadRuns(["__timestamp > 0"]);
    }
}