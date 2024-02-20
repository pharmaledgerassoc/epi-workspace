import {getTextDirection} from "../utils/utils.js";
import constants from "../constants.js";

export class EPIsService {
    constructor() {
    }

    getEpitUnit(actionElement, epiUnits) {
        let epiUnit = webSkel.getClosestParentElement(actionElement, ".epi-unit");
        let id = epiUnit.getAttribute("data-id");
        let l_unit = epiUnits.find(unit => unit.id === id);
        return l_unit;
    }

    getEPIPayload(epi, productCode, batchCode) {
        let result = webSkel.appServices.initMessage(epi.type);
        if (epi.action !== constants.EPI_ACTIONS.DELETE) {
            result.payload = {
                productCode: productCode,
                batchCode: batchCode,
                language: epi.language,
                xmlFileContent: epi.xmlFileContent,
                otherFilesContent: epi.otherFilesContent.map(payload => {
                    return {
                        filename: payload.filename,
                        fileContent: payload.fileContent.split("base64,")[1]
                    }
                }),
            };
        } else {
            result.payload = {
                productCode: productCode,
                batchCode: batchCode,
                language: epi.language
            };
        }
        return result;
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
            textDirection,
            epiLanguage: epiObject.language
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
        return epiUnit;
    }
}
