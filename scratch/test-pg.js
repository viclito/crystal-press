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

async function test() {
  console.log('Testing pg pool connection to Neon...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT username, "fullName", role, "passwordHash", "isActive" FROM users');
    console.log('SUCCESS! Users found via pg:');
    console.log(res.rows);
  } catch (err) {
    console.error('pg error:', err);
  } finally {
    await pool.end();
  }
}

test();
