import constants from "../../../constants.js";
const STATUS_CHECK_TIME = 750;
const DEFAULT_QUERY = ["__timestamp > 0"];

export class HealthCheckPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.setPaginationDefaultValues = () => {
            this.itemsNumber = 16;
            this.disableNextBtn = true;
            this.firstElementTimestamp = 0;
            this.lastElementTimestamp = undefined;
            this.previousPageFirstElements = [];
        };
        this.setPaginationDefaultValues();
        this.loadRuns = (query = DEFAULT_QUERY) => {
            this.invalidate(async () => {
                this.healthChecks = await webSkel.healthCheckClient.getIterationsMetadata(undefined, this.itemsNumber, "dsc", query);
                if (this.healthChecks && this.healthChecks.length > 0) {
                    if (this.healthChecks.length === this.itemsNumber) {
                        this.healthChecks.pop();
                        this.disableNextBtn = false;
                    } else if (this.healthChecks.length < this.itemsNumber) {
                        this.disableNextBtn = true;
                    }
                    for (let healthRecord of this.healthChecks) {
                        const statuses = await webSkel.healthCheckClient.getCheckStatus(healthRecord.pk);
                        const statusKeys = Object.keys(statuses);
                        for (let i = 0; i < statusKeys.length; i++) {
                            healthRecord.status = statuses[statusKeys[i]].status;
                            if (statuses[statusKeys[i]].status !== constants.HEALTH_CHECK_STATUSES.SUCCESS) {
                                break;
                            }
                        }
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
        if (this.healthCheckPK) {
            const currentCheck = this.healthChecks.find(check => check.pk === this.healthCheckPK);
            if (["never_executed", constants.HEALTH_CHECK_STATUSES.IN_PROGRESS].includes(currentCheck?.status)) {
                return setTimeout(() => {
                    this.checkStatus();
                }, STATUS_CHECK_TIME);
            }
            this.disabledClass = "";
        }
    }

    afterRender() {
        let pageBody = this.element.querySelector(".page-body");
        if (this.healthChecks.length === 0) {
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
            let query = [`__timestamp <= ${this.firstElementTimestamp}`];
            this.loadRuns(query);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            let query = [`__timestamp < ${this.firstElementTimestamp}`];
            this.loadRuns(query);
        }
    }

    async navigateToHealthCheckRun(_target, pk) {
        await webSkel.changeToDynamicPage("run-results-page", `run-results-page/${pk}`);
    }

    async runHealthCheck(_target) {
        this.healthCheckPK = await webSkel.healthCheckClient.startHealthCheck();
        setTimeout(() => {
            this.loadRuns(["__timestamp > 0"]);
        }, 100) 
        
    }

    async checkStatus() {
        const self = this;
        const statuses = await webSkel.healthCheckClient.getCheckStatus(this.healthCheckPK);
        const hasFailure = Object.values(statuses).some(status => status.status !== constants.HEALTH_CHECK_STATUSES.SUCCESS);
        if (hasFailure) {
            this.disabledClass = "disabled";
            return setTimeout(() => self.checkStatus.call(self), STATUS_CHECK_TIME);
        }
        this.loadRuns(["__timestamp > 0"]);
    }

}
