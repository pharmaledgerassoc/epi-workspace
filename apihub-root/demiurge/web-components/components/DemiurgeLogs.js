import AuditService from "../../services/AuditService.js";

export default class DemiurgeLogs {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.sorClient = "";
        this.logType = "";
        this.searchField = "";
        this.searchQueryAttribute = "";
        this.setPaginationDefaultValues = () => {
            this.logsNumber = 16;
            this.disableNextBtn = true;
            this.firstElementTimestamp = 0;
            this.lastElementTimestamp = undefined;
            this.previousPageFirstElements = [];
        };
        this.auditService = AuditService.getInstance();
        this.setPaginationDefaultValues();
        this.loadLogs = (query) => {
            this.invalidate(async () => {
                this.logs = await this.auditService.getLogs(this.logType, this.logsNumber, query, this.sorClient)
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
        this.loadLogs(["timestamp > 0"]);
    }

    beforeRender() {
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

    toggleSearchIcons(xMark) {
        if (this.searchInput.value === "") {
            xMark.style.display = "none";
        } else {
            xMark.style.display = "block";
        }
    }

    async searchLogs(event) {
        event.preventDefault();
        let formData = await webSkel.extractFormInformation(this.element.querySelector("search-input"));
        if (formData.isValid) {
            this.inputValue = formData.data[this.searchField];
            this.setPaginationDefaultValues();
            this.focusInput = "true";
            let logs = await this.auditService.getLogs(this.logType, this.logsNumber, ["timestamp > 0", `${this.searchQueryAttribute} == ${this.inputValue}`])
            if (logs.length > 0) {
                this.logs = logs;
                this.searchIdentifier = `${this.searchQueryAttribute} == ${this.inputValue}`;
                if (this.logs.length === this.logsNumber) {
                    this.logs.pop();
                    this.disableNextBtn = false;
                } else if (this.logs.length < this.logsNumber) {
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
        this.loadLogs(["timestamp > 0"]);
    }

    async downloadCSV(logType) {
        let csvData = this.auditService.convertToCSV(this.logs);
        let csvBlob = new Blob(csvData, {type: "text/csv"});
        let csvUrl = URL.createObjectURL(csvBlob);
        let link = document.createElement('a');
        link.href = csvUrl;
        link.download = 'Logs.csv';
        link.click();
        link.remove();
    }

    previousTablePage(_target) {
        if (!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0) {
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            let query = [`timestamp <= ${this.firstElementTimestamp}`];
            if (this.searchIdentifier) {
                query.push(this.searchIdentifier);
            }
            this.loadLogs(query);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            let query = [`timestamp < ${this.firstElementTimestamp}`];
            if (this.searchIdentifier) {
                query.push(this.searchIdentifier);
            }
            this.loadLogs(query);
        }
    }
}
