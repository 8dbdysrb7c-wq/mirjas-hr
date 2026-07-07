const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'AdminHR.jsx');

if (!fs.existsSync(filePath)) {
  console.error("❌ File not found:", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Import HRAttendanceAlerts
const importTarget = "import HRMissingPunches from './HRMissingPunches';";
const importReplacement = `import HRMissingPunches from './HRMissingPunches';
import HRAttendanceAlerts from './HRAttendanceAlerts';`;

if (content.includes(importTarget) && !content.includes("import HRAttendanceAlerts")) {
  content = content.replace(importTarget, importReplacement);
  console.log("✅ Imported HRAttendanceAlerts in AdminHR.jsx");
}

// 2. Add to renderContent switch statement
const switchTarget = "case 'missing-punches': return <HRMissingPunches user={user} refreshCounts={fetchCounts} />;";
const switchReplacement = `case 'missing-punches': return <HRMissingPunches user={user} refreshCounts={fetchCounts} />;
      case 'attendance-alerts': return <HRAttendanceAlerts user={user} />;`;

if (content.includes(switchTarget) && !content.includes("case 'attendance-alerts'")) {
  content = content.replace(switchTarget, switchReplacement);
  console.log("✅ Added attendance-alerts case to switch in AdminHR.jsx");
}

// 3. Add to navItems array
const navItemsTarget = `{ id: 'attendance', label: 'الحضور والانصراف', icon: <Clock />, color: '#14b8a6', bgLight: '#ccfbf1', customBadge: 'اليوم' },`;
const navItemsReplacement = `{ id: 'attendance', label: 'الحضور والانصراف', icon: <Clock />, color: '#14b8a6', bgLight: '#ccfbf1', customBadge: 'اليوم' },
    { id: 'attendance-alerts', label: 'تنبيهات الحضور والانصراف', icon: <AlertTriangle />, color: '#f43f5e', bgLight: '#ffe4e6', customBadge: 'تنبيهات' },`;

if (content.includes(navItemsTarget) && !content.includes("'attendance-alerts'")) {
  content = content.replace(navItemsTarget, navItemsReplacement);
  console.log("✅ Added attendance-alerts to navItems in AdminHR.jsx");
}

// 4. Update grid template columns for 11 tabs instead of 10
const gridTarget = "gridTemplateColumns: 'repeat(10, 1fr)', gap: '12px', minWidth: '1450px'";
const gridReplacement = "gridTemplateColumns: 'repeat(11, 1fr)', gap: '12px', minWidth: '1600px'";

if (content.includes(gridTarget)) {
  content = content.replace(gridTarget, gridReplacement);
  console.log("✅ Updated grid columns to 11 in AdminHR.jsx");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("✅ AdminHR.jsx updated successfully!");
