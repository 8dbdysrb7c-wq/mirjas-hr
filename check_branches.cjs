const { execSync } = require('child_process');
try {
  console.log("Git branches:");
  console.log(execSync('git branch -a', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
