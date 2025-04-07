const constants = require("../constants");

class AuditLogChecker {
    static auditLogLength = 0;

    static setApiClient(client) {
        this.client = client;
    }

    /**
     * Stores the current length of the audit log for later validation.
     *
     * @throws {Error} If the audit log data is not an array.
     */
    static async storeAuditLogSnapshot() {
        const {data} = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACTION, undefined, undefined, "timestamp > 0", "desc");
        if (!Array.isArray(data))
            throw new Error(`Expected an array but received ${typeof data}`);
        this.auditLogLength = data.length;
    }

    /**
     * Compares the current audit log state against the stored snapshot.
     *
     * @throws {Error} If the audit log data is not an array or if unexpected changes are detected.
     */
    static async assertAuditLogSnapshot() {
        const {data} = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACTION, undefined, undefined, "timestamp > 0", "desc");
        if (!Array.isArray(data))
            throw new TypeError(`Expected an array but received ${typeof data}`);

        if (data.length !== this.auditLogLength)
            throw new Error("Unexpected changes detected in the audit log");
    }

    static reportAudit(step, gtin, batch, data){
        const testName = expect.getState().currentTestName
        const reference = testName.split(" - ").pop();
        let referenceStr = "AUDIT-";
        if(gtin)
            referenceStr += `gtin=${gtin}--`;
        if(batch)
            referenceStr += `batch=${batch}--`;
    
        referenceStr += reference 

        this.client.reporter.outputPayload(step,referenceStr,data,"json", true);
    }

    /**
     * Test the audit logs
     * @param {string} gtin - The GTIN of the product.
     * @param {string | undefined} [batch] - batch number
     * @param {string} step - test step
     * @param {string} reason - audit expected reason
     * @param {Object | undefined} [oldObject]  - original object to compare (if undefined it means it is a creation)
     * @param {Object | undefined} [newObject]  - new object to compare after the action
     * @param {boolean} [itFailed=false]  - if it is failed action doesn't compare details
     * @param {boolean} [reportAudit=true]  - If you wish to save the audit on a file set to true. Defaults to true.
     */
    static async assertAuditLog(gtin, batch, step, reason, oldObject, newObject, itFailed = false, reportAudit = true) {
        const auditResponse = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, "timestamp > 0", "desc");
        const audit = auditResponse.data[0];
        expect(audit.itemCode).toEqual(gtin);
        expect(audit.reason).toEqual(reason);

        if(reportAudit)
            AuditLogChecker.reportAudit(step, gtin, batch, audit);

        if (itFailed)
            return audit;

        const {diffs} = audit.details[0]

        Object.entries(diffs).forEach(([key, value]) => {
            //TODO: Remove exceptions this should be handled by the models
            if (key === "epiProtocol")
                return true

            
            if(key === "batchRecall" || key === "productRecall")
                return true

            if(value.oldValue === "" || value.oldValue === undefined)
                return true;

            if(value.newValue === "" || value.newValue === undefined)
                return true;

            //TODO: Remove exceptions this should be handled by the models
            expect(value.oldValue).toEqual(oldObject ? oldObject[key] : "");
            expect(value.newValue).toEqual(newObject[key]);
        })

        return audit;
    }

    /**
     * Test the leaflets audit logs
     * @param {string} step  - test step
     * @param {string} gtin  - leaflet gtin
     * @param {string} reason - audit expected reason
     * @param {string} epiLanguage  - leaflet's expected language
     * @param {string} epiType  - leaflet's expected type
     * @param {string | undefined} [epiMarket]  - leaflet's market
     * @param {string | undefined} [batch=undefined]  - leaflet's batch
     * @param {boolean} [itFailed=false]  - if it is failed action doesn't compare details
     */
    static async assertEPIAuditLog(step, gtin, reason, epiLanguage, epiType, epiMarket, batch = undefined, itFailed = false) {
        const epiAuditResponse = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, "timestamp > 0", "desc");
        const audit = epiAuditResponse.data[0];
        expect(audit.itemCode).toEqual(gtin);
        expect(audit.reason).toEqual(reason);

        AuditLogChecker.reportAudit(step, gtin, batch, audit);

        if (itFailed)
            return audit;

        const details = audit.details[0]

        expect(details.epiLanguage).toEqual(epiLanguage);
        expect(details.epiType).toEqual(epiType);

        if (epiMarket)
            expect(details.epiMarket).toEqual(epiMarket);

        if (batch) {
            expect(audit.batchNumber).toEqual(batch);
            if (reason !== constants.constants.OPERATIONS.DELETE_LEAFLET)
                expect(details.epiMarket).toEqual(null);
        }

        return audit;
    }
}

module.exports = {AuditLogChecker};