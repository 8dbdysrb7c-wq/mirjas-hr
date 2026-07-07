import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyDrTFkfeZr7F2UFhubaxt0s4_VNwYC5R8Q",
  authDomain: "mirjaswork.firebaseapp.com",
  projectId: "mirjaswork",
  storageBucket: "mirjaswork.firebasestorage.app",
  messagingSenderId: "742199978686",
  appId: "1:742199978686:web:6fc97d192fa99d8dd60cef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
    console.log("جاري فحص قاعدة البيانات...");
    const snap = await getDocs(collection(db, 'stock'));
    const allStock = snap.docs.map(d => ({id: d.id, ...d.data()}));
    
    // فلترة الأصناف التي تبدأ بـ CON
    const conItems = allStock.filter(item => 
        (item.itemNumber && item.itemNumber.startsWith('CON-')) || 
        (item.category && item.category.includes('مستهلكات'))
    );

    // تجميع الأصناف الفريدة (تجنب تكرار نفس الرقم إذا كان موجوداً في عدة مخازن)
    const uniqueItemsMap = new Map();
    const usedNumbers = new Set();
    let maxNumber = 0;

    for (const item of conItems) {
        if (item.itemNumber && item.itemNumber.startsWith('CON-')) {
            const numStr = item.itemNumber.replace('CON-', '');
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) {
                usedNumbers.add(num);
                if (num > maxNumber) {
                    maxNumber = num;
                }
            }
        }
        
        // للاحتفاظ بنسخة واحدة من كل صنف للترتيب الأبجدي
        const key = item.itemNumber || item.name;
        if (!uniqueItemsMap.has(key)) {
            uniqueItemsMap.set(key, item);
        }
    }

    // إيجاد الأرقام المفقودة
    const missingNumbers = [];
    for (let i = 1; i <= maxNumber; i++) {
        if (!usedNumbers.has(i)) {
            missingNumbers.push(`CON-${String(i).padStart(5, '0')}`);
        }
    }

    // ترتيب الأصناف أبجدياً
    const uniqueItemsArray = Array.from(uniqueItemsMap.values());
    uniqueItemsArray.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

    // إعداد التقرير
    let report = "=== تقرير أرقام CON المفقودة ===\n\n";
    
    if (missingNumbers.length > 0) {
        report += `يوجد ${missingNumbers.length} رقم مفقود (فراغات) بين CON-00001 و CON-${String(maxNumber).padStart(5, '0')}:\n`;
        report += missingNumbers.join(" ، ") + "\n\n";
    } else {
        report += `لا يوجد أي أرقام مفقودة بين CON-00001 و CON-${String(maxNumber).padStart(5, '0')}.\n\n`;
    }

    report += "=== قائمة الأصناف الحالية (مرتبة أبجدياً) ===\n";
    report += "رقم الصنف\t\t|\tاسم الصنف\n";
    report += "--------------------------------------------------------\n";
    
    for (const item of uniqueItemsArray) {
        report += `${item.itemNumber || 'بدون رقم'}\t|\t${item.name || 'بدون اسم'}\n`;
    }

    fs.writeFileSync('con_report.txt', report, 'utf-8');
    console.log("تم فحص الأرقام بنجاح!");
    console.log("يرجى فتح الملف 'con_report.txt' لقراءة التقرير الكامل الذي يحتوي على الأرقام المفقودة والأصناف مرتبة أبجدياً.");
    process.exit(0);
}

main().catch(console.error);
