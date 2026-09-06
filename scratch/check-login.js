async function checkLoginHtml() {
  const res = await fetch('http://localhost:3000/login');
  console.log('HTTP Status:', res.status);
  const html = await res.text();
  console.log('HTML Length:', html.length);
  const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/);
  console.log('CSS Link found in HTML:', cssMatch ? cssMatch[1] : 'NONE');
  if (cssMatch) {
    const cssRes = await fetch('http://localhost:3000' + cssMatch[1]);
    console.log('CSS fetch status:', cssRes.status);
    const cssText = await cssRes.text();
    console.log('CSS bytes:', cssText.length);
  }
}

checkLoginHtml().catch(console.error);
