import {navigateToPage, setupGlobalErrorHandlers} from "./utils/utils.js";

import WebSkel from "./WebSkel/webSkel.js";

const openDSU = require("opendsu");
const resolver = openDSU.loadAPI("resolver");
import env from "./environment.js";
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
    const {epiDomain, epiSubdomain} = env;
    webSkel.client = gtinResolver.getEPISorClient(epiDomain, epiSubdomain);

    webSkel.setDomElementForPages(document.querySelector("#page-content"));

    await navigateToPage("landing-page", {["source-page"]: window.location.hash || "#home-page"});
    window.addEventListener('beforeunload', saveCurrentState);
})();
