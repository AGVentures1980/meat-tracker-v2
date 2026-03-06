const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function configureTexasDeBrazilTheme() {
    try {
        console.log("Starting theme configuration for Texas de Brazil...");

        // Find TDB in the database
        const company = await prisma.company.findFirst({
            where: {
                name: {
                    contains: "Texas de Brazil"
                }
            }
        });

        if (!company) {
            console.error("Error: Texas de Brazil company not found in the database. Please create it first.");
            process.exit(1);
        }

        console.log(`Found company: ${company.name} (ID: ${company.id})`);

        // Update with the theme details based on brand analysis
        const updatedCompany = await prisma.company.update({
            where: {
                id: company.id
            },
            data: {
                subdomain: "tdb",
                // Primary brand color exactly matching their brand (Maroon / Dark Red)
                theme_primary_color: "#7e1518",
                // The white/transparent SVG logo for dark backgrounds
                theme_logo_url: "https://texasdebrazil.com/wp-content/uploads/2018/01/tdb-logo-light.svg",
                // A beautiful background image from their official website showing meats roasting over fire
                theme_bg_url: "https://texasdebrazil.com/wp-content/uploads/2018/02/DSC04135-2-1200x800.jpg"
            }
        });

        console.log("\nSuccess! Texas de Brazil theme updated:");
        console.log(`- Subdomain: ${updatedCompany.subdomain}`);
        console.log(`- Primary Color: ${updatedCompany.theme_primary_color}`);
        console.log(`- Logo URL: ${updatedCompany.theme_logo_url}`);
        console.log(`- Background URL: ${updatedCompany.theme_bg_url}`);
        console.log("\nThe 'tdb.brasameat.com' or 'tdb.localhost:5173' login page should now show this theme.");

    } catch (error) {
        console.error("An error occurred during configuration:", error);
    } finally {
        await prisma.$disconnect();
    }
}

configureTexasDeBrazilTheme();
