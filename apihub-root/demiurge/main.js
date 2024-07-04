import WebSkel from "./WebSkel/webSkel.js";
const openDSU = require("opendsu");
(async ()=>{
    window.webSkel = await WebSkel.initialise("./webskel-configs.json");
    let pageContent = document.querySelector("#page-content");
    pageContent.insertAdjacentHTML("beforebegin", `<left-sidebar data-presenter="left-sidebar"></left-sidebar>`)
    webSkel.setDomElementForPages(pageContent);
    let currentPage = window.location.hash.slice(1);
    if(currentPage === ""){
        currentPage = "groups-page";
    }
    webSkel.notificationHandler = openDSU.loadAPI("error");
    await webSkel.changeToDynamicPage(currentPage, currentPage);
})();

