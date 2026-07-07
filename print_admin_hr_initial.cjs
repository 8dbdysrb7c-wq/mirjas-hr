const { execSync } = require('child_process');
try {
  console.log("AdminHR.jsx navItems in Initial Commit:");
  const content = execSync('git show b9cfa6e:src/pages/hr/AdminHR.jsx', { encoding: 'utf8' });
  const startIdx = content.indexOf('const navItems = [');
  const endIdx = content.indexOf('];', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    console.log(content.substring(startIdx, endIdx + 2));
  } else {
    console.log("Could not find navItems");
  }
} catch (e) {
  console.error("Error:", e.message);
}
