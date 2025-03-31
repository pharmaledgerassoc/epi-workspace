const { Builder, By, Key, until, Capabilities } = require("selenium-webdriver");

describe("BStack demo test", () => {
  let browser;

  beforeAll(() => {
      const a = jest
      const v = expect;
      new Builder()
      .usingServer(`http://localhost:45454/wd/hub`)
      .withCapabilities(Capabilities.safari())
      // .setChromeOptions({
      //     "prefs": {
      //         "hardware.audio_capture_enabled": true,
      //         "hardware.video_capture_enabled": true,
      //         "hardware.audio_capture_allowed_urls": ["https://www.omegle.com"],
      //         "hardware.video_capture_allowed_urls": ["https://www.omegle.com"]
      //     }
      // })
      .build();
  });
  
  afterAll(async () => {
    await browser.quit();
  })


  describe("Browser compatibility", () => {

      it("Loads first page", async () => {
          await browser.get("https://lwa.preqa.pladevs.com");
          const a = jest;
          await browser.wait(until.titleMatches(/PharmaLedger/i), 10000);
      });
      //
      // it("Accepts terms and conditions", async () => {
      //     const agree = browser.findElement(By.id("agree-button"));
      //     await browser.get("https://lwa.preqa.pladevs.com");
      //     await agree.click();
      //     await browser.waitUntil(async () => await browser.getTitle() !== "",
      //         {
      //             timeout: 10000,
      //             timeoutMsg: "Page did not move from Terms and conditions to Main Page",
      //         }
      //     );
      //     expect(browser.getTitle()).toContain('PharmaLedger');
      //
      // });

  })

});
