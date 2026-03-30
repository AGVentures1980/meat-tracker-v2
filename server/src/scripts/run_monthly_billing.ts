import { PrismaClient } from '@prisma/client';
import { addMonths } from 'date-fns';

const prisma = new PrismaClient();

async function runMonthlyBillingJob() {
    console.log('🚀 Starting Smart Equity Monthly Billing Cron Job...');
    try {
        const now = new Date();
        const month = now.getMonth(); // Previous month (0-indexed, so getMonth() is perfect for "last month")
        const year = month === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const targetMonth = month === 0 ? 12 : month;

        console.log(`📅 Target Billing Period: ${targetMonth}/${year}`);

        const startDate = new Date(year, targetMonth - 1, 1);
        const endDate = new Date(year, targetMonth, 0, 23, 59, 59);

        const companies = await prisma.company.findMany({
            where: { company_status: { in: ['Active', 'active'] } },
            include: { stores: true }
        });

        console.log(`Found ${companies.length} active companies to process.`);
        const generatedInvoices = [];

        for (const company of companies) {
            let totalMonthlySaasFee = 0;
            let storeBreakdown: any[] = [];

            for (const store of company.stores) {
                const storeFee = 1000;
                totalMonthlySaasFee += storeFee;

                storeBreakdown.push({
                    store: store.store_name,
                    saasFee: storeFee
                });
            }

            const totalInvoiceAmount = totalMonthlySaasFee;

            if (totalInvoiceAmount > 0) {
                const invoice = await prisma.sysInvoice.create({
                    data: {
                        company_id: company.id,
                        amount: totalInvoiceAmount,
                        due_date: addMonths(new Date(), 1),
                        description: `Billing for ${targetMonth}/${year}: Brasa OS Executive License`,
                        status: 'unpaid',
                        usage_stats: {
                            month: targetMonth,
                            year,
                            totalMonthlySaasFee,
                            storeBreakdown,
                        }
                    }
                });

                generatedInvoices.push({ company: company.name, invoiceId: invoice.id, amount: totalInvoiceAmount });
            }
        }

        console.log(`✅ Successfully generated ${generatedInvoices.length} invoices.`);
        console.table(generatedInvoices);
        
    } catch (error) {
        console.error('❌ Error in Cron Job:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Execute the job directly
runMonthlyBillingJob();
