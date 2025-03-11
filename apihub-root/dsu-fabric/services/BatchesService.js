import constants from "../constants.js";
import bwipjs from "../cloned-dependecies/bwip.js";
import {navigateToPage} from "../utils/utils.js";
import { unsanitize } from "../WebSkel/utils/dom-utils.js";

//TODO: CODE-REVIEW - bwipjs is a helper or an external library/dependency??

const TWO_D_BARCODES = ["datamatrix", "gs1datamatrix", "qrcode"];

export class BatchesService {
    constructor() {
    }

    charsMap = {
        "33": "!",
        "34": '"',
        "35": "#",
        "36": "$",
        "37": "%",
        "38": "&",
        "39": "'",
        "40": "(",
        "41": ")",
        "42": "*",
        "43": "+",
        "45": "-",
        "46": ".",
        "47": "/",
        "58": ":",
        "59": ";",
        "60": "<",
        "61": "=",
        "62": ">",
        "63": "?",
        "64": "@",
        "91": "[",
        "92": "\\",
        "93": "]",
        "94": "^",
        "95": "_",
        "96": "`",
        "123": "{",
        "124": "|",
        "125": "}",
        "126": "~"
    }

    batchFields() {
        return [
            "batchRecall",
            "batchNumber",
            "enableExpiryDay",
            "epiProtocol",
            "expiryDate",
            "inventedName",
            "nameMedicinalProduct",
            "packagingSiteName",
            "productCode",
            "importLicenseNumber",
            "manufacturerName",
            "dateOfManufacturing",
            "manufacturerAddress1",
            "manufacturerAddress2",
            "manufacturerAddress3",
            "manufacturerAddress4",
            "manufacturerAddress5"
        ]
    }

    bwipjsEscape(data) {
        let resultData = data.split("").map(char => {
            if (this.charsMap[char.charCodeAt(0)]) {
                return char.charCodeAt(0) >= 100 ? `^${char.charCodeAt(0)}` : `^0${char.charCodeAt(0)}`
            } else {
                return char;
            }
        }).join("")
        return resultData;
    }

    sanitizeCode(code) {
        return code.replace(/"/g, "\\\"");
    }

    getDateInputTypeFromDateString(dateValueString, enableExpiryDateCheck) {
        if (!dateValueString) {
            if (enableExpiryDateCheck) {
                return "date";
            } else {
                return "month"
            }

        }

        const isDateSeparated = dateValueString.includes('-');

        if (isDateSeparated) {
            const parts = dateValueString.split('-');

            if (parts.length === 3) {
                return "date";
            } else if (parts.length === 2) {
                if (parts[1] === "00" || parts[0].length === 4) {
                    return "month";
                }
            }
        } else {
            if (dateValueString.length === 4 || dateValueString.slice(-2) === "00") {
                return "month";
            } else {
                return "date";
            }
        }
    }

    getFirstTwoDigitsOfYear() {
        const year = new Date().getFullYear();
        const yearString = year.toString();
        return yearString.slice(0, 2);
    }

    parseDateStringToDateInputValue(dateValueString) {
        if (!dateValueString || dateValueString === "undefined") {
            return "";
        }
        let formatType = this.getDateInputTypeFromDateString(dateValueString);
        return this.transformExpiryDate(dateValueString, formatType);
    }

    transformExpiryDate(expiryDate, formatType, separator = "-") {
        let inputStringDate = "";
        if (formatType === "date") {
            /* returns 'DD-MM-YYYY' */
            inputStringDate = expiryDate.slice(4, 6) +
                separator +
                expiryDate.slice(2, 4) +
                separator +
                this.getFirstTwoDigitsOfYear() +
                expiryDate.slice(0, 2)
        } else {
            /* returns 'MM-YYYY' */
            if (expiryDate.slice(-2).includes("00")) {
                expiryDate = expiryDate.slice(0, 4);
            }
            inputStringDate = expiryDate.slice(2, 4) +
                separator +
                this.getFirstTwoDigitsOfYear() +
                expiryDate.slice(0, 2)
        }
        return inputStringDate;
    }

