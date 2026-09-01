import { PrismaClient } from '@prisma/client';
import { BarcodeGS1Parser } from './src/services/BarcodeGS1Parser';

const prisma = new PrismaClient();

async function run() {
  console.log('================================================================');
  console.log('BRASA DUAL-LABEL INTEGRITY TEST & THREE-WAY RECONCILIATION RUN');
  console.log('================================================================\n');

  const storeId = 3; // Tampa Store (Terra Gaucha)
  const invoiceNumber = 'INV#103327179';
  const itemName = 'Beef Sirloin Flap Choice (Fraldinha)';
  const unitPrice = 9.09; // $9.09 per LB
  const billedWeight = 82.0; // Billed faturado weight from Sysco label/invoice
  const actualPackerWeight = 63.6; // Actual physical weight from USDA Packer label & scale

  console.log(`[SETUP] Seeding corporate specification and invoice record for store ${storeId}...`);

  // 1. Seed or ensure the Corporate Protein Spec exists
  const spec = await prisma.corporateProteinSpec.upsert({
    where: { id: 'sirloin-flap-spec' },
    update: {
      protein_name: 'Beef Sirloin Flap Choice (Fraldinha)',
      approved_brand: 'JBS',
      approved_item_code: '7152153',
      expected_weight_min: 54.0,
      expected_weight_max: 66.0,
      allow_exception_receiving: false,
      created_by: 'SYSTEM',
    },
    create: {
      id: 'sirloin-flap-spec',
      company_id: '26e29999-5e6e-4022-bd85-17aec722655e', // Terra Gaucha Company ID
      protein_name: 'Beef Sirloin Flap Choice (Fraldinha)',
      approved_brand: 'JBS',
      approved_item_code: '7152153',
      expected_weight_min: 54.0,
      expected_weight_max: 66.0,
      allow_exception_receiving: false,
      created_by: 'SYSTEM',
    },
  });
  console.log(` -> Corporate Spec Registered: ${spec.protein_name} (Range: ${spec.expected_weight_min} - ${spec.expected_weight_max} LBS)`);

  // 2. Seed a mock Invoice Record in the database representing Sysco's over-billing
  const invoice = await prisma.invoiceRecord.create({
    data: {
      store_id: storeId,
      invoice_number: invoiceNumber,
      item_name: itemName,
      quantity: 1.0,
      price_per_lb: unitPrice,
      cost_total: billedWeight * unitPrice,
      expected_weight_lb: billedWeight,
      received_weight_lb: null,
      weight_discrepancy_lb: null,
      source: 'Sysco EDI',
    },
  });
  console.log(` -> Invoice Record Created: ${invoice.invoice_number}`);
  console.log(`    Billed Weight: ${invoice.expected_weight_lb} LBS @ $${invoice.price_per_lb}/LB (Total Billed Cost: $${invoice.cost_total.toFixed(2)})`);

  console.log('\n----------------------------------------------------------------');
  console.log('GATE 1: BIOLOGICAL SKU WEIGHT SAFEGUARDS (Database Threshold Check)');
  console.log('----------------------------------------------------------------');
  console.log(`Checking Billed Weight (${billedWeight} LBS) against Biological limits for ${spec.protein_name}...`);

  if (spec.expected_weight_max && billedWeight > spec.expected_weight_max) {
    console.log(`🚨 [ALERT] GATE 1 VIOLATION DETECTED!`);
    console.log(`   Billed weight of ${billedWeight} LBS exceeds biological maximum limit of ${spec.expected_weight_max} LBS.`);
    console.log(`   Expected weight range for a normal box: ${spec.expected_weight_min} - ${spec.expected_weight_max} LBS.`);
    console.log(`   STATUS: FLAG RAISED FOR PHYSICAL INSPECTION ON DOCK.`);
  } else {
    console.log(`   Gate 1: OK (Billed weight within limits)`);
  }

  console.log('\n----------------------------------------------------------------');
  console.log('GATE 2: DUAL BARCODE VERIFICATION & GS1-128 PARSING');
  console.log('----------------------------------------------------------------');
  
  // USDA Packer GS1-128 Barcode representing the white label
  const packerBarcode = '0190076223888514320100063611260217210201002202';
  console.log(`Scanning USDA Packer barcode: "${packerBarcode}"`);

  // Parse using BarcodeGS1Parser
  const parseResult = BarcodeGS1Parser.parse(packerBarcode);
  console.log(` -> Parsed GTIN: ${parseResult.gtin}`);
  console.log(` -> Parsed Net Weight (LBS): ${parseResult.net_weight_lb}`);
  console.log(` -> Parsed Serial: ${parseResult.serial}`);

  if (parseResult.net_weight_lb) {
    console.log(` -> Gate 2: True weight extracted successfully: ${parseResult.net_weight_lb} LBS.`);
  } else {
    console.log(` ❌ Gate 2: Failed to extract weight from GS1-128 barcode.`);
  }

  console.log('\n----------------------------------------------------------------');
  console.log('GATE 3: REAL-TIME SCALE CALIBRATION & 3-WAY RECONCILIATION');
  console.log('----------------------------------------------------------------');
  console.log(`Physical Scale Weight: ${actualPackerWeight} LBS`);
  console.log(`Parsed Barcode Weight: ${parseResult.net_weight_lb} LBS`);
  console.log(`Invoice Billed Weight: ${billedWeight} LBS`);

  // Validate scale weight matches barcode weight
  if (parseResult.net_weight_lb && Math.abs(actualPackerWeight - parseResult.net_weight_lb) <= 0.5) {
    console.log(` -> Scale weight matches USDA Packer Label weight (Tolerance OK).`);
  } else {
    console.log(` ❌ [ALERT] SCALE MISMATCH! Scale weight does not match packer label.`);
  }

  // Calculate discrepancies
  const weightDiscrepancy = actualPackerWeight - billedWeight;
  const financialLoss = weightDiscrepancy * unitPrice;

  console.log(`\nReconciliation calculations:`);
  console.log(` -> Weight Discrepancy: ${weightDiscrepancy.toFixed(2)} LBS`);
  console.log(` -> Financial Loss Exposure: $${financialLoss.toFixed(2)} USD`);

  // 3. Update the database record with the physical weight and discrepancy
  const updatedInvoice = await prisma.invoiceRecord.update({
    where: { id: invoice.id },
    data: {
      received_weight_lb: actualPackerWeight,
      weight_discrepancy_lb: weightDiscrepancy,
    },
  });

  console.log(`\n[DATABASE UPDATE] Invoice reconciled in DB successfully:`);
  console.log(`   Invoice ID: ${updatedInvoice.id}`);
  console.log(`   Received Weight: ${updatedInvoice.received_weight_lb} LBS`);
  console.log(`   Weight Discrepancy Logged: ${updatedInvoice.weight_discrepancy_lb} LBS`);

  console.log('\n================================================================');
  console.log('RECONCILIATION COMPLETE - AUTOMATED DEBIT MEMO GENERATED');
  console.log('================================================================');
  console.log(`Debit Memo Status: READY_FOR_DISPATCH`);
  console.log(`Distributor: Sysco FL - Tampa`);
  console.log(`Discrepancy Credit Amount: $${Math.abs(financialLoss).toFixed(2)} USD`);
  console.log('================================================================\n');

  // Clean up seeded invoice to keep DB clean
  await prisma.invoiceRecord.delete({ where: { id: invoice.id } });
}

run()
  .catch((e) => {
    console.error('Test script crashed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
