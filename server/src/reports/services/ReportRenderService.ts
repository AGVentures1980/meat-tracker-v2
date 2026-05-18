import puppeteer from 'puppeteer';
import { generateReceivingVarianceReportHtml, ReceivingVarianceReportData } from '../templates/receiving-variance-report.template';

export class ReportRenderService {

    /**
     * Renders a premium, immutable PDF from a solved ReceivingVarianceReportData instance
     * utilizing a headless Puppeteer/Chromium instance.
     */
    public static async renderReceivingReport(data: ReceivingVarianceReportData): Promise<Buffer> {
        const html = generateReceivingVarianceReportHtml(data);
        
        let browser;
        try {
            // Launch headless Puppeteer instance optimized for lightweight environments (e.g., Railway/Linux docker)
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
            
            // Set network idle timeout to make sure fonts load properly
            await page.setContent(html, { 
                waitUntil: 'networkidle0' 
            });

            // Set viewport size matching desktop screen proportions
            await page.setViewport({
                width: 816, // 8.5in at 96dpi
                height: 1056, // 11in at 96dpi
                deviceScaleFactor: 1
            });

            // Generate immutable PDF using zeroed margins so our premium template borders are preserved
            const pdfBuffer = await page.pdf({
                format: 'Letter',
                printBackground: true,
                margin: {
                    top: '0px',
                    bottom: '0px',
                    left: '0px',
                    right: '0px'
                },
                preferCSSPageSize: true
            });

            return pdfBuffer;

        } catch (error) {
            console.error('CRITICAL: Headless PDF rendering failure in ReportRenderService:', error);
            throw new Error(`PDF Render Engine Failure: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (closeErr) {
                    console.error('Error closing puppeteer browser:', closeErr);
                }
            }
        }
    }
}
