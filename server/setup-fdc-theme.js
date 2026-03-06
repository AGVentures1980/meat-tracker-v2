const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function configureFogoDeChaoTheme() {
    try {
        console.log("Starting theme configuration for Fogo de Chão...");

        // Try to find Fogo de Chao in the database.
        // Also checking for 'Fogo' to be safe.
        let company = await prisma.company.findFirst({
            where: {
                OR: [
                    { name: { contains: "Fogo de Chão" } },
                    { name: { contains: "Fogo de Chao" } }
                ]
            }
        });

        if (!company) {
            console.log("Fogo de Chão not found in the local database. Creating it automatically...");
            company = await prisma.company.create({
                data: {
                    name: "Fogo de Chão",
                    plan: "enterprise"
                }
            });
        }

        console.log(`Found company: ${company.name} (ID: ${company.id})`);

        // Update with Fogo de Chão branding
        const updatedCompany = await prisma.company.update({
            where: {
                id: company.id
            },
            data: {
                subdomain: "fdc",
                // Primary brand color: "Gaucho Red", a vibrant red-orange reflecting fire
                theme_primary_color: "#A31D21",
                // The official dark logo from their WP site
                theme_logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fogo_de_Ch%C3%A3o_logo.svg/1024px-Fogo_de_Ch%C3%A3o_logo.svg.png",
                // A dark, high-quality, atmospheric fire/meat image for the background
                theme_bg_url: "https://images.unsplash.com/photo-1544025162-8111142125bb?q=80&w=1200&auto=format&fit=crop"
            }
        });

        console.log("\nSuccess! Fogo de Chão theme updated:");
        console.log(`- Subdomain: ${updatedCompany.subdomain}`);
        console.log(`- Primary Color: ${updatedCompany.theme_primary_color}`);
        console.log(`- Logo URL: ${updatedCompany.theme_logo_url}`);
        console.log(`- Background URL: ${updatedCompany.theme_bg_url}`);
        console.log("\nThe 'fdc.brasameat.com' or 'fdc.localhost:5173' login page should now show this theme.");

    } catch (error) {
        console.error("An error occurred during configuration:", error);
    } finally {
        await prisma.$disconnect();
    }
}

configureFogoDeChaoTheme();
