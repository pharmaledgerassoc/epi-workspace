import WebSkel from "./WebSkel/webSkel.js";

const openDSU = require("opendsu");
import {getInstance} from "./MockClient.js";
import mockData from "./MockData.js";

function registerGlobalActions() {
    async function pasteToField(_target,fieldId) {
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

    function copyFieldValue(_target,fieldId) {
        const element = document.getElementById(fieldId);
        if (!element) {
            throw new Error(`Element with id ${fieldId} not found`);
        }
        window.focus();
        navigator.clipboard.writeText(element.value)
            .then(() => console.log('Text copied to clipboard'))
            .catch(err => console.error('Error copying text: ', err));
    }

    webSkel.registerAction("pasteToField", pasteToField);
    webSkel.registerAction("copyFieldValue", copyFieldValue);
}

(async () => {
    window.webSkel = await WebSkel.initialise("./webskel-configs.json");
    registerGlobalActions();
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    let pageContent = document.querySelector("#page-content");
    pageContent.insertAdjacentHTML("beforebegin", `<sidebar-menu data-presenter="left-sidebar"></sidebar-menu>`)
    webSkel.setDomElementForPages(pageContent);
    let currentPage = window.location.hash.slice(1);
    let presenterName = currentPage.split("/")[0];
    if (currentPage === "") {
        currentPage = "groups-page";
        presenterName = "groups-page";
    }
    webSkel.notificationHandler = openDSU.loadAPI("error");
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
    await Promise.all(promises);
    await webSkel.changeToDynamicPage(presenterName, currentPage);
})();

