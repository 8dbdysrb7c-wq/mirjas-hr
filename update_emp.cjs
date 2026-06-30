const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'EmployeeDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The new imports
const imports = `import { HomeTab } from './employee/tabs/HomeTab';
import { DailyReportTab } from './employee/tabs/DailyReportTab';
import { ReportHistoryTab } from './employee/tabs/ReportHistoryTab';
import { MissionsTab } from './employee/tabs/MissionsTab';
import { MissingPunchesTab } from './employee/tabs/MissingPunchesTab';
import { HRRequestsTab } from './employee/tabs/HRRequestsTab';
`;

// Only add if not already added
if (!content.includes('import { HomeTab }')) {
  content = content.replace("import AdminLive from './admin/AdminLive';", "import AdminLive from './admin/AdminLive';\n" + imports);
}

// Replace renderContent body
const casesToReplace = /case 'home':[\s\S]*?case 'sales':/m;

const newCases = `case 'home':
        return (
          <HomeTab
            isMobile={isMobile}
            isFlash={isFlash}
            fetchAddress={fetchAddress}
            isCheckingInOut={isCheckingInOut}
            currentAddress={currentAddress}
            LiveClock={LiveClock}
            todayAttendance={todayAttendance}
            handleGPSAction={handleGPSAction}
            DashboardCard={DashboardCard}
            allowedLeaveTypes={allowedLeaveTypes}
            leaveFormData={leaveFormData}
            setLeaveFormData={setLeaveFormData}
            setShowLeaveModal={setShowLeaveModal}
            handleTabChange={handleTabChange}
            user={user}
            setShowAdvanceModal={setShowAdvanceModal}
            canViewMissions={canViewMissions}
            isSupervisor={isSupervisor}
            canViewSupervisorReports={canViewSupervisorReports}
            remainingPunches={remainingPunches}
            setShowMissingPunchModal={setShowMissingPunchModal}
          />
        );

      case 'add':
        return (
          <DailyReportTab
            handleSubmit={handleSubmit}
            allReports={allReports}
            user={user}
            date={date}
            setDate={setDate}
            userRoles={userRoles}
            selectedDeptKey={selectedDeptKey}
            setSelectedDeptKey={setSelectedDeptKey}
            departments={departments}
            setTasks={setTasks}
            timeIn={timeIn}
            timeOut={timeOut}
            breakTimeFrom={breakTimeFrom}
            setBreakTimeFrom={setBreakTimeFrom}
            breakTimeTo={breakTimeTo}
            setBreakTimeTo={setBreakTimeTo}
            phoneSafe={phoneSafe}
            setPhoneSafe={setPhoneSafe}
            phoneUsages={phoneUsages}
            setPhoneUsages={setPhoneUsages}
            tasks={tasks}
            tasksData={tasksData}
            updateTask={updateTask}
            removeTaskRow={removeTaskRow}
            addTaskRow={addTaskRow}
            isMobile={isMobile}
          />
        );

      case 'history':
        return (
          <ReportHistoryTab
            myReports={myReports}
            handleViewReportDetails={handleViewReportDetails}
            isMobile={isMobile}
          />
        );

      case 'missions':
        return (
          <MissionsTab
            missions={missions}
            globalSettings={globalSettings}
            handleUpdateMissionStatus={handleUpdateMissionStatus}
          />
        );

      case 'missing_punches':
        return (
          <MissingPunchesTab
            remainingPunches={remainingPunches}
            userMissingPunchQuota={userMissingPunchQuota}
            currentMonthPunchesCount={currentMonthPunchesCount}
            setShowMissingPunchModal={setShowMissingPunchModal}
            myMissingPunches={myMissingPunches}
          />
        );

      case 'hr_requests':
        return (
          <HRRequestsTab
            user={user}
            myLeaves={myLeaves}
            missingPunches={missingPunches}
            myReports={myReports}
            myAdvances={myAdvances}
            handleViewReportDetails={handleViewReportDetails}
            handleEditRequest={handleEditRequest}
            handleDeleteRequest={handleDeleteRequest}
          />
        );
      case 'sales':`;

content = content.replace(casesToReplace, newCases);

fs.writeFileSync(filePath, content, 'utf8');
console.log('EmployeeDashboard.jsx updated successfully!');
