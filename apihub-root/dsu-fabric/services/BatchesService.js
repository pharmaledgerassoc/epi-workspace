import constants from "../constants.js";
import bwipjs from "../cloned-dependecies/bwip.js";
import {navigateToPage} from "../utils/utils.js";

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
            "batch",
            "batchNumber",
            "enableExpiryDay",
            "epiProtocol",
            "expiryDate",
            "inventedName",
            "nameMedicinalProduct",
            "packagingSiteName",
            "productCode"
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

    getDateInputTypeFromDateString(dateValueString) {
        if (!dateValueString) {
            return "empty";
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
        let inputStringDate = "";
        const separator = '-'
        if (this.getDateInputTypeFromDateString(dateValueString) === "date") {
            /* returns 'DD-MM-YYYY' */
            inputStringDate = dateValueString.slice(4, 6) +
                separator +
                dateValueString.slice(2, 4) +
                separator +
                this.getFirstTwoDigitsOfYear() +
                dateValueString.slice(0, 2)
        } else {
            /* returns 'MM-YYYY' */
            if (dateValueString.slice(-2).includes("00")) {
                dateValueString = dateValueString.slice(0, 4);
            }
            inputStringDate = dateValueString.slice(2, 4) +
                separator +
                this.getFirstTwoDigitsOfYear() +
                dateValueString.slice(0, 2)
        }
        return inputStringDate;
    }

    createDateInput(dateInputType, assignDateValue = null) {
        let dateInput = document.createElement('input');
        dateInput.id = 'date';
        dateInput.classList.add('pointer');
        dateInput.classList.add('date-format-remover');
        dateInput.classList.add('form-control');
        dateInput.setAttribute('name', 'expiryDate');
        dateInput.setAttribute('type', dateInputType);
        dateInput.required = true;
        if (assignDateValue) {
            /* to reverse the format of the date displayed on UI */
            dateInput.setAttribute('data-date', this.reverseSeparatedDateString(assignDateValue));
            dateInput.value = assignDateValue;
            if (!dateInput.value) {
                console.error(`${assignDateValue} is not a valid date. Input type: ${dateInput}`)
            }
        }
        dateInput.addEventListener('click', function () {
            this.blur();
            if ('showPicker' in this) {
                this.showPicker();
            }
        });
        let self = this;
        dateInput.addEventListener('change', function (event) {
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
            ? dateParts[2] + separator + dateParts[1] + separator + dateParts[0]
            : dateParts[1] + separator + dateParts[0];
    }

    /* mm-yyyy to yyyy-mm  || yyyy-mm->mm-yyyy || */
    reverseSeparatedDateString(dateString) {
        const separator = '-'
        let dateParts = dateString.split(separator);
        return dateParts.reverse().join(separator);
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
        dateInputElementRef.setAttribute('data-date', this.reverseInputFormattedDateString(assignDateValue));
        dateInputElementRef.value = assignDateValue;
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

    async addBatch(batchData, EPIs) {
        const batchValidationResult = await this.validateBatch(batchData);
        if (batchValidationResult.valid) {
            await $$.promisify(webSkel.client.addBatch)(batchData.productCode, batchData.batchNumber, this.createBatchPayload(batchData));
            for (const EPI of EPIs) {
                let epiDetails = webSkel.appServices.getEPIPayload(EPI, batchData.productCode, batchData.batchNumber);
                await $$.promisify(webSkel.client.addBatchEPI)(batchData.productCode, batchData.batchNumber, EPI.language, EPI.type, epiDetails);
            }
        }
        return batchValidationResult;
    }

    createBatchPayload(batchData) {
        return {payload: batchData};
    }

    async loadEditData(gtin, batchId) {
        const batch = await $$.promisify(webSkel.client.getBatchMetadata)(gtin, batchId);
        if (!batch) {
            console.error(`Unable to find batch with ID: ${batchId}.`);
            return {batch: undefined, product: undefined};
        }
        const product = await $$.promisify(webSkel.client.getProductMetadata)(gtin);
        if (!product) {
            console.error(`Unable to find product with product code: ${batch.productCode} for batch ID: ${batchId}.`);
            return {batch, product: undefined};
        }
        return {batch, product};
    };

    async updateBatch(batchData, existingEPIs) {
        const batchValidationResult = this.validateBatch(batchData)
        if (batchValidationResult.valid) {
            await $$.promisify(webSkel.client.updateBatch)(batchData.productCode, batchData.batchNumber, this.createBatchPayload(batchData));

            for (let epi of batchData.EPIs) {
                let epiDetails = webSkel.appServices.getEPIPayload(epi, batchData.productCode);
                if (epi.action === constants.EPI_ACTIONS.ADD) {
                    await $$.promisify(webSkel.client.addBatchEPI)(batchData.productCode, batchData.batchNumber, epi.language, epi.type, epiDetails);
                }
                if (epi.action === constants.EPI_ACTIONS.UPDATE) {
                    await $$.promisify(webSkel.client.updateBatchEPI)(batchData.productCode, batchData.batchNumber, epi.language, epi.type, epiDetails);
                }
                if (epi.action === constants.EPI_ACTIONS.DELETE) {
                    await $$.promisify(webSkel.client.deleteBatchEPI)(batchData.productCode, batchData.batchNumber, epi.language, epi.type);
                }
            }
            /* for (const epi of updatedEPIs) {
                 let epiPayload=webSkel.appServices.createEPIPayload(epi,batchData.productCode);
                 if(epi.action === "update" && existingEPIs.some(obj => obj.language === epi.language)){
                     await $$.promisify(webSkel.client.updateBatchEPI)(batchData.productCode, batchData.batchNumber,epiPayload);
                 }else if (epi.action === "add") {
                     await $$.promisify(webSkel.client.addBatchEPI)(batchData.productCode,batchData.batchNumber, epiPayload);
                 } else if (epi.action === "delete"){
                     let language;
                     if (existingEPIs.some(obj => {
                         language = obj.language;
                         return obj.language === epi.language;
                     })) {
                         await $$.promisify(webSkel.client.deleteBatchEPI)(batchData.productCode, language);
                     }
                 }
             }*/
            return true;
        } else {
            /* TODO Replace console error logging with toasts */
            console.error(batchValidationResult.message);
            return false;
        }
    }

    async validateBatch(batchObj) {
        if (!batchObj.productCode) {
            return {valid: false, message: 'Product code is a mandatory field'};
        }
        if (!batchObj.batchNumber) {
            return {valid: false, message: 'Batch number is a mandatory field'};
        }

        if (!/^[A-Za-z0-9]{1,20}$/.test(batchObj.batchNumber)) {
            return {
                valid: false,
                message: 'Batch number can contain only alphanumeric characters and a maximum length of 20'
            };
        }

        if (!batchObj.expiryDate) {
            return {valid: false, message: 'Expiration date is a mandatory field'};
        }
        const batch = await $$.promisify(webSkel.client.getBatchMetadata)(batchObj.productCode, batchObj.batchNumber);
        if (batch) {
            return {valid: false, message: `Batch ID is already in use for product with gtin ${batchObj.productCode}`};
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

            Object.keys(diffs).forEach(key => {
                if (key === "expiryDate") {
                    let daySelectionObj = {
                        oldValue: initialBatch.enableExpiryDay,
                        newValue: updatedBatch.enableExpiryDay
                    }

                    result.push(webSkel.appServices.getDateDiffViewObj(diffs[key], key, daySelectionObj, constants.MODEL_LABELS_MAP.BATCH))
                    return;
                }
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

    async getBatchEPIs(productCode, batchNumber, epiType) {
        let epiLanguages = await $$.promisify(webSkel.client.listBatchLangs)(productCode, batchNumber, epiType)
        let EPIs = [];
        if (epiLanguages && epiLanguages.length > 0) {
            for (let i = 0; i < epiLanguages.length; i++) {
                let epiPayload = await $$.promisify(webSkel.client.getBatchEPIs)(productCode, batchNumber, epiLanguages[i], epiType);
                EPIs.push(webSkel.appServices.getEpiModelObject(epiPayload, epiLanguages[i], epiType));
            }
        }
        return EPIs
    }

    async getBatchData(productCode, batchNumber) {
        let {batch, product} = await this.loadEditData(productCode, batchNumber);
        const formatBatchForDiffProcess = (batch) => {
            Object.keys(batch).forEach(batchKey => {
                if (batchKey.startsWith("__")) {
                    delete batch[batchKey];
                }
            });
            delete batch["pk"];
        }
        webSkel.appServices.cleanMessage(batch);
        webSkel.appServices.cleanMessage(product);
        let leafletEPIs = await this.getBatchEPIs(productCode, batchNumber, constants.API_MESSAGE_TYPES.EPI.LEAFLET);
        let smpcEPIs = await this.getBatchEPIs(productCode, batchNumber, constants.API_MESSAGE_TYPES.EPI.SMPC);
        let EPIs = [...leafletEPIs, ...smpcEPIs];
        return {batch, product, EPIs}
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
        const productOptions = products.map(product => {
            return `<option value="${product.productCode}"> ${product.productCode} - ${product.inventedName} </option>`;
        }).join("");
        return {productOptions, products}
    }

    async getBatches(number = undefined, query = undefined, sortDirection = "desc") {
        return await $$.promisify(webSkel.client.listBatches)(undefined, number, query, sortDirection);
    }

}
