export const EmailService = {
    /**
     * Sends a critical security alert to the administrator.
     * In production, this would use SendGrid/SMTP.
     * Currently, it logs to the server console for immediate visibility.
     */
    async sendSecurityAlert(payload: {
        type: 'BRUTE_FORCE' | 'UNAUTHORIZED_ACCESS' | 'SYSTEM_TAMPERING';
        ip: string;
        details: string;
        timestamp: Date;
    }) {
        const adminEmail = 'alexandre@alexgarciaventures.co';

        console.log('\n🚨 [SENTINEL SECURITY ALERT] 🚨');
        console.log('---------------------------------------------------');
        console.log(`To: ${adminEmail}`);
        console.log(`Subject: ⚠️ SECURITY ALERT: ${payload.type} Detected`);
        console.log(`Time: ${payload.timestamp.toISOString()}`);
        console.log(`Source IP: ${payload.ip}`);
        console.log(`Details: ${payload.details}`);
        console.log('Action: Immediate investigation recommended.');
        console.log('---------------------------------------------------\n');

        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, timestamp: new Date() };
    },

    async sendQCAlert(payload: {
        storeId?: string;
        barcode: string;
        user: string;
        reason: string;
    }) {
        const directorEmail = 'david@texasdebrazil.com';
        
        console.log('\n⚠️ [RECEIVING DOCK QC ALERT] ⚠️');
        console.log('---------------------------------------------------');
        console.log(`To: ${directorEmail}`);
        console.log(`Subject: 🛑 UNAUTHORIZED SUBSTITUTION REJECTED`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`Store ID: ${payload.storeId || 'Unknown'}`);
        console.log(`Scanned By: ${payload.user}`);
        console.log(`Barcode Detected: ${payload.barcode}`);
        console.log(`Action Taken: ${payload.reason}`);
        console.log('---------------------------------------------------\n');

        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
    }
};
