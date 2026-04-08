-- AlterTable
ALTER TABLE "BurgerInventoryPool" ADD COLUMN     "manager_declared_on_hand" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PullToPrepEvent" ADD COLUMN     "intended_use" TEXT NOT NULL DEFAULT 'RODIZIO';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "target_patty_oz" DOUBLE PRECISION NOT NULL DEFAULT 8.0;

-- AlterTable
ALTER TABLE "TrimRecordEvent" ADD COLUMN     "sent_to" TEXT NOT NULL DEFAULT 'WASTE_BIN';
