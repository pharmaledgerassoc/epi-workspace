const {generateGTIN} = require("../gtinUtils");

describe("gtin-utils", () => {
    it("randomly generates gtins", () => {
        const gtin = generateGTIN();
        expect(gtin).toHaveLength(14);
        expect(typeof gtin).toBe("string");
    });

    const paddings = [1,2,3,4,5,6,7,8,9,10,11,12,13];
    paddings.forEach(baseNumber => {
        it(`generates gtins from ${baseNumber} length numbers`, () => {
            const arr = new Array(baseNumber)
            arr.fill(1);
            const gtin = generateGTIN(arr.join(""));
            expect(gtin).toHaveLength(14);
        })
    })

    it.skip("enumerates all possible gtins", () => {
        const possibleGtins = 10**14;
        const limit = parseInt(new Array(13).fill(9).join(''));
        const start = Date.now();

        const gtins = []
        for(let i = 0; i <= limit; i++) {
            const gtin = generateGTIN(i);
            gtins.push(gtin);
        }
        const end = Date.now();

        console.log(`Generated ${gtins.length}out of ${10**14} gtins in ${end - start} milliseconds`);
    })

})