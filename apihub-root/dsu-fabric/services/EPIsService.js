import {getTextDirection} from "../utils/utils.js";

export class EPIsService {
    constructor() {
    }

    getEpitUnit(actionElement, epiUnits) {
        let epiUnit = webSkel.getClosestParentElement(actionElement, ".epi-unit");
        let id = epiUnit.getAttribute("data-id");
        let l_unit = epiUnits.find(unit => unit.id === id);
        return l_unit;
    }

    getEpiPreviewModel(epiObject, productData) {
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

    getEpiModelObject(payload, language, epiType) {
        let epiFiles = [payload.xmlFileContent, ...payload.otherFilesContent];
        return {
            id: webSkel.appServices.generateID(16),
            language: language,
            xmlFileContent: payload.xmlFileContent,
            otherFilesContent: payload.otherFilesContent,
            filesCount: epiFiles.length,
            type: epiType
        }
    }

    deleteEPI(eventTarget, epiUnits) {
        let epiUnitElement = webSkel.getClosestParentElement(eventTarget, ".epi-unit");
        let id = epiUnitElement.getAttribute("data-id");
        let epiUnit = epiUnits.find(unit => unit.id === id);
        epiUnit.action = "delete";
    }
}
