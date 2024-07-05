import WebSkel from "./WebSkel/webSkel.js";
const openDSU = require("opendsu");
import {getInstance} from "./MockClient.js";
import mockData from "./MockData.js";
(async ()=>{
    window.webSkel = await WebSkel.initialise("./webskel-configs.json");
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    let pageContent = document.querySelector("#page-content");
    pageContent.insertAdjacentHTML("beforebegin", `<sidebar-menu data-presenter="left-sidebar"></sidebar-menu>`)
    webSkel.setDomElementForPages(pageContent);
    let currentPage = window.location.hash.slice(1);
    let presenterName = currentPage.split("/")[0];
    if(currentPage === ""){
        currentPage = "groups-page";
        presenterName = "groups-page";
    }
    webSkel.notificationHandler = openDSU.loadAPI("error");
    webSkel.client = getInstance("default");
    let promises = []
    for(let item of mockData.devUserLogs){
        promises.push($$.promisify(webSkel.client.addAuditLog)(item));
    }
    for(let item of mockData.userLogs){
        promises.push($$.promisify(webSkel.client.addAuditLog)(item));
    }
    for(let item of mockData.healthChecks){
        promises.push($$.promisify(webSkel.client.addHealthCheck)(item));
    }
    await Promise.all(promises);
    await webSkel.changeToDynamicPage(presenterName, currentPage);
})();

