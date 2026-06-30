import re

with open('src/pages/admin/AdminReports.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { getReports, getEmployees, getDepartments, saveReport, deleteReport, getSalesOrders, getOrders, getCustomers, getMissions, getStock } from '../../store';",
    "import { getReports, getEmployees, getDepartments, saveReport, deleteReport, getSalesOrders, getOrders, getCustomers, getMissions, getStock, getReportsByDateRange, getSalesOrdersByDateRange, getOrdersByDateRange, getMissionsByDateRange } from '../../store';"
)

# 2. Replace useEffect
old_effect = r"""  useEffect\(\(\) => \{
    const fetchData = async \(\) => \{
      setLoading\(true\);
      try \{
        const \[reps, emps, depts, sales, prod, custs, missions, stock\] = await Promise\.all\(\[
          getReports\(\),
          getEmployees\(\),
          getDepartments\(\),
          getSalesOrders\(\),
          getOrders\(\),
          getCustomers\(\),
          getMissions\(\),
          getStock\(\)
        \]\);
        setReports\(reps\);
        setEmployees\(emps\.filter\(e => e\.role !== 'admin' && e\.level !== 'admin'\)\);
        setDepartments\(depts\);
        setSalesOrders\(sales\);
        setProductionOrders\(prod\);
        setCustomers\(custs\);
        setDeliveryMissions\(missions\);
        setStockItems\(stock\);

        // Find the maximum date among all reports/orders/missions
        let maxDate = '';
        reps\.forEach\(r => \{
          if \(r\.date && r\.date > maxDate\) maxDate = r\.date;
        \}\);
        sales\.forEach\(o => \{
          if \(o\.orderDate && o\.orderDate > maxDate\) maxDate = o\.orderDate;
        \}\);
        prod\.forEach\(o => \{
          if \(o\.orderDate && o\.orderDate > maxDate\) maxDate = o\.orderDate;
        \}\);
        missions\.forEach\(m => \{
          const mDate = \(m\.createdAt \|\| ''\)\.split\('T'\)\[0\];
          if \(mDate && mDate > maxDate\) maxDate = mDate;
        \}\);

        let defaultStart = '';
        if \(maxDate\) \{
          const d = new Date\(maxDate\);
          if \(\!isNaN\(d\.getTime\(\)\)\) \{
            d\.setDate\(d\.getDate\(\) - 10\);
            defaultStart = d\.toISOString\(\)\.split\('T'\)\[0\];
          \}
        \}
        if \(\!defaultStart\) \{
          const d = new Date\(\);
          d\.setDate\(d\.getDate\(\) - 10\);
          defaultStart = getLocalDateStr\(d\);
        \}

        setDefaultDateFrom\(defaultStart\);
        setDateFrom\(defaultStart\);
        setIsDefaultDate\(true\);
      \} catch \(err\) \{
        console\.error\("Error fetching data:", err\);
      \}
      setLoading\(false\);
    \};
    fetchData\(\);
  \}, \[\]\);"""

new_effect = """  const fetchDynamicData = async (from, to) => {
    setLoading(true);
    try {
      const [reps, sales, prod, missions] = await Promise.all([
        getReportsByDateRange(from, to),
        getSalesOrdersByDateRange(from, to),
        getOrdersByDateRange(from, to),
        getMissionsByDateRange(from, to)
      ]);
      setReports(reps);
      setSalesOrders(sales);
      setProductionOrders(prod);
      setDeliveryMissions(missions);
    } catch (err) {
      console.error("Error fetching dynamic data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [emps, depts, custs, stock] = await Promise.all([
          getEmployees(),
          getDepartments(),
          getCustomers(),
          getStock()
        ]);
        setEmployees(emps.filter(e => e.role !== 'admin' && e.level !== 'admin'));
        setDepartments(depts);
        setCustomers(custs);
        setStockItems(stock);
      } catch (err) {
        console.error("Error fetching static data:", err);
      }
    };
    
    fetchStaticData();

    const d = new Date();
    d.setDate(d.getDate() - 10);
    const defaultStart = getLocalDateStr(d);
    
    setDefaultDateFrom(defaultStart);
    setDateFrom(defaultStart);
    setIsDefaultDate(true);

    fetchDynamicData(defaultStart, '');
  }, []);"""

content = re.sub(old_effect, new_effect, content, flags=re.DOTALL)

# 3. Update the Apply button
content = content.replace(
    '<button className="btn-premium-save" onClick={() => setShowFilterModal(false)}>تطبيق</button>',
    '<button className="btn-premium-save" onClick={() => { setShowFilterModal(false); fetchDynamicData(dateFrom, dateTo); }}>تطبيق</button>'
)

# 4. Update the Clear button
content = content.replace(
    """                setDateFrom(''); setDateTo(''); setFilterOrderNumber(''); setFilterCreatedBy(''); setSearchTerm('');
                setIsDefaultDate(false);
              }}>تفريغ</button>""",
    """                setDateFrom(''); setDateTo(''); setFilterOrderNumber(''); setFilterCreatedBy(''); setSearchTerm('');
                setIsDefaultDate(false);
                fetchDynamicData('', '');
              }}>تفريغ</button>"""
)

with open('src/pages/admin/AdminReports.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
