# 🗄️ 02. Database Architecture & High-Performance Schema

> **Database**: PostgreSQL 15+  
> **ORM**: Prisma ORM / Drizzle ORM (with Raw SQL Acceleration for Trigram Search)  
> **Optimization Focus**: Sub-millisecond barcode lookups, zero-lag search-as-you-type for 1,500+ SKUs, ACID transaction isolation for counter billing.

---

## 1. High-Performance Indexing Strategy

In a busy retail counter with 1,500+ SKUs, scanning a barcode or typing a product name must respond in **under 10ms**. Standard `LIKE '%query%'` triggers sequential table scans that choke under load.

### Indexing Matrix

```mermaid
graph TD
    Query[Incoming Product Query] --> CheckType{Query Format}
    CheckType -->|Exact Barcode Match| BTreeBarcode[B-Tree Index: products_barcode_idx]
    CheckType -->|Exact SKU Code Match| BTreeSKU[B-Tree Index: products_sku_code_idx]
    CheckType -->|Prefix / Substring Text| GINTrigram[GIN pg_trgm Index: products_search_trgm_idx]
    
    BTreeBarcode --> Result[Sub-Millisecond Result < 2ms]
    BTreeSKU --> Result
    GINTrigram --> Result
```

### 1.1 Trigram Indexing (`pg_trgm`) for Fuzzy & Prefix Search
Enable the `pg_trgm` extension in PostgreSQL to enable GIN (Generalized Inverted Index) on product names, codes, and customer names:

```sql
-- Required extension for instant search-as-you-type
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fast fuzzy search on product name and SKU
CREATE INDEX IF NOT EXISTS products_name_trgm_idx 
ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_sku_trgm_idx 
ON products USING gin (sku_code gin_trgm_ops);

-- Fast customer phone and name search
CREATE INDEX IF NOT EXISTS customers_name_phone_trgm_idx 
ON customers USING gin ((name || ' ' || phone) gin_trgm_ops);
```

### 1.2 Partial Indexes for Active Working Sets
Active products and open job orders represent 99% of hot queries. Indexing only active/pending records keeps indexes small and 100% in RAM:

```sql
-- Only index active products for counter billing
CREATE INDEX IF NOT EXISTS products_active_counter_idx 
ON products (sub_category_id, name, selling_price) 
WHERE is_active = TRUE;

-- Only index incomplete job orders for dashboard & workshop board
CREATE INDEX IF NOT EXISTS job_orders_active_pipeline_idx 
ON job_orders (status, expected_delivery_date ASC) 
WHERE status NOT IN ('DELIVERED', 'CANCELLED');

-- Fast lookup for low stock alert
CREATE INDEX IF NOT EXISTS products_low_stock_idx 
ON products (current_stock, min_stock_alert) 
WHERE is_active = TRUE AND current_stock <= min_stock_alert;
```

---

## 2. Complete Prisma / PostgreSQL Schema Definition

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [pg_trgm]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "relationJoins"]
}

// ----------------------------------------------------
// ENUMS
// ----------------------------------------------------

enum UserRole {
  ADMIN
  MANAGER
  CASHIER
}

enum JobStatus {
  ORDER_PLACED
  DESIGNING
  PROOF_APPROVAL
  PRINTING
  FINISHING
  READY_FOR_PICKUP
  DELIVERED
  CANCELLED
}

enum InvoiceType {
  POS_COUNTER
  DESKTOP_DETAILED
  JOB_ORDER_FINAL
}

enum InvoiceStatus {
  COMPLETED
  HELD
  CANCELLED
  REFUNDED
}

enum PaymentMethod {
  CASH
  UPI
  CARD
  CREDIT_UDHAAR
  SPLIT
}

enum StockAdjustmentType {
  PURCHASE_RESTOCK
  SALE_DEDUCTION
  PRINT_SPOILAGE
  DAMAGE_WASTAGE
  MANUAL_CORRECTION
  RETURN_RESTOCK
}

// ----------------------------------------------------
// USER & AUDIT LOGS
// ----------------------------------------------------

model User {
  id            String         @id @default(uuid()) @db.Uuid
  username      String         @unique @db.VarChar(50)
  fullName      String         @map("full_name") @db.VarChar(100)
  passwordHash  String         @map("password_hash") @db.Text
  role          UserRole       @default(CASHIER)
  isActive      Boolean        @default(true) @map("is_active")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  invoices      Invoice[]
  jobOrders     JobOrder[]
  auditLogs     AuditLog[]
  adjustments   StockAdjustment[]

  @@map("users")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  action      String   @db.VarChar(100) // INVOICE_CANCELLED, PRICE_OVERRIDE, STOCK_ADJUST
  entityType  String   @map("entity_type") @db.VarChar(50)
  entityId    String   @map("entity_id") @db.VarChar(50)
  oldValues   Json?    @map("old_values")
  newValues   Json?    @map("new_values")
  ipAddress   String?  @map("ip_address") @db.VarChar(45)
  timestamp   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([entityType, entityId])
  @@index([userId, timestamp(sort: Desc)])
  @@map("audit_logs")
}

