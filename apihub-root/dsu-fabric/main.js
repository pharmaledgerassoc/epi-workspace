import {getUserDetails, loadPage, navigateToPage, setupGlobalErrorHandlers, showError} from "./utils/utils.js";
import {getPermissionsWatcher} from "./services/PermissionsWatcher.js";
import env from "./environment.js";
import WebSkel from "./WebSkel/webSkel.js";
import {
    gtin,
    gtin2,
    batchNumber,
    batchNumber2,
    productDetails,
    productDetails2,
    batchDetails,
    batchDetails2,
    leafletDetails,
    germanLeaflet,
    imageData,
    accessLog,
    actionLog,
    actionLog2
} from "./mockData.js";

const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const crypto = openDSU.loadAPI("crypto");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");


const getSSODetectedId = () => {
    return getUserDetails();
}

//todo: CODE-REVIEW - this function needs a more explicit name
const init = async () => {
    let mainDSU;
    const versionlessSSI = keySSISpace.createVersionlessSSI(undefined, `/${getSSODetectedId()}`)
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
        return await getWalletAccess();
    }
    sc.on("initialised", async () => {
        console.log("Initialised");
        await getWalletAccess();
    });
}

//TODO: CODE-REVIEW - why this function is called callMockClient if the purpose of it is to setup test data during development ?
const callMockClient = async () => {

    await $$.promisify(webSkel.client.addProduct)(gtin, productDetails);
    await $$.promisify(webSkel.client.addProduct)(gtin2, productDetails2);
    await $$.promisify(webSkel.client.addEPI)(gtin, leafletDetails);
    await $$.promisify(webSkel.client.addProductImage)(gtin, imageData);
    await $$.promisify(webSkel.client.addBatch)(gtin, batchNumber, batchDetails);
    await $$.promisify(webSkel.client.addBatch)(gtin2, batchNumber2, batchDetails2);
    await $$.promisify(webSkel.client.addEPI)(gtin, batchNumber, leafletDetails);
    await $$.promisify(webSkel.client.updateEPI)(gtin, batchNumber, leafletDetails);
    await $$.promisify(webSkel.client.addEPI)(gtin, batchNumber, germanLeaflet);
    await $$.promisify(webSkel.client.addAuditLog)(accessLog);
    await $$.promisify(webSkel.client.addAuditLog)(actionLog);
    await $$.promisify(webSkel.client.addAuditLog)(actionLog2);

}




let createDID = async () => {
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

let getWalletAccess = async () => {
    await webSkel.showLoading();
    try {
        if (getUserDetails() === "usr1@example.com") {
            webSkel.hideLoading();
            return await navigateToPage("home-page");
        }
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
            did = await createDID();
            shouldPersist = true;
        }

        getPermissionsWatcher(did, async () => {
            webSkel.hideLoading();
            await navigateToPage("home-page");
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

//todo: CODE-REVIEW - does this function needed ? it seems to don't be used at this point in time
let initialize = async () => {

    let batchId;
    //todo: CODE-REVIEW - why to we call an API for NODEJS in web/browser environment?
    const mainDSU = await $$.promisify(scAPI.getMainDSUForNode, scAPI)();
    try {
        batchId = await mainDSU.startOrAttachBatchAsync();
        await $$.promisify(mainDSU.writeFile)('environment.json', JSON.stringify(env));
        await $$.promisify(mainDSU.commitBatch)(batchId);
        await getWalletAccess();
    } catch (e) {
        try {
            await mainDSU.cancelBatchAsync(batchId);
        } catch (err) {
            showError("Initialization error!!!", `Failed to cancel batch`, err.message)
            return;
        }
        showError("Initialization error!!!", "Could not initialize wallet", e.message)
    }
}

function saveCurrentState() {
    webSkel.currentState = Object.assign({}, history.state);
}

function closeDefaultLoader() {
    let UILoader = {
        "modal": document.querySelector('#default-loader-markup'),
        "style": document.querySelector('#default-loader-style'),
        "script": document.querySelector('#default-loader-script')
    }
    UILoader.modal.close();
    UILoader.modal.remove();
    UILoader.script.remove();
    UILoader.style.remove();
}
window.webSkel = await WebSkel.initialise("./webskel-configs.json");
webSkel.notificationHandler = openDSU.loadAPI("error");
(async () => {
    await setupGlobalErrorHandlers();
    //todo: CODE-REVIEW - why the initialization of UtilsService is exposed and not called during webSkel constructor?!
    window.gtinResolver = require("gtin-resolver");
    let domain = "default";
    webSkel.client = gtinResolver.getMockEPISORClient(domain);

    await callMockClient();
    webSkel.setDomElementForPages(document.querySelector("#page-content"));
    await init();
    //await loadPage();
    document.querySelector("#page-content").insertAdjacentHTML("beforebegin", `<left-sidebar data-presenter="left-sidebar" data-sidebar-selection="${webSkel.defaultPage}"></left-sidebar>`);
    window.addEventListener('beforeunload', saveCurrentState);
})();
