const { getConfig } = require("../conf");
const { OAuth } = require("../clients/Oauth");

describe("Initialization", () => {

    let config = getConfig();
    let oauth;

    beforeAll(async () => {
        oauth = new OAuth(config);
        const token = await oauth.getAccessToken();
        oauth.setSharedToken(token);
    })


    it("logs in to sso", async () => {
        expect(oauth.getToken()).toBeDefined();
    })
})