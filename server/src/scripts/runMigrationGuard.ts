import { safeMigrationGuard } from '../utils/PrismaMigrationGuard';

async function bootstrap() {
    console.log("=== SRE BOOT SEQUENCE INITIATED ===");
    try {
        await safeMigrationGuard();
        console.log("=== SRE MIGRATION GUARD CLEARED ===");
        process.exit(0);
    } catch (e: any) {
        console.error("=== SRE MIGRATION GUARD FATAL ===");
        console.error(e.message);
        process.exit(1);
    }
}

bootstrap();
