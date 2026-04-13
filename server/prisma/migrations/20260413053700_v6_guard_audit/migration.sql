-- CreateTable
CREATE TABLE "MigrationGuardAuditLog" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guard_version" TEXT NOT NULL,
    "boot_id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "migration_name" TEXT,
    "event" TEXT NOT NULL,
    "state_detected" TEXT,
    "decision" TEXT,
    "checksum_db" TEXT,
    "checksum_local" TEXT,
    "finished_at" TIMESTAMP(3),
    "rolled_back_at" TIMESTAMP(3),
    "reason" TEXT,
    "details" JSONB,

    CONSTRAINT "MigrationGuardAuditLog_pkey" PRIMARY KEY ("id")
);
