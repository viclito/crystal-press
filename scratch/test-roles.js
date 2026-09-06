async function testRoles() {
  for (const [user, pass] of [['admin', 'admin123'], ['manager', 'manager123'], ['cashier', 'cashier123']]) {
    const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfRes.json();
    const cookies = csrfRes.headers.get('set-cookie');

    const res = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies || '',
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        username: user,
        password: pass,
        json: 'true',
      }),
      redirect: 'manual',
    });

    console.log(`Role ${user}: HTTP ${res.status}`);
  }
}

testRoles().catch(console.error);
