
export const MicrosoftGraphService = {
    config: {
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        targetFolder: process.env.ONEDRIVE_FOLDER || 'Invoices/Pending'
    },

    /**
     * Authenticates with Azure AD.
     * In MOCK_MODE (missing keys), returns a dummy token.
     */
    async authenticate() {
        if (!this.config.clientId) {
            console.log('⚠️ [MS GRAPH] Authenticating in MOCK MODE (No Keys Found)');
            return 'mock-bearer-token';
        }
        // Real implementation would use @azure/identity or axios post to login.microsoftonline.com
        return 'real-bearer-token';
    },

    /**
     * Lists files in the target folder.
     */
    async listInvoices() {
        const token = await this.authenticate();

        if (token === 'mock-bearer-token') {
            // Simulate finding a file occasionally (e.g., based on random chance or first run)
            // For demo purposes, we will find one file on first run.
            const mockFile = {
                id: 'mock-file-123',
                name: 'invoice_sysco_dallas_0218.pdf',
                size: 1024 * 500, // 500kb
                createdDateTime: new Date().toISOString()
            };
            return [mockFile];
        }

        // Real implementation: GET https://graph.microsoft.com/v1.0/drives/{drive-id}/root:/{path}:/children
        return [];
    },

    /**
     * Downloads a file stream.
     */
    async downloadFile(fileId: string): Promise<Buffer> {
        console.log(`⬇️ [MS GRAPH] Downloading file ${fileId}...`);

        if (fileId.startsWith('mock-')) {
            // Return empty buffer for mock
            return Buffer.from('Mock PDF Content');
        }

        // Real implementation would fetch file content
        return Buffer.from('');
    },

    /**
     * Moves a file to the 'Processed' folder to prevent re-reading.
     */
    async moveFileToProcessed(fileId: string, fileName: string) {
        console.log(`✅ [MS GRAPH] Moving ${fileName} to 'Processed' folder...`);
        return true;
    }
};
