async function main() {
  const html = await fetch("http://localhost:3000/login").then((r) => r.text());
  console.log("HTML length:", html.length);
  const regex = /href="(\/_next\/static\/[^"]+\.css[^"]*)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const cssPath = match[1];
    const res = await fetch("http://localhost:3000" + cssPath);
    const cssText = await res.text();
    console.log("CSS Path:", cssPath, "HTTP Status:", res.status, "CSS Size:", cssText.length, "bytes");
  }
}
main().catch(console.error);