    createDateInput(dateInputType, name = 'expiryDate', assignDateValue = null, isRequired = true) {
        let dateInput = document.createElement('input');
        dateInput.id = name;
        dateInput.classList.add('pointer');
        dateInput.classList.add('date-format-remover');
        dateInput.classList.add('form-control');
        dateInput.setAttribute('name', name);
        dateInput.setAttribute('type', dateInputType);
        dateInput.setAttribute('min', "2000-01-01");
        dateInput.required = isRequired;
        if (assignDateValue && !assignDateValue.includes("undefined")) {
            /* to reverse the format of the date displayed on UI */
            dateInput.setAttribute('data-date', this.reverseSeparatedDateString(assignDateValue, "/"));
            dateInput.value = assignDateValue.split("/").join("-");
            if (!dateInput.value) {
                console.error(`${assignDateValue} is not a valid date. Input type: ${dateInput}`)
            }
        }
        dateInput.addEventListener('click', function () {
            this.blur();
            this.oldValue = this.value;
            if ('showPicker' in this) {
                this.showPicker();
            }
        });
        let self = this;
        dateInput.addEventListener('change', function (event) {
            const {target} = event;
            if (!event.target.value) {
                event.stopImmediatePropagation();
                event.preventDefault();
                target.setAttribute('data-date', '');
                target.value = '';
                if(target.required)
                    webSkel.notificationHandler.reportUserRelevantError(`${name} is a mandatory field and can not be empty. Please select a valid date`);
                return;
            }
            if(!!event.target.value)
                self.updateUIDate(this, event.target.value);
        })
        return dateInput
    }

    getLastDayOfMonth(year, month) {
        if (typeof year === "string" && typeof month === "string") {
            [year, month] = [parseInt(year), parseInt(month)];
        }
        return new Date(year, month, 0).getDate();
    }

