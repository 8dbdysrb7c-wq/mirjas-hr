import React from 'react';
import { motion } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Calendar, Clock, Phone, Trash2, Plus, Save } from 'lucide-react';

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

export const DailyReportTab = ({
  handleSubmit,
  allReports,
  user,
  date,
  setDate,
  userRoles,
  selectedDeptKey,
  setSelectedDeptKey,
  departments,
  setTasks,
  timeIn,
  timeOut,
  breakTimeFrom,
  setBreakTimeFrom,
  breakTimeTo,
  setBreakTimeTo,
  phoneSafe,
  setPhoneSafe,
  phoneUsages,
  setPhoneUsages,
  tasks,
  tasksData,
  updateTask,
  removeTaskRow,
  addTaskRow,
  isMobile
}) => {
  return (
    <motion.form
      onSubmit={handleSubmit}
      className="glass-card !px-2 sm:!px-6"
      style={{ paddingBottom: isMobile ? '100px' : '20px' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-4 pb-2 border-b">
        <h3 className="text-lg mb-0" style={{ marginBottom: 0 }}>
          <Calendar size={18} className="inline-block ml-2 text-primary" />
          {allReports.some(r => String(r.userId || '').trim() === String(user.id || '').trim() && r.date === date) ? 'تعديل التقرير' : 'تقرير جديد'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="input-group">
          <label className="text-xs">التاريخ</label>
          <Flatpickr className="input-field h-10" value={date} onChange={([d]) => setDate(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true, maxDate: 'today', minDate: '2026-05-01' }} placeholder="اختر تاريخ" required />
        </div>
        {userRoles.length > 1 && (
          <div className="input-group">
            <label className="text-xs">المسطرة الرئيسية (القسم)</label>
            <select
              className="input-field h-10 text-sm"
              value={selectedDeptKey}
              onChange={(e) => {
                const newDept = e.target.value;
                setSelectedDeptKey(newDept);
                // Update all tasks that were using the previous default
                setTasks(prev => prev.map(t => (!t.name && !t.operation) ? { ...t, department: newDept } : t));
              }}
              required
            >
              {userRoles.map(r => <option key={r} value={r}>{departments[r]}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="input-group glass-panel p-4 bg-slate-50 border border-slate-100">
          <label className="text-sm font-bold flex items-center gap-2 mb-2"><Clock size={16} className="text-primary" /> وقت الدخول</label>
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              className="input-field h-12 text-center text-lg font-bold bg-slate-200 text-slate-600 cursor-not-allowed border-slate-300" 
              value={timeIn || 'لم تسجل'} 
              readOnly 
              disabled 
            />
          </div>
        </div>

        <div className="input-group glass-panel p-4 bg-slate-50 border border-slate-100">
          <label className="text-sm font-bold flex items-center gap-2 mb-2"><Clock size={16} className="text-primary" /> وقت الخروج</label>
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              className="input-field h-12 text-center text-lg font-bold bg-slate-200 text-slate-600 cursor-not-allowed border-slate-300" 
              value={timeOut || 'لم تسجل'} 
              readOnly 
              disabled 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="input-group">
          <label className="text-xs">بداية الاستراحة</label>
          <input 
            type="time" 
            className="input-field h-10 text-center text-sm" 
            value={breakTimeFrom} 
            onChange={(e) => setBreakTimeFrom(e.target.value)} 
          />
        </div>
        <div className="input-group">
          <label className="text-xs">نهاية الاستراحة</label>
          <input 
            type="time" 
            className="input-field h-10 text-center text-sm" 
            value={breakTimeTo} 
            onChange={(e) => setBreakTimeTo(e.target.value)} 
          />
        </div>
      </div>

      <div className="input-group glass-panel p-3 bg-slate-50 mb-4">
        <label className="flex items-center gap-2 text-warning text-sm font-bold"><Phone size={16} /> نظام الهاتف الخلوي</label>
        <label className="checkbox-group mt-3 text-sm">
          <input type="checkbox" checked={phoneSafe} onChange={(e) => setPhoneSafe(e.target.checked)} />
          هل تم وضع الهاتف بالامانات ؟
        </label>
        <div className="flex items-center justify-between gap-2 mt-4">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">عدد مرات استعمال الهاتف الخلوي:</label>
          <input type="number" min="0" className="input-field h-9 w-16 text-center font-bold p-1" value={phoneUsages} onChange={(e) => setPhoneUsages(e.target.value)} placeholder="0" />
        </div>
      </div>

      <h3 className="mb-3 text-base">الأعمال المنجزة</h3>
      {tasks.map((task) => {
        const taskDeptTasks = tasksData[task.department] || [];
        const selectedTaskDef = taskDeptTasks.find(d => d.name === task.name);
        const operations = selectedTaskDef ? Object.keys(selectedTaskDef.ops) : [];
        
        // Filter roles to only those that exist in the departments list
        const validUserRoles = userRoles.filter(r => departments[r]);
        const availableRoles = validUserRoles.length > 0 ? validUserRoles : (Object.keys(departments).length > 0 ? Object.keys(departments) : []);
        const isMultiRole = availableRoles.length > 1;
        return (
          <div key={task.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 mb-3 p-1 sm:p-3 bg-slate-50 rounded-lg items-end border border-slate-100">
            {isMultiRole && (
              <div className="input-group mb-0 md:col-span-3">
                <label className="text-xs font-bold text-slate-700">خط الإنتاج (القسم)</label>
                <select
                  className="input-field h-11 text-base font-bold text-slate-900 bg-white border-2 border-slate-200 focus:border-primary"
                  value={task.department}
                  onChange={(e) => updateTask(task.id, { department: e.target.value })}
                  required
                >
                  {availableRoles.map(r => <option key={r} value={r}>{departments[r]}</option>)}
                </select>
              </div>
            )}
            <div className={`input-group mb-0 ${isMultiRole ? 'md:col-span-3' : 'md:col-span-4'}`}>
              <label className="text-xs font-bold text-slate-700">الصنف</label>
              {taskDeptTasks.length > 0 ? (
                <select
                  className="input-field h-11 text-base font-bold text-slate-900 bg-white border-2 border-slate-200 focus:border-primary"
                  value={task.name}
                  onChange={(e) => updateTask(task.id, { name: e.target.value })}
                  required
                >
                  <option value="">اختر...</option>
                  {taskDeptTasks.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              ) : (
                <div className="input-field h-11 text-sm font-bold flex items-center text-muted bg-gray-100 border-2" style={{ borderStyle: 'dashed' }}>
                  لا يوجد أصناف لهذه المسطرة
                </div>
              )}
            </div>
            <div className={`input-group mb-0 ${isMultiRole ? 'md:col-span-2' : 'md:col-span-3'}`}>
              <label className="text-xs font-bold text-slate-700">العملية</label>
              <select
                className="input-field h-11 text-base font-bold text-slate-900 bg-white border-2 border-slate-200 focus:border-primary"
                value={task.operation}
                onChange={(e) => updateTask(task.id, { operation: e.target.value })}
                required
                disabled={!task.name}
              >
                <option value="">اختر...</option>
                {operations.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
            <div className={`input-group mb-0 ${isMultiRole ? 'md:col-span-1' : 'md:col-span-2'}`}>
              <label className="text-xs font-bold text-slate-700">العدد</label>
              <input
                type="number"
                className="input-field h-11 text-base font-bold text-slate-900 bg-white border-2 border-slate-200 focus:border-primary text-center"
                value={task.count}
                onChange={(e) => updateTask(task.id, { count: e.target.value })}
                required
                min="1"
              />
            </div>
            <div className={`input-group mb-0 ${isMultiRole ? 'md:col-span-2' : 'md:col-span-2'}`}>
              <label className="text-xs font-bold text-slate-700">ملاحظات (اختياري)</label>
              <input
                type="text"
                className="input-field h-11 text-base font-bold text-slate-900 bg-white border-2 border-slate-200 focus:border-primary"
                value={task.notes || ''}
                onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                placeholder="ملاحظات"
              />
            </div>
            <button type="button" className="btn btn-outline text-danger h-11 w-full col-span-full md:col-span-1" onClick={() => removeTaskRow(task.id)} style={{ borderColor: '#fee2e2' }}><Trash2 size={16} /> <span className="md:hidden">حذف</span></button>
          </div>
        );
      })}
      <button 
        type="button" 
        className="btn btn-outline mb-4 w-full h-10 disabled:opacity-50 disabled:cursor-not-allowed" 
        onClick={addTaskRow}
        disabled={tasks.length > 0 && (!tasks[tasks.length - 1].name || !tasks[tasks.length - 1].operation || !tasks[tasks.length - 1].count)}
      >
        <Plus size={16} /> إضافة عمل إضافي
      </button>
      <button type="submit" className="btn btn-primary w-full h-11 text-base"><Save size={18} /> حفظ التقرير</button>
    </motion.form>
  );
};
