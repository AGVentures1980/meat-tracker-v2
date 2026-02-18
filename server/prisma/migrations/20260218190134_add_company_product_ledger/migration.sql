-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "annual_growth_rate" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "owner_id" TEXT;

-- AlterTable
ALTER TABLE "DeliverySale" ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "dinner_guests_micros" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lunch_guests_micros" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "dinner_price" DOUBLE PRECISION NOT NULL DEFAULT 58.90,
ADD COLUMN     "exclude_lamb_from_rodizio_lbs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_lunch_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lunch_price" DOUBLE PRECISION NOT NULL DEFAULT 29.90,
ADD COLUMN     "olo_sales_target" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompanyProduct" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "is_villain" BOOLEAN NOT NULL DEFAULT false,
    "is_dinner_only" BOOLEAN NOT NULL DEFAULT false,
    "standard_target" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesForecast" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "week_start" DATE NOT NULL,
    "forecast_lunch" INTEGER NOT NULL DEFAULT 0,
    "forecast_dinner" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "potential_fit" DOUBLE PRECISION NOT NULL,
    "research_summary" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "contact_info" JSONB,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "agent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SysInvoice" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "billing_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "description" TEXT,
    "usage_stats" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SysInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProduct_company_id_name_key" ON "CompanyProduct"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SalesForecast_store_id_week_start_key" ON "SalesForecast"("store_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "SystemMetric_key_key" ON "SystemMetric"("key");

-- AddForeignKey
ALTER TABLE "CompanyProduct" ADD CONSTRAINT "CompanyProduct_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesForecast" ADD CONSTRAINT "SalesForecast_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SysInvoice" ADD CONSTRAINT "SysInvoice_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
