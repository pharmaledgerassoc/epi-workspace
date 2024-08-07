import WebSkel from "./WebSkel/webSkel.js";

const openDSU = require("opendsu");
import {getInstance} from "./MockClient.js";
import AppManager from "./services/AppManager.js";
import constants from "./constants.js";
import utils from "./utils.js";
import env from "./environment.js";
import AuditService from "./services/AuditService.js";

function registerGlobalActions() {
    async function closeModal(_target) {
        let modal = webSkel.reverseQuerySelector(_target, "dialog");
        modal.close();
        modal.remove();
    }

    async function pasteToField(_target, fieldId) {
        window.focus();

        const pasteInputLocation = document.getElementById(fieldId);
        if (!pasteInputLocation) {
            webSkel.notificationHandler.reportUserRelevantError("Element not found");
        }

        if (pasteInputLocation.readOnly) {
            webSkel.notificationHandler.reportUserRelevantError("Element is readonly");
        }
        const text = await navigator.clipboard.readText();
        pasteInputLocation.value = text;
        pasteInputLocation.dispatchEvent(new Event('input'));
    }

    function copyFieldValue(_target, fieldId) {
        const element = document.getElementById(fieldId);
        if (!element) {
            webSkel.notificationHandler.reportUserRelevantError(`Element with id ${fieldId} not found`);
        }
        window.focus();
        navigator.clipboard.writeText(element.value)
            .then(() => {
                webSkel.notificationHandler.reportUserRelevantInfo("Copied to clipboard!");
            })
            .catch((err) => {
                webSkel.notificationHandler.reportUserRelevantError(`Error copying text: ${err}`);
            });
    }

    webSkel.registerAction("pasteToField", pasteToField);
    webSkel.registerAction("copyFieldValue", copyFieldValue);
    webSkel.registerAction("closeModal", closeModal);
}

async function setupGlobalErrorHandlers() {
    webSkel.notificationHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.WARN, (notification) => {
        renderToast(notification.message, "warning");
    });

    webSkel.notificationHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.INFO, (notification) => {
        renderToast(notification.message, "info")
    });

    webSkel.notificationHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.ERROR, (notification) => {
        let errMsg = "";
        if (notification.err && notification.err.message) {
            errMsg = notification.err.message;
        }
        let toastMsg = `${notification.message} ${errMsg}`
        alert(toastMsg)
    });
}

function renderToast(message, type, timeoutValue = 15000) {
    let toastContainer = document.querySelector(".toast-container");
    toastContainer.insertAdjacentHTML("beforeend", `<message-toast data-message="${message}" data-type="${type}" data-timeout="${timeoutValue}" data-presenter="message-toast"></message-toast>`);
}

(async () => {
    window.webSkel = await WebSkel.initialise("./webskel-configs.json");
    webSkel.notificationHandler = openDSU.loadAPI("error");
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    let pageContent = document.querySelector("#page-content");
    webSkel.setDomElementForPages(pageContent);
    registerGlobalActions();

    let {currentPage, presenterName} = utils.detectCurrentPage();

    await setupGlobalErrorHandlers();
    let gtinResolver = require("gtin-resolver");
    webSkel.client = getInstance("default");
    const {epiDomain, epiSubdomain} = env;
    webSkel.sorClient = gtinResolver.getEPISorClient(epiDomain, epiSubdomain, "Demiurge");

    webSkel.renderToast = renderToast;

    let justCreated;
    let appManager = AppManager.getInstance();


    try {
        justCreated = await appManager.walletInitialization();
    } catch (err) {
        webSkel.notificationHandler.reportUserRelevantError("Failed to execute initial wallet setup process", err);
    }

    if (justCreated || !await appManager.didWasCreated()) {
        presenterName = "booting-identity-page";
        currentPage = presenterName;
    } else {
        await AuditService.getInstance().addAccessLog();
    }

    pageContent.insertAdjacentHTML("beforebegin", `<sidebar-menu data-presenter="left-sidebar"></sidebar-menu>`);

    await webSkel.changeToDynamicPage(presenterName, currentPage);
})();
