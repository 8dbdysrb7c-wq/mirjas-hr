import React from 'react';
import { motion } from 'framer-motion';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Calendar, Clock, Phone, Trash2, Plus, Save, Info, LogIn, LogOut, Coffee, ClipboardList, Edit3, FilePlus, Minus } from 'lucide-react';

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const formatTimeArabic = (timeStr) => {
  if (!timeStr || timeStr === '--:--') return '--:--';
  if (timeStr.includes('صباح') || timeStr.includes('مساء')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
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
  notes,
  setNotes,
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
      className="dr-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="dr-header">
        <button type="button" className="dr-header-btn-main">
          <FilePlus size={24} />
        </button>
        <div className="dr-header-title">
          <h2>تقرير العمل اليومي</h2>
          <p>سجل أنشطتك وملاحظاتك لليوم</p>
        </div>
        {/* Removed left calendar button as requested */}
        <div style={{ width: '3rem' }}></div>
      </div>

      {/* معلومات أساسية */}
      <div className="dr-card">
        {/* Removed basic info title as requested */}
        <div className="dr-field">
          <label>التاريخ</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <Flatpickr 
              className="dr-input" 
              value={date} 
              onChange={([d]) => setDate(getLocalDateStr(d))} 
              options={{ dateFormat: 'Y-m-d', disableMobile: true, maxDate: 'today', minDate: '2026-05-01' }} 
              placeholder="اختر تاريخ" 
              required 
            />
            <Calendar size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
        </div>
      </div>

      {/* وقت الدخول والخروج */}
      <div className="dr-card">
        <div className="dr-card-header text-teal">
          <Plus size={18} style={{ padding: '2px', border: '1.5px solid var(--primary)', borderRadius: '50%' }} />
          <span>وقت الدخول والخروج</span>
        </div>
        
        <div className="dr-row">
          {/* Divider line */}
          <div className="dr-row-divider"></div>
          
          <div className="dr-half-col">
            <div className="dr-time-label-green">
              <span>وقت الدخول</span>
              <LogIn size={16} />
            </div>
            <div className="dr-time-display">
              <Clock size={14} style={{ color: '#94a3b8' }} />
              <span dir="ltr">{formatTimeArabic(timeIn)}</span>
            </div>
          </div>
          
          <div className="dr-half-col">
            <div className="dr-time-label-red">
              <span>وقت الخروج</span>
              <LogOut size={16} />
            </div>
            <div className="dr-time-display">
              <Clock size={14} style={{ color: '#94a3b8' }} />
              <span dir="ltr">{formatTimeArabic(timeOut)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* مدة الاستراحة */}
      <div className="dr-card-amber">
        <div className="dr-card-header text-amber">
          <Coffee size={18} />
          <span>مدة الاستراحة</span>
        </div>
        
        <div className="dr-row">
          <div className="dr-row-divider-amber"></div>
          
          <div className="dr-half-col">
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '0.4rem' }}>بداية الاستراحة</label>
            <div style={{ width: '100%' }}>
              <input 
                type="time" 
                className="dr-input dr-input-time" 
                style={{ backgroundColor: 'white', borderColor: '#cfeef1' }}
                value={breakTimeFrom} 
                onChange={(e) => setBreakTimeFrom(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="dr-half-col">
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary-dark)', marginBottom: '0.4rem' }}>نهاية الاستراحة</label>
            <div style={{ width: '100%' }}>
              <input 
                type="time" 
                className="dr-input dr-input-time" 
                style={{ backgroundColor: 'white', borderColor: '#cfeef1' }}
                value={breakTimeTo} 
                onChange={(e) => setBreakTimeTo(e.target.value)} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* نظام الهاتف الخلوي */}
      <div className="dr-card">
        <div className="dr-card-header text-teal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={18} />
            <span>نظام الهاتف الخلوي</span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#e11d48', backgroundColor: '#ffe4e6', padding: '2px 8px', borderRadius: '8px' }}>
            إلزامي *
          </span>
        </div>
        
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>
            هل تم وضع الهاتف بالأمانات؟ <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setPhoneSafe(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: phoneSafe === true ? '2px solid #0f766e' : '1.5px solid #e2e8f0',
                backgroundColor: phoneSafe === true ? '#f0fdfa' : '#ffffff',
                color: phoneSafe === true ? '#0f766e' : '#64748b',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: phoneSafe === true ? '0 4px 12px rgba(15, 118, 110, 0.15)' : 'none'
              }}
            >
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: phoneSafe === true ? '5px solid #0f766e' : '2px solid #cbd5e1', display: 'inline-block' }}></span>
              نعم، بالأمانات
            </button>
            <button
              type="button"
              onClick={() => setPhoneSafe(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: phoneSafe === false ? '2px solid #e11d48' : '1.5px solid #e2e8f0',
                backgroundColor: phoneSafe === false ? '#fff1f2' : '#ffffff',
                color: phoneSafe === false ? '#e11d48' : '#64748b',
                fontWeight: '800',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: phoneSafe === false ? '0 4px 12px rgba(225, 29, 72, 0.15)' : 'none'
              }}
            >
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: phoneSafe === false ? '5px solid #e11d48' : '2px solid #cbd5e1', display: 'inline-block' }}></span>
              لا، لم يوضع بالأمانات
            </button>
          </div>
        </div>

        <div className="dr-phone-counter-row" style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <div className="dr-phone-counter-label">
            <span>عدد مرات استعمال الهاتف <span style={{ color: '#e11d48' }}>*</span></span>
            <Phone size={14} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(26, 141, 155, 0.05)', borderRadius: '12px', padding: '2px', border: '1px solid rgba(26, 141, 155, 0.2)' }}>
            <button 
              type="button" 
              className="dr-counter-btn"
              onClick={() => setPhoneUsages(Math.max(0, (Number(phoneUsages) || 0) - 1))}
            >
              <Minus size={14} />
            </button>
            <input 
              type="number" 
              min="0" 
              required
              className="dr-counter-val" 
              value={phoneUsages === null || phoneUsages === undefined ? '' : phoneUsages} 
              placeholder="0"
              onChange={(e) => {
                const val = e.target.value;
                setPhoneUsages(val === '' ? '' : Math.max(0, parseInt(val, 10) || 0));
              }} 
            />
            <button 
              type="button" 
              className="dr-counter-btn"
              onClick={() => setPhoneUsages((Number(phoneUsages) || 0) + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* الأعمال المنجزة */}
      <div className="dr-card">
        <div className="dr-card-header text-teal">
          <ClipboardList size={18} />
          <span>الأعمال المنجزة</span>
        </div>

        {tasks.map((task, index) => {
          const taskDeptTasks = tasksData[task.department] || [];
          const selectedTaskDef = taskDeptTasks.find(d => d.name === task.name);
          const operations = selectedTaskDef ? Object.keys(selectedTaskDef.ops) : [];
          
          const validUserRoles = userRoles.filter(r => departments[r]);
          const availableRoles = validUserRoles.length > 0 ? validUserRoles : (Object.keys(departments).length > 0 ? Object.keys(departments) : []);
          const isMultiRole = availableRoles.length > 1;

          return (
            <div key={task.id} className="dr-task-card">
              {/* Task index green badge */}
              <div className="dr-task-badge">
                <span>{index + 1}</span>
              </div>
              <div className="dr-task-item">
                {isMultiRole && (
                  <div className="dr-field">
                    <label>خط الإنتاج (القسم)</label>
                    <select
                      className="dr-task-select"
                      value={task.department}
                      onChange={(e) => updateTask(task.id, { department: e.target.value })}
                      required
                    >
                      {availableRoles.map(r => <option key={r} value={r}>{departments[r]}</option>)}
                    </select>
                  </div>
                )}
                
                <div className="dr-field">
                  <label>الصنف</label>
                  {taskDeptTasks.length > 0 ? (
                    <select
                      className="dr-task-select"
                      value={task.name}
                      onChange={(e) => updateTask(task.id, { name: e.target.value })}
                      required
                    >
                      <option value="">اختر الصنف</option>
                      {taskDeptTasks.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                  ) : (
                    <div style={{ height: '2.75rem', backgroundColor: '#f1f5f9', border: '1.5px dashed #cbd5e1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700' }}>
                      لا يوجد أصناف لهذه المسطرة
                    </div>
                  )}
                </div>

                <div className="dr-field">
                  <label>العملية</label>
                  <select
                    className="dr-task-select"
                    value={task.operation}
                    onChange={(e) => updateTask(task.id, { operation: e.target.value })}
                    required
                    disabled={!task.name}
                  >
                    <option value="">اختر العملية</option>
                    {operations.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>

                <div className="dr-field">
                  <label>العدد</label>
                  <input
                    type="number"
                    className="dr-input"
                    style={{ textAlign: 'right' }}
                    value={task.count}
                    onChange={(e) => updateTask(task.id, { count: e.target.value })}
                    required
                    min="1"
                    placeholder="أدخل العدد"
                  />
                </div>

                <div className="dr-task-buttons">
                  <button 
                    type="button" 
                    className="dr-btn-delete"
                    onClick={() => removeTaskRow(task.id)}
                  >
                    <span>حذف</span>
                    <Trash2 size={16} />
                  </button>
                  <button 
                    type="button" 
                    className="dr-btn-add"
                    onClick={addTaskRow}
                    disabled={!task.name || !task.operation || !task.count}
                  >
                    <span>إضافة عمل إضافي</span>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
           <button 
             type="button" 
             className="dr-btn-add"
             style={{ width: '100%', marginTop: '1rem' }}
             onClick={addTaskRow}
           >
             <span>إضافة عمل جديد</span>
             <Plus size={16} />
           </button>
        )}
      </div>

      {/* ملاحظات عامة */}
      <div className="dr-card" style={{ backgroundColor: '#f8fafc' }}>
        <div className="dr-card-header text-teal" style={{ marginBottom: '0.75rem' }}>
          <Edit3 size={18} />
          <span>ملاحظات عامة حول عمل اليوم (اختياري)</span>
        </div>
        <textarea
          className="dr-textarea"
          value={notes || ''}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="اكتب أي ملاحظات تود إضافتها للتقرير العام..."
        ></textarea>
      </div>

      {/* Save Button */}
      <button type="submit" className="dr-btn-submit">
        <span>حفظ التقرير</span>
        <Save size={20} />
      </button>
    </motion.form>
  );
};

