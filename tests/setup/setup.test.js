const {getAccessToken} = require("../oauth");
const {getSwaggerClient} = require("../swagger/swagger")
getSwaggerClient();

// const {setOpenDSU} = require("../config/jest-opendsu-client");
// const {getSwaggerClient} = require("../swagger")
// require("../browser");
// try {
//     require('../../../opendsu-sdk/builds/output/openDSU.js');
//     const opendsu = require("opendsu");
//     console.log("loaded OpenDSU SDK");
// } catch (e){
//     console.error("Failed to load OpenDSU SDK:", e);
//     process.exit(1);
// }

let client;

beforeAll(() => {
    // setOpenDSU()
    // client = getSwaggerClient()
})

describe("Initialization", () => {



    let oathToken;

    beforeEach(async () => {
        // console.log("Swagger client initialized. Available APIs:", client.apis);
        oathToken = await getAccessToken()
    })

    it("logs in to sso", async () => {
        console.log(client);
        expect(oathToken).toBeDefined();
    })
})