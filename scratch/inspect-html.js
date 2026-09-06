async function main() {
  const res = await fetch("http://localhost:3000/login");
  const html = await res.text();
  console.log("=== HEAD OF /login ===");
  console.log(html.slice(0, 1500));
}
main().catch(console.error);
