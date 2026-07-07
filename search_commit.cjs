const { execSync } = require('child_process');
try {
  console.log("Git grep HRAttendanceAlerts in Initial Commit:");
  console.log(execSync('git grep "HRAttendanceAlerts" b9cfa6e', { encoding: 'utf8' }));
  
  console.log("\nGit grep تنبيهات in Initial Commit:");
  console.log(execSync('git grep "تنبيهات" b9cfa6e', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
