-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'manager', 'viewer');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('OLO', 'UberEats', 'DoorDash', 'Manual');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('CSV', 'Image');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'enterprise',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" SERIAL NOT NULL,
    "company_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "order_external_id" TEXT,
    "source" "OrderSource" NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "raw_payload" JSONB,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "protein_type" TEXT NOT NULL,
    "lbs" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeatUsage" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "protein" TEXT NOT NULL,
    "lbs_total" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "MeatUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "store_id" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "total_lbs" DOUBLE PRECISION NOT NULL,
    "extra_customers" INTEGER NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Order_store_id_order_date_idx" ON "Order"("store_id", "order_date");

-- CreateIndex
CREATE UNIQUE INDEX "MeatUsage_store_id_protein_date_key" ON "MeatUsage"("store_id", "protein", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Report_store_id_month_key" ON "Report"("store_id", "month");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeatUsage" ADD CONSTRAINT "MeatUsage_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
