const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
    console.log('Starting Whitelabel Audit Report rendering...');
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Load the local HTML file
        const htmlPath = path.join(__dirname, '../../linkedin_assets/brasa_tampa_audit_report_whitelabel.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        await page.setContent(htmlContent);
        
        // Wait 2 seconds for clean styling and fonts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Set Letter proportion viewport with high-res scale
        await page.setViewport({
            width: 850,
            height: 1100,
            deviceScaleFactor: 2 // High-density rendering for perfect text detail
        });

        // Capture screenshot
        const outputPath = path.join(__dirname, '../../linkedin_assets/brasa_tampa_audit_report_whitelabel.png');
        await page.screenshot({
            path: outputPath,
            type: 'png',
            fullPage: true
        });

        console.log('SUCCESS: Whitelabel Audit Report screenshot saved at:', outputPath);

    } catch (err) {
        console.error('ERROR capturing Whitelabel Audit Report screenshot:', err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

run();
