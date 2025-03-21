const {Lock} = require("../gtin-resolver/lib/utils/Lock.js")

const GTIN_LENGTH = 13
const GTIN_LOCK = "gtin-counter.lock"
const externalVolume = "apihub-root/external-volume"
const fs = require("fs")
const path = require("path")

/**
 * Generates a Global Trade Item Number (GTIN) with an optional base number.
 * 
 * @description This function creates a GTIN by either generating random digits or using a provided base number.
 * It then calculates and appends a check digit to ensure the GTIN's validity.
 * 
 * @param {string|number} [baseNumber] - An optional base number to start the GTIN generation.
 *                                       If provided, it will be used as the beginning of the GTIN.
 *                                       If not provided, the function will generate random digits for the entire GTIN.
 * 
 * @returns {string} A valid 14-digit GTIN string, including the check digit.
 */
function generateGTIN(baseNumber) {
    const gtinDigits = [];
    if (!baseNumber){
        for (let i = 0; i < GTIN_LENGTH; i++) {
            gtinDigits.push(Math.floor(Math.random() * 10))
        }
    } else {
        baseNumber = typeof baseNumber === 'number'? baseNumber.toString() : baseNumber;
        for (let i = 0; i < GTIN_LENGTH; i++) {
            const diff = GTIN_LENGTH - i - baseNumber.length - 1;
            if (diff > 0){
                gtinDigits.push(0);
                continue;
            }
            gtinDigits.push(Math.floor(Math.random() * 10))
        }
    }

    const gtinMultiplicationArray = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];


    let j = gtinMultiplicationArray.length - 1;
    let reszultSum = 0;
    for (let i = gtinDigits.length - 1; i >= 0; i--) {
        reszultSum = reszultSum + gtinDigits[i] * gtinMultiplicationArray[j];
        j--;
    }
    let validDigit = Math.floor((reszultSum + 10) / 10) * 10 - reszultSum;
    if (validDigit === 10) {
        validDigit = 0;
    }

    gtinDigits.push(validDigit);

    return gtinDigits.join('');
}

/**
 * @description A class for generating unique GTIN numbers.
 * @summary This class provides functionality to generate unique GTIN (Global Trade Item Number) values.
 * It supports persistence of the last generated GTIN and uses a locking mechanism to ensure thread-safe generation.
 * 
 * @class
 * @param {boolean} [persistence=false] - Whether to persist the last generated GTIN.
 * 
 * @property {number|undefined} _last - The last generated GTIN number.
 * @property {Lock} _lock - A lock object to ensure thread-safe operations.
 * @property {boolean} persistence - Indicates whether persistence is enabled.
 * 
 */
class GTINGenerator {

    _last;

    _lock = new Lock();

    /**
     * @description Creates a new GTINGenerator instance.
     * @summary Initializes a new GTINGenerator with optional persistence.
     * 
     * @param {boolean} [persistence=false] - Whether to persist the last generated GTIN.
     */
    constructor(persistence = false) {
        this.persistence = persistence;
        this._reload();
    }

    /**
     * @description Reloads the last GTIN from persistent storage if enabled.
     * @summary Attempts to read the last GTIN from a file if persistence is enabled.
     */
    _reload(){
        if (this.persistence){
            try {
                this._last = parseInt(fs.readFileSync(path.join(externalVolume, GTIN_LOCK), "utf8")) || 0;
            } catch (e){
                console.debug("Could not load last GTIN from file: " + e.message);
            }
        }
    }

    /**
     * @description Persists the given GTIN to storage.
     * @summary Writes the provided GTIN to a file for persistence.
     * 
     * @param {string} gtin - The GTIN to persist.
     */
    _persist(gtin){
        fs.writeFileSync(path.join(externalVolume, GTIN_LOCK), gtin)
    }

    /**
     * @description Generates the next unique GTIN.
     * @summary Generates a new GTIN, updates the last generated value, and persists if enabled.
     * 
     * @returns {Promise<string>} A promise that resolves to the next unique GTIN.
     * 
     * @mermaid
     * sequenceDiagram
     *   participant N as next
     *   participant L as _lock
     *   participant G as generateGTIN
     *   participant P as _persist
     *   N->>L: Acquire lock
     *   N->>N: Increment _last
     *   N->>G: Generate GTIN
     *   G-->>N: Return GTIN
     *   alt persistence is true
     *     N->>P: Persist GTIN
     *   end
     *   N->>L: Release lock
     *   N-->>N: Return GTIN
     */
    async next(){
        await this._lock.acquire();
        const base = typeof this._last === 'undefined'? 0 : ++this._last;
        const gtin = generateGTIN(base);
        if (this.persistence){
            this._persist(gtin)
        }
        this._lock.release()
        return gtin;
    }
}

module.exports = {
    generateGTIN,
    GTINGenerator
};