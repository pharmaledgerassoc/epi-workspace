const {getAccessToken} = require("../oauth");
// const {setOpenDSU} = require("../config/jest-opendsu-client");

beforeAll(() => {
    // setOpenDSU()
})

describe("Initialization", () => {

    let oathToken;

    beforeEach(async () => {
        oathToken = await getAccessToken()
    })

    it("logs in to sso", async () => {

    })
})