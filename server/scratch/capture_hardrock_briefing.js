const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
    console.log('Starting Hard Rock Tampa Briefing rendering...');
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
        
        const htmlPath = path.join(__dirname, '../../linkedin_assets/hardrock_readiness_briefing.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        await page.setContent(htmlContent);
        
        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.setViewport({
            width: 850,
            height: 1100,
            deviceScaleFactor: 2
        });

        const outputPath = path.join(__dirname, '../../linkedin_assets/hardrock_readiness_briefing.png');
        await page.screenshot({
            path: outputPath,
            type: 'png',
            fullPage: true
        });

        console.log('SUCCESS: Hard Rock Tampa Briefing screenshot saved at:', outputPath);

    } catch (err) {
        console.error('ERROR capturing Hard Rock Tampa Briefing screenshot:', err);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

run();
