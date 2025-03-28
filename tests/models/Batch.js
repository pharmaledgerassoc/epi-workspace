const {Model} = require("./Model");

/**
 * Represents a batch in the system.
 * @extends Model
 * @class
 * @property {string} productCode - The unique identifier for the product.
 * @property {string} batchNumber - The batch/lot number.
 // * @property {string} epiProtocol - The EPI protocol version.
 // * @property {string} lockId - Unique lock identifier.
 * @property {string} expiryDate - The expiration date in DDMMYY format.
 * @property {string} [importLicenseNumber] - Import license number for the batch.
 * @property {string} [dateOfManufacturing] - Manufacturing date of the batch.
 * @property {string} [manufacturerName] - Name of the manufacturer.
 * @property {string} [manufacturerAddress1] - 1st manufacturer address line.
 * @property {string} [manufacturerAddress2] - 2nd manufacturer address line.
 * @property {string} [manufacturerAddress3] - 3rd manufacturer address line.
 * @property {string} [manufacturerAddress4] - 4th manufacturer address line.
 * @property {string} [manufacturerAddress5] - 5th manufacturer address line.
 * @property {boolean} [batchRecall] - Indicates if the batch is under recall.
 * @property {string} [packagingSiteName] - Name of the packaging site.
 * @property {boolean} [flagEnableEXPVerification=false] - Enables expiration date verification.
 * @property {boolean} [flagEnableExpiredEXPCheck=false] - Enables expired product check.
 * @property {string} [batchMessage] - Message related to the batch.
 * @property {boolean} [flagEnableBatchRecallMessage=false] - Enables batch recall messages.
 * @property {string} [recallMessage] - Recall message content.
 * @property {boolean} [flagEnableACFBatchCheck=false] - Enables ACF batch checking.
 * @property {string} [acfBatchCheckURL] - URL for ACF batch verification.
 * @property {boolean} [flagEnableSNVerification=false] - Enables serial number verification.
 * @property {string} [acdcAuthFeatureSSI] - ACDC authentication feature SSI.
 * @property {boolean} [snValidReset=false] - Resets serial number validation status.
 * @property {string[]} [snValid] - Array of valid serial numbers.
 // * @property {number} [version=1] - Data version number.
 */
class Batch extends Model {
    productCode = "";
    batchNumber = "";
    // epiProtocol = "";
    // lockId = "";
    expiryDate = "";
    // inventedName = "";
    // nameMedicinalProduct = "";
    // importLicenseNumber = "";
    dateOfManufacturing = "";
    manufacturerName = "";
    manufacturerAddress1 = "";
    manufacturerAddress2 = "";
    manufacturerAddress3 = "";
    manufacturerAddress4 = "";
    manufacturerAddress5 = "";
    batchRecall = false;
    packagingSiteName = "";
    // version = 1;

    constructor(batch) {
        super();
        Model.fromObject(this, batch);
    }
}

module.exports = {
    Batch
}