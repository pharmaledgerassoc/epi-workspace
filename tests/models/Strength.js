const {Model} = require("./Model");
/**
 * @description Represents the strength of a substance in a medicinal product.
 * @summary The Strength class encapsulates information about the strength of a specific substance
 * in a medicinal product, including the substance name, its strength value, and associated legal entity.
 * It extends the base Model class to inherit common functionality.
 *
 * @class
 * @extends Model
 *
 * @property {string} substance - @description The name of the substance.
 * @property {string|number} strength - @description The strength value of the substance.
 * @property {string} [legalEntityName] - @description The name of the legal entity associated with this strength.
 */
class Strength extends Model {
    substance = undefined;
    strength = undefined;
    legalEntityName = undefined;

    constructor(strength) {
        super(strength);
        Model.fromObject(this, strength);
    }
}

module.exports = {
    Strength
}