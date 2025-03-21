const {getAccessToken} = require("../oauth");
// const {setOpenDSU} = require("../config/jest-opendsu-client");
const {getSwaggerClient} = require("../swagger")


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