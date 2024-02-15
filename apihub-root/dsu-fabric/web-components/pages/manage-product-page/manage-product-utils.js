import {getTextDirection} from "../../../utils/utils.js";

const productInputFieldNames = [
    "productCode",
    "inventedName",
    "nameMedicinalProduct",
    "internalMaterialCode",
    "strength",
    "patientLeafletInfo"
]
function createNewState(product = {}, image = "", epiUnits = [], marketUnits = []) {
    let productObj = {};
    for(let key of productInputFieldNames){
        productObj[key] = product[key] || "";
    }
    productObj.photo = image;
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
    createNewState,
    removeMarkedForDeletion,
    getEpitUnit,
    getEpiPreviewModel
}
