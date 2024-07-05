export class ComponentDetailsPage{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        let splitUrl = window.location.hash.split("/");
        this.id = splitUrl[1];
        this.componentName = splitUrl[2];
        this.invalidate(async ()=>{
            let run = await $$.promisify(webSkel.client.getHealthCheckPayload)(this.id);
            this.component = run.components.find((component)=>component.name === this.componentName);
        });
    }
    beforeRender(){
        if(this.component.status === "Success"){
            this.status = "Successful";
            this.statusColor = "success";
            this.statusMessage = "This check has passed."
            this.repairButton = "hidden";
        } else {
            this.status = "Failed";
            this.statusColor = "fail";
            this.statusMessage = "This check has failed."
        }
        this.logsContent = this.component.logs;
    }
    afterRender(){
    }
    async navigateToRunResultsPage(_target){
        await webSkel.changeToDynamicPage("run-results-page", `run-results-page/${this.id}`);
    }
}