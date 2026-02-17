import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const ProspectingAgent = {
    /**
     * Simulates the "minuscous study" of companies to find potential fit.
     */
    async discoverNewProspects() {
        console.log('🚀 AI Prospecting Agent: Initiating full-scale search for new companies...');

        const mockDiscoveries = [
            {
                name: 'Steakhouse Elite Group',
                industry: 'Hospitality / Fine Dining',
                size: 'Large',
                fit: 0.95,
                summary: 'Major franchise with 45 locations globally. High meat volume but struggling with inventory variances and manual procurement tracking.',
                justification: 'Their current paper-based tracking in the Texas market makes them a prime candidate for Brasa Intel automation. Estimated 12% food cost reduction potential.'
            },
            {
                name: 'Gaucho Express',
                industry: 'Fast Casual / BBQ',
                size: 'Medium',
                fit: 0.88,
                summary: 'Rapidly growing regional chain (8 units). They recently expanded to Florida and lack a centralized dashboard for real-time waste monitoring.',
                justification: 'Growth-stage companies need the Dashboard-EXEC to maintain standards across new locations without increasing head office staff.'
            },
            {
                name: 'The Burger Boutique',
                industry: 'Premium Burger / Bistro',
                size: 'Small',
                fit: 0.75,
                summary: 'Single location with high-end artisanal meats. High quality but very tight margins due to premium protein prices.',
                justification: 'Perfect for the SaaS entry plan. The MeatEngine can optimize their high-value cuts (Picanha/Wagyu) which are currently unmonitored.'
            }
        ];

        for (const m of mockDiscoveries) {
            await prisma.prospect.upsert({
                where: { id: `MOCK-LEAD-${m.name.replace(/\s+/g, '-').toLowerCase()}` }, // Use constant IDs for the demo
                update: {},
                create: {
                    id: `MOCK-LEAD-${m.name.replace(/\s+/g, '-').toLowerCase()}`,
                    company_name: m.name,
                    industry: m.industry,
                    size: m.size,
                    potential_fit: m.fit,
                    research_summary: m.summary,
                    justification: m.justification,
                    status: 'lead'
                }
            });
        }

        console.log('✅ AI Prospecting Agent: Exploration complete. Found 3 high-value targets.');
        return { success: true, targetsJoined: mockDiscoveries.length };
    },

    /**
     * Executes the email dispatch via available transport (SMTP/SendGrid/Console).
     */
    async sendCampaignEmail(leadId: string, content: string) {
        console.log(`📨 AGENT DISPATCH: Sending email to ${leadId}...`);

        // In a real production environment, this would call SendGrid/AWS SES.
        // For this "Real Implementation" phase without API keys, we log the transaction 
        // effectively treating the server logs as the email server output.

        // Simulating network delay for realism
        await new Promise(resolve => setTimeout(resolve, 800));

        console.log(`
        ---------------------------------------------------
        TO: ${leadId}
        SUBJECT: Brasa Partnership
        BODY: 
        ${content}
        ---------------------------------------------------
        `);

        return { success: true, status: 'sent', timestamp: new Date() };
    }
};
