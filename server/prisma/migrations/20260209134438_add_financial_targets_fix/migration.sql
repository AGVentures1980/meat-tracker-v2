-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'director';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "delivery_guests" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dine_in_guests" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "target_cost_guest" DOUBLE PRECISION NOT NULL DEFAULT 9.94,
ADD COLUMN     "target_lbs_guest" DOUBLE PRECISION NOT NULL DEFAULT 1.76;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "force_change" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_password_change" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "StoreMeatTarget" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "protein" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "cost_target" DOUBLE PRECISION,

    CONSTRAINT "StoreMeatTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRecord" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InventoryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRecord" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "item_name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost_total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreMeatTarget_store_id_protein_key" ON "StoreMeatTarget"("store_id", "protein");

-- CreateIndex
CREATE INDEX "InventoryRecord_store_id_date_idx" ON "InventoryRecord"("store_id", "date");

-- CreateIndex
CREATE INDEX "PurchaseRecord_store_id_date_idx" ON "PurchaseRecord"("store_id", "date");

-- AddForeignKey
ALTER TABLE "StoreMeatTarget" ADD CONSTRAINT "StoreMeatTarget_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRecord" ADD CONSTRAINT "InventoryRecord_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRecord" ADD CONSTRAINT "PurchaseRecord_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
