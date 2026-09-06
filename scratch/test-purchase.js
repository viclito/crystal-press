const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) {
    let val = v.join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[k.trim()] = val;
  }
});

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testPurchase() {
  console.log('Testing supplier and PO flow...');

  // 1. Find or create a test supplier
  let vendor = await prisma.vendor.findFirst({ where: { name: 'ITC Paperboards Ltd' } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: 'ITC Paperboards Ltd',
        contactPerson: 'Anil Gupta',
        phone: '9845012345',
        address: 'Secunderabad Mill Depot',
        outstandingBalance: 0,
        isActive: true,
      },
    });
    console.log('Created test vendor:', vendor.name);
  }

  // 2. Pick a test product
  const product = await prisma.product.findFirst({ where: { isActive: true } });
  if (!product) {
    console.log('No products found to test restock');
    return;
  }

  const initialStock = Number(product.currentStock);
  console.log(`Product: ${product.name} | Initial Stock: ${initialStock}`);

  // 3. Test Purchase Order creation
  const count = await prisma.purchaseOrder.count();
  const currentYear = new Date().getFullYear();
  const poNumber = `PO-${currentYear}-${String(count + 1).padStart(4, '0')}`;
  const qtyInward = 25;
  const unitCost = Number(product.costPrice) || 150;
  const total = qtyInward * unitCost;

  const po = await prisma.$transaction(async (tx) => {
    const newPo = await tx.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: vendor.id,
        vendorBillNo: 'ITC-CHALLAN-901',
        totalAmount: total,
        paidAmount: total / 2, // 50% paid, 50% due
        items: {
          create: [{
            productId: product.id,
            quantity: qtyInward,
            unitCostPrice: unitCost,
            lineTotal: total,
          }],
        },
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: { increment: qtyInward } },
    });

    await tx.vendor.update({
      where: { id: vendor.id },
      data: { outstandingBalance: { increment: total / 2 } },
    });

    return newPo;
  });

  console.log('Recorded PO:', po.poNumber);

  // 4. Verify updated stock
  const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
  const finalStock = Number(updatedProduct.currentStock);
  console.log(`Updated Stock: ${finalStock} (Difference: +${finalStock - initialStock})`);

  if (finalStock - initialStock === qtyInward) {
    console.log('✅ TEST PASSED: Inventory stock incremented accurately by +' + qtyInward);
  } else {
    console.error('❌ Stock increment mismatch!');
  }
}

testPurchase().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
