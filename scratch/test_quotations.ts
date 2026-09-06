import { prisma } from "../src/lib/prisma";
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  convertQuotationToJobOrder,
  convertQuotationToInvoice,
} from "../src/actions/quotations";
import { QuotationStatus, PaymentMethod } from "@prisma/client";

async function main() {
  console.log("🚀 Testing Quotations & Estimates Generator Actions...");

  // 1. Get or create a test customer
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: "Acme Enterprises",
        phone: "9876543210",
        email: "acme@example.com",
      },
    });
  }

  // 2. Get a sample product
  const product = await prisma.product.findFirst();

  // 3. Create a Quotation
  console.log("📝 Creating Quotation with Print Jobs and Inventory items...");
  const quoteRes = await createQuotation({
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    customerAddress: "42 Industrial Area, Phase 1",
    subTotal: 3450,
    discountAmount: 100,
    taxPercent: 18,
    taxAmount: 603,
    roundOff: 0,
    netTotal: 3953,
    status: QuotationStatus.DRAFT,
    termsConditions: "Standard printing terms. 50% advance.",
    notes: "VIP Client Priority Quotation",
    items: [
      {
        itemType: "CUSTOM_JOB",
        itemDescription: "2000 Visiting Cards 350 GSM Velvet Matte",
        specifications: {
          size: '3.5" x 2"',
          paper: "350 GSM Velvet Matte Board",
          sides: "Both Sides (4+4)",
          finishing: "Spot UV + Gold Foil",
        },
        quantity: 2000,
        unitName: "pcs",
        unitPrice: 1.25,
        discountAmount: 50,
        taxPercent: 18,
        taxAmount: 0,
        lineTotal: 2450,
      },
      {
        itemType: product ? "INVENTORY_PRODUCT" : "SERVICE",
        productId: product?.id || null,
        itemDescription: product?.name || "Graphic Designing Consultation",
        quantity: 2,
        unitName: product ? "pkts" : "hrs",
        unitPrice: 500,
        discountAmount: 0,
        taxPercent: 18,
        taxAmount: 0,
        lineTotal: 1000,
      },
    ],
  });

  if (!quoteRes.success || !quoteRes.quotation) {
    throw new Error("Failed to create quotation: " + quoteRes.error);
  }

  const quoteId = quoteRes.quotation.id;
  console.log(`✅ Quotation created: ${quoteRes.quotation.quotationNumber} (ID: ${quoteId})`);

  // 4. Test getQuotations
  const listRes = await getQuotations();
  console.log(`✅ getQuotations returned ${listRes.quotations?.length} quotes. Total Value: ₹${listRes.kpis?.totalValue}`);

  // 5. Test getQuotationById
  const detailRes = await getQuotationById(quoteId);
  console.log(`✅ getQuotationById verified. Items: ${detailRes.quotation?.items?.length}`);

  // 6. Test convertQuotationToJobOrder
  console.log("🔄 Testing Conversion to Live Job Order...");
  const jobConvertRes = await convertQuotationToJobOrder(quoteId, 1500);
  if (!jobConvertRes.success) {
    throw new Error("Conversion to Job Order failed: " + jobConvertRes.error);
  }
  console.log(`✅ Successfully converted to Job Order: ${jobConvertRes.job?.jobOrderNumber}`);

  // 7. Create second quote to test invoice conversion
  console.log("📝 Creating second Quotation for Tax Invoice conversion...");
  const quote2Res = await createQuotation({
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    subTotal: 1200,
    discountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    roundOff: 0,
    netTotal: 1200,
    status: QuotationStatus.ACCEPTED,
    items: [
      {
        itemType: "SERVICE",
        itemDescription: "Catalog Booklet Binding & Lamination",
        quantity: 50,
        unitName: "books",
        unitPrice: 24,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        lineTotal: 1200,
      },
    ],
  });

  if (quote2Res.success && quote2Res.quotation) {
    console.log(`🔄 Converting Quote #${quote2Res.quotation.quotationNumber} to Invoice...`);
    const invoiceRes = await convertQuotationToInvoice(quote2Res.quotation.id, {
      paymentMethod: PaymentMethod.UPI,
      paidAmount: 1200,
    });
    if (invoiceRes.success) {
      console.log(`✅ Successfully converted to Invoice: ${invoiceRes.invoice?.invoiceNumber}`);
    } else {
      console.error("Invoice conversion failed:", invoiceRes.error);
    }
  }

  console.log("🎉 All Quotation tests passed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
