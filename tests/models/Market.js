const {Model} = require("./Model.js");

/**
 * @description Represents a market entity in the system.
 * @summary The Market class encapsulates information about a specific market,
 * including its identifier, national code, MAH details, and legal entity information.
 * It extends the base Model class to inherit common functionality.
 *
 * @class
 * @extends Model
 *
 * @property {string} marketId - @description Unique identifier for the market.
 * @property {string} [nationalCode] - @description National code associated with the market.
 * @property {string} [mahName] - @description Name of the Marketing Authorization Holder (MAH).
 * @property {string} [legalEntityName] - @description Name of the legal entity associated with the market.
 * @property {string} [mahAddress] - @description Address of the Marketing Authorization Holder.
 *
 */
class Market extends Model {
    marketId = undefined;
    nationalCode = undefined;
    mahName = undefined;
    legalEntityName = undefined;
    mahAddress = undefined;
    constructor(market) {
        super(market);
        Model.fromObject(this, market);
    }

}

module.exports = {
    Market
}