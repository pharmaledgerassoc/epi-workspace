export class EPIsService{
    constructor(){}
    createEPIPayload(epi, gtin){
        return {
            productCode: gtin,
            language: epi.language,
            xmlFileContent: epi.xmlFileContent,
            otherFilesContent: epi.otherFilesContent
        };
    }
    async addEPI(epi,gtin,details,batchId){
        details.payload=this.createEPIPayload(epi,gtin);
        details.messageType = epi.type;
        await $$.promisify(webSkel.client.addEPI)(gtin,batchId,details);
    }
}