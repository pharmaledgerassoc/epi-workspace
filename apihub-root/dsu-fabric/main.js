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
console.log("Init");

init();
