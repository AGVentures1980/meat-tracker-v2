const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const path = require('path');

async function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                return downloadImage(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download '${url}' (${response.statusCode})`));
                return;
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

(async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        console.log("Navigating to fogodechao.com...");
        await page.goto('https://fogodechao.com', { waitUntil: 'networkidle2' });

        console.log("Extracting background images...");
        const imageUrls = await page.evaluate(() => {
            const bgImgs = Array.from(document.querySelectorAll('*'))
                .map(el => window.getComputedStyle(el).backgroundImage)
                .filter(bg => bg !== 'none' && bg.includes('url'))
                .map(bg => bg.match(/url\(['"]?(.*?)['"]?\)/)[1]);

            return [...new Set([...bgImgs])]
                .filter(url => url.match(/\.(jpeg|jpg|png|webp)/i))
                .filter(url => !url.includes('data:image'));
        });

        console.log(`Found ${imageUrls.length} potential hero images.`);

        // FDC usually has 3-4 main slider images
        const topImages = imageUrls.slice(0, 4);

        for (let i = 0; i < topImages.length; i++) {
            const dest = path.join(__dirname, '..', 'client', 'public', `fdc-hero-${i + 1}.jpg`);
            console.log(`Downloading ${topImages[i]} to ${dest}...`);
            await downloadImage(topImages[i], dest);
        }

        await browser.close();
        console.log("Done scraping.");
        process.exit(0);
    } catch (e) {
        console.error("Scraping failed:", e);
        process.exit(1);
    }
})();
