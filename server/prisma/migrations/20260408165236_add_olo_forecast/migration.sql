-- AlterTable
ALTER TABLE "SalesForecast" ADD COLUMN     "forecast_olo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "olo_target_lbs_order" DOUBLE PRECISION NOT NULL DEFAULT 0.50;
