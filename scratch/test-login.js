async function testLogin() {
  console.log('Fetching CSRF token...');
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  console.log('CSRF Token:', csrfData.csrfToken);

  const cookies = csrfRes.headers.get('set-cookie');

  console.log('Posting credentials for admin...');
  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies || '',
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      username: 'admin',
      password: 'admin123',
      json: 'true',
    }),
    redirect: 'manual',
  });

  console.log('Login HTTP Status:', loginRes.status);
  const text = await loginRes.text();
  console.log('Response body:', text);
}

testLogin().catch(console.error);
