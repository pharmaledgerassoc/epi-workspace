//https://www.browserstack.com/docs/automate/capabilities
// https://www.browserstack.com/docs/automate/selenium/camera-injection
const { Builder, By, Key, until, Capabilities, Browser } = require("selenium-webdriver");
const { getConfig } = require("../conf");

const a = jest
const v = expect;
const videoDatamatrix = `${process.cwd()}/tests/playwright/gtin_dev.y4m`;
const capabilities = {
    'browserstack.cameraInjection': true,
    'browserstack.cameraInjectionUrl': `media://${videoDatamatrix}`,
};

// gtin=12458796325688&batch=Batch1&expiry=28%20-%20Mar%20-%202025
// media://408ff24cf30111439064d795c926799f643bc0dc (conta demerson -> getin_dev.mp4)
// media://236ea90962c251fbbb726f8e07d87435d6e32ce4 (conta demerson -> gtin_techops_382.mp4)
// media://dc7a3b57602e608c80cda4debae7f6eb29d41151 (conta tiago -> gtin_techops_382.mp4)

describe("LWA compatibility testing", () => {
    let browser;
    let home;
    let config = getConfig();
    const browserstackUsername = process.env.BROWSERSTACK_USERNAME;
    const browserstackAccessKey = process.env.BROWSERSTACK_ACCESS_KEY;
    const env = "dev";
    // let bsLocal;

    async function getBrowser(osName) {
        if (["ios", "mac"].some(platform => osName.toLowerCase().includes(platform))) {
            return await new Builder()
                .forBrowser(Browser.SAFARI)
                .setSafariOptions()
                .withCapabilities()
                .build();
          
        }
        const Chrome = require("selenium-webdriver/chrome");
        const options = new Chrome.Options();
        return await new Builder()
            .forBrowser(Browser.CHROME)
            .setChromeOptions(
                options.addArguments(),
            )
            .build();
       
    }

    function getBrowserStackServerUrl() {
        if(browserstackUsername && browserstackAccessKey)
            return `https://${browserstackUsername}:${browserstackAccessKey}@hub-cloud.browserstack.com/wd/hub`
        return "http://localhost:45454";
    }

    // async function checkBrowserStackLocal() {

    //     // Iniciar o BrowserStack Local
    //     bsLocal = new browserstack.Local();
    //     bsLocal.start(browserstackLocalOptions, (error) => {
    //         if (error) {
    //             console.error("Error starting BrowserStack Local:", error);
    //         } else {
    //             console.log("BrowserStack Local started successfully!");
    //         }
    //     });

    //     // Garantir que o BrowserStack Local foi iniciado
    //     while (!bsLocal.isRunning()) {
    //         await new Promise((r) => setTimeout(r, 1000));
    //     }

    // }

    beforeAll(async () => {
        const osName = process.env.OS_NAME || process.platform  || "Windows"; // Dynamically set the OS via environment variable
        browser = await getBrowser(osName);
        home = env === "local" ? config['lwa_endpoint'] : `https://lwa.${env}.pladevs.com/`; 
    });

    describe("Browser compatibility", () => {
        it("Loads first page", async () => {
            await browser.get(home);
            await browser.wait(until.titleMatches(/PharmaLedger/i), 10000);

            home = await browser.getCurrentUrl();
        });
    });

    it("Accepts terms and conditions", async () => {
        await browser.get(home);
        await browser.wait(until.titleMatches(/PharmaLedger/i), 5000);

        const agreeButton = browser.findElement(By.id("agree-button"));
        await agreeButton.click();

        // Wait for a content container to be present after the reload
        await browser.wait(until.elementLocated(By.className('content-container')), 5000);

        const contentContainer = browser.findElement(By.className("content-container"));
        await browser.wait(until.elementIsVisible(contentContainer), 1000);
        const isDisplayed = await contentContainer.isDisplayed();
        expect(isDisplayed).toBe(true);
    }, 20000);

    it("Scan Datamatrix", async () => {
        const scanButton = browser.findElement(By.id("scan-button"));
        await browser.wait(until.elementIsVisible(scanButton), 2000);
        expect(await scanButton.isDisplayed()).toBe(true);
        await scanButton.click();
        await browser.wait(until.urlContains('scan'), 5000); // Replace 'specific_string' with your desired substring and set a 10-second timeout
        
        // works with mocked camera
        // const scannerPlaceholder = browser.findElement(By.id("scanner-placeholder"));
        // await browser.wait(until.elementIsVisible(scannerPlaceholder), 2000);
        // expect(await scannerPlaceholder.isDisplayed()).toBe(true);
        
        await browser.get(`${home.replace('main.html', '')}/leaflet.html?gtin=12458796325688&batch=Batch1`);
        await browser.wait(until.urlContains('leaflet'), 3000);  
      
        const productName = browser.findElement(By.className("product-name"));
        await browser.wait(until.elementIsVisible(productName), 10000);
        expect(await productName.isDisplayed()).toBe(true);
       
    }, 20000) 

    afterAll(async () => {
        if (browser) 
            await browser.quit();

        // if (bsLocal) {
        //     bsLocal.stop(() => {
        //         console.log("BrowserStack Local stopped.");
        //     });
        // }
    });
});
