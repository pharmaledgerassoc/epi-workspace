import constants from "../../../constants.js";

export class ComponentDetailsPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        let splitUrl = window.location.hash.split("/");
        this.id = splitUrl[1];
        this.componentName = splitUrl[2];
        this.name = constants.HEALTH_CHECK_COMPONENTS[this.componentName];
        this.loadComponent = async () => {
            this.component = await $$.promisify(webSkel.client.getHealthCheckComponent)(this.id, this.componentName);
        };
        this.invalidate(this.loadComponent);
    }

    beforeRender() {
        if (this.component.status === constants.HEALTH_CHECK_STATUSES.SUCCESS) {
            this.status = "Successful";
            this.statusColor = "success";
            this.statusMessage = "This check has passed."
            this.repairButton = "hidden";
        } else if (this.component.status === constants.HEALTH_CHECK_STATUSES.REPAIRED) {
            this.status = "Repaired";
            this.statusColor = "success";
            this.statusMessage = "This check has been repaired."
            this.repairButton = "hidden";
        } else if (this.component.status === constants.HEALTH_CHECK_STATUSES.FAILED_REPAIR) {
            this.status = "Failed To Repair";
            this.statusColor = "fail";
            this.statusMessage = "This check has failed to be repaired."
        } else {
            this.status = "Failed";
            this.statusColor = "fail";
            this.statusMessage = "This check has failed."
        }
        this.logsContent = this.component.logs;
    }

    afterRender() {
    }

    async navigateToRunResultsPage(_target) {
        await webSkel.changeToDynamicPage("run-results-page", `run-results-page/${this.id}`);
    }

    async fixComponent(_target) {
        await $$.promisify(webSkel.client.fixComponent)(this.id, this.componentName);
        this.invalidate(this.loadComponent);
    }
}