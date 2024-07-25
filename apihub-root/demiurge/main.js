import WebSkel from "./WebSkel/webSkel.js";

const openDSU = require("opendsu");
import {getInstance} from "./MockClient.js";
import mockData from "./MockData.js";
import constants from "./constants.js";
import utils from "./utils.js";

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

(async () => {
    window.webSkel = await WebSkel.initialise("./webskel-configs.json");
    webSkel.notificationHandler = openDSU.loadAPI("error");
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    let pageContent = document.querySelector("#page-content");
    webSkel.setDomElementForPages(pageContent);
    registerGlobalActions();

    const {currentPage, presenterName} = utils.detectCurrentPage();

    await setupGlobalErrorHandlers();
    webSkel.client = getInstance("default");
    let promises = []
    for (let item of mockData.devUserLogs) {
        promises.push($$.promisify(webSkel.client.addAuditLog)(item));
    }
    for (let item of mockData.userLogs) {
        promises.push($$.promisify(webSkel.client.addAuditLog)(item));
    }
    webSkel.renderToast = renderToast;
    try {
        await Promise.all(promises);
    } catch (e) {
        webSkel.notificationHandler.reportUserRelevantError("Failed to add audit logs", e);
    }
    await webSkel.changeToDynamicPage(presenterName, currentPage);
    pageContent.insertAdjacentHTML("beforebegin", `<sidebar-menu data-presenter="left-sidebar"></sidebar-menu>`);
})();

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
