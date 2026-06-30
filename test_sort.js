// test_sort.js
const activeReportTab = 'employees';
const sortConfig = { key: 'tasksCompleted', direction: 'descending' };

const getSortedData = (data, tab) => {
    let key = sortConfig.key;
    let direction = sortConfig.direction;

    if (!key) return data;

    const sorted = [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      if (tab === 'delivery') {
        if (key === 'type') {
            aVal = a.type || '---';
            bVal = b.type || '---';
        }
      }

      if (tab === 'stock' && key === 'status') {
          aVal = 'متوفر';
          bVal = 'متوفر';
      }

      if (key === 'date' || key === 'orderDate' || key === 'createdAt') {
        const dateA = new Date(aVal || 0).getTime();
        const dateB = new Date(bVal || 0).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return direction === 'ascending' ? dateA - dateB : dateB - dateA;
        }
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'ascending' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      if (aVal < bVal) return direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return sorted;
};

const filteredEmployeesReports = [
    { id: 1, date: '2024-01-01', phoneUsages: 5, tasks: [1,2,3], finalScore: 90 },
    { id: 2, date: '2024-01-02', phoneUsages: 2, tasks: [1,2], finalScore: 80 }
];

const filteredSalesOrders = [
    { id: 1, orderDate: '2024-01-01', status: 'منتهي' }
];

console.log('Testing employees...');
const sortedEmp = getSortedData(filteredEmployeesReports, 'employees');
console.log(sortedEmp);

console.log('Testing sales...');
const sortedSales = getSortedData(filteredSalesOrders, 'sales');
console.log(sortedSales);

console.log('Done.');
