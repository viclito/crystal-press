const fs = require('fs');
const path = require('path');

function searchDir(dir, regex) {
  let results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(searchDir(fullPath, regex));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          results.push({ file: fullPath, line: idx + 1, content: line.trim() });
        }
      });
    }
  }
  return results;
}

const alerts = searchDir(path.join(__dirname, '..', 'src'), /\b(alert|confirm)\s*\(/);
console.log(JSON.stringify(alerts, null, 2));
