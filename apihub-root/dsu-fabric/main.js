import {navigateToPage, setupGlobalErrorHandlers} from "./utils/utils.js";

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
const resolver = openDSU.loadAPI("resolver");

const initMockData = async () => {
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
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    await setupGlobalErrorHandlers();
    window.gtinResolver = require("gtin-resolver");
    let domain = "default";
    webSkel.client = gtinResolver.getMockEPISORClient(domain);

    await initMockData();
    webSkel.setDomElementForPages(document.querySelector("#page-content"));

    await navigateToPage("landing-page", {["source-page"]: window.location.hash || "#home-page"});
    window.addEventListener('beforeunload', saveCurrentState);
})();
