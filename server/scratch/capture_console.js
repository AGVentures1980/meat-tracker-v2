const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
    console.log('Starting Executive Console rendering...');
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
        const htmlPath = path.join(__dirname, '../../linkedin_assets/brasa_executive_action_console.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        await page.setContent(htmlContent);
        
        // Wait 2 seconds for clean styling and fonts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Set realistic high-resolution desktop proportions
        await page.setViewport({
            width: 1440,
            height: 900,
            deviceScaleFactor: 2 // High-density rendering for perfect text detail
        });

        // Capture screenshot
        const outputPath = path.join(__dirname, '../../linkedin_assets/brasa_executive_action_console.png');
        await page.screenshot({
            path: outputPath,
            type: 'png'
        });

        console.log('SUCCESS: Executive Console screenshot saved at:', outputPath);

    } catch (err) {
        console.error('ERROR capturing Executive Console screenshot:', err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

run();
