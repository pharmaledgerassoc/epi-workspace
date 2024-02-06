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
            imageId: webSkel.servicesRegistry.UtilsService.generateNumericID(12),
            imageType: "front",
            imageFormat: imageType,
            imageData: productData.photo
        };
    }
    createEPIPayload(epi, productData){
        this.details.payload = {
            productCode: productData.productCode,
            language: epi.language,
            xmlFileContent: epi.xmlFileContent,
            otherFilesContent: epi.otherFilesContent
        };
    }
    async addProduct(productData){
        this.createProductPayload(productData);
        this.details.messageType = "Product";
        await $$.promisify(webSkel.client.addProduct)(productData.productCode, this.details);
        if(productData.photo){
            this.createPhotoPayload(productData)
            this.details.messageType = "ProductPhoto";
            await $$.promisify(webSkel.client.addProductImage)(productData.productCode, this.details);
        }
        for(let epi of productData.epiUnits){
            this.createEPIPayload(epi, productData);
            this.details.messageType = "leaflet";
            await $$.promisify(webSkel.client.addEPI)(productData.productCode, this.details);
        }
    }
    async updateProduct(productData, existingUnits){
        this.createProductPayload(productData);
        this.details.messageType = "Product";
        await $$.promisify(webSkel.client.updateProduct)(productData.productCode, this.details);
        if(productData.photo){
            this.createPhotoPayload(productData)
            this.details.messageType = "ProductPhoto";
            await $$.promisify(webSkel.client.updateProductImage)(productData.productCode, this.details);
        }
        for(let epi of productData.epiUnits){
            this.createEPIPayload(epi, productData);
            this.details.messageType = "leaflet";
            await $$.promisify(webSkel.client.addEPI)(productData.productCode, this.details);
        }
    }
}
