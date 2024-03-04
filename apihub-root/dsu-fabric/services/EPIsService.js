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

    generateMissingToastList(missingImgFiles) {
        let missingFilesErrText = ``;
        missingImgFiles.forEach(item => {
            missingFilesErrText = missingFilesErrText + `<li>Image ${item} does not exist</li>`
        })
        return missingFilesErrText;
    }

    generateDifferentCaseToastList(differentCaseImgFiles) {
        let differentCaseErrText = ``;
        differentCaseImgFiles.forEach(item => {
            differentCaseErrText = differentCaseErrText + `<li>Image ${item.xmlName} does not exist, but a similar file ${item.fileName}  exists and will be used instead</li>`
        })
        return differentCaseErrText;
    }

    getToastContent(htmlList) {
        return `<div class="toast-content"><div>Uploaded XML file contains unknown image reference</div> <br>
            <div> <ul>${htmlList}</ul></div></div>`
    }

    async validateEPIFilesContent(epiFiles) {
        let acceptedFormats = ["text/xml", "image/jpg", "image/jpeg", "image/png", "image/gif", "image/bmp"];
        let returnMsg = "";
        try {
            let xmlContent;
            let epiImages = {};
            for (let file of epiFiles) {
                if (!acceptedFormats.includes(file.type)) {
                    returnMsg = `${file.type} is not a supported file type.`;
                    return {isValid: false, message: returnMsg};
                }
                if (file.name.endsWith(".xml")) {
                    xmlContent = await gtinResolver.DSUFabricUtils.getFileContent(file);
                } else {
                    let fileContent = await gtinResolver.DSUFabricUtils.getFileContentAsBuffer(file);
                    epiImages[file.name] = gtinResolver.utils.getImageAsBase64(fileContent);
                }
            }

            let xmlService = new gtinResolver.XMLDisplayService(document.querySelector(".modal-body"));

            let htmlXMLContent = xmlService.getHTMLFromXML("", xmlContent);
            let leafletHtmlContent = xmlService.buildLeafletHTMLSections(htmlXMLContent);
            if (!leafletHtmlContent) {
                returnMsg = this.getToastContent(this.generateMissingToastList(missingImgFiles));
                return {isValid: false, message: returnMsg};
            }

            let leafletHtmlImages = htmlXMLContent.querySelectorAll("img");
            let htmlImageNames = Array.from(leafletHtmlImages).map(img => img.getAttribute("src"));
            //removing from validation image src that are data URLs ("data:....")
            htmlImageNames = htmlImageNames.filter((imageSrc) => {
                let dataUrlRegex = new RegExp(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i);
                if (!!imageSrc.match(dataUrlRegex) || imageSrc.startsWith("data:")) {
                    returnMsg = "The XML file contains an unsupported embedded image."
                    return {isValid: false, message: returnMsg};
                }
                return {isValid: true, message: returnMsg};
            });
            let uploadedImageNames = Object.keys(epiImages);
            let differentCaseImgFiles = [];
            let missingImgFiles = []
            htmlImageNames.forEach(imgName => {
                if (!epiImages[imgName]) {
                    let differentCaseImg = uploadedImageNames.find((item) => item.toLowerCase() === imgName.toLowerCase())
                    if (differentCaseImg) {
                        differentCaseImgFiles.push({xmlName: imgName, fileName: differentCaseImg});
                    } else {
                        missingImgFiles.push(imgName);
                    }
                }
            })

            if (missingImgFiles.length > 0) {
                returnMsg = this.getToastContent(this.generateMissingToastList(missingImgFiles))
                return {isValid: false, message: returnMsg};
            }
            if (differentCaseImgFiles.length > 0) {
                returnMsg = this.getToastContent(this.generateDifferentCaseToastList(differentCaseImgFiles))
            }
            return {isValid: true, message: returnMsg};
        } catch (e) {
            returnMsg = "Attention: uploaded files format is not supported. To proceed successfully verify that you have an XML file and your XML file adheres to the prescribed format and structure. To obtain the correct XML specifications we recommend consulting our documentation. Thank you! "
            return {isValid: false, message: returnMsg};
        }

    }
}