// ----------------------------------------------------
// MASTER DATA
// ----------------------------------------------------

model Category {
  id            String        @id @default(uuid()) @db.Uuid
  name          String        @unique @db.VarChar(100)
  slug          String        @unique @db.VarChar(100)
  displayOrder  Int           @default(0) @map("display_order")
  isActive      Boolean       @default(true) @map("is_active")
  createdAt     DateTime      @default(now()) @map("created_at")

  subCategories SubCategory[]

  @@map("categories")
}

model SubCategory {
  id          String    @id @default(uuid()) @db.Uuid
  categoryId  String    @map("category_id") @db.Uuid
  name        String    @db.VarChar(100)
  slug        String    @db.VarChar(100)
  displayOrder Int      @default(0) @map("display_order")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")

  category    Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  products    Product[]

  @@unique([categoryId, name])
  @@index([categoryId, isActive])
  @@map("sub_categories")
}

model Unit {
  id             String    @id @default(uuid()) @db.Uuid
  code           String    @unique @db.VarChar(20) // pcs, ream, box, roll, sq_ft
  name           String    @db.VarChar(50)        // Pieces, Ream (500s), Box
  allowsFraction Boolean   @default(false) @map("allows_fraction")
  isActive       Boolean   @default(true) @map("is_active")

  products       Product[]

  @@map("units")
}

model Product {
  id             String            @id @default(uuid()) @db.Uuid
  skuCode        String            @unique @map("sku_code") @db.VarChar(50)
  barcode        String?           @unique @db.VarChar(50)
  name           String            @db.VarChar(255)
  subCategoryId  String            @map("sub_category_id") @db.Uuid
  unitId         String            @map("unit_id") @db.Uuid
  
  costPrice      Decimal           @default(0.00) @map("cost_price") @db.Decimal(12, 2)
  sellingPrice   Decimal           @map("selling_price") @db.Decimal(12, 2)
  currentStock   Decimal           @default(0.00) @map("current_stock") @db.Decimal(12, 2)
  minStockAlert  Decimal           @default(10.00) @map("min_stock_alert") @db.Decimal(12, 2)
  
  taxPercent     Decimal           @default(0.00) @map("tax_percent") @db.Decimal(5, 2)
  
  imageUrl       String?           @map("image_url") @db.Text
  isActive       Boolean           @default(true) @map("is_active")
  version        Int               @default(0) // Optimistic locking
  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt @map("updated_at")

  subCategory    SubCategory       @relation(fields: [subCategoryId], references: [id], onDelete: Restrict)
  unit           Unit              @relation(fields: [unitId], references: [id], onDelete: Restrict)
  invoiceItems   InvoiceItem[]
  purchaseItems  PurchaseOrderItem[]
  adjustments    StockAdjustment[]

  @@index([barcode])
  @@index([skuCode])
  @@index([subCategoryId, isActive])
  @@index([currentStock, minStockAlert])
  @@map("products")
}

model Customer {
  id              String            @id @default(uuid()) @db.Uuid
  name            String            @db.VarChar(150)
  phone           String?           @db.VarChar(20)
  email           String?           @db.VarChar(150)
  address         String?           @db.Text
  currentBalance  Decimal           @default(0.00) @map("current_balance") @db.Decimal(12, 2) // > 0 means Udhaar due
  creditLimit     Decimal           @default(0.00) @map("credit_limit") @db.Decimal(12, 2)
  notes           String?           @db.Text
  isActive        Boolean           @default(true) @map("is_active")
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  invoices        Invoice[]
  jobOrders       JobOrder[]
  payments        CustomerPayment[]
  ledgerEntries   CustomerLedger[]

  @@index([phone])
  @@index([name])
  @@index([currentBalance])
  @@map("customers")
}

model Vendor {
  id                 String              @id @default(uuid()) @db.Uuid
  name               String              @db.VarChar(150)
  contactPerson      String?             @map("contact_person") @db.VarChar(100)
  phone              String?             @db.VarChar(20)
  address            String?             @db.Text
  outstandingBalance Decimal             @default(0.00) @map("outstanding_balance") @db.Decimal(12, 2)
  isActive           Boolean             @default(true) @map("is_active")
  createdAt          DateTime            @default(now()) @map("created_at")

  purchaseOrders     PurchaseOrder[]
  vendorPayments     VendorPayment[]

  @@map("vendors")
}

