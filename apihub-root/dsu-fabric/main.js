import {getUserDetails, loadPage, navigateToPage, setupGlobalErrorHandlers, showError} from "./utils/utils.js";
import {getPermissionsWatcher} from "./services/PermissionsWatcher.js";
import env from "./environment.js";
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
  return crypto.sha256JOSE(crypto.generateRandom(10), "hex");
}

const init = async () => {
  let wallet;
  const versionlessSSI = keySSISpace.createVersionlessSSI(undefined, `/${getSSODetectedId()}`)
  try {
    wallet = await $$.promisify(resolver.loadDSU)(versionlessSSI);
  } catch (error) {
    try {
      wallet = await $$.promisify(resolver.createDSUForExistingSSI)(versionlessSSI);
    } catch (e) {
      console.log(e);
    }
  }

  scAPI.setMainDSU(wallet);
  debugger
  const sc = scAPI.getSecurityContext();
  sc.on("initialised", () => {
    console.log("Initialised");
  });
}

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

import WebSkel from "./WebSkel/webSkel.js";

window.webSkel = new WebSkel();
window.mainContent = document.querySelector("#app-wrapper");
webSkel.notificationHandler = openDSU.loadAPI("error");

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
    let mainDSU = await $$.promisify(scAPI.getMainDSU)();
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

let initialize = async () => {

  let batchId;
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

function defineActions() {
  webSkel.registerAction("closeErrorModal", async (_target) => {
    closeModal(_target);
  });
}

async function loadConfigs(jsonPath) {
  try {
    const response = await fetch(jsonPath);
    const config = await response.json();
    webSkel.defaultPage = config.defaultPage;
    for (const service of config.services) {
      const ServiceModule = await import(service.path);
      webSkel.initialiseService(service.name, ServiceModule[service.name]);
    }

    for (const presenter of config.presenters) {
      const PresenterModule = await import(presenter.path);
      webSkel.registerPresenter(presenter.name, PresenterModule[presenter.className]);
    }
    for (const component of config.components) {
      await webSkel.defineComponent(component.name, component.path, {urls: component.cssPaths});
    }
  } catch (error) {
    console.error(error);
    await showApplicationError("Error loading configs", "Error loading configs", `Encountered ${error} while trying loading webSkel configs`);
  }
}

async function handleHistory(event) {
  const result = webSkel.getService("AuthenticationService").getCachedCurrentUser();
  if (!result) {
    if (window.location.hash !== "#authentication-page") {
      webSkel.setDomElementForPages(mainContent);
      window.location.hash = "#authentication-page";
      await webSkel.changeToDynamicPage("authentication-page", "authentication-page", "", true);
    }
  } else {
    if (history.state) {
      if (history.state.pageHtmlTagName === "authentication-page") {
        const path = ["#", webSkel.currentState.pageHtmlTagName].join("");
        history.replaceState(webSkel.currentState, path, path);
      }
    }
  }
  let modal = document.querySelector("dialog");
  if (modal) {
    closeModal(modal);
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

(async () => {
  await setupGlobalErrorHandlers();
  window.gtinResolver = require("gtin-resolver");
  await webSkel.UtilsService.initialize();
  // await initialize();
  let domain = "default";
  webSkel.client = gtinResolver.getMockEPISORClient(domain);
  await callMockClient();
  webSkel.setDomElementForPages(document.querySelector("#page-content"));
  await loadConfigs("./webskel-configs.json");
  try {
    await initialize();
  } catch (e) {
    //
    webSkel.notificationHandler.reportUserRelevantError("Initialization failed!!!", e);
    return;
  }

  document.querySelector("#page-content").insertAdjacentHTML("beforebegin", `<left-sidebar data-presenter="left-sidebar" data-sidebar-selection="home-page"}"></left-sidebar>`);
  window.addEventListener('beforeunload', saveCurrentState);
})();
