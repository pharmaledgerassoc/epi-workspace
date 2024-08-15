import utils from '../../../utils.js';
const notificationHandler = require("opendsu").loadAPI("error");
import constants from "../../../constants.js";
import AuditService from "../../../services/AuditService.js";
import AppManager from "../../../services/AppManager.js";
export class DataRecoveryKeyModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.invalidate();
    }

    beforeRender() {
        if (!this.dataRecoveryKey) {
            utils.getEpiEnclave().then((epiEnclave) => {
                this.dataRecoveryKey = epiEnclave.enclaveKeySSI;
                this.invalidate();
            });
        }
    }

    afterRender() {
        const input = document.getElementById('data-recovery-key');
        const addMemberButton = document.getElementById('submitDataRecoveryKey');
        input.addEventListener('input', async () => {
            if (input.value.trim() !== "") {
                addMemberButton.disabled = false;
            } else {
                addMemberButton.disabled = true;
            }
        });
    }

    async submitDataRecoveryKey(_target) {
        const recoveryCode = document.getElementById('data-recovery-key').value;
        if (recoveryCode === "") {
            notificationHandler.reportUserRelevantError(`Please insert Data Recovery Key.`);
            return;
        }
        let fetchResponse = await fetch("./config/enclaves.json");
        let enclaves;
        try {
            enclaves = await fetchResponse.json();
        } catch (err) {
            return notificationHandler.reportUserRelevantError("Failed to read Enclave Configuration file.", err);
        }
        try {
            let epiEnclaveMsg = enclaves.find((enclave) => enclave.enclaveName === constants.EPI_SHARED_ENCLAVE);
            if (!epiEnclaveMsg) {
                notificationHandler.reportUserRelevantError(`Wrong or missing enclave name`);
                return;
            }
            let enclaveRecord;
            try {
                enclaveRecord = await utils.initSharedEnclave(recoveryCode, epiEnclaveMsg, true);
            } catch (e) {
                await webSkel.closeModal(_target);
                notificationHandler.reportUserRelevantError(`Couldn't initialize wallet DBEnclave with provided code`);
            }
            await utils.setEpiEnclave(enclaveRecord);
            const did = await AppManager.getStoredDID();
            // trigger migration in case total data loss recovery
            await AppManager.doDemiurgeMigration();
            await AppManager.doDSUFabricMigration(undefined, true);
            await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.DATA_RECOVERY, did, constants.EPI_ADMIN_GROUP);
        } catch (e) {
            notificationHandler.reportUserRelevantError(`Couldn't initialize wallet DBEnclave with provided code`);
        }
        await webSkel.closeModal(_target);
    }
}