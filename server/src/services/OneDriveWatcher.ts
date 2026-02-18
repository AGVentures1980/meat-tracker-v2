import { MicrosoftGraphService } from './MicrosoftGraphService';

export const OneDriveWatcher = {
    intervalId: null as NodeJS.Timeout | null,
    isRunning: false,

    /**
     * Starts the background monitoring process.
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        console.log('👁️ [ONEDRIVE WATCHER] Service Started. Monitoring for invoices...');

        // Check immediately on start
        this.checkFolder();

        // Then check every 15 minutes (or 1 minute for demo)
        const INTERVAL_MS = 60 * 1000; // 1 minute for demo
        this.intervalId = setInterval(() => this.checkFolder(), INTERVAL_MS);
    },

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        console.log('zzz [ONEDRIVE WATCHER] Service Stopped.');
    },

    /**
     * Core logic: Fetch -> Process -> Archive
     */
    async checkFolder() {
        try {
            console.log('🔍 [ONEDRIVE WATCHER] Checking for new files...');

            const files = await MicrosoftGraphService.listInvoices();

            if (files.length === 0) {
                console.log('   (No new files found)');
                return;
            }

            console.log(`   Found ${files.length} new invoices.`);

            for (const file of files) {
                console.log(`   Processing: ${file.name}`);

                // 1. Download
                const buffer = await MicrosoftGraphService.downloadFile(file.id);

                // 2. Process (OCR)
                // In a real scenario, we'd pass 'buffer' to the OCR Service.
                // For now, we mock the successful processing.
                await this.mockProcessInvoice(file.name);

                // 3. Move to Archive
                await MicrosoftGraphService.moveFileToProcessed(file.id, file.name);
            }

        } catch (error) {
            console.error('⚠️ [ONEDRIVE WATCHER] Error during check:', error);
        }
    },

    async mockProcessInvoice(fileName: string) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`   ✨ [Automated Ingestion] Successfully processed ${fileName}. Extracted 12 items.`);
        // Here we would call: InvoiceController.createFromOCR(...)
    }
};
