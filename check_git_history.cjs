const { execSync } = require('child_process');
try {
  console.log("Git Status:");
  console.log(execSync('git status', { encoding: 'utf8' }));
  console.log("\nGit Diff of last commit:");
  console.log(execSync('git diff HEAD~1 HEAD', { encoding: 'utf8' }));
  console.log("\nGit Reflog:");
  console.log(execSync('git reflog -n 10', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
