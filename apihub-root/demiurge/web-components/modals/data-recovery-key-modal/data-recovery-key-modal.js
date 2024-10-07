import utils from '../../../utils.js';
const notificationHandler = require("opendsu").loadAPI("error");
import constants from "../../../constants.js";
import AuditService from "../../../services/AuditService.js";
import AppManager from "../../../services/AppManager.js";

export class DataRecoveryKeyModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        webSkel.registerAction("copyRecoveryKey", this.copyRecoveryKey);
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
        let changeHandler = async () => {
            if (input.value.trim() !== "") {
                addMemberButton.classList.remove("disabled");
                addMemberButton.disabled = false;
            } else {
                addMemberButton.classList.add("disabled");
                addMemberButton.disabled = true;
            }
        }

        input.addEventListener('input', changeHandler);
        changeHandler();
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

    async copyRecoveryKey(){
        let input = this.parentElement.querySelector("#data-recovery-key-copy");
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices

        try{
            await navigator.clipboard.writeText(input.value);
            let did = await AppManager.getStoredDID();
            await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.RECOVERY_KEY_COPIED, did, constants.EPI_ADMIN_GROUP);
            webSkel.notificationHandler.reportUserRelevantInfo("Copied to clipboard!");
        }catch(err){
            webSkel.notificationHandler.reportUserRelevantError(`Failed to copy Data Recovery Key: ${err}`);
        }
    }
}