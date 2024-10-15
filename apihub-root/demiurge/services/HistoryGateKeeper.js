import {checkIfUserIsAuthorized} from "./PermissionsWatcher.js";
import AppManager from "./AppManager.js";

async function init(){
    let appManager = AppManager.getInstance();
    let did = await appManager.getDID();
    // Listen for the popstate event, which is triggered when the back button is pressed
    window.addEventListener('popstate', async function() {
        //test if the user is authorized
        let authorized = await checkIfUserIsAuthorized(did);
        if(!authorized){
            // Push the same state back to prevent back navigation to prevent any important pages to be accessed
            let appRootPath = window.location.origin+window.location.pathname;
            window.history.pushState(null, '', appRootPath);
            //if pushState will fail for sure the reload will help
            window.location.reload();
        }
    });
}

export default { init };
