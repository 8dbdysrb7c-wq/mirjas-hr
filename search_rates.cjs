const { execSync } = require('child_process');
try {
  const result = execSync('git log -p -S "1:1"', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
  console.log("Git Log Output for '1:1':\n" + result.substring(0, 5000));
} catch (e) {
  console.error("Error:", e.message);
}
try {
  const result2 = execSync('git log -p -S "rate"', { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
  console.log("Git Log Output for 'rate':\n" + result2.substring(0, 5000));
} catch (e) {
  console.error("Error:", e.message);
}
