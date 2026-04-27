
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIssues() {
    console.log("--- FETCHING SRE ISSUES ---");
    try {
        const companies = await prisma.company.findMany({
            include: {
                stores: true,
                AuditLog: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                }
            }
        });

        const issues = [];
        const now = new Date();

        for (const company of companies) {
            const hasActiveStore = company.stores.some((s) => s.status === 'ACTIVE');
            if (hasActiveStore) {
                const lastActivity = company.AuditLog.length > 0 ? new Date(company.AuditLog[0].created_at) : null;
                const hoursSince = lastActivity ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60) : Infinity;
                
                if (hoursSince > 48) {
                    issues.push({
                        id: `issue-noact-${company.id}`,
                        title: `Tenant ${company.name} has no activity in 48h`,
                        description: 'Could indicate adoption drop off.',
                        antigravity_prompt: `WARNING — Tenant ${company.name} has no activity in 48h.\nVerify: is this expected?\nIf unexpected: check login at ${company.subdomain || 'app'}.brasameat.com`
                    });
                }
            }
        }

        console.log(`Found ${issues.length} issues.`);
        issues.forEach((issue, idx) => {
            console.log(`\n[ISSUE ${idx}]`);
            console.log(`title: ${issue.title}`);
            console.log(`description: ${issue.description}`);
            console.log(`antigravity_prompt: ${issue.antigravity_prompt}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkIssues();
