const { execSync } = require('child_process');
try {
  console.log("Git show 6aa8d1d stat:");
  console.log(execSync('git show 6aa8d1d --stat', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
