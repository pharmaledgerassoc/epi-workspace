const {Product} = require("./Product");
const {getConfig} = require("../conf");
const {GtinGenerator} = require("../gtinUtils");


class ModelFactory {
    _gtinGenerator = new GtinGenerator(getConfig().gtin_persistence);
    _cachedProducts = {};

    product(props, test){
        const p = new Product(Object.assign({}, {
            productCode: this._gtinGenerator.next(),
            inventedName: `Test Product ${test}`,
            nameMedicinalProduct: `Test Product ${test} - extra info`
        }, props || {}));
        this._cachedProducts[p.productCode] = p;
        return p;
    }
}

module.exports = {
    ModelFactory: new ModelFactory()
};