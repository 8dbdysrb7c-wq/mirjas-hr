import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function runAnalysis() {
  if (window._sku_analysis_running) return;
  window._sku_analysis_running = true;
  
  try {
    const snap = await getDocs(collection(db, 'stock'));
    const stock = snap.docs.map(d => ({id: d.id, ...d.data()}));
    
    // Group by itemNumber first
    const groupedBySKU = stock.reduce((acc, item) => {
      if (!acc[item.itemNumber]) acc[item.itemNumber] = [];
      acc[item.itemNumber].push(item);
      return acc;
    }, {});

    const groups = Object.values(groupedBySKU).map(items => {
      const first = items[0];
      return {
        oldItemNumber: first.itemNumber,
        name: first.name || '',
        category: first.category || 'غير محدد',
        itemsCount: items.length,
        variants: items.map(i => i.spec).filter(Boolean).join('، '),
        rawItems: items
      };
    });

    // Check for similar names
    const needsReview = [];
    const processedGroups = [];
    
    const nameMap = {};
    groups.forEach(g => {
      const baseName = g.name.trim().replace(/\s+/g, ' ');
      if (!nameMap[baseName]) nameMap[baseName] = [];
      nameMap[baseName].push(g);
    });

    Object.values(nameMap).forEach(similarGroups => {
      if (similarGroups.length > 1) {
        // Multiple SKUs have the exact same name! They should be reviewed.
        similarGroups.forEach(g => {
          needsReview.push({
            name: g.name,
            oldItemNumber: g.oldItemNumber,
            category: g.category,
            reason: 'أصناف متعددة تحمل نفس الاسم الدقيق ولكن بأرقام مفصولة. هل يجب دمجها تحت رقم واحد؟',
            variants: g.variants
          });
          processedGroups.push(g); // Still assign a new ID to them for now
        });
      } else {
        processedGroups.push(similarGroups[0]);
      }
    });

    // Sort alphabetically by name
    processedGroups.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    const categoryMap = {
      'بضاعة جاهزة': 'FG',
      'أقمشة': 'FAB',
      'تغليف': 'PKG',
      'مستهلكات': 'CON',
      'أصول': 'AST'
    };

    const counters = { FG: 1, FAB: 1, PKG: 1, CON: 1, AST: 1, UNK: 1 };
    
    const preview = [];

    processedGroups.forEach(g => {
      let prefix = categoryMap[g.category];
      if (!prefix) {
        // Try to find partial match
        if (g.category.includes('بضاعة') || g.category.includes('جاهز')) prefix = 'FG';
        else if (g.category.includes('قماش') || g.category.includes('أقمشة')) prefix = 'FAB';
        else if (g.category.includes('تغليف') || g.category.includes('كرتون')) prefix = 'PKG';
        else if (g.category.includes('مستهلك') || g.category.includes('خياط')) prefix = 'CON';
        else if (g.category.includes('أصل') || g.category.includes('أصول') || g.category.includes('ماكين')) prefix = 'AST';
        else {
          prefix = 'UNK';
          needsReview.push({...g, reason: \`تصنيف غير معروف (\${g.category})\`});
        }
      }

      const newCode = \`\${prefix}-\${String(counters[prefix]).padStart(5, '0')}\`;
      counters[prefix]++;

      preview.push({
        name: g.name,
        category: g.category,
        oldCode: g.oldItemNumber,
        newCode: newCode,
        variants: g.variants
      });
    });

    let markdown = \`## 1. معاينة إعادة الترقيم (حسب الأقسام)\\n\\n\`;
    markdown += \`| اسم الصنف | القسم | الكود الحالي | الكود الجديد المقترح | الألوان/المواصفات (ستشترك بنفس الكود) |\\n| --- | --- | --- | --- | --- |\\n\`;
    preview.forEach(p => {
      markdown += \`| \${p.name} | \${p.category} | \${p.oldCode} | **\${p.newCode}** | \${p.variants || '-'} |\\n\`;
    });

    markdown += \`\\n\\n## 2. أصناف تحتاج إلى مراجعة قبل التطبيق\\n\\n\`;
    if (needsReview.length === 0) {
      markdown += \`> [!NOTE]\\n> لا توجد حالات تعارض أو أصناف متطابقة بالاسم بأرقام مختلفة. النظام جاهز للتطبيق.\\n\`;
    } else {
      markdown += \`> [!WARNING]\\n> هذه الأصناف تحمل أسماء متطابقة تماماً ولكن بأرقام مخزنية (SKU) مختلفة حالياً. حسب طلبك، يجب أن تشترك الأصناف المتشابهة في الألوان والمواصفات بنفس الكود. يُرجى توجيهي هل أقوم بدمجهم جميعاً تحت كود واحد قبل التطبيق، أم أتركهم كأصناف منفصلة؟\\n\\n\`;
      markdown += \`| اسم الصنف | القسم | الكود الحالي | السبب |\\n| --- | --- | --- | --- |\\n\`;
      needsReview.forEach(r => {
        markdown += \`| \${r.name} | \${r.category} | \${r.oldItemNumber} | \${r.reason} |\\n\`;
      });
    }

    await fetch('/api/dump', { method: 'POST', body: markdown });
    console.log("Analysis sent successfully.");
  } catch(e) {
    console.error("Error analyzing SKUs:", e);
  }
}
