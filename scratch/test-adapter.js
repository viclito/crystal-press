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

async function test() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.user.findMany({
      select: { username: true, fullName: true, role: true }
    });
    console.log('ADAPTER SUCCESS! Users from Prisma with pg adapter:', users);
  } catch (err) {
    console.error('Adapter error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
