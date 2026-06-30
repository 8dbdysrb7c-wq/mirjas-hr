import re

filepath = 'c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminReports.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace fetchDynamicData
fetch_start = "  const fetchDynamicData = async (from, to) => {"
fetch_end = """    }
    setLoading(false);
  };"""

new_fetch = """  const fetchDynamicData = async (from, to, isDefault = false) => {
    setLoading(true);
    try {
      let repFrom = from, salesFrom = from, prodFrom = from, missionsFrom = from;
      
      if (isDefault) {
        const today = new Date();
        
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);
        repFrom = getLocalDateStr(threeDaysAgo);

        const fiveDaysAgo = new Date(today);
        fiveDaysAgo.setDate(today.getDate() - 5);
        salesFrom = getLocalDateStr(fiveDaysAgo);
        prodFrom = salesFrom;
        
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        missionsFrom = getLocalDateStr(tenDaysAgo);
      }

      const [reps, sales, prod, missions] = await Promise.all([
        getReportsByDateRange(repFrom, to),
        getSalesOrdersByDateRange(salesFrom, to),
        getOrdersByDateRange(prodFrom, to),
        getMissionsByDateRange(missionsFrom, to)
      ]);
      setReports(reps);
      setSalesOrders(sales);
      setProductionOrders(prod);
      setDeliveryMissions(missions);
    } catch (err) {
      console.error("Error fetching dynamic data:", err);
    }
    setLoading(false);
  };"""

content = content.replace(content[content.find(fetch_start):content.find(fetch_end)+len(fetch_end)], new_fetch)

# 2. Replace useEffect initialization
use_effect_start = """    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = getLocalDateStr(tenDaysAgo);

    setDefaultDateFrom(tenDaysAgoStr);
    setDateFrom(tenDaysAgoStr);
    setIsDefaultDate(true);

    fetchDynamicData(tenDaysAgoStr, '');"""

new_use_effect = """    setDefaultDateFrom('');
    setDateFrom('');
    setIsDefaultDate(true);

    fetchDynamicData('', '', true);"""

content = content.replace(use_effect_start, new_use_effect)

# 3. Replace clear filter logic
clear_start = """                const tenDaysAgo = new Date();
                tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
                const tenDaysAgoStr = getLocalDateStr(tenDaysAgo);

                setDateFrom(tenDaysAgoStr); setDateTo(''); setFilterOrderNumber(''); setFilterCreatedBy(''); setSearchTerm('');
                setIsDefaultDate(true);
                fetchDynamicData(tenDaysAgoStr, '');"""

new_clear = """                setDateFrom(''); setDateTo(''); setFilterOrderNumber(''); setFilterCreatedBy(''); setSearchTerm('');
                setIsDefaultDate(true);
                fetchDynamicData('', '', true);"""

content = content.replace(clear_start, new_clear)

# 4. Replace the helper text string
text_start = """            {isDefaultDate && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '10px' }}>
                (يتم عرض بيانات آخر 10 أيام افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)
              </span>
            )}"""

new_text = """            {isDefaultDate && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '10px' }}>
                {activeReportTab === 'employees' 
                  ? '(يتم عرض بيانات آخر 3 أيام افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)'
                  : (activeReportTab === 'sales' || activeReportTab === 'production')
                    ? '(يتم عرض بيانات آخر 5 أيام افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)'
                    : '(يتم عرض بيانات آخر 10 أيام افتراضياً. لجلب بيانات أقدم، استخدم الفلتر أعلاه)'
                }
              </span>
            )}"""

content = content.replace(text_start, new_text)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated AdminReports.jsx for dynamic date filters.")
