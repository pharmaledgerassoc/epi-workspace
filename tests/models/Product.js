const {Model} = require("./Model");
const {Strength} = require("./Strength");
const {Market} = require("./Market");

/**
 * Represents a product in the system.
 * @extends Model
 * @class
 * @property {string} productCode - The unique identifier for the product.
 * @property {string} [internalMaterialCode] - The internal material code for the product.
 * @property {string} inventedName - The invented name of the product.
 * @property {string} nameMedicinalProduct - The medicinal name of the product.
 * @property {boolean} [productRecall] - Indicates if the product is under recall.
 * @property {boolean} [flagEnableAdverseEventReporting] - Indicates if adverse event reporting is enabled for the product.
 * @property {string} [adverseEventReportingURL] - The URL for reporting adverse events related to the product.
 * @property {boolean} [flagEnableACFProductCheck] - Indicates if ACF product check is enabled for the product.
 * @property {string} [acfProductCheckURL] - The URL for ACF product check.
 * @property {string} [patientSpecificLeaflet] - Information specific to patient leaflet.
 * @property {string} [healthcarePractitionerInfo] - Information for healthcare practitioners.
 * @property {Strength[]} [strengths] - The strengths of the product.
 * @property {Market[]} [markets] - The markets where the product is available.
 */
class Product extends Model {
    
    productCode = undefined; 
    internalMaterialCode = undefined;
    inventedName = undefined;
    nameMedicinalProduct = undefined;
    productRecall = undefined;
    flagEnableAdverseEventReporting = undefined;
    adverseEventReportingURL = undefined;
    flagEnableACFProductCheck = undefined;
    acfProductCheckURL = undefined;
    patientSpecificLeaflet = undefined;
    healthcarePractitionerInfo = undefined;
    strengths = undefined;
    markets = undefined;

    constructor(product) {
       super(product);
       if (this.strengths && this.strengths.length) {
           this.strengths = this.strengths.map(strength => new Strength(strength));
       }
       if (this.markets && this.markets.length) {
           this.markets = this.markets.map(market => new Market(market));
       }
    }
}

module.exports = {
    Product
}