const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'hr', 'AdminHR.jsx');

if (!fs.existsSync(filePath)) {
  console.error("❌ File not found:", filePath);
  process.exit(1);
}

// Normalize CRLF to LF
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Import (if not already there)
const importOld = "import HRMissingPunches from './HRMissingPunches';";
const importNew = "import HRMissingPunches from './HRMissingPunches';\nimport HRAttendanceAlerts from './HRAttendanceAlerts';";

if (content.includes(importOld) && !content.includes("import HRAttendanceAlerts")) {
  content = content.replace(importOld, importNew);
  console.log("✅ Import added");
}

// 2. Switch Case (if not already there)
const switchOld = "      case 'missing-punches': return <HRMissingPunches user={user} refreshCounts={fetchCounts} />;\n      case 'overtime':";
const switchNew = "      case 'missing-punches': return <HRMissingPunches user={user} refreshCounts={fetchCounts} />;\n      case 'attendance-alerts': return <HRAttendanceAlerts user={user} />;\n      case 'overtime':";

if (content.includes(switchOld) && !content.includes("case 'attendance-alerts'")) {
  content = content.replace(switchOld, switchNew);
  console.log("✅ Switch case added");
}

// 3. NavItems - Using single-line target to avoid multi-line formatting issues
const navOld = "{ id: 'attendance', label: 'الحضور والانصراف', icon: <Clock />, color: '#14b8a6', bgLight: '#ccfbf1', customBadge: 'اليوم' },";
const navNew = "{ id: 'attendance', label: 'الحضور والانصراف', icon: <Clock />, color: '#14b8a6', bgLight: '#ccfbf1', customBadge: 'اليوم' },\n    { id: 'attendance-alerts', label: 'تنبيهات الحضور والانصراف', icon: <AlertTriangle />, color: '#f43f5e', bgLight: '#ffe4e6', customBadge: 'تنبيهات' },";

if (content.includes(navOld) && !content.includes("attendance-alerts")) {
  content = content.replace(navOld, navNew);
  console.log("✅ NavItems updated");
}

// 4. Grid columns (if not already there)
const gridOld = "gridTemplateColumns: 'repeat(10, 1fr)', gap: '12px', minWidth: '1450px'";
const gridNew = "gridTemplateColumns: 'repeat(11, 1fr)', gap: '12px', minWidth: '1600px'";

if (content.includes(gridOld)) {
  content = content.replace(gridOld, gridNew);
  console.log("✅ Grid columns updated");
}

// Write back with CRLF
fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log("✅ AdminHR.jsx updated successfully!");
