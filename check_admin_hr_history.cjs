const { execSync } = require('child_process');
try {
  console.log("AdminHR.jsx contents at initial commit b9cfa6e:");
  const content = execSync('git show b9cfa6e:src/pages/hr/AdminHR.jsx', { encoding: 'utf8' });
  console.log(content.split('\n').filter(line => line.includes('Alert') || line.includes('alert') || line.includes('تنبيه')).join('\n'));
} catch (e) {
  console.error("Error:", e.message);
}
