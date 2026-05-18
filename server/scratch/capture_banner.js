const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
    console.log('Starting screenshot generation...');
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
        const htmlPath = path.join(__dirname, '../../linkedin_assets/brasa_enterprise_banner.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        await page.setContent(htmlContent);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Set high-fidelity OpenGraph viewport proportions (1200 x 630)
        await page.setViewport({
            width: 1200,
            height: 630,
            deviceScaleFactor: 2 // Retains high-fidelity vector rendering (2400 x 1260)
        });

        // Capture screenshot
        const outputPath = path.join(__dirname, '../../linkedin_assets/brasa_enterprise_banner.png');
        await page.screenshot({
            path: outputPath,
            type: 'png'
        });

        console.log('SUCCESS: Banner screenshot saved at:', outputPath);

    } catch (err) {
        console.error('ERROR capturing banner screenshot:', err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

run();
