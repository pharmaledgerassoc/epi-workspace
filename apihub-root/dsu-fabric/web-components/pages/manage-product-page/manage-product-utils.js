import {getTextDirection} from "../../../utils/utils.js";

const productInputFieldNames = [
    "productCode",
    "inventedName",
    "nameMedicinalProduct",
    "internalMaterialCode",
    "strength"
]

async function getProductData(productCode) {
    let productPayload = await $$.promisify(webSkel.client.getProductMetadata)(productCode);
    delete productPayload.pk;
    delete productPayload.__version;
    delete productPayload.__timestamp;
    let productPhotoPayload = await $$.promisify(webSkel.client.getImage)(productCode);
    let epiUnits = [];
    let languages = await $$.promisify(webSkel.client.listProductsLangs)(productCode);
    if (languages && languages.length > 0) {
        for (let i = 0; i < languages.length; i++) {
            let leafletPayload = await $$.promisify(webSkel.client.getEPI)(productCode, languages[i]);
            let leafletFiles = [leafletPayload.xmlFileContent, ...leafletPayload.otherFilesContent];
            let leafletObj = {
                id: webSkel.appServices.generateID(16),
                language: leafletPayload.language,
                xmlFileContent: leafletPayload.xmlFileContent,
                otherFilesContent: leafletPayload.otherFilesContent,
                filesCount: leafletFiles.length,
                type: leafletPayload.type
            };
            epiUnits.push(leafletObj);
        }
    }

    return {productPayload, productPhotoPayload, epiUnits}
}

function createNewState(product = {}, image = {}, epiUnits = [], marketUnits = []) {
    let productObj = Object.assign({}, product);
    productObj.photo = image || "";
    productObj.epiUnits = JSON.parse(JSON.stringify(epiUnits));
    productObj.marketUnits = JSON.parse(JSON.stringify(marketUnits));
    return productObj;
}

function removeMarkedForDeletion(key, value) {
    if (key === "epiUnits" || key === "marketUnits") {
        return value.filter(unit => unit.action !== "delete");
    } else {
        return value;
    }
}

function getEpitUnit(actionElement, epiUnits) {
    let epiUnit = webSkel.getClosestParentElement(actionElement, ".epi-unit");
    let id = epiUnit.getAttribute("data-id");
    let l_unit = epiUnits.find(unit => unit.id === id);
    return l_unit;
}
function getEpiPreviewModel(epiObject, productData) {
    let previewModalTitle = `Preview ${gtinResolver.Languages.getLanguageName(epiObject.language)} ${epiObject.type}`;
    let textDirection = getTextDirection(epiObject.language)
    return {
        previewModalTitle,
        "xmlFileContent": epiObject.xmlFileContent,
        "otherFilesContent": epiObject.otherFilesContent,
        "productName": productData.inventedName,
        "productDescription": productData.nameMedicinalProduct,
        textDirection
    };
}

export {
    productInputFieldNames,
    getProductData,
    createNewState,
    removeMarkedForDeletion,
    getEpitUnit,
    getEpiPreviewModel
}
