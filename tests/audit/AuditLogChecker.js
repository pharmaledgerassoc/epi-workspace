const constants = require("../constants");

class AuditLogChecker {
    static auditLogLength = 0;

    static setApiClient(client) {
        this.client = client;
    }

    static async cacheAuditLog() {
        try {
            const {data} = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACTION, undefined, undefined, "timestamp > 0", "desc");
            if (!Array.isArray(data))
                throw new Error(`Expected an array but received ${typeof data}`);
            this.auditLogLength = data.length;
        } catch (e) {
            throw e;
        }
    }

    static async checkAuditLog() {
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
}

module.exports = {AuditLogChecker};