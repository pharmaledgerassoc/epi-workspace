import DemiurgeLogs from "../DemiurgeLogs.js";
import constants from "../../../constants.js";

export class DemiurgeAccessLogs extends DemiurgeLogs {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.sorClient = "Demiurge";
        this.logType = constants.AUDIT_LOG_TYPES.USER_ACCESS
        this.searchField = "userId";
        this.searchQueryAttribute = "username"
    }

    beforeRender() {
        let string = "";
        for (let item of this.logs) {
            string += ` <div>${item.username}</div>
                        <div>Access Wallet</div>
                        <div>${item.userDID}</div>
                        <div>${item.userGroup}</div>
                        <div>${new Date(item.__timestamp).toISOString()}</div>`;
        }
        this.items = string;
    }


}
