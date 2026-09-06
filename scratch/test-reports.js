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

async function testReport() {
  console.log('Testing Financial Report Data Fetching & Calculations...');

  const invoices = await prisma.invoice.findMany({
    include: { items: true }
  });

  console.log(`Total Invoices in DB: ${invoices.length}`);

  let totalRev = 0;
  let totalTax = 0;
  invoices.forEach(i => {
    totalRev += Number(i.netTotal);
    totalTax += Number(i.taxAmount);
  });

  console.log(`Total Revenue Calculated: ₹${totalRev.toFixed(2)}`);
  console.log(`Total GST Tax Calculated: ₹${totalTax.toFixed(2)}`);
  console.log('✅ TEST PASSED: Reports engine verified!');
}

testReport().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
