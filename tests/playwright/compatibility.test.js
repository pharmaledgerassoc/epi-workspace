// https://playwright.dev/docs/library
// https://playwright.dev/docs/best-practices
import { test, expect, chromium } from '@playwright/test';

test.use({
    permissions: ['camera']
});

let browser;
let context;
let page;
let home = "http://localhost:8080/lwa";


test.describe("LWA compatibility testing", () => {
    
    test.beforeAll(async() => {
        const path = `${process.cwd()}/tests/playwright/gtin_datamatrix.y4m`;
        browser = await chromium.launch({
            args: [
              '--use-fake-device-for-media-stream',
              `--use-file-for-fake-video-capture=/${path}`
            ]
          });
        context = await browser.newContext({
            permissions: ['camera'] 
        });
        page = await context.newPage();
        await context.grantPermissions(['camera']);
     
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

    test("Trigger Scanner", async () => {
        const scanButton = page.locator("#scan-button");
        await expect(scanButton).toBeVisible();
    
        await scanButton.click();
        await expect(page).toHaveURL(/scan/i);
    
        const scannerPlaceholder = page.locator("#scanner-placeholder");
        await expect(scannerPlaceholder).toBeVisible();
    
        // await page.evaluate(() => {});
    
        // Aguarda tempo suficiente para execução do intervalo
        await page.waitForTimeout(500);

        await expect(page).toHaveURL(/leaflet/i);

    }) 
})