async function init(){
    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    const SecretsHandler = require("opendsu").loadApi("w3cdid").SecretsHandler;

    // Listen for the popstate event, which is triggered when the back button is pressed
    window.addEventListener('popstate', async function() {
        let creds;
        try{
            const mainDID = await scAPI.getMainDIDAsync();
            const handler = await SecretsHandler.getInstance(mainDID);
            creds = await handler.checkIfUserIsAuthorized(mainDID);
        }catch(err){
            //ignored...
        }

        //test if the user is authorized
        if (!creds) {
            // Push the same state back to prevent back navigation to prevent any important pages to be accessed
            let appRootPath = window.location.origin+window.location.pathname;
            window.history.pushState(null, '', appRootPath);
            //if pushState will fail for sure the reload will help
            window.location.reload();
        }
    });
}

export default { init };
