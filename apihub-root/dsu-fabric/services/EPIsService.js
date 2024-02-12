export class EPIsService{
    constructor(){}
    createEPIPayload(epi, productData){
        return {
            productCode: productData.productCode,
            language: epi.language,
            xmlFileContent: epi.xmlFileContent,
            otherFilesContent: epi.otherFilesContent
        };
    }
    async addEPI(epi,productData,details){
        details.payload=this.createEPIPayload(epi,productData);
        details.messageType = epi.type;
        await $$.promisify(webSkel.client.addEPI)(productData.productCode, details);
    }
}