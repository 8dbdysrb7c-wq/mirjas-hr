const { execSync } = require('child_process');
try {
  execSync('git checkout src/pages/hr/AdminHR.jsx', { encoding: 'utf8' });
  console.log("✅ Reverted AdminHR.jsx changes.");
} catch (e) {
  console.error("Error:", e.message);
}