// ----------------------------------------------------
// CUSTOM PRINTING JOB ORDERS
// ----------------------------------------------------

model JobOrder {
  id                   String               @id @default(uuid()) @db.Uuid
  jobOrderNumber       String               @unique @map("job_order_number") @db.VarChar(50) // JO-2026-0001
  customerId           String?              @map("customer_id") @db.Uuid
  customerName         String               @map("customer_name") @db.VarChar(150)
  customerPhone        String?              @map("customer_phone") @db.VarChar(20)
  
  jobType              String               @map("job_type") @db.VarChar(100) // Visiting Card, Wedding Card, Banner
  specifications       Json                 // { size: "3.5x2", paper: "350gsm Matte", color: "4+4", sides: 2 }
  quantity             Int
  unitName             String               @default("pcs") @map("unit_name") @db.VarChar(20)
  
  totalAmount          Decimal              @map("total_amount") @db.Decimal(12, 2)
  advancePaid          Decimal              @default(0.00) @map("advance_paid") @db.Decimal(12, 2)
  balanceDue           Decimal              @default(0.00) @map("balance_due") @db.Decimal(12, 2)
  
  status               JobStatus            @default(ORDER_PLACED)
  proofApproved        Boolean              @default(false) @map("proof_approved")
  proofApprovedAt      DateTime?            @map("proof_approved_at")
  designNotes          String?              @map("design_notes") @db.Text
  
  expectedDeliveryDate DateTime?            @map("expected_delivery_date")
  deliveredAt          DateTime?            @map("delivered_at")
  
  createdById          String               @map("created_by_id") @db.Uuid
  createdAt            DateTime             @default(now()) @map("created_at")
  updatedAt            DateTime             @updatedAt @map("updated_at")

  customer             Customer?            @relation(fields: [customerId], references: [id], onDelete: SetNull)
  createdBy            User                 @relation(fields: [createdById], references: [id], onDelete: Restrict)
  attachments          JobOrderAttachment[]
  invoices             Invoice[]

  @@index([status, expectedDeliveryDate])
  @@index([customerId, status])
  @@index([customerPhone])
  @@map("job_orders")
}

model JobOrderAttachment {
  id          String   @id @default(uuid()) @db.Uuid
  jobOrderId  String   @map("job_order_id") @db.Uuid
  fileUrl     String   @map("file_url") @db.Text
  fileName    String   @map("file_name") @db.VarChar(255)
  fileType    String   @map("file_type") @db.VarChar(50)
  isProof     Boolean  @default(false) @map("is_proof")
  createdAt   DateTime @default(now()) @map("created_at")

  jobOrder    JobOrder @relation(fields: [jobOrderId], references: [id], onDelete: Cascade)

  @@map("job_order_attachments")
}

// ----------------------------------------------------
// INVOICING & BILLING
// ----------------------------------------------------

model Invoice {
  id               String            @id @default(uuid()) @db.Uuid
  invoiceNumber    String            @unique @map("invoice_number") @db.VarChar(50) // CP-2026-0001
  invoiceType      InvoiceType       @default(POS_COUNTER) @map("invoice_type")
  
  customerId       String?           @map("customer_id") @db.Uuid
  customerName     String            @default("Walk-in Customer") @map("customer_name") @db.VarChar(150)
  customerPhone    String?           @map("customer_phone") @db.VarChar(20)
  
  jobOrderId       String?           @map("job_order_id") @db.Uuid
  
  subTotal         Decimal           @map("sub_total") @db.Decimal(12, 2)
  discountAmount   Decimal           @default(0.00) @map("discount_amount") @db.Decimal(12, 2)
  taxAmount        Decimal           @default(0.00) @map("tax_amount") @db.Decimal(12, 2)
  roundOff         Decimal           @default(0.00) @map("round_off") @db.Decimal(12, 2)
  netTotal         Decimal           @map("net_total") @db.Decimal(12, 2)
  
  paidAmount       Decimal           @default(0.00) @map("paid_amount") @db.Decimal(12, 2)
  balanceDue       Decimal           @default(0.00) @map("balance_due") @db.Decimal(12, 2) // Credited to Udhaar
  
  paymentMethod    PaymentMethod     @default(CASH) @map("payment_method")
  status           InvoiceStatus     @default(COMPLETED)
  
  notes            String?           @db.Text
  createdById      String            @map("created_by_id") @db.Uuid
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  customer         Customer?         @relation(fields: [customerId], references: [id], onDelete: SetNull)
  jobOrder         JobOrder?         @relation(fields: [jobOrderId], references: [id], onDelete: SetNull)
  createdBy        User              @relation(fields: [createdById], references: [id], onDelete: Restrict)
  items            InvoiceItem[]
  payments         CustomerPayment[]

  @@index([createdAt(sort: Desc)])
  @@index([customerId, createdAt(sort: Desc)])
  @@index([createdById, createdAt])
  @@index([status])
  @@map("invoices")
}

