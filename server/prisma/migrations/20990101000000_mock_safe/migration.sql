-- Mock Safe Migration
ALTER TABLE "Store" ADD COLUMN "target_cost_guest" DOUBLE PRECISION NOT NULL DEFAULT 9.94;
