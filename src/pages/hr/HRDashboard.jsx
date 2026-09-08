import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, Calendar, AlertTriangle, FileText, ChevronLeft, Plus } from 'lucide-react';
import { getEmployees, getHRLeaves, getHRAttendance, getHRViolations } from '../../store';
import './hr.css';

const HRDashboard = ({ user, onNavigate }) => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [empsData, leavesData, attendanceData, violationsData] = await Promise.all([
        getEmployees(),
        getHRLeaves(),
        getHRAttendance(),
        getHRViolations()
      ]);
      setEmployees(empsData.filter(isActiveEmployee));
      setLeaves(leavesData);
      setAttendance(attendanceData);
      setViolations(violationsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  // Calculate Stats
  const totalEmployees = employees.length;
  const todayAttendance = attendance.filter(a => a.date === todayStr);
  const presentToday = todayAttendance.filter(a => a.status === 'مداوم' || a.status === 'متأخر').length;
  const lateToday = todayAttendance.filter(a => a.status === 'متأخر').length;
  const absentToday = totalEmployees - presentToday; // Simplified, in reality depends on work schedule
  const pendingLeaves = leaves.filter(l => l.status === 'معلق').length;
  
  const thisMonthViolations = violations.filter(v => v.date?.startsWith(thisMonthStr));
  const totalDeductions = thisMonthViolations.reduce((sum, v) => sum + (Number(v.deductionAmount) || 0), 0);
  const totalOvertime = todayAttendance.reduce((sum, a) => sum + (Number(a.overtimeHours) || 0), 0);

  // Stat Card Component
  const StatCard = ({ title, value, icon, color, onClick }) => (
    <div onClick={onClick} className="hr-stat-card">
      <div className={`hr-stat-icon hr-color-${color}`}>
        {icon}
      </div>
      <h4 className="hr-stat-value">{value}</h4>
      <p className="hr-stat-title">{title}</p>
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div className="hr-header-bar">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>إدارة الموارد البشرية</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="hr-stats-grid">
        <StatCard title="إجمالي الموظفين" value={totalEmployees} icon={<Users size={28} />} color="blue" onClick={() => onNavigate('employees')} />
        <StatCard title="المداومين اليوم" value={presentToday} icon={<UserCheck size={28} />} color="emerald" onClick={() => onNavigate('attendance')} />
        <StatCard title="الغائبين اليوم" value={absentToday} icon={<UserX size={28} />} color="rose" onClick={() => onNavigate('attendance')} />
        <StatCard title="المتأخرين اليوم" value={lateToday} icon={<Clock size={28} />} color="amber" onClick={() => onNavigate('attendance')} />
        <StatCard title="طلبات الإجازة" value={pendingLeaves} icon={<FileText size={28} />} color="blue" onClick={() => onNavigate('leaves')} />
        <StatCard title="إجمالي الخصومات" value={totalDeductions} icon={<AlertTriangle size={28} />} color="orange" onClick={() => onNavigate('violations')} />
        <StatCard title="ساعات الإضافي" value={totalOvertime} icon={<Clock size={28} />} color="purple" onClick={() => onNavigate('attendance')} />
      </div>


    </div>
  );
};

export default HRDashboard;
