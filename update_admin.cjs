const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/admin/AdminReports.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace table logic
const startMarker = '          <table className="reports-center-table">';
const endMarker = '          </table>';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex) + endMarker.length;

if (startIndex === -1 || endIndex < startMarker.length) {
    console.error('Table not found in AdminReports.jsx');
    process.exit(1);
}

const replacement = `          <table className="reports-center-table">
            {activeReportTab === 'employees' && (
              <EmployeesReportTab 
                employees={employees}
                hrAttendance={hrAttendance}
                filteredEmployeesReports={filteredEmployeesReports}
                selectedEmployee={selectedEmployee}
                empSortKey={empSortKey}
                empSortDir={empSortDir}
                handleEmpSort={handleEmpSort}
                getEmpSortIcon={getEmpSortIcon}
                getScoreTone={getScoreTone}
                handleViewReportDetails={handleViewReportDetails}
                handleEditEmployeeReport={handleEditEmployeeReport}
                handleDeleteEmployeeReport={handleDeleteEmployeeReport}
              />
            )}
            {activeReportTab === 'sales' && (
              <SalesOrdersReportTab
                sortedSalesOrders={sortedRowsByTab.sales}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                getStatusBadgeClass={getStatusBadgeClass}
              />
            )}
            {activeReportTab === 'production' && (
              <ProductionReportTab
                sortedProductionOrders={sortedRowsByTab.production}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                getStatusBadgeClass={getStatusBadgeClass}
              />
            )}
            {activeReportTab === 'delivery' && (
              <DeliveryReportTab
                sortedDeliveryMissions={sortedRowsByTab.delivery}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                getStatusBadgeClass={getStatusBadgeClass}
                getMissionTypeLabel={getMissionTypeLabel}
              />
            )}
            {activeReportTab === 'stock' && (
              <StockReportTab
                sortedStockItems={sortedRowsByTab.stock}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                renderStockVariant={renderStockVariant}
                getStockItemStatus={getStockItemStatus}
                getStatusBadgeClass={getStatusBadgeClass}
              />
            )}
            {activeReportTab === 'missingpunches' && (
              <MissingPunchesReportTab
                sortedMissingPunches={sortedRowsByTab.missingpunches}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                printDraftConfig={printDraftConfig}
                pendingExportAction={pendingExportAction}
              />
            )}
            {activeReportTab === 'tasks' && (
              <TasksReportTab
                sortedTasks={sortedRowsByTab.tasks}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
              />
            )}
            {activeReportTab === 'supervisors' && (
              <SupervisorsReportTab
                sortedSupervisors={sortedRowsByTab.supervisors}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
              />
            )}
            {activeReportTab === 'customers' && (
              <CustomersReportTab
                sortedCustomers={sortedRowsByTab.customers}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
              />
            )}
            <tbody>
              {((activeReportTab === 'employees' && filteredEmployeesReports.length === 0) ||
                (activeReportTab === 'hr' && filteredHR.length === 0) ||
                (activeReportTab === 'missingpunches' && filteredMissingPunches.length === 0) ||
                (activeReportTab === 'tasks' && filteredTasks.length === 0) ||
                (activeReportTab === 'supervisors' && filteredSupervisorReports.length === 0) ||
                (activeReportTab === 'customers' && filteredCustomersReports.length === 0) ||
                (activeReportTab === 'sales' && filteredSalesOrders.length === 0) ||
                (activeReportTab === 'production' && filteredProductionOrders.length === 0) ||
                (activeReportTab === 'delivery' && filteredDeliveryMissions.length === 0) ||
                (activeReportTab === 'stock' && filteredStockItems.length === 0)) && (
                  <tr>
                    <td colSpan={emptyResultsColSpan} className="text-center text-muted" style={{ padding: '2rem' }}>لا يوجد نتائج مطابقة لخيارات البحث</td>
                  </tr>
                )}
            </tbody>
          </table>`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminReports.jsx');
