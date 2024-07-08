import WebSkel from "./WebSkel/webSkel.js";

const openDSU = require("opendsu");
import {getInstance} from "./MockClient.js";
import mockData from "./MockData.js";
import constants from "./constants.js";

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
            throw new Error(`Element with id ${fieldId} not found.`);
        }

        if (pasteInputLocation.readOnly) {
            throw new Error(`Element with id ${fieldId} is readonly.`);
        }
        const text = await navigator.clipboard.readText();
        pasteInputLocation.value = text;
        pasteInputLocation.dispatchEvent(new Event('input'));
    }

    function copyFieldValue(_target, fieldId) {
        const element = document.getElementById(fieldId);
        if (!element) {
            throw new Error(`Element with id ${fieldId} not found`);
        }
        window.focus();
        navigator.clipboard.writeText(element.value)
            .then(() => {
                console.log('Text copied to clipboard')
                webSkel.renderToast("Copied to clipboard!", "info", 5000);
            })
            .catch(err => console.error('Error copying text: ', err));
    }

    webSkel.registerAction("pasteToField", pasteToField);
    webSkel.registerAction("copyFieldValue", copyFieldValue);
    webSkel.registerAction("closeModal", closeModal);
}

(async () => {
    window.webSkel = await WebSkel.initialise("./webskel-configs.json");
    registerGlobalActions();
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    let pageContent = document.querySelector("#page-content");
    webSkel.setDomElementForPages(pageContent);
    let currentPage = window.location.hash.slice(1);
    let presenterName = currentPage.split("/")[0];
    if (currentPage === "") {
        currentPage = "groups-page";
        presenterName = "groups-page";
    }
    webSkel.notificationHandler = openDSU.loadAPI("error");
    await setupGlobalErrorHandlers();
    webSkel.client = getInstance("default");
    let promises = []
    for (let item of mockData.devUserLogs) {
        promises.push($$.promisify(webSkel.client.addAuditLog)(item));
    }
    for (let item of mockData.userLogs) {
        promises.push($$.promisify(webSkel.client.addAuditLog)(item));
    }
    for (let item of mockData.healthChecks) {
        promises.push($$.promisify(webSkel.client.addHealthCheck)(item));
    }
    webSkel.renderToast = renderToast;
    await Promise.all(promises);
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
        renderToast(toastMsg, "error")
    });
}
function renderToast(message, type, timeoutValue = 15000) {
    let toastContainer = document.querySelector(".toast-container");
    toastContainer.insertAdjacentHTML("beforeend", `<message-toast data-message="${message}" data-type="${type}" data-timeout="${timeoutValue}" data-presenter="message-toast"></message-toast>`);
}