model InvoiceItem {
  id             String    @id @default(uuid()) @db.Uuid
  invoiceId      String    @map("invoice_id") @db.Uuid
  productId      String?   @map("product_id") @db.Uuid
  itemDescription String   @map("item_description") @db.VarChar(255)
  unitName       String    @default("pcs") @map("unit_name") @db.VarChar(20)
  
  quantity       Decimal   @db.Decimal(12, 2)
  unitCostPrice  Decimal   @default(0.00) @map("unit_cost_price") @db.Decimal(12, 2)
  unitSalePrice  Decimal   @map("unit_sale_price") @db.Decimal(12, 2)
  discountAmount Decimal   @default(0.00) @map("discount_amount") @db.Decimal(12, 2)
  taxPercent     Decimal   @default(0.00) @map("tax_percent") @db.Decimal(5, 2)
  taxAmount      Decimal   @default(0.00) @map("tax_amount") @db.Decimal(12, 2)
  lineTotal      Decimal   @map("line_total") @db.Decimal(12, 2)

  invoice        Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  product        Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([invoiceId])
  @@index([productId])
  @@map("invoice_items")
}

// ----------------------------------------------------
// PAYMENTS & CUSTOMER LEDGER (UDHAAR)
// ----------------------------------------------------

model CustomerPayment {
  id             String        @id @default(uuid()) @db.Uuid
  customerId     String        @map("customer_id") @db.Uuid
  invoiceId      String?       @map("invoice_id") @db.Uuid
  amount         Decimal       @db.Decimal(12, 2)
  paymentMethod  PaymentMethod @map("payment_method")
  transactionRef String?       @map("transaction_ref") @db.VarChar(100) // UPI UTR or Card Auth
  notes          String?       @db.Text
  receivedAt     DateTime      @default(now()) @map("received_at")

  customer       Customer      @relation(fields: [customerId], references: [id], onDelete: Restrict)
  invoice        Invoice?      @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  @@index([customerId, receivedAt(sort: Desc)])
  @@map("customer_payments")
}

model CustomerLedger {
  id             String    @id @default(uuid()) @db.Uuid
  customerId     String    @map("customer_id") @db.Uuid
  referenceType  String    @map("reference_type") @db.VarChar(50) // INVOICE, PAYMENT, RETURN
  referenceId    String    @map("reference_id") @db.VarChar(50)
  debitAmount    Decimal   @default(0.00) @map("debit_amount") @db.Decimal(12, 2)  // Bill amount added
  creditAmount   Decimal   @default(0.00) @map("credit_amount") @db.Decimal(12, 2) // Payment received
  runningBalance Decimal   @map("running_balance") @db.Decimal(12, 2)
  notes          String?   @db.Text
  createdAt      DateTime  @default(now()) @map("created_at")

  customer       Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([customerId, createdAt(sort: Desc)])
  @@map("customer_ledger")
}

// ----------------------------------------------------
// PURCHASES, RESTOCKING & INVENTORY
// ----------------------------------------------------

model PurchaseOrder {
  id             String              @id @default(uuid()) @db.Uuid
  poNumber       String              @unique @map("po_number") @db.VarChar(50)
  vendorId       String              @map("vendor_id") @db.Uuid
  vendorBillNo   String?             @map("vendor_bill_no") @db.VarChar(50)
  totalAmount    Decimal             @map("total_amount") @db.Decimal(12, 2)
  paidAmount     Decimal             @default(0.00) @map("paid_amount") @db.Decimal(12, 2)
  purchaseDate   DateTime            @default(now()) @map("purchase_date")
  notes          String?             @db.Text

  vendor         Vendor              @relation(fields: [vendorId], references: [id], onDelete: Restrict)
  items          PurchaseOrderItem[]

  @@index([vendorId, purchaseDate(sort: Desc)])
  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id              String        @id @default(uuid()) @db.Uuid
  purchaseOrderId String        @map("purchase_order_id") @db.Uuid
  productId       String        @map("product_id") @db.Uuid
  quantity        Decimal       @db.Decimal(12, 2)
  unitCostPrice   Decimal       @map("unit_cost_price") @db.Decimal(12, 2)
  lineTotal       Decimal       @map("line_total") @db.Decimal(12, 2)

  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product         Product       @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@map("purchase_order_items")
}

