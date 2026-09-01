-- CreateTable
CREATE TABLE IF NOT EXISTS "OutletForecastLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "outlet_id" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "meal_period" TEXT NOT NULL,
    "reservation_forecast" INTEGER,
    "manager_forecast" INTEGER,
    "actual_guests" INTEGER,
    "lbs_consumed" DOUBLE PRECISION,
    "lbs_per_guest" DOUBLE PRECISION,
    "target_lbs_per_guest" DOUBLE PRECISION,
    "variance_pct" DOUBLE PRECISION,
    "submitted_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutletForecastLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OutletForecastLog_outlet_id_business_date_meal_period_key" ON "OutletForecastLog"("outlet_id", "business_date", "meal_period");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutletForecastLog_company_id_store_id_business_date_idx" ON "OutletForecastLog"("company_id", "store_id", "business_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutletForecastLog_outlet_id_business_date_idx" ON "OutletForecastLog"("outlet_id", "business_date");

-- Clean up any Infinity values already stored
UPDATE "OutletForecastLog"
SET lbs_per_guest = NULL, variance_pct = NULL
WHERE lbs_per_guest = 'Infinity'::float
   OR lbs_per_guest = '-Infinity'::float
   OR lbs_per_guest = 'NaN'::float;

