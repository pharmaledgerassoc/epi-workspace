export class EPIsService {
    constructor() {
    }

    async addOrUpdateEPI (epi, gtin, batchId) {
        let details = webSkel.appServices.getEPIPayload(epi, gtin, batchId);
        await $$.promisify(webSkel.client.addEPI)(gtin, batchId, details);
    }
}
