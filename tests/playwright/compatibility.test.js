// https://playwright.dev/docs/library
// https://playwright.dev/docs/best-practices
// gtin=12458796325688&batch=Batch1&expiry=28%20-%20Mar%20-%202025
import { test, expect, chromium } from '@playwright/test';
const { getConfig } = require("../conf");
const { OAuth } = require("../clients/Oauth");


test.use({
    permissions: ['camera'],
    launchOptions: {
        args: [
            // '--incognito',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-video-capture=/${process.cwd()}/tests/playwright/gtin_dev.3gp`
        ]
    }  
});

test.describe("LWA compatibility testing", () => {

    let page;
    let context;
    let home;
    let config = getConfig();
    
    test.beforeAll(async({browser}) => {
        home = "https://lwa.dev.pladevs.com/"; //config['lwa_endpoint'];
        context = await browser.newContext({
            permissions: ['camera'] 
        });
        page = await context.newPage();

        // browser = await chromium.launch({
        //     args: [
        //       '--incognito',
        //       '--use-fake-device-for-media-stream',
        //       `--use-file-for-fake-video-capture=/${videoDatamatrix}`
        //     ]
        //   });
        // context = await browser.newContext({
        //     permissions: ['camera'] 
        // });
        // page = await context.newPage();
        // await context.grantPermissions(['camera']);

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
    
    test.afterAll(async({browser}) => {
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
    
        await expect(page).toHaveURL(/leaflet/i);
        console.log(`Test Awaiting for 10 seconds for request response...`);
        await page.waitForTimeout(10000);

        // if (page.url().includes('error'))
        //     throw new Error('Error on scan datamatrix');

    }) 
})