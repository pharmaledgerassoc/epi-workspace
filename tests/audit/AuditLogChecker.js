const constants = require("../constants")

class AuditLogChecker {
    static auditLogLength = 0;

    static setApiClient(client) {
        this.client = client;
    }

    static async cacheAuditLog() {
        try {
            const auditResponse = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, undefined, "timestamp > 0", "desc");
            this.auditLogLength = auditResponse.data.length;
        } catch (error) {
            console.error("Erro ao buscar o audit log:", error);
        }
    }

    static async checkAuditLog() {
        try {
            const auditResponse = await this.client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, undefined, "timestamp > 0", "desc");
            const audit = auditResponse.data;
            if (audit.length !== this.auditLogLength)
                throw new Error("O tamanho do audit log foi alterado!");
        } catch (error) {
            console.error("Erro ao verificar o audit log:", error);
            throw error;
        }
    }
}

module.exports = {AuditLogChecker};
