const { execSync } = require('child_process');
try {
  console.log("Recent Git commits:");
  console.log(execSync('git log --oneline -n 10', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
