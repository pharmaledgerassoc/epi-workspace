import {getUserDetails} from "../utils/utils.js";

export class UtilsService {
    constructor() {
    }

    generate(charactersSet, length) {
        let result = '';
        const charactersLength = charactersSet.length;
        for (let i = 0; i < length; i++) {
            result += charactersSet.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    dbMessageFields = ["pk", "meta", "did", "__timestamp", "$loki", "context", "keySSI", "epiProtocol", "version"];

    generateDeterministicId(...input) {
        input = Array.isArray(input) ? input : [input];
        input = input.map((item) => {
            if (typeof item === "object" && item !== null) {
                return Object.entries(item).map(([key, value]) => `${key}:${value}`).join("_");
            }
            return item;
        }).join("_");
        let encode = 0;
        const length = input.length;
        for (let i = 0; i < length; i++) {
            const char = input.charCodeAt(i);
            encode = (encode * 131 + char) >>> 0;
        }
        return encode.toString();
    }

    generateID(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return this.generate(characters, length);
    }

    generateNumericID(length) {
        const characters = '0123456789';
        return this.generate(characters, length);
    }

    generateSerialNumber(length) {
        let char = this.generate("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2);
        let number = this.generateNumericID(length - char.length);
        return char + number;

    }

    getDiffsForAudit(prevData, newData) {
        if (prevData && (Array.isArray(prevData) || Object.keys(prevData).length > 0)) {
            prevData = this.cleanMessage(prevData);
            newData = this.cleanMessage(newData);

            let diffs = Object.keys(newData).reduce((diffs, key) => {
                if (newData[key].action === "delete" && !prevData[key]) {
                    return diffs;
                }
                if (JSON.stringify(prevData[key]) === JSON.stringify(newData[key])) return diffs
                return {
                    ...diffs, [key]: {oldValue: prevData[key] || "", newValue: newData[key]}
                }
            }, {})
            return diffs;
        }
    }

    getPhotoDiffViewObj(diff, property, modelLabelsMap) {
        const gtinResolverUtils = gtinResolver.getMappingsUtils();
        return {
            "changedProperty": modelLabelsMap[property],
            "oldValue": {
                "value": diff.oldValue ? gtinResolverUtils.getImageAsBase64(diff.oldValue) : " ",
                "directDisplay": true
            },
            "newValue": {
                "value": diff.newValue ? gtinResolverUtils.getImageAsBase64(diff.newValue) : " ",
                "directDisplay": true
            },
            "isPhoto": true
        }
    }

    getEpiDiffViewObj(epiDiffObj) {
        let changedPropertyLabel;
        const obj = epiDiffObj.newValue ? epiDiffObj.newValue : epiDiffObj.oldValue;
        if (obj) {
            const langLabel = gtinResolver.Languages.getLanguageName(obj.language)
            const typeDescription = gtinResolver.UploadTypes.getEpiTypeDescription(obj.type);
            changedPropertyLabel = `${langLabel} ${typeDescription}`
            if (obj.ePIMarket) {
                const ePIMarket = gtinResolver.Countries.getCountry(obj.ePIMarket)
                changedPropertyLabel += ` for ${ePIMarket} (${obj.ePIMarket})`;
            }
        }

        return {
            "changedProperty": changedPropertyLabel,
            "oldValue": {"value": epiDiffObj.oldValue || "-", "directDisplay": !epiDiffObj.oldValue},
            "newValue": {
                "value": epiDiffObj.newValue && epiDiffObj.newValue.action !== "delete" ? epiDiffObj.newValue : "-",
                "directDisplay": !epiDiffObj.newValue || epiDiffObj.newValue.action === "delete"
            },
            "dataType": "epi"
        }
    }

    getDateDiffViewObj(diff, property, enableDaySelection, modelLabelsMap) {
        const formatDate = (value) => {
            value = webSkel.appServices.parseDateStringToDateInputValue(value);
            return value.split("-").join("/");
        };
        diff.oldValue = formatDate(diff.oldValue);
        diff.newValue = formatDate(diff.newValue);
        return {
            "changedProperty": modelLabelsMap[property],
            "oldValue": {
                "isDate": !!diff.oldValue,
                "value": diff.oldValue || false,
                "directDisplay": true,
                "enableExpiryDay": enableDaySelection.oldValue
            },
            "newValue": {
                "isDate": !!diff.newValue,
                "value": diff.newValue || false,
                "directDisplay": true,
                "enableExpiryDay": enableDaySelection.newValue
            }
        }
    }

    getPropertyDiffViewObj(diff, property, modelLabelsMap) {
        let oldValue = diff.oldValue;
        let newValue = diff.newValue;
        if (typeof oldValue !== "string") {
            oldValue =  JSON.stringify(oldValue);
        }
        if (typeof newValue !== "string") {
            newValue = JSON.stringify(newValue);
        }
        return {
            "changedProperty": modelLabelsMap[property],
            "oldValue": {"value": oldValue || " ", "directDisplay": true},
            "newValue": {"value": newValue || " ", "directDisplay": true}
        } 
    }

    initMessage(msgType) {
        return {
            messageType: msgType,
            messageTypeVersion: 2,
            senderId: getUserDetails(),
            receiverId: "QPNVR",
            messageId: webSkel.appServices.generateID(16),
            messageDateTime: new Date().toISOString()
        }
    }

    cleanMessage(message) {
        let cleanMessage = JSON.parse(JSON.stringify(message));
        this.dbMessageFields.forEach(field => {
            if (field in cleanMessage) {
                delete cleanMessage[field]
            }
        })
        return cleanMessage;
    }

    hasCodeOrHTML(string) {
        const regex = /<[^>]+>/;
        return regex.test(string);
    }


    generateMissingToastList(missingImgFiles) {
        let missingFilesErrText = ``;
        if (missingImgFiles && Array.isArray(missingImgFiles)) {
            missingImgFiles.forEach(item => {
                missingFilesErrText = missingFilesErrText + `<li> ${item} not found</li>`
            })
        }

        return missingFilesErrText;
    }

    generateDifferentCaseToastList(differentCaseImgFiles) {
        let differentCaseErrText = ``;
        if (differentCaseImgFiles && Array.isArray(differentCaseImgFiles)) {
            differentCaseImgFiles.forEach(item => {
                differentCaseErrText = differentCaseErrText + `<li>Image ${item.xmlName} does not exist, but a similar file ${item.fileName}  exists and will be used instead</li>`
            })
        }
        return differentCaseErrText;
    }

    getToastListContent(message, htmlList) {
        let toastContent = `<div class="toast-content"><div>${message}</div>`
        if (htmlList) {
            toastContent = toastContent + `<br> <div> <ul>${htmlList}</ul></div></div>`
        } else {
            toastContent = toastContent + `</div>`
        }
        return toastContent;
    }

    getErrDetails(err) {
        let errDetails = ""
        if (err.reason) {
            let errObj = "";
            try {
                errObj = JSON.parse(err.reason);
                errDetails = errObj.message || "";
            } catch (e) {
                errDetails = err.reason || "";
            }
            if (errObj.details && Array.isArray(errObj.details)) {
                errObj.details.forEach(item => {
                    errDetails = errDetails + "<br>" + (item.errorMessage || "") + " " + (item.errorDetails || "")
                })
            }
        } else {
            errDetails = err.message || "";
        }
        return errDetails;
    }

}
