const { execSync } = require('child_process');
try {
  console.log("Stash list:");
  console.log(execSync('git stash list', { encoding: 'utf8' }));
  
  console.log("\nReflog entries:");
  console.log(execSync('git reflog -n 20', { encoding: 'utf8' }));
  
  console.log("\nDiff between HEAD and HEAD@{1} (files changed in last reset):");
  console.log(execSync('git diff HEAD@{1} --stat', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
