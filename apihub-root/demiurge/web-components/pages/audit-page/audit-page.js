export class AuditPage {
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
        this.loadLogs = (query) => {
            this.invalidate(async () => {
                //always returns ascending order using memoryStorageStrategy
                this.logs = await $$.promisify(webSkel.client.filterAuditLogs)(undefined, this.itemsNumber, "dsc", query);
                if (this.logs && this.logs.length > 0) {
                    if (this.logs.length === this.itemsNumber) {
                        this.logs.pop();
                        this.disableNextBtn = false;
                    } else if (this.logs.length < this.itemsNumber) {
                        this.disableNextBtn = true;
                    }
                    this.lastElementTimestamp = this.logs[this.logs.length - 1].__timestamp;
                    this.firstElementTimestamp = this.logs[0].__timestamp;
                }
            });
        };
        this.loadLogs(["__timestamp > 0"]);
    }
    beforeRender(){
        let string = "";
        for (let item of this.logs) {
            string += ` <div class="data-item">${item.userId}</div>
                        <div class="data-item">${item.action}</div>
                        <div class="data-item">${item.userDID}</div>
                        <div class="data-item">${item.userGroup}</div>
                        <div class="data-item">${new Date(item.__timestamp).toISOString()}</div>`;
        }
        this.items = string;
    }
    afterRender() {
        let logs = this.element.querySelector(".logs-section");
        if (this.logs.length === 0) {
            logs.style.display = "none";
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
        this.searchInput = this.element.querySelector("search-input");
        if(this.searchInput){
            if(this.boundSearchLogs){
                this.searchInput.removeEventListener("search", this.boundSearchLogs);
            }
            this.boundSearchLogs = this.searchLogs.bind(this);
            this.searchInput.addEventListener("search", this.boundSearchLogs);
        }
    }
    toggleSearchIcons(xMark) {
        if (this.searchInput.value === "") {
            xMark.style.display = "none";
        } else {
            xMark.style.display = "block";
        }
    }

    async searchLogs(event) {
        event.preventDefault();
        let formData = await webSkel.extractFormInformation(this.searchInput);
        if (formData.isValid) {
            this.inputValue = formData.data.userId;
            this.setPaginationDefaultValues();
            this.focusInput = "true";
            let logs = await $$.promisify(webSkel.client.filterAuditLogs)(undefined, this.itemsNumber, "dsc", ["__timestamp > 0", `userId == ${this.inputValue}`]);
            if (logs.length > 0) {
                this.logs = logs;
                this.userIdFilter = `userId == ${this.inputValue}`;
                if (this.logs.length === this.itemsNumber) {
                    this.logs.pop();
                    this.disableNextBtn = false;
                } else if (this.logs.length < this.itemsNumber) {
                    this.disableNextBtn = true;
                }
                this.lastElementTimestamp = this.logs[this.logs.length - 1].__timestamp;
                this.firstElementTimestamp = this.logs[0].__timestamp;
                this.searchResultIcon = "<img class='result-icon' src='./assets/images/icons/check.svg' alt='check'>";
            } else {
                this.searchResultIcon = "<img class='result-icon rotate' src='./assets/images/icons/ban.svg' alt='ban'>";
            }
            this.focusInput = true;
            this.invalidate();
        }
    }

    async deleteInput() {
        this.searchResultIcon = "";
        this.inputValue = "";
        this.focusInput = "";
        this.userIdFilter = "";
        this.loadLogs(["__timestamp > 0"]);
    }

    async downloadCSV() {
        let csvData = webSkel.appServices.convertToCSV(this.logs, "access");
        let csvBlob = new Blob(csvData, {type: "text/csv"});
        let csvUrl = URL.createObjectURL(csvBlob);
        let link = document.createElement('a');
        link.href = csvUrl;
        link.download = 'AccessLogs.csv';
        link.click();
        link.remove();
    }

    previousTablePage(_target) {
        if (!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0) {
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            //TODO to <= after changing storage strategy
            let query = [`__timestamp >= ${this.firstElementTimestamp}`];
            if(this.userIdFilter){
                query.push(this.userIdFilter);
            }
            this.loadLogs(query);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            //TODO to < after changing storage strategy
            let query = [`__timestamp > ${this.firstElementTimestamp}`];
            if(this.userIdFilter){
                query.push(this.userIdFilter);
            }
            this.loadLogs(query);
        }
    }
}