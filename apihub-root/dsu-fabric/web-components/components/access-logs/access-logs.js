import constants from "../../../constants.js";

export class AccessLogs {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.logsNumber = 16;
        this.disableNextBtn = true;
        this.firstElementTimestamp = 0;
        this.lastElementTimestamp = undefined;
        this.previousPageFirstElements = [];
        this.loadLogs = (query) => {
            this.invalidate(async () => {
                this.logs = await $$.promisify(webSkel.client.filterAuditLogs)(constants.AUDIT_LOG_TYPES.USER_ACCESS, undefined, this.logsNumber, query, "desc");
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
            string += ` <div>${item.userId}</div>
                        <div>Access Wallet</div>
                        <div>${item.userDID}</div>
                        <div>${item.userGroup}</div>
                        <div>${new Date(item.__timestamp).toISOString()}</div>`;
        }
        this.items = string;
    }

    afterRender() {
        this.searchInput = this.element.querySelector("#userId");
        this.searchInput.value = this.inputValue || "";
        let xMark = this.element.querySelector(".x-mark");

        if (this.boundFnKeypress) {
            this.searchInput.removeEventListener("keypress", this.boundFnKeypress);
        }
        this.boundFnKeypress = this.searchLog.bind(this);
        this.searchInput.addEventListener("keypress", this.boundFnKeypress);

        if (this.boundFnMouseLeave) {
            this.searchInput.removeEventListener("mouseleave", this.boundFnMouseLeave);
        }
        this.boundFnMouseLeave = this.hideXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseleave", this.boundFnMouseLeave);

        if (this.boundFnMouseEnter) {
            this.searchInput.removeEventListener("mouseenter", this.boundFnMouseEnter);
        }
        this.boundFnMouseEnter = this.showXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseenter", this.boundFnMouseEnter);

        if (this.boundFnFocusout) {
            this.searchInput.removeEventListener("focusout", this.boundFnFocusout);
        }
        this.boundFnFocusout = this.removeFocus.bind(this, xMark);
        this.searchInput.addEventListener("focusout", this.boundFnFocusout);

        if (this.boundFnInput) {
            this.searchInput.removeEventListener("input", this.boundFnInput);
        }
        this.boundFnInput = this.toggleSearchIcons.bind(this, xMark);
        this.searchInput.addEventListener("input", this.boundFnInput);

        if (this.focusInput) {
            this.searchInput.focus();
            xMark.style.display = "block";
            this.focusInput = false;
        }
        let logs = this.element.querySelector(".logs-section");
        if (this.logs.length === 0) {
            logs.style.display = "none";
            let noData = `<div class="no-data">No Data ...</div>`;
            this.element.insertAdjacentHTML("beforeend", noData)
        }
        let previousBtn = this.element.querySelector("#previous");
        let nextBtn = this.element.querySelector("#next");
        if (this.previousPageFirstElements.length === 0) {
            previousBtn.classList.add("disabled");
        }
        if (this.disableNextBtn) {
            nextBtn.classList.add("disabled");
        }
    }

    toggleSearchIcons(xMark, event) {
        if (this.searchInput.value === "") {
            xMark.style.display = "none";
        } else {
            xMark.style.display = "block";
        }
    }

    removeFocus(xMark, event) {
        xMark.style.display = "none";
    }

    showXMark(xMark, event) {
        if (this.searchInput.value !== "") {
            xMark.style.display = "block";
        }
    }

    hideXMark(xMark, event) {
        if (document.activeElement !== this.searchInput) {
            xMark.style.display = "none";
        }
    }

    async searchLog(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            let formData = await webSkel.extractFormInformation(this.searchInput);
            if (formData.isValid) {
                this.inputValue = formData.data.userId;
                let logs = await $$.promisify(webSkel.client.filterAuditLogs)(undefined, undefined, [`userId == ${this.inputValue}`]);
                if (logs.length > 0) {
                    this.logs = logs;
                    this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
                } else {
                    this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
                }
                this.focusInput = true;
                this.invalidate();
            }
        }
    }

    async deleteInput(xMark) {
        this.searchResultIcon = "";
        delete this.inputValue;
        this.invalidate(async () => {
            this.products = await $$.promisify(webSkel.client.listProducts)();
            this.batches = await $$.promisify(webSkel.client.listBatches)();
        });
    }

    async downloadCSV() {
        let csvData = webSkel.appServices.convertToCSV(this.logs);
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
            this.loadLogs([`__timestamp <= ${this.firstElementTimestamp}`]);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            this.loadLogs([`__timestamp < ${this.firstElementTimestamp}`]);
        }
    }
}
