export class ComponentDetailsPage{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        let splitUrl = window.location.hash.split("/");
        this.id = splitUrl[1];
        this.runId = splitUrl[2];
        this.invalidate(async ()=>{
            this.component = {
                name: "Component Name",
                status: "success",
                logs:"Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here.Logs will be displayed here."
            }
        });
    }
    beforeRender(){
        this.componentName = this.component.name;
        if(this.component.status === "success"){
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
        await webSkel.changeToDynamicPage("run-results-page", `run-results-page/${this.runId}`);
    }
}