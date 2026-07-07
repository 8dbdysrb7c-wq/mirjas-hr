const fs = require('fs');
const path = require('path');

const sessionPath = path.join(__dirname, '.wwebjs_auth');

try {
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('\n✅ تم مسح جلسة الواتساب وتسجيل الخروج بنجاح وتام!\n');
    } else {
        console.log('\n✅ الجلسة ممسوحة مسبقاً، لا يوجد أي حساب مسجل حالياً.\n');
    }
} catch (err) {
    console.error('\n❌ حدث خطأ أثناء محاولة مسح الجلسة:', err.message, '\n');
}
