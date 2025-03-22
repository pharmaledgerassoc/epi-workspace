const {Product} = require("./Product");
const {getConfig} = require("../conf");
const {GTINGenerator} = require("../gtinUtils");

/**
 * @description Factory for creating model instances.
 * @summary This class provides methods to create and manage product models for testing purposes.
 * It uses a GTIN generator to create unique product codes and caches created products.
 *
 * @class
 * @param {boolean} gtin_persistence - Whether to persist GTIN numbers between runs.
 *
 * @property {GTINGenerator} _gtinGenerator - @description GTIN generator instance for creating unique product codes.
 * @property {Object} _cachedProducts - @description Cache of created products, indexed by their product codes.
 */
class ModelFactory {
    _gtinGenerator = new GTINGenerator(getConfig().gtin_persistence);
    _cachedProducts = {};

    /**
     * @description Creates a new product instance.
     * @summary Generates a new Product instance with a unique product code and default values.
     * The created product is cached for future reference.
     *
     * @param {string} test - The test identifier to be used in the product name.
     * @param {Object} [props] - Additional properties to be assigned to the product.
     * @returns {Product} A new Product instance.
     *
     * @mermaid
     * sequenceDiagram
     *   participant MF as ModelFactory
     *   participant GTIN as GTINGenerator
     *   participant P as Product
     *   MF->>GTIN: next()
     *   GTIN-->>MF: productCode
     *   MF->>P: new Product(...)
     *   P-->>MF: product instance
     *   MF->>MF: Cache product
     *   MF-->>MF: Return product
     */
    async product(test, props){
        const p = new Product(Object.assign({}, {
            productCode: await this._gtinGenerator.next(),
            inventedName: `Test Product ${test}`,
            nameMedicinalProduct: `Test Product ${test} - extra info`
        }, props || {}));
        this._cachedProducts[p.productCode] = p;
        console.log(`generated product: ${p.productCode} for test ${test}`);
        return p;
    }
}

module.exports = {
    ModelFactory: new ModelFactory()
};