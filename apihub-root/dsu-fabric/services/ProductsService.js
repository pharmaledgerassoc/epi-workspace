import constants from "../constants.js";
export class ProductsService{
    constructor() {
    }

    details = {
        messageType: "",
        messageTypeVersion: 1,
        senderId: "ManualUpload",
        receiverId: "QPNVS",
        messageId: "S000001",
        messageDateTime: "2023-01-11T09:10:01CET"
    }
    createProductPayload(productData){
        this.details.payload = {
            productCode: productData.productCode,
            internalMaterialCode: productData.internalMaterialCode,
            inventedName: productData.inventedName,
            nameMedicinalProduct: productData.nameMedicinalProduct,
            strength: productData.strength
        };
    }
    createPhotoPayload(productData){
        const regex = /\/([^\/;]+);/;
        const match = productData.photo.match(regex);
        let imageType;
        if(match){
            imageType = match[1];
        }else {
            imageType = "unknown";
        }
        this.details.payload = {
            productCode: productData.productCode,
            imageId: webSkel.appServices.generateNumericID(12),
            imageType: "front",
            imageFormat: imageType,
            imageData: productData.photo
        };
    }
    createLeafletPayload(epi, productData){
        this.details.payload = {
            productCode: productData.productCode,
            language: epi.language,
            xmlFileContent: epi.xmlFileContent,
            otherFilesContent: epi.otherFilesContent
        };
    }
    async uploadLeafletFiles(epi){
        epi.otherFilesContent = [];
        for(let file of epi.leafletFiles){
            if(file.type === "text/xml"){
                epi.xmlFileContent = await webSkel.uploadFileAsText(file);
            }else {
                epi.otherFilesContent.push(await webSkel.imageUpload(file));
            }
        }

    }
    async addProduct(productData, callback){
        this.createProductPayload(productData);
        this.details.messageType = "Product";
        await $$.promisify(webSkel.client.addProduct)(productData.productCode, this.details);
        if(productData.photo){
            this.createPhotoPayload(productData)
            this.details.messageType = "ProductPhoto";
            await $$.promisify(webSkel.client.addImage)(productData.productCode, this.details);
        }
        for(let epi of productData.epiUnits){
            await this.uploadLeafletFiles(epi);
            this.createLeafletPayload(epi, productData);
            this.details.messageType = epi.type;
            await $$.promisify(webSkel.client.addEPI)(productData.productCode, this.details);
        }
    }
    async updateProduct(productData, existingEpiUnits){
        this.createProductPayload(productData);
        this.details.messageType = "Product";
        await $$.promisify(webSkel.client.updateProduct)(productData.productCode, this.details);
        if(productData.photo){
            this.createPhotoPayload(productData)
            this.details.messageType = "ProductPhoto";
            await $$.promisify(webSkel.client.updateImage)(productData.productCode, this.details);
        }
        for(let epi of productData.epiUnits){
            if(epi.leafletFiles instanceof FileList && epi.type === "leaflet"){
                await this.uploadLeafletFiles(epi);
                this.createLeafletPayload(epi, productData);
                this.details.messageType = epi.type;
                if(existingEpiUnits.some(obj => obj.language === epi.language)){
                    await $$.promisify(webSkel.client.updateEPI)(productData.productCode, this.details);
                }else {
                    await $$.promisify(webSkel.client.addEPI)(productData.productCode, this.details);
                }
            }
            else {
                let language;
                if(existingEpiUnits.some(obj => {
                    language = obj.language;
                    return obj.language === epi.language && epi.action === "delete";
                })){
                    await $$.promisify(webSkel.client.deleteEPI)(productData.productCode, language);
                }
            }
        }
    }
    getMarketDiffViewObj(marketDiffObj) {
        let newValueCountry = "";
        if(marketDiffObj.newValue){
            newValueCountry = gtinResolver.Countries.getCountry(marketDiffObj.newValue.country);
        }
        let oldValueCountry = "";
        if(marketDiffObj.oldValue){
            oldValueCountry = gtinResolver.Countries.getCountry(marketDiffObj.oldValue.country);
        }

        let changedProperty = marketDiffObj.newValue ? `${newValueCountry}  Market` : `${oldValueCountry}  Market`
        return {
            "changedProperty": changedProperty,
            "oldValue": {"value": marketDiffObj.oldValue || "-", "directDisplay": !!!marketDiffObj.oldValue},
            "newValue": {
                "value": marketDiffObj.newValue && marketDiffObj.newValue.action !== "delete" ? marketDiffObj.newValue : "-",
                "directDisplay": !!!marketDiffObj.newValue || marketDiffObj.newValue.action === "delete"
            },
            "dataType": "market"
        }
    }

    getProductDiffs(initialProduct, updatedProduct) {
        let result = [];
        try {
            let { epiUnits, marketUnits, ...initialProductData } = initialProduct;
            let { epiUnits: updatedLeafletUnits, marketUnits: updatedMarketUnits, ...updatedProductData } = updatedProduct;
            let diffs = webSkel.appServices.getDiffsForAudit(initialProductData, updatedProductData);
            let epiDiffs = webSkel.appServices.getDiffsForAudit(initialProduct.epiUnits, updatedProduct.epiUnits);
            let marketDiffs = webSkel.appServices.getDiffsForAudit(initialProduct.marketUnits, updatedProduct.marketUnits);
            Object.keys(diffs).forEach(key => {
                if (key === "photo") {
                    result.push(webSkel.appServices.getPhotoDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.PRODUCT));
                    return;
                }
                result.push(webSkel.appServices.getPropertyDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.PRODUCT));
            });
            Object.keys(epiDiffs).forEach(key => {
                result.push(webSkel.appServices.getEpiDiffViewObj(epiDiffs[key]));
            });
            Object.keys(marketDiffs).forEach(key => {
                result.push(this.getMarketDiffViewObj(marketDiffs[key]));
            });

        } catch (e) {
            console.log(e);
        }
        return result;
    }
}
