/**
 * Util Method to setup the OpenDSU Tests Library to be accessible within Jest
 * through the {@link process}.opendsu property
 *
 * **must be setup** in ```jest.config.js``` like so:
 *
 * ```javascript
 * module.exports = {
 *     ...
 *      globalSetup: "./tests/config/opendsu-setup.js.js",
 * }
 * ```
 * @throws {Error} if it fails to load OpenDSU
 *
 * @async
 * @function setupOpenDSUForJest
 *
 * @memberOf dsu-utils
 */
async function setupOpenDSUForJest(){
    const {cacheOpenDSU} = require('./jest-opendsu-client');

    const path = require("path");

    let openDSU;
    const basePath = process.cwd();

    let pathAdapter = "/"

    try{
        require(path.join(basePath, pathAdapter, 'opendsu-sdk/builds/output/pskWebServer.js'));
        openDSU = require("opendsu");
    } catch (e) {
        try {
            require(path.join(basePath, "../", 'opendsu-sdk/builds/output/openDSU.js'));
            pathAdapter = "../";
            openDSU = require("opendsu");
        } catch (e){
            throw new Error("Could not load OpenDSU on the second path iteration " + e.message);
        }
    }

    if (!openDSU)
        throw new Error("OpenDSU has not been loaded (no error was thrown)");
    console.log("OpenDSU as been loaded");

    cacheOpenDSU({
        opendsu: openDSU
    });
}

module.exports = setupOpenDSUForJest;
