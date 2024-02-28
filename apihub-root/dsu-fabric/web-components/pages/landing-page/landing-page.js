import {getUserDetails, loadPage} from "../../../utils/utils.js";
import {getPermissionsWatcher} from "../../../services/PermissionsWatcher.js";
import env from "../../../environment.js";

const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const crypto = openDSU.loadAPI("crypto");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const resolver = openDSU.loadAPI("resolver");

export class LandingPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.sourcePage = this.element.getAttribute("data-source-page");
        this.invalidate(async () => {
            let mainDSU;
            const versionlessSSI = keySSISpace.createVersionlessSSI(undefined, `/${this.getSSODetectedId()}`)
            try {
                mainDSU = await $$.promisify(resolver.loadDSU)(versionlessSSI);
            } catch (error) {
                try {
                    mainDSU = await $$.promisify(resolver.createDSUForExistingSSI)(versionlessSSI);
                    await $$.promisify(mainDSU.writeFile)('environment.json', JSON.stringify(env));
                } catch (e) {
                    console.log(e);
                }
            }

            scAPI.setMainDSU(mainDSU);
            const sc = scAPI.getSecurityContext();
            if (sc.isInitialised()) {
                return await this.getWalletAccess();
            }
            sc.on("initialised", async () => {
                console.log("Initialised");
                return await this.getWalletAccess();
            });
        });
    }

    getSSODetectedId = () => {
        return getUserDetails();
    }

    createDID = async () => {
        const userDetails = getUserDetails();
        const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
        const openDSU = require("opendsu");
        const config = openDSU.loadAPI("config");
        let appName = await $$.promisify(config.getEnv)("appName");
        let userId = `${appName}/${userDetails}`;
        let did;
        let i = 1;
        do {
            try {
                did = await $$.promisify(w3cDID.resolveDID)(`did:ssi:name:${vaultDomain}:${userId}`);
            } catch (e) {
                did = null;
            }
            if (did) {
                userId = userId + i++;
            }
        } while (did)

        did = await $$.promisify(w3cDID.createIdentity)("ssi:name", vaultDomain, userId);
        return did.getIdentifier();
    }

    getWalletAccess = async () => {
        await webSkel.showLoading();
        try {
            let mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
            let did;
            try {
                did = await scAPI.getMainDIDAsync();
            } catch (e) {
                // TODO check error type to differentiate between business and technical error
                // this.notificationHandler.reportDevRelevantInfo("DID not yet created", e);
            }
            let shouldPersist = false;
            if (!did) {
                did = await this.createDID();
                shouldPersist = true;
            }


            if (this.sourcePage === "#landing-page" || this.sourcePage === "#generate-did-page") {
                this.sourcePage = "#home-page";
            }

            getPermissionsWatcher(did, async () => {
                await webSkel.appServices.addAccessLog(did);
                await loadPage(this.sourcePage);
            });

            if (!shouldPersist) {
                return;
            }

            let batchId;
            try {
                batchId = await mainEnclave.startOrAttachBatchAsync();
                await scAPI.setMainDIDAsync(did);
                await mainEnclave.commitBatchAsync(batchId);
            } catch (e) {
                const writeKeyError = createOpenDSUErrorWrapper(`Failed to write key`, e);
                try {
                    await mainEnclave.cancelBatchAsync(batchId);
                } catch (error) {
                    throw createOpenDSUErrorWrapper(`Failed to cancel batch`, error, writeKeyError);
                }
                throw writeKeyError;
            }
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to initialize wallet", err);
            setTimeout(() => {
                window.disableRefreshSafetyAlert = true;
                window.location.reload()
            }, 2000)
        }
    }


    beforeRender() {

    }

    afterRender() {
    }

}
