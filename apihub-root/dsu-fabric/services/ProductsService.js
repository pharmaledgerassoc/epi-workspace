export class ProductsService{
    constructor() {
    }

    async addProduct(productData, photo, leafletsData, marketsData){
        const details = {
            messageType: "",
            messageTypeVersion: 1,
            senderId: "ManualUpload",
            receiverId: "QPNVS",
            messageId: "S000001",
            messageDateTime: "2023-01-11T09:10:01CET"
        }
        details.payload = {
            productCode: productData.data.productCode,
            internalMaterialCode: productData.data.materialCode,
            inventedName: productData.data.brandName,
            nameMedicinalProduct: productData.data.medicinalName,
            strength: productData.data.strength
        };
        details.messageType = "Product";
        await $$.promisify(webSkel.client.addProduct)(productData.data.productCode, details);
        if(productData.photo){
            details.payload = {
                productCode: productData.data.productCode,
                imageId: webSkel.servicesRegistry.UtilsService.generateNumericID(12),
                imageType: "front",
                imageFormat: productData.photo.files[0].type,
                imageData: photo
            };
            details.messageType = "ProductPhoto";
            await $$.promisify(webSkel.client.addProductImage)(productData.data.productCode, details);
        }
        for(let leaflet of leafletsData){
            details.payload = {
                productCode: productData.data.productCode,
                language: gtinResolver.Languages.getLanguageCode(leaflet.data.language),
                xmlFileContent: leaflet.data.leaflet.files
            };
            details.messageType = "leaflet";
            await $$.promisify(webSkel.client.addEPI)(productData.data.productCode, details);
        }
        // for (let market of marketsData){
        //
        // }
    }
}