    reverseInputFormattedDateString(dateString) {
        const separator = '-';
        const dateParts = dateString.split(separator);
        return this.getDateInputTypeFromDateString(dateString) === 'date'
            ? dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0]
            : dateParts[1] + "/" + dateParts[0];
    }

    /* mm-yyyy to yyyy-mm  || yyyy-mm->mm-yyyy || */
    reverseSeparatedDateString(dateString, separator) {
        let dateParts = dateString.split(separator);
        return dateParts.reverse().join("/");
    }

    getCurrentDateTimeCET() {
        const date = new Date();

        const offset = -60;
        const cetDate = new Date(date.getTime() + (offset * 60 * 1000));

        const year = cetDate.getFullYear();
        const month = (cetDate.getMonth() + 1).toString().padStart(2, '0');
        const day = cetDate.getDate().toString().padStart(2, '0');
        const hours = cetDate.getHours().toString().padStart(2, '0');
        const minutes = cetDate.getMinutes().toString().padStart(2, '0');
        const seconds = cetDate.getSeconds().toString().padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}CET`;
    }

    formatBatchExpiryDate(dateString) {
        //to do format with 00 if no day in date
        return dateString.split('-').map((part, index) => index === 0 ? part.slice(2) : part).join('');
    }

    prefixMonthDate(dateString) {
        const prefix = "00";
        return dateString + prefix;
    }

    removeEPIForDeletion(key, value) {
        if (key === "EPIs") {
            return value.filter(unit => unit.action !== "delete");
        } else {
            return value;
        }
    }

    updateUIDate(dateInputElementRef, assignDateValue) {
        if(typeof assignDateValue === "string" && assignDateValue.length < 6)
            assignDateValue = "";
        if(!!assignDateValue) {
            dateInputElementRef.setAttribute('data-date', this.reverseInputFormattedDateString(assignDateValue));
            dateInputElementRef.value = assignDateValue;
        }
    }

    createNewBatch(batchRef = {}, EPIs = []) {
        let batchObj = {};
        for (let key of this.batchFields()) {
            batchObj[key] = batchRef[key] || "";
        }
        batchObj.EPIs = JSON.parse(JSON.stringify(EPIs));
        return batchObj;
    }

    drawQRCodeCanvas(model, element) {
        if (model.barcodeData.length > 0) {
            let canvas = element.querySelector("canvas");
            canvas.innerHTML = "";

            let tryToGenerateBarcode = () => {
                if (bwipjs) {
                    try {
                        let options = {
                            bcid: model.barcodeType || "qrcode",      // Barcode type
                            text: model.barcodeData,      // Text to encode
                            scale: 3,             // 3x scaling factor
                            height: model.barcodeSize || 32,    // Bar height, in millimeters
                            textxalign: 'center', // Always good to set this
                        }

                        if (model.includeBarcodeText) {
                            options['alttext'] = model.barcodeData;
                        }

                        if (TWO_D_BARCODES.indexOf(model.barcodeType) !== -1) {
                            options['width'] = model.barcodeSize;
                        }

                        // @ts-ignore
                        bwipjs.toCanvas(canvas, options, function (err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    } catch (e) {
                        // most commonly errors come from wrong input data format
                        console.log(e)
                    }

                } else {
                    setTimeout(tryToGenerateBarcode, 100);
                }
            }
            tryToGenerateBarcode();
        }
    }

    generateSerializationForBatch(batch, serialNumber, element) {
        let barcodeData;
        if (serialNumber === "" || typeof serialNumber === "undefined") {
            barcodeData = `(01)${batch.productCode}(10)${batch.batchNumber}(17)${batch.expiryDate}`;
        } else {
            barcodeData = `(01)${batch.productCode}(21)${this.bwipjsEscape(serialNumber)}(10)${this.bwipjsEscape(batch.batchNumber)}(17)${batch.expiryDate}`;
        }
        barcodeData = this.sanitizeCode(barcodeData);
        let model = {
            barcodeData: barcodeData,
            barcodeType: "gs1datamatrix",
            barcodeSize: 16,
            includeBarcodeText: false
        };
        this.drawQRCodeCanvas(model, element);
    }

    createBatchPayload(batchData) {
        let result = webSkel.appServices.initMessage(constants.API_MESSAGE_TYPES.BATCH);
        result.payload = {
            productCode: batchData.productCode,
            batchNumber: batchData.batchNumber,
            expiryDate: batchData.expiryDate,
            batchRecall: typeof (batchData?.batchRecall) === 'boolean' ? batchData?.batchRecall : false,
            packagingSiteName: batchData.packagingSiteName, 
            importLicenseNumber: batchData.importLicenseNumber,
            manufacturerName: batchData.manufacturerName,
            dateOfManufacturing: batchData.dateOfManufacturing?.length === 6 ? batchData.dateOfManufacturing : this.formatBatchExpiryDate(batchData.dateOfManufacturing),
            manufacturerAddress1: batchData.manufacturerAddress1 || "",
            manufacturerAddress2: batchData.manufacturerAddress2 || "",
            manufacturerAddress3: batchData.manufacturerAddress3 || "",
            manufacturerAddress4: batchData.manufacturerAddress4 || "",
            manufacturerAddress5: batchData.manufacturerAddress5 || ""
        };
        return result;
    }

    parseDateOfManufacturing(date) {

    }

    async loadEditData(gtin, batchId) {

        let checkResult = await this.checkBatchStatus(gtin, batchId, true);

        if (checkResult.status === "invalid") {
            webSkel.notificationHandler.reportUserRelevantError(checkResult.message, checkResult.err);
            return
        }

        const batch = await $$.promisify(webSkel.client.getBatchMetadata)(gtin, batchId);
        const product = await $$.promisify(webSkel.client.getProductMetadata)(gtin);
        return {batch, product};
    }

    async checkBatchStatus(gtin, batchNumber, preventMyObjectWarning) {
        let batchStatus;
        let response = {status: "valid"}
        try {
            batchStatus = await $$.promisify(webSkel.client.objectStatus)(gtin, batchNumber);
        } catch (e) {
            response = {
                status: "invalid",
                err: e,
                message: webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't get status for batch code: ${batchNumber}. <br> Please check your network connection and configuration and try again.`)
            };
            return response;
        }
        if (batchStatus === constants.OBJECT_AVAILABILITY_STATUS.MY_OBJECT) {
            if (!preventMyObjectWarning) {
                response = {
                    status: "invalid",
                    message: "Batch Number for this Product Code (GTIN) is already in use. In case an update is needed, please edit the existing batch using that Batch Number."
                }
                return response;
            }
        }
        if (batchStatus === constants.OBJECT_AVAILABILITY_STATUS.EXTERNAL_OBJECT) {
            response = {
                status: "invalid",
                message: 'Batch code validation failed. Provided batch code is already used.'
            }
            return response;
        }

        if (batchStatus === constants.OBJECT_AVAILABILITY_STATUS.RECOVERY_REQUIRED) {
            let accept = await webSkel.showModal("dialog-modal", {
                header: "Action required",
                message: "Batch version needs recovery. Start the recovery process?",
                denyButtonText: "Cancel",
                acceptButtonText: "Proceed"
            }, true);
            if (accept) {
                let modal;
                try {
                    modal = await webSkel.showModal("progress-info-modal", {
                        header: "Info",
                        message: "Recover process in progress..."
                    });
                    await $$.promisify(webSkel.client.recover)(gtin, batchNumber);
                } catch (err) {
                    response = {
                        status: "invalid",
                        message: 'Batch recovery process failed.'
                    }
                    return response;
                }
                if (modal) {
                    await webSkel.closeModal(modal);
                }
                webSkel.notificationHandler.reportUserRelevantWarning("Batch recovery success.");
            }
        }
        return response;
    }


    async saveBatch(batchData, isUpdate, skipMetadataUpdate = false) {

        await webSkel.showLoading()
        let checkResult = await this.checkBatchStatus(batchData.productCode, batchData.batchNumber, isUpdate);

        let modal = await webSkel.showModal("progress-info-modal", {
            header: "Info",
            message: "Saving Batch..."
        });
        await webSkel.hideLoading();
        if (checkResult.status === "invalid") {
            await webSkel.closeModal(modal);
            webSkel.notificationHandler.reportUserRelevantError(checkResult.message, checkResult.err);
            return
        }

        const batchValidationResult = await this.validateBatch(batchData);
        if (batchValidationResult.valid) {
            if (!skipMetadataUpdate) {
                try {
                    if (isUpdate) {
                        await $$.promisify(webSkel.client.updateBatch)(batchData.productCode, batchData.batchNumber, this.createBatchPayload(batchData));
                    } else {
                        await $$.promisify(webSkel.client.addBatch)(batchData.productCode, batchData.batchNumber, this.createBatchPayload(batchData));
                    }
                } catch (err) {
                    await webSkel.closeModal(modal);
                    webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't update data for batch ${batchData.batchNumber} and product code: ${batchData.productCode}. <br> ${webSkel.appServices.getErrDetails(err)}`), err);
                    return;
                }
            }

            try {
                await webSkel.appServices.executeEPIActions(batchData.EPIs, batchData.productCode, batchData.batchNumber);
            } catch (err) {
                await webSkel.closeModal(modal);
                webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't update data for batch ${batchData.batchNumber} and product code: ${batchData.productCode}. <br> ${webSkel.appServices.getErrDetails(err)}`), err);
                return;
            }
        } else {
            await webSkel.closeModal(modal);
            webSkel.notificationHandler.reportUserRelevantError(batchValidationResult.message);
            return;
        }
        try {
            await webSkel.closeModal(modal);
        } catch (err) {
            //for now i believe that this error can be ignored...
        }

        await navigateToPage("batches-page");
    }

    async validateBatch(batchObj) {
        if (!batchObj.productCode) {
            return {valid: false, message: 'Product code is a mandatory field'};
        }
        if (!batchObj.batchNumber) {
            return {valid: false, message: 'Batch number is a mandatory field'};
        }

        if (!/^[a-zA-Z0-9/-]{1,20}$/.test(batchObj.batchNumber)) {
            return {
                valid: false,
                message: 'Batch number can contain only alphanumeric characters and a maximum length of 20'
            };
        }

        if (!batchObj.expiryDate) {
            return {valid: false, message: 'Expiration date is a mandatory field'};
        }

        return {valid: true, message: ''};
    }

    getBatchDiffs(initialBatch, updatedBatch) {
        let result = [];
        try {
            let {EPIs, ...initialBatchData} = initialBatch;
            let {EPIs: updatedEPIs, ...updatedBatchData} = updatedBatch;
            let diffs = webSkel.appServices.getDiffsForAudit(initialBatchData, updatedBatchData);
            let epiDiffs = webSkel.appServices.getDiffsForAudit(EPIs, updatedEPIs);

            if (Object.keys(diffs).length > 0) {
                result.needsMetadataUpdate = true;
            }

            Object.keys(diffs).forEach(key => {
                
                if (key === "expiryDate") {
                    let daySelectionObj = {
                        oldValue: initialBatch.enableExpiryDay,
                        newValue: updatedBatch.enableExpiryDay
                    }

                    let item = webSkel.appServices.getDateDiffViewObj(diffs[key], key, daySelectionObj, constants.MODEL_LABELS_MAP.BATCH);
                    item.oldValue.value = `<label>${item.oldValue.value}</label><br><label class="gs1-label">GS1 format (${initialBatch.expiryDate})</label>`

                    item.newValue.value = `<label>${item.newValue.value}</label><br><label class="gs1-label">GS1 format (${updatedBatch.expiryDate})</label>`
                    result.push(item);
                    return;
                }

                if (key === "dateOfManufacturing") {
                    const formatDate = (value) => {
                        value = webSkel.appServices.parseDateStringToDateInputValue(value);
                        return value.split("-").join("/");
                    };
                    const diffsKey = {
                        oldValue: !initialBatch.dateOfManufacturing ?  "" : formatDate(initialBatch.dateOfManufacturing),
                        newValue: !updatedBatch.dateOfManufacturing ? "" : this.reverseInputFormattedDateString(updatedBatch.dateOfManufacturing)
                    };
                    return result.push(webSkel.appServices.getPropertyDiffViewObj(diffsKey, key, constants.MODEL_LABELS_MAP.BATCH));

                }
                if(key === "batchRecall") {
                    const diffsKey = {
                        oldValue:(typeof diffs[key].oldValue === 'boolean' && diffs[key].oldValue === true) ? 
                            "On" : "Off",
                        newValue: (typeof diffs[key].newValue === 'boolean' && diffs[key].newValue === true) ? 
                            "On" : "Off",
                    };
                    return result.push(webSkel.appServices.getPropertyDiffViewObj(diffsKey, key, constants.MODEL_LABELS_MAP.BATCH)); 
                }

                if (key.includes("manufacturerAddress")) 
                    diffs[key].oldValue = unsanitize(diffs[key].oldValue);
                
                result.push(webSkel.appServices.getPropertyDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.BATCH));
            });
            Object.keys(epiDiffs).forEach(key => {
                result.push(webSkel.appServices.getEpiDiffViewObj(epiDiffs[key]));
            });

        } catch (e) {
            console.log(e);
        }

        return result;
    }

    async getBatchData(productCode, batchNumber) {
        try {
            let {batch, product} = await this.loadEditData(productCode, batchNumber);
            if (!batch || !product) {
                throw new Error(`Couldn't get data for batchNumber: ${batchNumber}  and productCode: ${productCode} `)
            }

            webSkel.appServices.cleanMessage(batch);
            webSkel.appServices.cleanMessage(product);
            let leafletEPIs = await webSkel.appServices.retrieveEPIs(productCode, batchNumber, constants.API_MESSAGE_TYPES.EPI.LEAFLET);
            let smpcEPIs = await webSkel.appServices.retrieveEPIs(productCode, batchNumber, constants.API_MESSAGE_TYPES.EPI.SMPC);
            let EPIs = [...leafletEPIs, ...smpcEPIs];
            this.getDateInputTypeFromDateString(batch.expiryDate) !== "month" ? batch.enableExpiryDay = "on" : "off";
            return {batch, product, EPIs}
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve batch data. <br> Please check your network connection and configuration and try again.`), err);
        }
    }

    async getProductsForSelect() {
        const products = await webSkel.appServices.getProducts();
        if (products.length === 0) {
            let modal = await webSkel.showModal("progress-info-modal", {
                header: "Products not found",
                message: "Failed to retrieve products list! Create a product first!"
            });
            setTimeout(async () => {
                await webSkel.closeModal(modal);
                await navigateToPage("manage-product-page");
            }, 3000);
        }
        return products
    }

    async getBatches(number = undefined, query = undefined, sortDirection = "desc") {
        let result = [];
        try {
            result = await $$.promisify(webSkel.client.listBatches)(undefined, number, query, sortDirection);
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve batches. <br> Please check your network connection and configuration and try again.`), err);
        }
        return result
    }

}