model VendorPayment {
  id             String        @id @default(uuid()) @db.Uuid
  vendorId       String        @map("vendor_id") @db.Uuid
  amount         Decimal       @db.Decimal(12, 2)
  paymentMethod  PaymentMethod @map("payment_method")
  transactionRef String?       @map("transaction_ref") @db.VarChar(100)
  paidAt         DateTime      @default(now()) @map("paid_at")

  vendor         Vendor        @relation(fields: [vendorId], references: [id], onDelete: Restrict)

  @@map("vendor_payments")
}

model StockAdjustment {
  id              String              @id @default(uuid()) @db.Uuid
  productId       String              @map("product_id") @db.Uuid
  adjustmentType  StockAdjustmentType @map("adjustment_type")
  quantityDelta   Decimal             @map("quantity_delta") @db.Decimal(12, 2) // Negative for Spoilage/Sale, Positive for Restock
  previousStock   Decimal             @map("previous_stock") @db.Decimal(12, 2)
  newStock        Decimal             @map("new_stock") @db.Decimal(12, 2)
  reasonNotes     String?             @map("reason_notes") @db.Text
  userId          String              @map("user_id") @db.Uuid
  createdAt       DateTime            @default(now()) @map("created_at")

  product         Product             @relation(fields: [productId], references: [id], onDelete: Restrict)
  user            User                @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([productId, createdAt(sort: Desc)])
  @@map("stock_adjustments")
}

// ----------------------------------------------------
// SETTINGS & CONFIGURATION
// ----------------------------------------------------

model ShopSettings {
  id               String   @id @default(uuid()) @db.Uuid
  shopName         String   @default("Crystal Press") @map("shop_name") @db.VarChar(150)
  tagline          String?  @default("Printing Press & Stationery") @db.VarChar(200)
  addressLine1     String?  @map("address_line1") @db.Text
  addressLine2     String?  @map("address_line2") @db.Text
  phone1           String?  @map("phone_1") @db.VarChar(20)
  phone2           String?  @map("phone_2") @db.VarChar(20)
  email            String?  @db.VarChar(100)
  logoUrl          String?  @map("logo_url") @db.Text
  
  upiId            String?  @map("upi_id") @db.VarChar(100) // shop@upi for QR code
  upiPayeeName     String?  @map("upi_payee_name") @db.VarChar(100)
  
  invoicePrefix    String   @default("CP") @map("invoice_prefix") @db.VarChar(10)
  jobOrderPrefix   String   @default("JO") @map("job_order_prefix") @db.VarChar(10)
  
  receiptFooter    String?  @default("Thank you for your business!") @map("receipt_footer") @db.Text
  termsConditions  String?  @map("terms_conditions") @db.Text
  
  defaultTaxRate   Decimal  @default(0.00) @map("default_tax_rate") @db.Decimal(5, 2)
  isTaxEnabled     Boolean  @default(false) @map("is_tax_enabled")
  
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("shop_settings")
}
```

---

## 3. Atomic Checkout & Concurrency Controls

When Cashiers create sales rapidly, stock deductions must be 100% atomic to avoid double-selling or negative discrepancies.

### 3.1 Stock Deduction Atomic Query Pattern
Instead of reading stock and updating in separate steps, use atomic PostgreSQL decrement with validation in a single round-trip:

```typescript
// Fast atomic stock update in a Prisma interactive transaction
await prisma.$transaction(async (tx) => {
  for (const item of cartItems) {
    if (item.productId) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          version: item.version, // Optimistic concurrency check
          currentStock: { gte: item.quantity }, // Prevent negative stock
        },
        data: {
          currentStock: { decrement: item.quantity },
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new Error(`Insufficient stock or concurrent update for item: ${item.name}`);
      }
    }
  }

  // Create Invoice, InvoiceItems, and Ledger in the same ACID block...
});
```

---

## 4. Database Connection & Pooling Configuration

In Next.js serverless and Node environments, misconfigured connection pools cause pool exhaustion. Configure `pgBouncer` / connection limits:

```env
# Connection URL with PgBouncer connection pooling
DATABASE_URL="postgresql://user:password@host:6543/crystalpress?pgbouncer=true&connection_limit=15&pool_timeout=10"

# Direct URL for Prisma migrations & schema push
DIRECT_URL="postgresql://user:password@host:5432/crystalpress"
```
