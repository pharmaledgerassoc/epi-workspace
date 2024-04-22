import constants from "../../../constants.js";

export class ActionLogs {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.setPaginationDefaultValues = () => {
            this.logsNumber = 16;
            this.disableNextBtn = true;
            this.firstElementTimestamp = 0;
            this.lastElementTimestamp = undefined;
            this.previousPageFirstElements = [];
        };
        this.setPaginationDefaultValues();
        this.loadLogs = (query) => {
            this.invalidate(async () => {
                this.logs = await $$.promisify(webSkel.client.filterAuditLogs)(constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, this.logsNumber, query, "desc");
                if (this.logs && this.logs.length > 0) {
                    if (this.logs.length === this.logsNumber) {
                        this.logs.pop();
                        this.disableNextBtn = false;
                    } else if (this.logs.length < this.logsNumber) {
                        this.disableNextBtn = true;
                    }
                    this.lastElementTimestamp = this.logs[this.logs.length - 1].__timestamp;
                    this.firstElementTimestamp = this.logs[0].__timestamp;
                }

            });
        };
        this.loadLogs(["__timestamp > 0"]);
    }

    beforeRender() {
        let string = "";
        for (let item of this.logs) {
            string += `
                        <div>${item.itemCode || "-"}</div>
                        <div>${item.batchNumber || "-"}</div>
                        <div>${item.reason}</div>
                        <div>${item.username}</div>
                        <div>${new Date(item.__timestamp).toISOString()}</div>
                        <div class="view-details pointer" data-local-action="openAuditEntryModal ${item.pk}">View</div>`;

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
        if (this.searchInput) {
            if (this.boundSearchLogs) {
                this.searchInput.removeEventListener("search", this.boundSearchLogs);
            }
            this.boundSearchLogs = this.searchLogs.bind(this);
            this.searchInput.addEventListener("search", this.boundSearchLogs);
        }
    }

    async searchLogs(event) {
        event.preventDefault();
        let formData = await webSkel.extractFormInformation(this.searchInput);
        if (formData.isValid) {
            this.inputValue = formData.data.productCode;
            this.setPaginationDefaultValues();
            this.focusInput = "true";
            let logs = await $$.promisify(webSkel.client.filterAuditLogs)(constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, this.logsNumber, ["__timestamp > 0", `itemCode == ${this.inputValue}`], "desc");
            if (logs && logs.length > 0) {
                this.logs = logs;
                this.gtinFilter = `itemCode == ${this.inputValue}`;
                if (this.logs.length === this.logsNumber) {
                    this.logs.pop();
                    this.disableNextBtn = false;
                } else if (this.logs.length < this.logsNumber) {
                    this.disableNextBtn = true;
                }
                this.lastElementTimestamp = this.logs[this.logs.length - 1].__timestamp;
                this.firstElementTimestamp = this.logs[0].__timestamp;
                this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
            } else {
                this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
            }
            this.focusInput = true;
            this.invalidate();
        }
    }

    async deleteInput() {
        this.searchResultIcon = "";
        this.inputValue = "";
        this.focusInput = "";
        delete this.gtinFilter;
        this.loadLogs(["__timestamp > 0"]);
    }

    async openAuditEntryModal(_target, pk) {
        let logEntry = this.logs.find(item => item.pk === pk)
        await webSkel.showModal("audit-entry-modal", {"entry": encodeURIComponent(JSON.stringify(logEntry))});
    }

    async downloadCSV() {
        let csvData = webSkel.appServices.convertToCSV(this.logs, "action");
        let csvBlob = new Blob(csvData, {type: "text/csv"});
        let csvUrl = URL.createObjectURL(csvBlob);
        let link = document.createElement('a');
        link.href = csvUrl;
        link.download = 'ActionLogs.csv';
        link.click();
        link.remove();
    }

    previousTablePage(_target) {
        if (!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0) {
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            let query = [`__timestamp <= ${this.firstElementTimestamp}`];
            if (this.gtinFilter) {
                query.push(this.gtinFilter);
            }
            this.loadLogs(query);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            let query = [`__timestamp < ${this.firstElementTimestamp}`];
            if (this.gtinFilter) {
                query.push(this.gtinFilter);
            }
            this.loadLogs(query);
        }
    }
}
