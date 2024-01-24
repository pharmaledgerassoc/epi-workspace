export class ActionLogs {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate(async ()=>{
            this.logs = await $$.promisify(webSkel.client.filterAuditLogs)(0, undefined, undefined, "__timestamp > 0");
        });
    }
    beforeRender(){
        let string = "";
        for(let item of this.logs){
            let batch = "-";
            if(item.logInfo.messageType === "Batch")
            {
                batch = item.logInfo.payload.batch;
            }
            string += `
                        <div>${item.itemCode}</div>
                        <div>${batch}</div>
                        <div>${item.reason}</div>
                        <div>${item.logInfo.senderId}</div>
                        <div>${item.logInfo.messageDateTime}</div>
                        <div class="view-details pointer" data-local-action="openActionLogModal">View</div>
                      `;
        }
        this.items = string;
    }
    afterRender(){
        let logs = this.element.querySelector(".logs-section");
        if(this.logs.length === 0){
            logs.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }
        this.searchInput = this.element.querySelector("#productCode");
        this.searchInput.value = this.inputValue || "";
        let xMark = this.element.querySelector(".x-mark");

        if(this.boundFnKeypress){
            this.searchInput.removeEventListener("keypress", this.boundFnKeypress);
        }
        this.boundFnKeypress= this.searchLog.bind(this);
        this.searchInput.addEventListener("keypress", this.boundFnKeypress);

        if(this.boundFnMouseLeave){
            this.searchInput.removeEventListener("mouseleave", this.boundFnMouseLeave);
        }
        this.boundFnMouseLeave = this.hideXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseleave", this.boundFnMouseLeave);

        if(this.boundFnMouseEnter){
            this.searchInput.removeEventListener("mouseenter", this.boundFnMouseEnter);
        }
        this.boundFnMouseEnter = this.showXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseenter", this.boundFnMouseEnter);

        if(this.boundFnFocusout){
            this.searchInput.removeEventListener("focusout", this.boundFnFocusout);
        }
        this.boundFnFocusout = this.removeFocus.bind(this, xMark);
        this.searchInput.addEventListener("focusout", this.boundFnFocusout);

        if(this.boundFnInput){
            this.searchInput.removeEventListener("input", this.boundFnInput);
        }
        this.boundFnInput = this.toggleSearchIcons.bind(this, xMark);
        this.searchInput.addEventListener("input", this.boundFnInput);

        if(this.focusInput){
            this.searchInput.focus();
            xMark.style.display = "block";
            this.focusInput = false;
        }
    }
    toggleSearchIcons(xMark, event){
        if(this.searchInput.value === ""){
            xMark.style.display = "none";
        }else {
            xMark.style.display = "block";
        }
    }
    removeFocus(xMark, event){
        xMark.style.display = "none";
    }
    showXMark(xMark, event){
        if(this.searchInput.value !== ""){
            xMark.style.display = "block";
        }
    }
    hideXMark(xMark, event){
        if(document.activeElement !== this.searchInput){
            xMark.style.display = "none";
        }
    }
    async searchLog(event){
        if(event.key === "Enter"){
            event.preventDefault();
            let formData = await webSkel.UtilsService.extractFormInformation(this.searchInput);
            if(formData.isValid){
                this.inputValue = formData.data.productCode;
                let logs = await $$.promisify(webSkel.client.filterAuditLogs)(undefined, undefined, [`productCode == ${this.inputValue}`]);
                if(logs.length > 0){
                    this.logs = logs;
                    this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
                }else {
                    this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
                }
                this.focusInput = true;
                this.invalidate();
            }
        }
    }
    async deleteInput(xMark){
        this.searchResultIcon = "";
        delete this.inputValue;
        this.invalidate(async ()=>{
            this.logs = await $$.promisify(webSkel.client.filterAuditLogs)(0, undefined, undefined, "__timestamp > 0");
        });
    }
    openActionLogModal(){
        console.log("to be done");
    }
}