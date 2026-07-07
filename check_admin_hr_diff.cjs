const { execSync } = require('child_process');
try {
  console.log("Git show 6aa8d1d for AdminHR.jsx:");
  console.log(execSync('git show 6aa8d1d -- src/pages/hr/AdminHR.jsx', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
