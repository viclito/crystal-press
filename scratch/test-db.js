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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('Testing with current DATABASE_URL:', process.env.DATABASE_URL);
  try {
    const count = await prisma.user.count();
    console.log('Users count:', count);
    const users = await prisma.user.findMany({ select: { username: true, passwordHash: true, role: true } });
    console.log('Users in DB:', users);
  } catch (err) {
    console.error('Error with current URL:', err.message);

    // Try removing channel_binding
    const altUrl = process.env.DATABASE_URL.replace('&channel_binding=require', '').replace('channel_binding=require', '');
    console.log('\nTesting with alternate URL:', altUrl);
    const altPrisma = new PrismaClient({
      datasources: { db: { url: altUrl } }
    });
    try {
      const count2 = await altPrisma.user.count();
      console.log('Users count with alt URL:', count2);
      const users2 = await altPrisma.user.findMany({ select: { username: true, passwordHash: true, role: true } });
      console.log('Users in DB with alt URL:', users2);
    } catch (err2) {
      console.error('Error with alt URL:', err2.message);
    } finally {
      await altPrisma.$disconnect();
    }
  } finally {
    await prisma.$disconnect();
  }
}

test();
