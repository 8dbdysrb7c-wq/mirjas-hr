const { execSync } = require('child_process');

try {
  console.log("استعادة الملف الأصلي من Git...");
  execSync('git checkout src/pages/hr/HRMissingPunches.jsx', { cwd: __dirname });
  console.log("✅ تم استعادة الملف الأصلي بنجاح! يرجى تحديث الصفحة لرؤية التصميم القديم.");
} catch (e) {
  console.error("❌ حدث خطأ أثناء الاستعادة:", e.message);
}
