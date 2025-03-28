// https://playwright.dev/docs/library
// https://playwright.dev/docs/best-practices
import { test, expect, chromium } from '@playwright/test';
const { getConfig } = require("../conf");
const { OAuth } = require("../clients/Oauth");

test.use({
    permissions: ['camera']
});




test.describe("LWA compatibility testing", () => {

    let browser;
    let context;
    let page;
    let home;
    let config = getConfig();
    const videoDatamatrix = `${process.cwd()}/tests/playwright/gtin_valid.y4m`;
    
    test.beforeAll(async() => {
        home = config['lwa_endpoint'];
        browser = await chromium.launch({
            args: [
              '--incognito',
              '--use-fake-device-for-media-stream',
              `--use-file-for-fake-video-capture=/${videoDatamatrix}`
            ]
          });
        context = await browser.newContext({
            permissions: ['camera'] 
        });
        page = await context.newPage();
        await context.grantPermissions(['camera']);

        // login when running in localhost
        // if(home.includes("localhost")) {
        //     const oauth = new OAuth(config);
        //     const token = await oauth.getAccessToken();
        //     oauth.setSharedToken(token);
        //     await page.setExtraHTTPHeaders({
        //         Authorization: `Bearer ${token}`,
        //     });
        // }
    })
    
    test.afterAll(async() => {
        if(browser)
            await browser.close();
    })
    
  
    test("Loads first page", async () => {
        await page.goto(home);
        await expect(page).toHaveTitle(/PharmaLedger/i);

        const agreeButton = page.locator("#agree-button");
        await expect(agreeButton).toBeVisible();
    })

    test("Accept terms", async () => {
        const agreeButton = page.locator("#agree-button");
        await expect(agreeButton).toBeVisible();

        await agreeButton.click();
        await expect(agreeButton).toBeHidden();

        const contentContainer = page.locator('.content-container');
        await expect(contentContainer).toBeVisible();
        
    }) 

    test("Scan Datamatrix", async () => {
        const scanButton = page.locator("#scan-button");
        await expect(scanButton).toBeVisible();
    
        await scanButton.click();
        await expect(page).toHaveURL(/scan/i);
    
        const scannerPlaceholder = page.locator("#scanner-placeholder");
        await expect(scannerPlaceholder).toBeVisible();
        
        await page.waitForTimeout(2000);

        await expect(page).toHaveURL(/leaflet/i);

    }) 
})