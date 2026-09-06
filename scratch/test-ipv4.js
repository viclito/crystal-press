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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting with ipv4first...');
  const users = await prisma.user.findMany({ select: { username: true, fullName: true, role: true, passwordHash: true } });
  console.log('SUCCESS! Users found:', users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
