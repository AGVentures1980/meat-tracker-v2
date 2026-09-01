import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPolicies = [
  {
    provider: 'GOOGLE',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: true,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: true,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'Google rules: Discovery and metadata allowed only through Places API or authorized GBP API. Webpage scraping prohibited.',
  },
  {
    provider: 'YELP',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: true,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'Yelp rules: Discovery and metadata allowed through approved API. Automated webpage scraping prohibited.',
  },
  {
    provider: 'OPENTABLE',
    allowDiscovery: true,
    allowPublicMetadata: false,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: false,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'OpenTable rules: Discovery allowed. Metadata through permitted sources. Automated webpage scraping prohibited.',
  },
  {
    provider: 'TRIPADVISOR',
    allowDiscovery: true,
    allowPublicMetadata: false,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: false,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'TripAdvisor rules: Discovery allowed. Automated monitoring/scraping prohibited until approved API adapter exists.',
  },
  {
    provider: 'FACEBOOK',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: true,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'Facebook policies: Manual or official APIs only.',
  },
  {
    provider: 'INSTAGRAM',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: true,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'Instagram rules: Meta API permissions required.',
  },
  {
    provider: 'TIKTOK',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: false,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'TikTok policies: Import and manual actions only.',
  },
  {
    provider: 'YOUTUBE',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: true,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'YouTube: API and manual input only.',
  },
  {
    provider: 'REDDIT',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: true,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'Reddit: API and manual import only.',
  },
  {
    provider: 'OTHER',
    allowDiscovery: true,
    allowPublicMetadata: true,
    allowAutomatedMonitoring: false,
    allowAutomatedContentIngestion: false,
    allowOfficialApi: false,
    allowClientImport: true,
    allowManualImport: true,
    notes: 'Default fallback policy.',
  },
];

async function main() {
  console.log('Seeding Source Policies...');
  for (const policy of defaultPolicies) {
    await prisma.sourcePolicy.upsert({
      where: { provider: policy.provider },
      update: policy,
      create: policy,
    });
  }
  console.log('Source Policies Seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
