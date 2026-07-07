const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log("Running eslint check...");
  const output = execSync('npx eslint src/pages/hr/HRMissingPunches.jsx', { cwd: __dirname, encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, 'lint.txt'), "No lint errors:\n" + output, 'utf8');
  console.log("✅ Lint check completed, no syntax errors.");
} catch (e) {
  fs.writeFileSync(path.join(__dirname, 'lint.txt'), "Lint error output:\n" + e.stdout + "\n" + e.stderr + "\n" + e.message, 'utf8');
  console.log("❌ Lint check failed. Output written to lint.txt");
}
