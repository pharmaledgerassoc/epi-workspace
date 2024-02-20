import {showModal} from "../WebSkel/utils/modal-utils.js";
import constants from "../constants.js";

function createObservableObject(obj, onChange) {
  return new Proxy(obj, {
    set(target, property, value) {
      target[property] = value;
      onChange();
      return true;
    },
  });
}

//TODO: CODE-REVIEW - migrate the URL logic to webskel
async function loadPage(pageToLoad) {
  const handleURL = (URL = window.location.hash) => {
    return (!URL || URL === '#') ? webSkel.defaultPage : URL.slice(URL.startsWith('#') ? 1 : 0).split('?')[0];
  };
  let currentPage = handleURL(pageToLoad);
  pageToLoad = pageToLoad.substring(1);
  await webSkel.changeToDynamicPage(`${currentPage}`, `${pageToLoad}`);
}

function getCurrentPageTag() {
  let URL = window.location.hash;
  return URL.slice(URL.startsWith('#') ? 1 : 0)
}


function showError(title, message, technical) {
  window.showApplicationError = async () => {
    await showModal("show-error-modal", {
      title: title,
      message: message,
      technical: technical
    });
  }
}

function showNotification(type, message) {
  window.showApplicationError = async () => {
    await showModal("show-error-modal", {
      title: type,
      message: message,
      technical: ""
    });
  }
}

function parseCookies(cookies) {
  const parsedCookies = {};
  if (!cookies) {
    return parsedCookies;
  }
  let splitCookies = cookies.split(";");
  splitCookies = splitCookies.map(splitCookie => splitCookie.trim());
  splitCookies.forEach(cookie => {
    const cookieComponents = cookie.split("=");
    const cookieName = cookieComponents[0].trim();
    let cookieValue = cookieComponents[1].trim();
    if (cookieValue === "null") {
      cookieValue = undefined;
    }
    parsedCookies[cookieName] = cookieValue;
  })

  return parsedCookies;
}

function getUserDetails() {
  let userData = localStorage.getItem("SSODetectedId");
  if(!userData) {
    const parsedCookies = parseCookies(document.cookie);
    userData = parsedCookies["SSODetectedId"];
  }
  return userData;
}

async function setupGlobalErrorHandlers() {
  const openDSU = require("opendsu");
  let errHandler = openDSU.loadAPI("error");

  errHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.WARN, (notification) => {
    showNotification(constants.NOTIFICATION_TYPES.WARN, notification.message)
  });

  errHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.INFO, (notification) => {
    showNotification(constants.NOTIFICATION_TYPES.INFO, notification.message);
  });

  errHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.ERROR, (notification) => {
    let errMsg = "";
    if (notification.err && notification.err.message) {
      errMsg = notification.err.message;
    }
    let toastMsg = `${notification.message} ${errMsg}`
    showNotification(constants.NOTIFICATION_TYPES.ERROR, toastMsg);
  })

}

async function navigateToPage(pageTag, data) {
  await webSkel.changeToDynamicPage(pageTag, pageTag, data);
  changeSidebarFromURL();
}

function isCopyToClipboardSupported() {
  let support = !!document.queryCommandSupported;

  ['copy', 'cut'].forEach((action) => {
    support = support && !!document.queryCommandSupported(action);
  });
  return support;
}

function copyToClipboard(text) {
  if (isCopyToClipboardSupported()) {
    navigator.clipboard.writeText(text).catch((error) => {
      console.error('Cannot copy text', error);
    });
  }
}


//other rtl language codes to be used for later:  "arc", "arz", "ckb", "dv", "fa", "ha", "he", "khw", "ks", "ps", "sd", "ur", "uz_AF", "yi"
let rtlLangCodes = ["ar", "he"];

function getTextDirection(lang) {
  let textDirection = "LTR";
  if (rtlLangCodes.find((rtlLAng) => rtlLAng === lang)) {
    textDirection = "RTL"
  }
  return textDirection;
}
function changeSidebarFromURL() {
  let currentPage = window.location.hash;
  let categories = ["home", "my-account", "product", "batch", "audit", "logout"];
  let sidebarItems = document.querySelectorAll(".menu-item");
  let oldSelection = Array.from(sidebarItems).find(sidebarItem => sidebarItem.getAttribute("id") === "active-menu-item");
  if(oldSelection){
    oldSelection.removeAttribute("id");
  }
  if (!sidebarItems) {
    return;
  }
  let elements = {};
  for (let category of categories) {
    elements[category] = Array.from(sidebarItems).find(sidebarItem => sidebarItem.getAttribute("data-category") === category);
  }
  for (let category of categories) {
    if (currentPage.includes(category)) {
      elements[category].id = "active-menu-item";
      return;
    }
  }
}
export {
  createObservableObject,
  loadPage,
  showNotification,
  getCurrentPageTag,
  showError,
  getUserDetails,
  setupGlobalErrorHandlers,
  navigateToPage,
  copyToClipboard,
  isCopyToClipboardSupported,
  getTextDirection,
  changeSidebarFromURL
}
