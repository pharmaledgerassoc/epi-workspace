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
            //todo: [code-review] this throw error may cause strange behaviour if is not handled where this method will be called!!!
            // a better way is to generate some UI feedback to be caught as soon as possible the wrong method call!
            throw new Error(`Element with id ${fieldId} not found.`);
        }

        if (pasteInputLocation.readOnly) {
            //todo: [code-review] this throw error may cause strange behaviour if is not handled where this method will be called!!!
            // a better way is to generate some UI feedback to be caught as soon as possible the wrong method call!
            throw new Error(`Element with id ${fieldId} is readonly.`);
        }
        const text = await navigator.clipboard.readText();
        pasteInputLocation.value = text;
        pasteInputLocation.dispatchEvent(new Event('input'));
    }

    function copyFieldValue(_target, fieldId) {
        const element = document.getElementById(fieldId);
        if (!element) {
            //todo: [code-review] this throw error may cause strange behaviour if is not handled where this method will be called!!!
            // a better way is to generate some UI feedback to be caught as soon as possible the wrong method call!
            throw new Error(`Element with id ${fieldId} not found`);
        }
        window.focus();
        navigator.clipboard.writeText(element.value)
            .then(() => {
                //todo: [code-review] Remove any unnecessary console.log messages. It is more important to give feedback to the user that his action completed with success or not
                console.log('Text copied to clipboard')
                //todo: [code-review] replace the renderToast call with proper webSkel.notificationHandler.observeUserRelevantMessages handler
                webSkel.renderToast("Copied to clipboard!", "info", 5000);
            })
            //todo: [code-review] replace the console.error with proper dialog or toast to inform user about his action result
            .catch(err => console.error('Error copying text: ', err));
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

    //todo: [code-review] why to we have hidden here the page detection logic and not into a specific method that maybe can be used in other cases?!
    let currentPage = window.location.hash.slice(1);
    let presenterName = currentPage.split("/")[0];
    if (currentPage === "") {
        currentPage = "groups-page";
        presenterName = "groups-page";
    }

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
        renderToast(toastMsg, "error")
    });
}

function renderToast(message, type, timeoutValue = 15000) {
    let toastContainer = document.querySelector(".toast-container");
    toastContainer.insertAdjacentHTML("beforeend", `<message-toast data-message="${message}" data-type="${type}" data-timeout="${timeoutValue}" data-presenter="message-toast"></message-toast>`);
}