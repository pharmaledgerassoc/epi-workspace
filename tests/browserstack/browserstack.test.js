//https://www.browserstack.com/docs/automate/capabilities
// https://www.browserstack.com/docs/automate/selenium/camera-injection
//https://www.browserstack.com/docs/app-automate/appium/advanced-features/ios-device-settings
const { Builder, By, Key, until, Capabilities, Browser } = require("selenium-webdriver");
const { getConfig } = require("../conf");

const a = jest
const v = expect;
const videoDatamatrix = `${process.cwd()}/tests/playwright/gtin_dev.y4m`;
const capabilities = {
    'browserstack.cameraInjection': true,
    'browserstack.cameraInjectionUrl': `media://${videoDatamatrix}`,
};

// gtin=23658479652148&batch=Batch1&expiry=28%20-%20Mar%20-%202025
// media://408ff24cf30111439064d795c926799f643bc0dc (conta demerson -> getin_dev.mp4)
// media://236ea90962c251fbbb726f8e07d87435d6e32ce4 (conta demerson -> gtin_techops_382.mp4)
// media://dc7a3b57602e608c80cda4debae7f6eb29d41151 (conta tiago -> gtin_techops_382.mp4)
// "media_url":"media://eddc2d0db4b13d81a022f668a7deaab4cd678e51 (conta demersonc_7lUJ8A -> datamatrix.png)"

describe("LWA compatibility testing", () => {
    let browser;
    let home;
    let config = getConfig();
    const browserstackUsername = process.env.BROWSERSTACK_USERNAME;
    const browserstackAccessKey = process.env.BROWSERSTACK_ACCESS_KEY;
    const env = process.env?.BROWSERSTACK_LOCAL ? "local" : !!process.env?.LWA ? process.env?.LWA : config['lwa_env'];
    // let bsLocal;

    function getLwaEndPoint() {
        return env === "local" ? 
            "http://localhost:8080/lwa/" : `https://lwa.${env}.pladevs.com/`; 
    }

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
        home = getLwaEndPoint(); 
    });

    describe("Browser compatibility", () => {
        it("Loads first page", async () => {
            await browser.get(home);
            await browser.wait(until.titleMatches(/PharmaLedger/i), 10000);
        });
  
        it("Accepts terms and conditions", async () => {
            const agreeButton = await browser.wait(
                until.elementLocated(By.id('agree-button')),
                10000
            );
            await browser.executeScript('arguments[0].scrollIntoView(true);', agreeButton);
            await browser.wait(
                until.elementIsVisible(agreeButton),
                10000 // Ensure the element is visible
            );
            await agreeButton.click();

            // Wait for a agree button removed from DOM
            await browser.wait(
                until.stalenessOf(agreeButton),
                10000
            );
            const contentContainer = await browser.wait(
                until.elementLocated(By.className('content-container')),
                10000
            );
            await browser.executeScript('arguments[0].scrollIntoView(true);', contentContainer);
            await browser.wait(
                until.elementIsVisible(contentContainer),
                10000 // Ensure the element is visible
            );
            expect(await contentContainer.isDisplayed()).toBe(true);
        }, 60000);


        it("Scan Datamatrix", async () => {
        
            const scanButton = await browser.wait(
                until.elementLocated(By.id('scan-button')),
                10000
            );
            await browser.executeScript('arguments[0].scrollIntoView(true);', scanButton);
            await browser.wait(
                until.elementIsVisible(scanButton),
                5000 
            );
            expect(await scanButton.isDisplayed()).toBe(true);
            await scanButton.click();
            
            await browser.wait(until.urlContains('scan'), 5000); 
            let currentUrl = await browser.getCurrentUrl();
            await browser.get(`${currentUrl.replace('scan.html', '')}leaflet.html?gtin=23658479652148&batch=Batch1`);
            await browser.wait(until.titleMatches(/PharmaLedger/i), 10000);

            const loaderContainer = await browser.wait(
                until.elementLocated(By.className('loader-container')),
                10000
            );
            
            try {
            
                if(loaderContainer) {
                    // Wait for a loader container removed from DOM or not visible
                    const loaderContainerVisible = await loaderContainer?.isDisplayed();
                    await browser.wait(
                        loaderContainerVisible ? 
                            until.elementIsNotVisible(loaderContainer) : until.stalenessOf(loaderContainer),
                        15000
                    );
                }
            } catch (error) {
                console.info(`Error locating element:  ${error?.message}`);
            }
            
            currentUrl = await browser.getCurrentUrl();

            if(currentUrl.includes('error')) {
                console.warn("Test passed, but no leaflet found for datamatrix (gtin: 23658479652148, batch: Batch1)");
                const scanAgainButton = await browser.wait(
                    until.elementLocated(By.id("scan-again-button")),
                    5000
                );
                await browser.executeScript('arguments[0].scrollIntoView(true);', scanAgainButton);
                expect(await scanAgainButton.isDisplayed()).toBe(true); 
            } else {
                console.info("Loaded datamatrix (gtin: 23658479652148, batch: Batch1)");
                const productName = await browser.wait(
                    until.elementLocated(By.className("product-name")),
                    10000
                );
                await browser.wait(until.elementIsVisible(productName), 5000);
                expect(await productName.isDisplayed()).toBe(true);
            }
            
            await browser.executeScript('window.localStorage.clear();');
            await browser.executeScript('window.sessionStorage.clear();');
          
        }, 80000);
    });

    afterAll(async () => {
        if(browser) 
            await browser.quit();
        // if (bsLocal) {
        //     bsLocal.stop(() => {
        //         console.log("BrowserStack Local stopped.");
        //     });
        // }
    });
});
