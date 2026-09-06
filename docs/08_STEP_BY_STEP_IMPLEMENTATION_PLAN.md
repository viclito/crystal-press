# 🗺️ 08. Step-by-Step Implementation Roadmap & Tracking

> **Project**: Crystal Press — Billing & Management ERP  
> **Status Tracker**: Updated continuously across development phases.

---

## 🎯 Comprehensive Feature Verification Checklist (100% Mapped)

| # | Feature Requested | Implementation Phase | Specification File Reference |
| :-: | :--- | :---: | :--- |
| **1** | **Login (username/password, Owner/Manager/Cashier)** | Phase 1 & 2 | [`01_PROJECT_SPECIFICATION.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#2) |
| **2** | **Product Master (Add/edit, category & sub-category, barcode)** | Phase 2 & 6 | [`02_DATABASE_ARCHITECTURE.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#2) |
| **3** | **Product Fast Search (Name/code/barcode, 1,500+ items, <10ms)** | Phase 4 & 6 | [`02_DATABASE_ARCHITECTURE.md#1`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#1), [`04_FRONTEND_PERFORMANCE.md#1`](file:///d:/Desktop/NEXT/crystalpress/docs/04_FRONTEND_PERFORMANCE.md#1) |
| **4** | **POS Billing Screen (Scan/search → cart → total → pay → thermal receipt)** | Phase 4 | [`04_FRONTEND_PERFORMANCE.md#3`](file:///d:/Desktop/NEXT/crystalpress/docs/04_FRONTEND_PERFORMANCE.md#3), [`05_ASSET_AND_PRINT_OPTIMIZATION.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/05_ASSET_AND_PRINT_OPTIMIZATION.md#2) |
| **5** | **Stock Auto-Deduction on Every Sale (Atomic StockLog/Adjustment)** | Phase 2 & 4 | [`02_DATABASE_ARCHITECTURE.md#3`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#3), [`06_API_AND_INTEGRATIONS.md#3`](file:///d:/Desktop/NEXT/crystalpress/docs/06_API_AND_INTEGRATIONS.md#3) |
| **6** | **Customer Lookup by Phone (Optional per bill, auto-populate)** | Phase 4 & 7 | [`01_PROJECT_SPECIFICATION.md#3`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#3) |
| **7** | **Daily Sales Report (Today's total, cash/UPI split, bill list)** | Phase 8 | [`01_PROJECT_SPECIFICATION.md#9`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#9), [`03_UI_UX_DESIGN_SYSTEM.md#3`](file:///d:/Desktop/NEXT/crystalpress/docs/03_UI_UX_DESIGN_SYSTEM.md#3) |
| **8** | **Thermal (80mm/58mm) & A4 Print-Friendly Layouts** | Phase 4 & 5 | [`05_ASSET_AND_PRINT_OPTIMIZATION.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/05_ASSET_AND_PRINT_OPTIMIZATION.md#2) |
| **9** | **Job Order Module (Specs, advance payment, multi-status pipeline)** | Phase 5 | [`01_PROJECT_SPECIFICATION.md#4`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#4) |
| **10**| **Job Order → Convert to Final Bill on Delivery** | Phase 5 | [`01_PROJECT_SPECIFICATION.md#4`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#4) |
| **11**| **Regular / Desktop Billing Screen (Bulk stationery & job order bills)** | Phase 4 & 5 | [`01_PROJECT_SPECIFICATION.md#5`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#5) |
| **12**| **Low-Stock Alert List on Dashboard** | Phase 3 & 8 | [`02_DATABASE_ARCHITECTURE.md#1`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#1), [`03_UI_UX_DESIGN_SYSTEM.md#3`](file:///d:/Desktop/NEXT/crystalpress/docs/03_UI_UX_DESIGN_SYSTEM.md#3) |
| **13**| **Customer Credit (Udhaar) Tracking (DUE/PARTIAL, balance, ledger)** | Phase 7 | [`01_PROJECT_SPECIFICATION.md#6`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#6), [`02_DATABASE_ARCHITECTURE.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#2) |
| **14**| **WhatsApp Send Button (wa.me link with prefilled bill & job ready alerts)**| Phase 4, 5 & 6 | [`06_API_AND_INTEGRATIONS.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/06_API_AND_INTEGRATIONS.md#2) |
| **15**| **Purchase Entry (Vendor, items, cost price) → Auto Stock Increase** | Phase 6 | [`01_PROJECT_SPECIFICATION.md#7`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#7), [`02_DATABASE_ARCHITECTURE.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#2) |
| **16**| **Razorpay / Dynamic UPI Payment Gateway Integration** | Phase 4 & 6 | [`06_API_AND_INTEGRATIONS.md#1`](file:///d:/Desktop/NEXT/crystalpress/docs/06_API_AND_INTEGRATIONS.md#1) |
| **17**| **Comprehensive Reports (Profit/margin, stock valuation, category sales)**| Phase 8 | [`01_PROJECT_SPECIFICATION.md#9`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#9) |
| **18**| **Role: Manager (Bridging Owner and Cashier permissions)** | Phase 1 & 2 | [`01_PROJECT_SPECIFICATION.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#2) |
| **19**| **Edit / Delete Audit Log on Bills & Sensitive Operations** | Phase 2 & 9 | [`01_PROJECT_SPECIFICATION.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#2), [`02_DATABASE_ARCHITECTURE.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#2) |
| **20**| **Automated DB Backup (JSON/SQL dump export & scheduled backups)** | Phase 9 | [`06_API_AND_INTEGRATIONS.md#4`](file:///d:/Desktop/NEXT/crystalpress/docs/06_API_AND_INTEGRATIONS.md#4) |
| **21**| **Bill/Receipt Template Customization (Shop logo, footer, terms)** | Phase 9 | [`02_DATABASE_ARCHITECTURE.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/02_DATABASE_ARCHITECTURE.md#2), [`05_ASSET_AND_PRINT_OPTIMIZATION.md#2`](file:///d:/Desktop/NEXT/crystalpress/docs/05_ASSET_AND_PRINT_OPTIMIZATION.md#2) |
| **22**| **Reorder Suggestions Based on Sales Velocity** | Phase 6 & 8 | [`01_PROJECT_SPECIFICATION.md#7`](file:///d:/Desktop/NEXT/crystalpress/docs/01_PROJECT_SPECIFICATION.md#7) |

---

## 🚦 Phase Execution Matrix

| Phase | Description | Status | Deliverables |
| :---: | :--- | :---: | :--- |
| **01** | **Project Initialization & Foundation** | ✅ Completed | Next.js 14+, TypeScript, Tailwind CSS, custom design tokens, Shadcn UI setup, core package installations. |
| **02** | **Database Schema & Seed Engine** | ✅ Completed | PostgreSQL Prisma schema, connection singleton, comprehensive seed script with 50+ sample SKUs, categories, units, users. |
| **03** | **Lodgify-Style App Shell & UI Kit** | ✅ Completed | Navigation sidebar with active lime pill, top header with live shift/clock, StatCard, StatusBadge, SegmentedMetricBar, CustomDataTable. |
| **04** | **High-Speed Counter POS (Flow A)** | ✅ Completed | Zustand in-memory cart, virtualized catalog, HID hardware barcode scanner wedge, F2/F4/F8/F9 shortcuts, dynamic UPI QR modal, 80mm thermal receipt engine, WhatsApp bill dispatch, hold bills. |
| **05** | **Custom Printing Job Orders (Flow B)** | ✅ Completed | Multi-stage Kanban pipeline, job order creation with parametric specs (paper, GSM, size, finishing), advance token collection, printable production job card, WhatsApp pickup alert, balance settlement. |
| **06** | **1,500 SKU Inventory & Spoilage** | ✅ Completed | Virtualized product catalog table, SKU/barcode generator, printable barcode sheets, paper/print spoilage adjustment screen, purchase orders restocking. |
| **07** | **Customer & Credit (Udhaar) Ledger** | ✅ Completed | Customer profiles, credit limits, chronological debit/credit ledger statement, quick payment collection modal. |
| **08** | **Executive Analytics & Reporting** | ✅ Completed | Today's sales KPI cards, revenue trend area chart, payment method donut chart, fast-moving items, recent activity timeline. |
| **09** | **Settings, Audit & Final Verification** | ✅ Completed | Shop profile & tax settings, audit log viewer, JSON/CSV backup/export, full E2E & performance testing. |

---

## 🛠️ Step-by-Step Detailed Action Items

### Phase 1: Project Setup & Custom Tokens
- [ ] Initialize Next.js 14+ App Router project.
- [ ] Configure `tailwind.config.ts` with custom colors (`lime-400`, `lime-500`, `slate-900`, `slate-50`) and radius (`1.25rem`).
- [ ] Install: `@prisma/client`, `prisma`, `@tanstack/react-query`, `@tanstack/react-virtual`, `zustand`, `lucide-react`, `framer-motion`, `qrcode.react`, `zod`, `clsx`, `tailwind-merge`, `idb-keyval`.
- [ ] Create folder structure: `src/app`, `src/components`, `src/lib`, `src/stores`, `src/hooks`, `src/actions`, `src/types`.

### Phase 2: PostgreSQL Schema & Database Engine
- [ ] Generate `prisma/schema.prisma` with all models.
- [ ] Create `src/lib/prisma.ts` connection manager.
- [ ] Create `prisma/seed.ts` for instant development dataset.

### Phase 3: Lodgify-Inspired App Shell
- [ ] Build `Sidebar.tsx` with rounded lime active pill & bottom widget card.
- [ ] Build `Header.tsx` with live clock, cashier shift, and quick search.
- [ ] Build reusable UI kit: `StatCard.tsx`, `StatusBadge.tsx`, `SegmentedMetricBar.tsx`, `CustomDataTable.tsx`.

### Phase 4: High-Speed Counter POS Billing
- [ ] Build `src/stores/usePOSStore.ts` (instant in-memory cart calculations).
- [ ] Build `src/hooks/useBarcodeScanner.ts` (global HID keyboard wedge listener).
- [ ] Build `src/components/pos/VirtualizedProductGrid.tsx`.
- [ ] Build `src/components/pos/POSCart.tsx` with quick tender and discount controls.
- [ ] Build `src/components/pos/UPIPaymentModal.tsx` (dynamic QR generation).
- [ ] Build `src/components/print/ThermalReceipt.tsx` (native hidden iframe print engine).
- [ ] Implement Server Action `processCounterCheckout` with atomic stock decrement.

### Phase 5: Custom Printing Job Orders
- [ ] Build `src/app/jobs/page.tsx` (visual Kanban pipeline + table view).
- [ ] Build `JobOrderModal.tsx` (specs: paper, GSM, size, finishing, advance amount).
- [ ] Build `JobWorkOrderPrint.tsx` (workshop production job card).
- [ ] Build WhatsApp alert generator for order ready pickup.
- [ ] Build "Convert Job to Final Bill" workflow.

### Phase 6: Inventory & Spoilage
- [ ] Build `src/app/inventory/page.tsx` with virtualized table & filter chips.
- [ ] Build `StockAdjustmentModal.tsx` for paper spoilage & misprints.
- [ ] Build `BarcodeSheetPrint.tsx` for printing product barcode labels.

### Phase 7: Customers & Credit (Udhaar)
- [ ] Build `src/app/customers/page.tsx` with search & credit limit warning.
- [ ] Build `CustomerLedgerModal.tsx` with statement breakdown.
- [ ] Build `CollectPaymentModal.tsx` with auto ledger update.

### Phase 8: Executive Dashboard
- [ ] Build `src/app/page.tsx` with Lodgify-inspired KPI widgets, revenue area chart, and donut breakdown.

### Phase 9: Settings, Audit & Backup
- [ ] Build `src/app/settings/page.tsx` (shop info, UPI ID, optional tax switch).
- [ ] Build `src/app/settings/audit-logs/page.tsx`.
- [ ] Build JSON/CSV data export utilities.
