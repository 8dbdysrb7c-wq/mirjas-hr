const { execSync } = require('child_process');
try {
  console.log("Git Log searching for 'تنبيهات':");
  console.log(execSync('git log -S "تنبيهات" --oneline', { encoding: 'utf8' }));
  
  console.log("\nGit Log searching for 'HRAttendanceAlerts':");
  console.log(execSync('git log -S "HRAttendanceAlerts" --oneline', { encoding: 'utf8' }));
} catch (e) {
  console.error("Error:", e.message);
}
