const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const resolver = openDSU.loadAPI("resolver");
const crypto = openDSU.loadAPI("crypto");
const getSSODetectedId = () => {
    return crypto.sha256JOSE(crypto.generateRandom(10), "hex");
}

const init = async () => {
    const scAPI = require("opendsu").loadAPI("sc");
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
    const gtinResolver = require("gtin-resolver");
    const client = gtinResolver.getMockEPISORClient();
    const domain = "default";
    const gtin = "00000000000000";
    const productDetails = {
        "messageType": "Product",
        "messageTypeVersion": 1,
        "senderId": "ManualUpload",
        "receiverId": "QPNVS",
        "messageId": "S000001",
        "messageDateTime": "2023-01-11T09:10:01CET",
        "product": {
            "productCode": "00000000000000",
            "internalMaterialCode": "",
            "inventedName": "BOUNTY",
            "nameMedicinalProduct": "BOUNTY® 250 mg / 0.68 mL pre-filled syringe",
            "strength": ""
        }
    };

    await $$.promisify(client.addProduct)(domain, gtin, productDetails);
    const result = await $$.promisify(client.readProductMetadata)(domain, gtin);
    console.log(result);
}

import WebSkel from "./WebSkel/webSkel.js";

window.webSkel = new WebSkel();
window.mainContent = document.querySelector("#app-wrapper");


async function loadPage() {
    document.querySelector("#page-content").insertAdjacentHTML("beforebegin", `<left-sidebar data-presenter="left-sidebar" ></left-sidebar>`);
    await webSkel.changeToDynamicPage("home-page", `home`);
}

export function changeSelectedPageFromSidebar(url) {
    let element = document.getElementById('selected-page');
    if (element) {
        element.removeAttribute('id');
        let paths = element.querySelectorAll("path");
        paths.forEach((path) => {
            path.setAttribute("fill", "white");
        });
    }
    let divs = document.querySelectorAll('.feature');
    divs.forEach(div => {
        let dataAction = div.getAttribute('data-local-action');
        let page = dataAction.split(" ")[1];
        if (url.includes(page)) {
            div.setAttribute('id', 'selected-page');
            let paths = div.querySelectorAll("path");
            paths.forEach((path) => {
                path.setAttribute("fill", "var(--left-sidebar)");
            });
        }
    });
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

        for (const service of config.services) {
            const ServiceModule = await import(service.path);
            webSkel.initialiseService(service.name, ServiceModule[service.name]);
        }

        for (const presenter of config.presenters) {
            const PresenterModule = await import(presenter.path);
            webSkel.registerPresenter(presenter.name, PresenterModule[presenter.className]);
        }
        for (const component of config.components) {
            await webSkel.defineComponent(component.name, component.path, component.cssPaths);
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
    await webSkel.UtilsService.initialize();
    webSkel.setDomElementForPages(document.querySelector("#page-content"));
    await loadConfigs("./webskel-configs.json");
    await loadPage();
    window.addEventListener('beforeunload', saveCurrentState);
})();