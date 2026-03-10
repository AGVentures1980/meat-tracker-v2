import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FDC_COMPANY_ID = '43670635-c205-4b19-99d4-445c7a683730';

async function main() {
    console.log('Applying official Fogo de Chão Branding Theme...');

    await prisma.company.update({
        where: { id: FDC_COMPANY_ID },
        data: {
            subdomain: 'fogo',
            // FDC Signature Deep Red/Orange Gradient
            theme_primary_color: '#cf2e2e',
            // Use their official transparent white logo for dark cinematic backgrounds
            theme_logo_url: 'https://fogodechao.com/wp-content/themes/fogo/assets/images/logo-fogo.svg',
            // We'll use a high-end fire roasting video for the cinematic background
            theme_bg_url: 'https://vimeo.com/712316491', // Classic Fire Roasting B-Roll fallback
            // New fields mapped for expanded theme support if added later
        }
    });

    console.log('FDC Master Theme Updated. Re-routing fogo.brasa.app is live.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
