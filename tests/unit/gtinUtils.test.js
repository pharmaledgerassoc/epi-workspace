const {generateGTIN, GTIN_LOCK, GTINGenerator} = require("../gtinUtils");
const {Reporter} = require("../reporting");

describe("gtin-utils", () => {
    it.only("randomly generates gtins", async () => {
        const gtin = generateGTIN();
        expect(gtin).toHaveLength(14);
        expect(typeof gtin).toBe("string");
        await new Reporter("gtin-utils").outputPayload("", "generated gtin", gtin, "text")
    });

    const paddings = [1,2,3,4,5,6,7,8,9,10,11,12,13];
    paddings.forEach(baseNumber => {
        it(`generates gtins from ${baseNumber} length numbers`, () => {
            const arr = new Array(baseNumber)
            arr.fill(0)
            arr[0] = 1; // First digit is always 1 to make it powers of 10
            const gtin = generateGTIN(arr.join(""));
            expect(gtin).toHaveLength(14);
            console.log(`Generated gtin: ${gtin} from base number: ${baseNumber}`);
        })
    })

    const sequenceTest = 10000

    it(`generates ${sequenceTest} valid GTINS sequentially`, async() => {
        require('fs').rmSync(require("path").join(process.cwd(), GTIN_LOCK), { force: true });
        const generator = new GTINGenerator(true);
        const testScope = Object.keys(new Array(sequenceTest).fill(0))
        let padded;
        let gtin;
        for(let i of testScope){
            if (i === "0") continue; // no gtin with all zeros
            padded = i.padStart(13, "0");
            gtin = await generator.next();
            expect(gtin.slice(0, padded.length)).toEqual(padded)
        }
    })

    it.skip("enumerates all possible gtins", () => {
        const possibleGtins = 10**14;
        const limit = parseInt(new Array(13).fill(9).join(''));
        const start = Date.now();

        let counter = 10;
        let elapsed;
        const gtins = []
        for(let i = 0; i <= limit; i++) {
            if (i % counter === 0){
                elapsed = Date.now();
                console.log(`Generating ${counter}th out of ${possibleGtins} in ${elapsed - start} milliseconds`);
                counter = counter * 10;
            }
            const gtin = generateGTIN(i);
            console.log(gtin)
            gtins.push(gtin);
        }
        const end = Date.now();

        console.log(`Generated ${gtins.length}out of ${possibleGtins} gtins in ${end - start} milliseconds`);
    })

})