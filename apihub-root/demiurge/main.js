import WebSkel from "./WebSkel/webSkel.js";

const openDSU = require("opendsu");
import AppManager from "./services/AppManager.js";
import HistoryGateKeeper from "./services/HistoryGateKeeper.js";
import constants from "./constants.js";
import utils from "./utils.js";
import env from "./environment.js";
import AuditService from "./services/AuditService.js";
import {getPermissionsWatcher, checkIfUserIsAuthorized} from "./services/PermissionsWatcher.js";

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
        utils.renderToast(notification.message, "warning", null, "infinite");
    });

    webSkel.notificationHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.INFO, (notification) => {
        utils.renderToast(notification.message, "info")
    });

    webSkel.notificationHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.ERROR, (notification) => {
        let errMsg = "";
        if (notification.err && notification.err.message) {
            errMsg = notification.err.message;
        }
        let toastMsg = `${notification.message} ${errMsg}`
        utils.renderToast(toastMsg, "error", "alert")
    });
}


(async () => {
    // Define the CSS styles as a string
    const styles = `
dialog.toast-dialog {
    height: min-content;
    border: none;
    margin: 0 0 5px;
    width: 100%;
}

dialog.toast-dialog.block_alert {
    margin: 10px 10px 5px auto;
    width: 40%;
}

.toast-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: fixed;
    top: 0;
    width: 40%;
    right: 0;
    align-items: end;
    padding: 10px;
    background: none;
    pointer-events: none;
    z-index: 10000;
}

.toast-text {
    color: #000;
    padding: 1.25rem;
}

.toast {
    display: flex;
    opacity: 100%;
    background-color: #FFFFFF;
    justify-content: space-between;
    width: 100%;
    border-top: 3px solid;
    border-radius: 8px;
}

.toast.info {
    border-top-color: #33D29C;
    box-shadow: 0 1px 3px #33D29C;
}

.toast.warn {
    border-top-color: #FEC02D;
    box-shadow: 0 1px 3px #FEC02D;
}

.toast.error {
    border-top-color: #EF4C61;
    box-shadow: 0 1px 3px #EF4C61;
}

.toast-close-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    pointer-events: all;
    padding: 10px;
}
`;

// Create a style element
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;

// Append the style element to the document head
    document.head.appendChild(styleSheet);

    window.webSkel = await WebSkel.initialise("./webskel-configs.json");
    webSkel.notificationHandler = openDSU.loadAPI("error");
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    let pageContent = document.querySelector("#page-content");
    webSkel.setDomElementForPages(pageContent);
    registerGlobalActions();

    let {currentPage, presenterName} = utils.detectCurrentPage();

    await setupGlobalErrorHandlers();
    const {epiDomain, epiSubdomain} = env;
    let gtinResolver = require("gtin-resolver");
    webSkel.healthCheckClient = gtinResolver.getHealthCheckClient();
    webSkel.demiurgeSorClient = gtinResolver.getEPISorClient(epiDomain, epiSubdomain, "Demiurge");
    webSkel.dsuFabricSorClient = gtinResolver.getEPISorClient(epiDomain, epiSubdomain);
    webSkel.renderToast = utils.renderToast;

    let justCreated;
    let appManager = AppManager.getInstance();
    try {
        justCreated = await appManager.walletInitialization();
    } catch (err) {
        webSkel.notificationHandler.reportUserRelevantError("Failed to execute initial wallet setup process", err);
    }

    let did = await appManager.getDID();
    if (justCreated || !await appManager.didWasCreated() || !await checkIfUserIsAuthorized(did)) {
        presenterName = "booting-identity-page";
        currentPage = presenterName;
    } else {
        let permissionWatcher = getPermissionsWatcher(did);
        if (await permissionWatcher.checkAccess()) {
            await AuditService.getInstance().addAccessLog();
        }
    }

    HistoryGateKeeper.init();

    pageContent.insertAdjacentHTML("beforebegin", `<sidebar-menu data-presenter="left-sidebar"></sidebar-menu>`);

    let originalPageChange = webSkel.changeToDynamicPage;
    webSkel.changeToDynamicPage = function (...args) {
        try {
            if (args[0] !== "booting-identity-page") {
                document.querySelector("sidebar-menu").style.display = "flex";
            }

            //if better to close here any remaining dialogs before navigate to the requested page...
            let dialogs = window.document.body.querySelectorAll("dialog");
            for (let dialog of dialogs) {
                webSkel.closeModal(dialog);
            }
        } catch (err) {
            console.log(err);
        }
        originalPageChange.call(webSkel, ...args);
    }

    await webSkel.changeToDynamicPage(presenterName, currentPage);
})();
