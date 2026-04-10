-- CreateTable
CREATE TABLE "RawIntegrationPayload" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "trace_id" TEXT,
    "source_id" TEXT NOT NULL,
    "store_id" TEXT,
    "raw_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawIntegrationPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalEvent" (
    "id" TEXT NOT NULL,
    "payload_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "normalized_data" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanonicalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawIntegrationPayload_idempotency_key_key" ON "RawIntegrationPayload"("idempotency_key");
CREATE INDEX "RawIntegrationPayload_source_id_status_idx" ON "RawIntegrationPayload"("source_id", "status");
CREATE INDEX "RawIntegrationPayload_trace_id_idx" ON "RawIntegrationPayload"("trace_id");
CREATE UNIQUE INDEX "CanonicalEvent_payload_id_key" ON "CanonicalEvent"("payload_id");
