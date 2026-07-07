const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const diff = execSync('git diff src/pages/hr/HRMissingPunches.jsx', { cwd: __dirname, encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, 'diff.txt'), diff, 'utf8');
  console.log("✅ Diff written to diff.txt successfully.");
} catch (e) {
  console.error("❌ Diff failed:", e.message);
}
