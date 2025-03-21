const GTIN_LENGTH = 13

/**
 *
 * @param {string | number} [baseNumber]
 * @returns {string}
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

module.exports = {
    generateGTIN
};