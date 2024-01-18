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

callMockClient()