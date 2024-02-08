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
    return (!URL || URL === '#') ? webSkel.defaultPage : URL.slice(URL.startsWith('#') ? 1 : 0).split('/')[0];
  };
  let currentPage = handleURL(pageToLoad);
  pageToLoad = pageToLoad.substring(1);
  await webSkel.changeToDynamicPage(`${currentPage}`, `${pageToLoad}`);
}

function getCurrentPageTag() {
  let URL = window.location.hash;
  return URL.slice(URL.startsWith('#') ? 1 : 0)
}

function changeSelectedPageFromSidebar(url) {
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

function getUserDetails() {
  let userData = localStorage.getItem("SSODetectedID");
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

export {
  createObservableObject,
  loadPage,
  showNotification,
  getCurrentPageTag,
  changeSelectedPageFromSidebar,
  showError,
  getUserDetails,
  setupGlobalErrorHandlers,
  navigateToPage,
  copyToClipboard,
  isCopyToClipboardSupported,
  getTextDirection
}
