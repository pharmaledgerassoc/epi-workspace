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
        try {
            const {data} = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACTION, undefined, undefined, "timestamp > 0", "desc");
            if (!Array.isArray(data))
                throw new Error(`Expected an array but received ${typeof data}`);
            this.auditLogLength = data.length;
        } catch (e) {
            throw e;
        }
    }

    /**
     * Compares the current audit log state against the stored snapshot.
     *
     * @throws {Error} If the audit log data is not an array or if unexpected changes are detected.
     */
    static async assertAuditLogSnapshot() {
        try {
            const {data} = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACTION, undefined, undefined, "timestamp > 0", "desc");
            if (!Array.isArray(data))
                throw new Error(`Expected an array but received ${typeof data}`);
            if (data.length !== this.auditLogLength)
                throw new Error("Unexpected changes detected in the audit log");
        } catch (e) {
            throw e;
        }
    }

    /**
     * Test the audit logs
     * @param {string} reason - audit expected reason
     * @param {Object | undefined} [oldObject]  - original object to compare (if undefined it means it is a creation)
     * @param {Object | undefined} [newObject]  - new object to compare after the action
     * @param {boolean} [itFailed=false]  - if it is failed action doesn't compare details
     */
    static async assertAuditLog(reason, oldObject, newObject, itFailed = false) {
        const auditResponse = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, "timestamp > 0", "desc");
        const audit = auditResponse.data[0];
        expect(audit.reason).toEqual(reason);

        if (itFailed)
            return audit;

        const {diffs} = audit.details[0]

        Object.entries(diffs).forEach(([key, value]) => {
            if (key === "epiProtocol")
                return true
            expect(value.oldValue).toEqual(oldObject ? oldObject[key] : "");
            expect(value.newValue).toEqual(newObject[key]);
        })

        return audit;
    }

    /**
     * Test the leaflets audit logs
     * @param {string} gtin  - leaflet gtin
     * @param {string} reason - audit expected reason
     * @param {string} epiLanguage  - leaflet's expected language
     * @param {string} epiType  - leaflet's expected type
     * @param {string | undefined} [epiMarket]  - leaflet's market
     * @param {string | undefined} [batch=undefined]  - leaflet's batch
     * @param {boolean} [itFailed=false]  - if it is failed action doesn't compare details
     */
    static async assertEPIAuditLog(gtin, reason, epiLanguage, epiType, epiMarket, batch = undefined, itFailed = false) {
        const auditResponse = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, "timestamp > 0", "desc");
        const audit = auditResponse.data[0];
        expect(audit.itemCode).toEqual(gtin);
        expect(audit.reason).toEqual(reason);

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