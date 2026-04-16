const fs = require('fs');
const path = require('path');

const prismaContent = `

// =======================================================
// BRASA ENTERPRISE INTEGRATION MESH (PROMPT 06)
// =======================================================

model SupplierCatalogItem {
  id                   String  @id @default(cuid())
  supplierId           String
  supplierItemCode     String
  gtin                 String?
  supplierDescription  String?
  supplierPackType     String?
  expectedWeightRange  String?
  expectedUom          String? @default("lb")
  isActive             Boolean @default(true)
  linkedProteinSpecId  String?
  confidence           Float   @default(0.0)

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  supplier             SupplierProfile @relation(fields: [supplierId], references: [id])
  spec                 CorporateProteinSpec? @relation(fields: [linkedProteinSpecId], references: [id])

  @@index([supplierId, supplierItemCode])
}

model PurchaseOrder {
  id               String   @id @default(cuid())
  companyId        String
  storeId          Int
  supplierId       String?
  poNumber         String
  status           PoStatus @default(DRAFT)
  plannedDelivery  DateTime?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  lines            PurchaseOrderLine[]

  @@index([companyId, storeId])
  @@index([poNumber])
}

model PurchaseOrderLine {
  id               String   @id @default(cuid())
  purchaseOrderId  String
  supplierItemCode String?
  productRefId     String?
  qtyExpected      Int
  weightExpected   Float?
  packCount        Int?
  status           String   @default("OPEN")
  
  purchaseOrder    PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])

  @@index([purchaseOrderId])
}

model ExpectedDelivery {
  id               String   @id @default(cuid())
  companyId        String
  storeId          Int
  supplierId       String?
  asnNumber        String?
  status           DeliveryStatus @default(PLANNED)
  plannedDelivery  DateTime?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  lines            ExpectedDeliveryLine[]

  @@index([companyId, storeId])
  @@index([asnNumber])
}

model ExpectedDeliveryLine {
  id                 String   @id @default(cuid())
  expectedDeliveryId String
  supplierItemCode   String?
  qtyExpected        Int
  weightExpected     Float?

  expectedDelivery   ExpectedDelivery @relation(fields: [expectedDeliveryId], references: [id])
}

model SupplierDocument {
  id                     String   @id @default(cuid())
  companyId              String
  storeId                Int
  supplierId             String?
  documentType           SupplierDocType
  externalDocumentNumber String?
  issueDate              DateTime?
  sourceChannel          String   @default("UPLOAD")
  rawPayload             Json?
  parsedStatus           DocParsedStatus @default(CAPTURED)
  confidence             Float    @default(0.0)

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  lines                  SupplierDocumentLine[]

  @@index([storeId])
  @@index([externalDocumentNumber])
}

model SupplierDocumentLine {
  id                 String   @id @default(cuid())
  documentId         String
  supplierItemCode   String?
  qty                Int?
  weight             Float?
  price              Float?

  document           SupplierDocument @relation(fields: [documentId], references: [id])
}

model PosSalesFeed {
  id               String   @id @default(cuid())
  storeId          Int
  businessDate     DateTime
  sourceSystem     String   @default("TOAST")
  transactionRef   String?
  importedAt       DateTime @default(now())

  lines            PosSalesLine[]

  @@index([storeId, businessDate])
}

model PosSalesLine {
  id               String   @id @default(cuid())
  feedId           String
  itemSold         String
  quantity         Float
  modifiers        Json?
  channel          String   @default("DINE_IN")

  feed             PosSalesFeed @relation(fields: [feedId], references: [id])
}

model ReconciliationEvent {
  id               String   @id @default(cuid())
  storeId          Int
  businessDate     DateTime
  status           String   @default("OPEN")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  varianceCases    VarianceCase[]

  @@index([storeId, businessDate])
}

model VarianceCase {
  id                      String   @id @default(cuid())
  reconciliationEventId   String
  type                    String
  severity                VarianceSeverity @default(LOW)
  sourceEntities          Json?
  financialEstimate       Float?
  status                  String   @default("OPEN")
  requiredAction          String?
  assignedRole            String?
  auditTrail              Json?

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  reconciliationEvent     ReconciliationEvent @relation(fields: [reconciliationEventId], references: [id])
}

model SupplierIntegritySnapshot {
  id                       String   @id @default(cuid())
  companyId                String
  supplierId               String
  periodStart              DateTime
  periodEnd                DateTime
  weakRuleRate             Float    @default(0.0)
  reviewRate               Float    @default(0.0)
  rejectRate               Float    @default(0.0)
  documentMismatchRate     Float    @default(0.0)
  expectedVsReceivedVariance Float  @default(0.0)
  averageRiskScore         Float    @default(0.0)
  confidenceIndex          Float    @default(1.0)
  degradationTrend         String?

  createdAt                DateTime @default(now())

  @@index([companyId, supplierId, periodEnd])
}

enum PoStatus {
  DRAFT
  ISSUED
  PARTIALLY_FULFILLED
  FULFILLED
  DISPUTED
  CLOSED
}

enum DeliveryStatus {
  PLANNED
  IN_TRANSIT
  ARRIVED
  PARTIALLY_RECEIVED
  RECEIVED
  EXCEPTION
}

enum SupplierDocType {
  INVOICE
  PACKING_LIST
  BILL_OF_LADING
  ASN
  DELIVERY_NOTE
}

enum DocParsedStatus {
  CAPTURED
  PARSED
  VERIFIED
  LINKED
  DISPUTED
}

enum VarianceSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
`;

fs.appendFileSync(path.join(__dirname, 'server/prisma/schema.prisma'), prismaContent);
console.log("Schema appended successfully.");
