import constants from "../constants.js";

export class ProductsService {
    constructor() {

    }

    productInputFieldNames() {
        return [
            "productCode",
            "inventedName",
            "nameMedicinalProduct",
            "internalMaterialCode",
            "strength"/*,
            "patientLeafletInfo"*/
        ]
    }

    createNewProduct(product = {}, image = "", epiUnits = [], marketUnits = []) {
        let productObj = {};
        for (let key of this.productInputFieldNames()) {
            productObj[key] = product[key] || "";
        }
        productObj.photo = image;
        productObj.epiUnits = JSON.parse(JSON.stringify(epiUnits));
        productObj.marketUnits = JSON.parse(JSON.stringify(marketUnits));
        return productObj;
    }

    removeMarkedForDeletion(key, value) {
        if (key === "epiUnits" || key === "marketUnits") {
            return value.filter(unit => unit.action !== "delete");
        } else {
            return value;
        }
    }

    async getProductEPIs(productCode, epiType) {
        let epiLanguages = await $$.promisify(webSkel.client.listProductLangs)(productCode, epiType)
        let EPIs = [];
        if (epiLanguages && epiLanguages.length > 0) {
            for (let i = 0; i < epiLanguages.length; i++) {
                let epiPayload = await $$.promisify(webSkel.client.getProductEPIs)(productCode, epiLanguages[i], epiType);
                EPIs.push(webSkel.appServices.getEpiModelObject(epiPayload, epiLanguages[i], epiType));
            }
        }
        return EPIs
    }

    getProductPayload(productData) {
        let result = webSkel.appServices.initMessage(constants.API_MESSAGE_TYPES.PRODUCT);
        result.payload = {
            productCode: productData.productCode,
            internalMaterialCode: productData.internalMaterialCode,
            inventedName: productData.inventedName,
            nameMedicinalProduct: productData.nameMedicinalProduct,
            strength: productData.strength/*,
            patientLeafletInfo: productData.patientLeafletInfo*/
        };
        return result;
    }

    getPhotoPayload(productData) {
        const regex = /\/([^\/;]+);/;
        const match = productData.photo.match(regex);
        let imageType;
        if (match) {
            imageType = match[1];
        } else {
            imageType = "unknown";
        }
        let result = webSkel.appServices.initMessage(constants.API_MESSAGE_TYPES.PRODUCT_PHOTO);
        result.payload = {
            productCode: productData.productCode,
            imageId: webSkel.appServices.generateNumericID(12),
            imageType: "front",
            imageFormat: imageType,
            imageData: productData.photo
        };
        return result;
    }

    async getProductData(productCode) {
        let productPayload = await $$.promisify(webSkel.client.getProductMetadata)(productCode);
        delete productPayload.pk;
        delete productPayload.__version;
        delete productPayload.__timestamp;
        let productPhotoPayload = await $$.promisify(webSkel.client.getImage)(productCode);
        let leafletEPIs = await this.getProductEPIs(productCode, constants.API_MESSAGE_TYPES.EPI.LEAFLET);
        let smpcEPIs = await this.getProductEPIs(productCode, constants.API_MESSAGE_TYPES.EPI.SMPC);
        let EPIs = [...leafletEPIs, ...smpcEPIs];
        return {productPayload, productPhotoPayload, EPIs}
    }

    async addProduct(productData) {
        let productDetails = this.getProductPayload(productData);
        await $$.promisify(webSkel.client.addProduct)(productData.productCode, productDetails);
        if (productData.photo) {
            let photoDetails = this.getPhotoPayload(productData)
            await $$.promisify(webSkel.client.addImage)(productData.productCode, photoDetails);
        }
        for (let epi of productData.epiUnits) {
            let epiDetails = webSkel.appServices.getEPIPayload(epi, productData.productCode);
            await $$.promisify(webSkel.client.addProductEPI)(productData.productCode, epi.language, epi.type, epiDetails);
        }
    }

    async updateProduct(productData, existingEpiUnits) {
        let productDetails = this.getProductPayload(productData);
        if (productData.photo) {
            let photoDetails = this.getPhotoPayload(productData)
            await $$.promisify(webSkel.client.updateImage)(productData.productCode, photoDetails);
        }
        for (let epi of productData.epiUnits) {
            let epiDetails = webSkel.appServices.getEPIPayload(epi, productData.productCode);
            if (epi.action === constants.EPI_ACTIONS.ADD) {
                await $$.promisify(webSkel.client.addProductEPI)(productData.productCode, epi.language, epi.type, epiDetails);
            }
            if (epi.action === constants.EPI_ACTIONS.UPDATE) {
                await $$.promisify(webSkel.client.updateProductEPI)(productData.productCode, epi.language, epi.type, epiDetails);
            }
            if (epi.action === constants.EPI_ACTIONS.DELETE) {
                await $$.promisify(webSkel.client.deleteProductEPI)(productData.productCode, epi.language, epi.type);
            }
        }
        await $$.promisify(webSkel.client.updateProduct)(productData.productCode, productDetails);

    }

    getMarketDiffViewObj(marketDiffObj) {
        let newValueCountry = "";
        if (marketDiffObj.newValue) {
            newValueCountry = gtinResolver.Countries.getCountry(marketDiffObj.newValue.country);
        }
        let oldValueCountry = "";
        if (marketDiffObj.oldValue) {
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
            let {epiUnits, marketUnits, ...initialProductData} = initialProduct;
            let {
                epiUnits: updatedLeafletUnits,
                marketUnits: updatedMarketUnits,
                ...updatedProductData
            } = updatedProduct;
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

    async getProducts(number = undefined, query = undefined, sortDirection = "desc") {
        return await $$.promisify(webSkel.client.listProducts)( undefined, number, query, sortDirection);
    }
}
