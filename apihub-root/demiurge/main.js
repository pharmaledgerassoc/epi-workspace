import WebSkel from "./WebSkel/webSkel.js";
window.webSkel = await WebSkel.initialise("./webskel-configs.json");
webSkel.setDomElementForPages(document.querySelector("#page-content"));
