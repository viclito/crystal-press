import { PrismaClient, UserRole, JobStatus, PaymentMethod } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Crystal Press Database...");

  // 1. Clean existing records (Optional / Idempotent)
  await prisma.auditLog.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.customerLedger.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.jobOrderAttachment.deleteMany();
  await prisma.jobOrder.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.vendorPayment.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.subCategory.deleteMany();
  await prisma.category.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shopSettings.deleteMany();

  // 2. Create Users
  const adminUser = await prisma.user.create({
    data: {
      username: "admin",
      fullName: "Owner (Jaylon Dorwart)",
      passwordHash: "admin123", // In production: bcrypt hash
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      username: "manager",
      fullName: "Ramesh Sharma",
      passwordHash: "manager123",
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  const cashierUser = await prisma.user.create({
    data: {
      username: "cashier",
      fullName: "Suresh Kumar",
      passwordHash: "cashier123",
      role: UserRole.CASHIER,
      isActive: true,
    },
  });

  console.log("✅ Users created (admin, manager, cashier)");

  // 3. Create Shop Settings
  await prisma.shopSettings.create({
    data: {
      shopName: "Crystal Press",
      tagline: "Printing Press & Premium Stationery Retail",
      addressLine1: "42, Market Complex, Opp. Town Hall",
      addressLine2: "Main Commercial Road, District Center",
      phone1: "+91 98765 43210",
      phone2: "+91 98765 43211",
      email: "billing@crystalpress.com",
      upiId: "crystalpress@okaxis",
      upiPayeeName: "Crystal Press",
      invoicePrefix: "CP",
      jobOrderPrefix: "JO",
      receiptFooter: "Thank you for visiting Crystal Press! Goods once sold can be exchanged within 3 days.",
      termsConditions: "1. 50% advance mandatory on all custom print jobs.\n2. Design approval on WhatsApp is final.\n3. Delivery subject to proof confirmation.",
      defaultTaxRate: 0,
      isTaxEnabled: false,
    },
  });

  console.log("✅ Shop Settings created");

  // 4. Create Units
  const units = await Promise.all([
    prisma.unit.create({ data: { code: "pcs", name: "Pieces", allowsFraction: false } }),
    prisma.unit.create({ data: { code: "ream", name: "Ream (500 Sheets)", allowsFraction: false } }),
    prisma.unit.create({ data: { code: "box", name: "Box / Carton", allowsFraction: false } }),
    prisma.unit.create({ data: { code: "pkt", name: "Packet", allowsFraction: false } }),
    prisma.unit.create({ data: { code: "roll", name: "Roll", allowsFraction: false } }),
    prisma.unit.create({ data: { code: "sq_ft", name: "Square Feet", allowsFraction: true } }),
    prisma.unit.create({ data: { code: "dozen", name: "Dozen (12 Pcs)", allowsFraction: false } }),
  ]);

  const unitMap = new Map(units.map((u) => [u.code, u.id]));

  // 5. Create Categories & Subcategories
  const catPaper = await prisma.category.create({
    data: {
      name: "Paper & Boards",
      slug: "paper-boards",
      displayOrder: 1,
      subCategories: {
        create: [
          { name: "A4 Copier Paper", slug: "a4-copier-paper", displayOrder: 1 },
          { name: "Art Cards & Gloss (300/350 GSM)", slug: "art-cards", displayOrder: 2 },
          { name: "Executive Bond Paper", slug: "bond-paper", displayOrder: 3 },
          { name: "Color & Craft Sheets", slug: "color-sheets", displayOrder: 4 },
        ],
      },
    },
    include: { subCategories: true },
  });

  const catStationery = await prisma.category.create({
    data: {
      name: "Stationery & Writing",
      slug: "stationery-writing",
      displayOrder: 2,
      subCategories: {
        create: [
          { name: "Ballpoint & Gel Pens", slug: "pens", displayOrder: 1 },
          { name: "Permanent & Whiteboard Markers", slug: "markers", displayOrder: 2 },
          { name: "Registers, Notebooks & Pads", slug: "notebooks", displayOrder: 3 },
          { name: "Files, Folders & Binders", slug: "files-folders", displayOrder: 4 },
        ],
      },
    },
    include: { subCategories: true },
  });

  const catConsumables = await prisma.category.create({
    data: {
      name: "Printing Consumables",
      slug: "printing-consumables",
      displayOrder: 3,
      subCategories: {
        create: [
          { name: "Thermal Paper Rolls (80mm / 58mm)", slug: "thermal-rolls", displayOrder: 1 },
          { name: "Lamination Pouches & Rolls", slug: "lamination", displayOrder: 2 },
          { name: "Spiral Coils & Binding Strips", slug: "spiral-coils", displayOrder: 3 },
          { name: "ID Card Holders & Lanyards", slug: "id-cards-supplies", displayOrder: 4 },
        ],
      },
    },
    include: { subCategories: true },
  });

  const catOffice = await prisma.category.create({
    data: {
      name: "Office Tools & Adhesives",
      slug: "office-tools",
      displayOrder: 4,
      subCategories: {
        create: [
          { name: "Staplers, Pins & Punches", slug: "staplers-punches", displayOrder: 1 },
          { name: "Tapes, Adhesives & Glues", slug: "tapes-glues", displayOrder: 2 },
          { name: "Calculators & Desk Accessories", slug: "calculators-desk", displayOrder: 3 },
        ],
      },
    },
    include: { subCategories: true },
  });

  console.log("✅ Categories & SubCategories created");

  const subCatA4 = catPaper.subCategories.find((s) => s.slug === "a4-copier-paper")!.id;
  const subCatArt = catPaper.subCategories.find((s) => s.slug === "art-cards")!.id;
  const subCatBond = catPaper.subCategories.find((s) => s.slug === "bond-paper")!.id;
  const subCatPens = catStationery.subCategories.find((s) => s.slug === "pens")!.id;
  const subCatMarkers = catStationery.subCategories.find((s) => s.slug === "markers")!.id;
  const subCatNotebooks = catStationery.subCategories.find((s) => s.slug === "notebooks")!.id;
  const subCatThermal = catConsumables.subCategories.find((s) => s.slug === "thermal-rolls")!.id;
  const subCatLamination = catConsumables.subCategories.find((s) => s.slug === "lamination")!.id;
  const subCatSpiral = catConsumables.subCategories.find((s) => s.slug === "spiral-coils")!.id;
  const subCatOffice = catOffice.subCategories.find((s) => s.slug === "staplers-punches")!.id;
  const subCatTapes = catOffice.subCategories.find((s) => s.slug === "tapes-glues")!.id;

  // 6. Create Initial 30+ Diverse Products
  const sampleProducts = [
    // Paper
    { name: "JK Copier Paper 75 GSM - A4 Ream (500 Sheets)", skuCode: "PAP-JK-75A4", barcode: "890123450001", subCategoryId: subCatA4, unitId: unitMap.get("ream")!, costPrice: 280, sellingPrice: 340, currentStock: 85, minStockAlert: 20 },
    { name: "Bilt Matrix Copier Paper 70 GSM - A4 Ream", skuCode: "PAP-BLT-70A4", barcode: "890123450002", subCategoryId: subCatA4, unitId: unitMap.get("ream")!, costPrice: 240, sellingPrice: 295, currentStock: 60, minStockAlert: 15 },
    { name: "TNPL Copier Paper 80 GSM - A4 Ream", skuCode: "PAP-TNP-80A4", barcode: "890123450003", subCategoryId: subCatA4, unitId: unitMap.get("ream")!, costPrice: 310, sellingPrice: 380, currentStock: 40, minStockAlert: 10 },
    { name: "Century Art Card 300 GSM Matte (Pack of 100 Sheets)", skuCode: "PAP-CEN-300M", barcode: "890123450004", subCategoryId: subCatArt, unitId: unitMap.get("pkt")!, costPrice: 450, sellingPrice: 590, currentStock: 25, minStockAlert: 5 },
    { name: "Century Art Card 350 GSM Gloss (Pack of 100 Sheets)", skuCode: "PAP-CEN-350G", barcode: "890123450005", subCategoryId: subCatArt, unitId: unitMap.get("pkt")!, costPrice: 520, sellingPrice: 680, currentStock: 18, minStockAlert: 5 },
    { name: "Royal Executive Bond Paper 85 GSM - 500 Sheets", skuCode: "PAP-ROY-85B", barcode: "890123450006", subCategoryId: subCatBond, unitId: unitMap.get("ream")!, costPrice: 650, sellingPrice: 850, currentStock: 12, minStockAlert: 4 },

    // Pens & Writing
    { name: "Reynolds 045 Fine Ballpoint Pen (Blue, Box of 20)", skuCode: "PEN-REY-045B", barcode: "890123450010", subCategoryId: subCatPens, unitId: unitMap.get("box")!, costPrice: 150, sellingPrice: 200, currentStock: 50, minStockAlert: 10 },
    { name: "Reynolds 045 Fine Ballpoint Pen (Single Pc)", skuCode: "PEN-REY-045S", barcode: "890123450011", subCategoryId: subCatPens, unitId: unitMap.get("pcs")!, costPrice: 7.5, sellingPrice: 10, currentStock: 320, minStockAlert: 50 },
    { name: "Cello Butterflow Blue Ballpoint Pen (Pack of 10)", skuCode: "PEN-CEL-BUT10", barcode: "890123450012", subCategoryId: subCatPens, unitId: unitMap.get("pkt")!, costPrice: 80, sellingPrice: 100, currentStock: 45, minStockAlert: 10 },
    { name: "Uniball Eye UB-150 Rollerball Pen (Blue)", skuCode: "PEN-UNI-UB150", barcode: "890123450013", subCategoryId: subCatPens, unitId: unitMap.get("pcs")!, costPrice: 65, sellingPrice: 85, currentStock: 28, minStockAlert: 8 },
    { name: "Camlin Whiteboard Marker (Black / Blue / Red Assorted)", skuCode: "MRK-CAM-WB4", barcode: "890123450014", subCategoryId: subCatMarkers, unitId: unitMap.get("pkt")!, costPrice: 90, sellingPrice: 120, currentStock: 35, minStockAlert: 10 },
    { name: "Faber-Castell Textliner Pastel Highlighters (Set of 6)", skuCode: "MRK-FC-PAST6", barcode: "890123450015", subCategoryId: subCatMarkers, unitId: unitMap.get("pkt")!, costPrice: 160, sellingPrice: 220, currentStock: 15, minStockAlert: 5 },

    // Registers & Notebooks
    { name: "Hardbound Accounts Register 4-Quire (384 Pages)", skuCode: "NB-ACC-4Q", barcode: "890123450020", subCategoryId: subCatNotebooks, unitId: unitMap.get("pcs")!, costPrice: 140, sellingPrice: 195, currentStock: 30, minStockAlert: 8 },
    { name: "Classmate Spiral Notebook A4 Ruled (300 Pages)", skuCode: "NB-CLM-A4300", barcode: "890123450021", subCategoryId: subCatNotebooks, unitId: unitMap.get("pcs")!, costPrice: 115, sellingPrice: 160, currentStock: 42, minStockAlert: 12 },
    { name: "Carbonless Duplicate Bill Book (100 Sets)", skuCode: "NB-BIL-DUP100", barcode: "890123450022", subCategoryId: subCatNotebooks, unitId: unitMap.get("pcs")!, costPrice: 45, sellingPrice: 75, currentStock: 55, minStockAlert: 15 },

    // Consumables & Thermal Rolls
    { name: "Thermal Billing Paper Roll 80mm x 50m (Pack of 10)", skuCode: "CON-TH-8050", barcode: "890123450030", subCategoryId: subCatThermal, unitId: unitMap.get("pkt")!, costPrice: 320, sellingPrice: 420, currentStock: 22, minStockAlert: 6 },
    { name: "Thermal POS Paper Roll 58mm x 25m (Box of 20)", skuCode: "CON-TH-5825", barcode: "890123450031", subCategoryId: subCatThermal, unitId: unitMap.get("box")!, costPrice: 280, sellingPrice: 380, currentStock: 14, minStockAlert: 5 },
    { name: "A4 Lamination Pouch 125 Micron (Pack of 100)", skuCode: "CON-LAM-A4125", barcode: "890123450032", subCategoryId: subCatLamination, unitId: unitMap.get("pkt")!, costPrice: 290, sellingPrice: 390, currentStock: 30, minStockAlert: 10 },
    { name: "Plastic Spiral Binding Coils 10mm (Box of 100)", skuCode: "CON-SPI-10MM", barcode: "890123450033", subCategoryId: subCatSpiral, unitId: unitMap.get("box")!, costPrice: 160, sellingPrice: 230, currentStock: 18, minStockAlert: 5 },
    { name: "Plastic Spiral Binding Coils 14mm (Box of 100)", skuCode: "CON-SPI-14MM", barcode: "890123450034", subCategoryId: subCatSpiral, unitId: unitMap.get("box")!, costPrice: 210, sellingPrice: 290, currentStock: 16, minStockAlert: 5 },

    // Tools & Tapes
    { name: "Kangaro HD-10 Heavy Duty Stapler", skuCode: "OFC-KAN-HD10", barcode: "890123450040", subCategoryId: subCatOffice, unitId: unitMap.get("pcs")!, costPrice: 85, sellingPrice: 120, currentStock: 25, minStockAlert: 5 },
    { name: "Kangaro No. 10 Stapler Pins (Box of 20 packets)", skuCode: "OFC-KAN-PIN10", barcode: "890123450041", subCategoryId: subCatOffice, unitId: unitMap.get("box")!, costPrice: 110, sellingPrice: 150, currentStock: 40, minStockAlert: 10 },
    { name: "Brown Packaging Tape 2-Inch (65 Meters)", skuCode: "OFC-TAP-BRW2", barcode: "890123450042", subCategoryId: subCatTapes, unitId: unitMap.get("roll")!, costPrice: 48, sellingPrice: 70, currentStock: 65, minStockAlert: 15 },
    { name: "Wonder Transparent Tape 1-Inch (30 Meters)", skuCode: "OFC-TAP-TRN1", barcode: "890123450043", subCategoryId: subCatTapes, unitId: unitMap.get("roll")!, costPrice: 18, sellingPrice: 30, currentStock: 80, minStockAlert: 20 },
    { name: "Fevicol MR Squeezy Glue Bottle (200g)", skuCode: "OFC-FEV-200G", barcode: "890123450044", subCategoryId: subCatTapes, unitId: unitMap.get("pcs")!, costPrice: 42, sellingPrice: 55, currentStock: 35, minStockAlert: 8 },
  ];

  for (const prod of sampleProducts) {
    await prisma.product.create({
      data: prod,
    });
  }

  console.log(`✅ Seeded ${sampleProducts.length} diverse Products`);

  // 7. Create Sample Customers
  const custWalkIn = await prisma.customer.create({
    data: {
      name: "Walk-in Customer",
      phone: "0000000000",
      currentBalance: 0,
      creditLimit: 0,
      notes: "Default retail counter walk-in customer",
    },
  });

  const custRajesh = await prisma.customer.create({
    data: {
      name: "Rajesh Graphics & Printers",
      phone: "9823011223",
      email: "rajesh.graphics@gmail.com",
      address: "Shop 12, Graphic Plaza, Industrial Estate",
      currentBalance: 3200, // Active Udhaar
      creditLimit: 15000,
      notes: "Regular client for visiting cards & offset papers",
    },
  });

  const custShree = await prisma.customer.create({
    data: {
      name: "Shree Lakshmi Enterprises",
      phone: "9845099887",
      email: "shreelakshmi@yahoo.com",
      address: "4th Cross, Gandhi Nagar",
      currentBalance: 0,
      creditLimit: 25000,
    },
  });

  const custAnil = await prisma.customer.create({
    data: {
      name: "Dr. Anil Mehta (Clinic)",
      phone: "9988112233",
      address: "Apollo Complex, City Center",
      currentBalance: 850,
      creditLimit: 5000,
    },
  });

  console.log("✅ Customers created (including Udhaar regular accounts)");

  // 8. Create Sample Vendors
  await prisma.vendor.create({
    data: {
      name: "JK Paper Mills Ltd Wholesale Distributor",
      contactPerson: "Alok Gupta",
      phone: "9811223344",
      address: "Wholesale Paper Market, Godown 4",
      outstandingBalance: 12400,
    },
  });

  await prisma.vendor.create({
    data: {
      name: "Kangaro Stationery & Office Suppliers",
      contactPerson: "Vikas Jain",
      phone: "9822334455",
      address: "Stationery Mart, Sector 18",
      outstandingBalance: 4500,
    },
  });

  console.log("✅ Vendors created");

  // 9. Create Sample Custom Job Orders (Printing Press Flow B)
  await prisma.jobOrder.create({
    data: {
      jobOrderNumber: "JO-2026-0001",
      customerId: custRajesh.id,
      customerName: custRajesh.name,
      customerPhone: custRajesh.phone,
      jobType: "Visiting Cards (Premium Matte)",
      specifications: {
        size: "3.5 x 2.0 inches",
        paperType: "350 GSM Art Card with Thermal Matte Lamination",
        colors: "4+4 (Full Color Both Sides)",
        finishing: "Spot UV on Logo + Rounded Corners",
        designProvided: true,
      },
      quantity: 1000,
      unitName: "pcs",
      totalAmount: 1650,
      advancePaid: 650,
      balanceDue: 1000,
      status: JobStatus.PRINTING,
      proofApproved: true,
      proofApprovedAt: new Date(Date.now() - 24 * 3600 * 1000),
      expectedDeliveryDate: new Date(Date.now() + 24 * 3600 * 1000),
      createdById: adminUser.id,
    },
  });

  await prisma.jobOrder.create({
    data: {
      jobOrderNumber: "JO-2026-0002",
      customerId: custAnil.id,
      customerName: custAnil.name,
      customerPhone: custAnil.phone,
      jobType: "Doctor Prescription Pads (100 Sheets each)",
      specifications: {
        size: "A5 (5.8 x 8.3 inches)",
        paperType: "80 GSM Executive Bond Paper",
        colors: "2+0 (Navy Blue & Medical Green)",
        finishing: "Top Padded with Strawboard Backing",
      },
      quantity: 20,
      unitName: "pads",
      totalAmount: 1800,
      advancePaid: 1000,
      balanceDue: 800,
      status: JobStatus.READY_FOR_PICKUP,
      proofApproved: true,
      proofApprovedAt: new Date(Date.now() - 48 * 3600 * 1000),
      expectedDeliveryDate: new Date(),
      createdById: cashierUser.id,
    },
  });

  await prisma.jobOrder.create({
    data: {
      jobOrderNumber: "JO-2026-0003",
      customerName: "Grand Wedding Planners (Pooja Weds Rahul)",
      customerPhone: "9711224466",
      jobType: "Royal Wedding Invitation Cards",
      specifications: {
        size: "7.5 x 9.5 inches Tri-Fold",
        paperType: "Metallic Golden Shimmer Board (280 GSM)",
        colors: "Screen Print Gold Foil + Maroon",
        finishing: "Die Cut Floral Lace + Gold Ribbon Tie",
      },
      quantity: 500,
      unitName: "cards",
      totalAmount: 14500,
      advancePaid: 5000,
      balanceDue: 9500,
      status: JobStatus.DESIGNING,
      proofApproved: false,
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      createdById: adminUser.id,
    },
  });

  console.log("✅ Sample Job Orders created (Visiting cards, Pads, Wedding cards)");

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
