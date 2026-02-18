/*
  Warnings:

  - You are about to drop the column `exclude_lamb_from_rodizio_lbs` on the `Store` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompanyProduct" ADD COLUMN     "include_in_delivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "protein_group" TEXT;

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "exclude_lamb_from_rodizio_lbs",
ADD COLUMN     "serves_lamb_chops_rodizio" BOOLEAN NOT NULL DEFAULT false;
