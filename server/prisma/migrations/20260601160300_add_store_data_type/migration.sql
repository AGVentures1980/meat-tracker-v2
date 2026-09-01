-- CreateEnum
CREATE TYPE "StoreDataType" AS ENUM ('LIVE', 'DEMO');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "data_type" "StoreDataType" NOT NULL DEFAULT 'DEMO';
