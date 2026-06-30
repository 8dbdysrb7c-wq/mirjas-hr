const fs = require('fs');

const file = 'src/pages/admin/AdminReports.jsx';
const content = fs.readFileSync(file, 'utf8');

const target = `    if (!key || activeReportTab !== tabName) return data;

    } else if (activeReportTab === 'sales' || activeReportTab === 'production') {`;

const replacement = `    if (!key || activeReportTab !== tabName) return data;

    try {
      const sorted = [...data].sort((a, b) => {
        let aVal = a ? a[key] : undefined;
        let bVal = b ? b[key] : undefined;

        if (tabName === 'employees') {
          if (key === 'phone') {
            aVal = a?.phoneUsages || 0;
            bVal = b?.phoneUsages || 0;
          } else if (key === 'tasksCompleted') {
            aVal = a?.tasks?.length || 0;
            bVal = b?.tasks?.length || 0;
          }
        }

        if (tabName === 'delivery') {
          if (key === 'type') {
            aVal = getMissionTypeLabel(a);
            bVal = getMissionTypeLabel(b);
          }
        }

        if (tabName === 'stock' && key === 'status') {
          aVal = getStockItemStatus(a);
          bVal = getStockItemStatus(b);
        }

        // Date handling
        if (key === 'date' || key === 'orderDate' || key === 'createdAt') {
          const dateA = new Date(aVal || 0).getTime();
          const dateB = new Date(bVal || 0).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) {
            if (dateA < dateB) return direction === 'ascending' ? -1 : 1;
            if (dateA > dateB) return direction === 'ascending' ? 1 : -1;
            return 0;
          }
        }

        // Number handling (protect against NaN)
        if (typeof aVal === 'number' || typeof bVal === 'number') {
          const numA = Number(aVal) || 0;
          const numB = Number(bVal) || 0;
          if (numA < numB) return direction === 'ascending' ? -1 : 1;
          if (numA > numB) return direction === 'ascending' ? 1 : -1;
          return 0;
        }

        // String handling (guarantees transitivity)
        const strA = String(aVal || '').toLowerCase();
        const strB = String(bVal || '').toLowerCase();
        const cmp = strA.localeCompare(strB, 'ar', { numeric: true });
        return direction === 'ascending' ? cmp : -cmp;
      });
      return sorted;
    } catch (err) {
      console.error('Sorting error in AdminReports:', err);
      return data;
    }
  };

  const fetchDynamicData = async (from, to, isDefault = false) => {
    setLoading(true);
    try {
      let repFrom = from, salesFrom = from, prodFrom = from, missionsFrom = from, supervisorFrom = from;
      
      if (isDefault) {
        const today = new Date();
        
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(today.getDate() - 2);
        repFrom = getLocalDateStr(twoDaysAgo);

        const fiveDaysAgo = new Date(today);
        fiveDaysAgo.setDate(today.getDate() - 5);
        salesFrom = getLocalDateStr(fiveDaysAgo);
        prodFrom = salesFrom;
        supervisorFrom = salesFrom;
        
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(today.getDate() - 10);
        missionsFrom = getLocalDateStr(tenDaysAgo);
      }

      const [reps, sales, prod, missions, attLogs, supTasks, supReps, settings] = await Promise.all([
        getReportsByDateRange(repFrom, to),
        getSalesOrdersByDateRange(salesFrom, to),
        getOrdersByDateRange(prodFrom, to),
        getMissionsByDateRange(missionsFrom, to),
        getHRAttendanceByDateRange(repFrom, to),
        getSupervisorTasksByDateRange(supervisorFrom, to),
        getSupervisorReportsByDateRange(supervisorFrom, to),
        getGlobalSettings()
      ]);
      setReports(reps);
      setSalesOrders(sales);
      setProductionOrders(prod);
      setDeliveryMissions(missions);
      setHRAttendance(attLogs || []);
      setSupervisorTasks(supTasks || []);
      setSupervisorReports(supReps || []);
      setGlobalSettings(settings || {});
    } catch (err) {
      console.error("Error fetching dynamic data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [emps, custs, stock, mpData, fetchedSettings] = await Promise.all([
          getEmployees(),
          getCustomers(),
          getStock(),
          getMissingPunches(),
          getGlobalSettings()
        ]);
        setEmployees(emps.filter(e => e.role !== 'admin' && e.level !== 'admin'));
        setDepartments(fetchedSettings?.departmentsList || []);
        setJobTitles(fetchedSettings?.jobTitles || []);
        setSalesStatuses(fetchedSettings?.salesStatuses || []);
        setMissionStatuses(fetchedSettings?.missionStatuses || []);
        setProductionStatuses(fetchedSettings?.productionStatuses || []);
        setCustomerSectors(fetchedSettings?.customerSectors || []);
        setCustomers(custs || []);
        setStockItems(stock || []);
        setMissingPunches(mpData || []);
      } catch (err) {
        console.error("Error fetching static data:", err);
      }
    };
    
    fetchStaticData();

    setDefaultDateFrom('');
    setDateFrom('');
    setIsDefaultDate(true);

    fetchDynamicData('', '', true);
  }, []);

  useEffect(() => {
    if (activeReportTab === 'employees') {
      setSortConfig({ key: 'date', direction: 'descending' });
    } else if (activeReportTab === 'sales' || activeReportTab === 'production') {`;

let normalizedContent = content.replace(/\r\n/g, '\n');
let normalizedTarget = target.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedTarget)) {
  const finalContent = normalizedContent.replace(normalizedTarget, replacement);
  fs.writeFileSync(file, finalContent, 'utf8');
  console.log("SUCCESS: File restored!");
} else {
  console.log("FAILED to find target block in file. Target:\\n" + normalizedTarget);
}
