import React, { useState, useEffect } from 'react';
import { getDepartments, saveDepartments, getTasksData, saveTasksData, isAdmin, canPerformAction, getGlobalSettings } from '../../store';
import { Plus, Edit2, Trash2, X, Layers, Search , ArrowUpDown} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const AdminSettings = ({ user }) => {
  const [departments, setDepartments] = useState({});
  const [tasksData, setTasksData] = useState({});
  const [activeDept, setActiveDept] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ key: '', name: '', isEdit: false });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ oldName: '', name: '', ops: [{ name: '', min: 0, max: 0 }] });
  const [globalSettings, setGlobalSettings] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const [deps, tasks, settings] = await Promise.all([
        getDepartments(),
        getTasksData(),
        getGlobalSettings()
      ]);
      setDepartments(deps);
      setTasksData(tasks);
      setGlobalSettings(settings);
      if (Object.keys(deps).length > 0) setActiveDept(Object.keys(deps)[0]);
    };
    fetchData();
  }, []);

  const handleSaveDept = async () => {
    if (!deptForm.key || !deptForm.name) { Swal.fire('خطأ', 'أدخل معرف واسم القسم', 'error'); return; }
    const updated = { ...departments };
    updated[deptForm.key] = deptForm.name;
    await saveDepartments(updated);
    setDepartments(updated);

    if (!deptForm.isEdit && !tasksData[deptForm.key]) {
      const updatedTasks = { ...tasksData, [deptForm.key]: [] };
      await saveTasksData(updatedTasks);
      setTasksData(updatedTasks);
    }
    
    if (!activeDept) setActiveDept(deptForm.key);
    setShowDeptModal(false);
    Swal.fire('تم الحفظ', 'تم حفظ القسم بنجاح', 'success');
  };

  const handleDeleteDept = (key) => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-confirm-delete',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'هل أنت متأكد؟',
      text: "لا يمكن التراجع عن هذا الإجراء!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updatedDeps = { ...departments };
        delete updatedDeps[key];
        await saveDepartments(updatedDeps);
        setDepartments(updatedDeps);

        const updatedTasks = { ...tasksData };
        delete updatedTasks[key];
        await saveTasksData(updatedTasks);
        setTasksData(updatedTasks);

        if (activeDept === key) setActiveDept(Object.keys(updatedDeps)[0] || '');
        Swal.fire('تم', 'تم الحذف بنجاح', 'success');
      }
    });
  };

  const handleOpenDeptModal = (dept = null) => {
    const isEdit = !!dept;
    const initialData = isEdit ? { key: dept.key, name: dept.name } : { key: '', name: '' };

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layers text-primary"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
             <span>${isEdit ? 'تعديل قسم' : 'إضافة قسم جديد'}</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-type text-muted"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>
              اسم القسم (عربي)
            </label>
            <input id="swal-name" class="premium-input" placeholder="مثال: قسم الخياطة" value="${initialData.name}">
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code text-muted"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              المعرف البرمجي (انجليزي)
            </label>
            <input id="swal-key" class="premium-input" placeholder="مثال: sewing" value="${initialData.key}" ${isEdit ? 'disabled' : ''}>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'تحديث القسم' : 'حفظ القسم',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const key = document.getElementById('swal-key').value;
        const name = document.getElementById('swal-name').value;
        if (!key || !name) {
          Swal.showValidationMessage('يرجى ملء جميع الحقول');
          return false;
        }
        return { key, name };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { key, name } = result.value;
        const updated = { ...departments };
        updated[key] = name;
        await saveDepartments(updated);
        setDepartments(updated);

        if (!isEdit && !tasksData[key]) {
          const updatedTasks = { ...tasksData, [key]: [] };
          await saveTasksData(updatedTasks);
          setTasksData(updatedTasks);
        }
        if (!activeDept) setActiveDept(key);
        Swal.fire('تم الحفظ', 'تم حفظ القسم بنجاح', 'success');
      }
    });
  };

  const handleOpenTaskModal = (task = null) => {
    const isEdit = !!task;
    const opsArray = isEdit ? Object.entries(task.ops).map(([name, range]) => ({ name, min: range[0], max: range[1], hrMin: range[2] !== undefined ? range[2] : Math.round(range[0]/9), hrMax: range[3] !== undefined ? range[3] : Math.round(range[1]/9) })) : [{ name: '', min: 0, max: 0, hrMin: 0, hrMax: 0 }];
    
    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list text-primary"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
             <span>${isEdit ? 'تعديل مهمة' : 'إضافة مهمة جديدة'}</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group">
            <label>اسم الصنف</label>
            <input id="swal-task-name" class="premium-input" placeholder="مثال: تيشرت قطني" value="${isEdit ? task.name : ''}">
          </div>
          <p class="text-sm text-muted mb-3" style="text-align: right;">العمليات (مثال: درزة، حبكة) ونطاق الهدف</p>
          <div id="ops-container" style="max-height: 300px; overflow-y: auto; padding-left: 5px;">
            ${opsArray.map((op, idx) => `
              <div class="op-row" style="background:#f8fafc; padding:15px; border-radius:14px; margin-bottom:12px; border:1px solid #f1f5f9;">
                <div class="premium-form-group" style="margin-bottom: 10px;">
                  <input class="premium-input op-name" placeholder="اسم العملية" value="${op.name}" style="padding: 0.75rem;">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 10px;">
                  <div class="premium-form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.75rem; margin-bottom: 4px;">الحد الأدنى (يومي)</label>
                    <input type="number" class="premium-input op-min" placeholder="الحد الأدنى" value="${op.min}" oninput="this.closest('.op-row').querySelector('.op-hr-min').value = Math.round(this.value / 9)" style="padding: 0.75rem;">
                  </div>
                  <div class="premium-form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.75rem; margin-bottom: 4px;">الحد الأعلى (يومي)</label>
                    <input type="number" class="premium-input op-max" placeholder="الحد الأعلى" value="${op.max}" oninput="this.closest('.op-row').querySelector('.op-hr-max').value = Math.round(this.value / 9)" style="padding: 0.75rem;">
                  </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                  <div class="premium-form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.75rem; margin-bottom: 4px;">عمل الساعة (أدنى)</label>
                    <input type="number" step="0.1" class="premium-input op-hr-min" placeholder="أدنى للساعة" value="${op.hrMin}" style="padding: 0.75rem; background: #e2e8f0;">
                  </div>
                  <div class="premium-form-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.75rem; margin-bottom: 4px;">عمل الساعة (أعلى)</label>
                    <input type="number" step="0.1" class="premium-input op-hr-max" placeholder="أعلى للساعة" value="${op.hrMax}" style="padding: 0.75rem; background: #e2e8f0;">
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <button type="button" class="btn btn-outline btn-sm w-full mt-2" onclick="const container = document.getElementById('ops-container'); const div = document.createElement('div'); div.className='op-row'; div.style='background:#f8fafc; padding:15px; border-radius:14px; margin-bottom:12px; border:1px solid #f1f5f9;'; div.innerHTML=\`<div class='premium-form-group' style='margin-bottom: 10px;'><input class='premium-input op-name' placeholder='اسم العملية' style='padding: 0.75rem;'></div><div style='display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom: 10px;'><div class='premium-form-group' style='margin-bottom: 0;'><label style='font-size: 0.75rem; margin-bottom: 4px;'>الحد الأدنى (يومي)</label><input type='number' class='premium-input op-min' placeholder='الحد الأدنى' value='0' oninput='this.closest(&quot;.op-row&quot;).querySelector(&quot;.op-hr-min&quot;).value = Math.round(this.value / 9)' style='padding: 0.75rem;'></div><div class='premium-form-group' style='margin-bottom: 0;'><label style='font-size: 0.75rem; margin-bottom: 4px;'>الحد الأعلى (يومي)</label><input type='number' class='premium-input op-max' placeholder='الحد الأعلى' value='0' oninput='this.closest(&quot;.op-row&quot;).querySelector(&quot;.op-hr-max&quot;).value = Math.round(this.value / 9)' style='padding: 0.75rem;'></div></div><div style='display:grid; grid-template-columns: 1fr 1fr; gap:10px;'><div class='premium-form-group' style='margin-bottom: 0;'><label style='font-size: 0.75rem; margin-bottom: 4px;'>عمل الساعة (أدنى)</label><input type='number' step='0.1' class='premium-input op-hr-min' placeholder='أدنى للساعة' value='0' style='padding: 0.75rem; background: #e2e8f0;'></div><div class='premium-form-group' style='margin-bottom: 0;'><label style='font-size: 0.75rem; margin-bottom: 4px;'>عمل الساعة (أعلى)</label><input type='number' step='0.1' class='premium-input op-hr-max' placeholder='أعلى للساعة' value='0' style='padding: 0.75rem; background: #e2e8f0;'></div></div>\`; container.appendChild(div);">
            + إضافة عملية أخرى
          </button>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isEdit ? 'تحديث المهمة' : 'حفظ المهمة',
      cancelButtonText: 'إلغاء',
      preConfirm: () => {
        const name = document.getElementById('swal-task-name').value;
        const opRows = document.querySelectorAll('.op-row');
        const formattedOps = {};
        opRows.forEach(row => {
          const opNameInput = row.querySelector('.op-name');
          if (!opNameInput) return;
          const opName = opNameInput.value;
          const min = row.querySelector('.op-min').value;
          const max = row.querySelector('.op-max').value;
          const hrMin = row.querySelector('.op-hr-min')?.value || Math.round(min/9);
          const hrMax = row.querySelector('.op-hr-max')?.value || Math.round(max/9);
          if (opName) formattedOps[opName] = [parseInt(min) || 0, parseInt(max) || 0, parseFloat(hrMin) || 0, parseFloat(hrMax) || 0];
        });

        if (!name || Object.keys(formattedOps).length === 0) {
          Swal.showValidationMessage('يرجى إدخال اسم الصنف وعملية واحدة على الأقل');
          return false;
        }
        return { name, ops: formattedOps };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { name, ops } = result.value;
        const deptTasks = [...(tasksData[activeDept] || [])];
        if (isEdit) {
          const idx = deptTasks.findIndex(t => t.name === task.name);
          if (idx !== -1) deptTasks[idx] = { name, ops };
        } else {
          deptTasks.push({ name, ops });
        }
        const updatedTasksData = { ...tasksData, [activeDept]: deptTasks };
        await saveTasksData(updatedTasksData);
        setTasksData(updatedTasksData);
        Swal.fire({
          title: 'تم الحفظ',
          text: 'تم حفظ الصنف بنجاح',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleDeleteTask = (taskName) => {
    Swal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-confirm-delete',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions',
        title: 'premium-modal-title'
      },
      buttonsStyling: false,
      title: 'هل أنت متأكد؟',
      text: "لا يمكن التراجع عن هذا الإجراء!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const deptTasks = (tasksData[activeDept] || []).filter(t => t.name !== taskName);
        const updatedTasksData = { ...tasksData, [activeDept]: deptTasks };
        await saveTasksData(updatedTasksData);
        setTasksData(updatedTasksData);
        Swal.fire('تم', 'تم الحذف بنجاح', 'success');
      }
    });
  };

  return (
    <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header matching AdminSales/AdminSalesSimple style */}
      <div className="flex-responsive mb-2 no-print">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="text-primary" /> إعدادات المهام والمساطر
          </h2>
          <p className="text-muted">تكوين الأقسام والعمليات ونطاق المستهدفات (Targets)</p>
        </div>
      </div>

      {/* Quick Search Bar */}
      <div className="glass-panel no-print" style={{ padding: '0.8rem 1rem' }}>
        <div className="flex gap-4 items-center justify-between w-full flex-wrap">
          <div className="flex items-center gap-3 w-full md:max-w-md">
            <Search className="text-muted" size={20} />
            <input 
              type="text" 
              placeholder="بحث سريع عن صنف أو مهمة..." 
              className="input-field flex-1" 
              style={{ marginBottom: 0 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Departments Tabs */}
      <div className="premium-tabs-container no-print" style={{ gap: '0.75rem', borderBottom: 'none', marginBottom: 0, paddingBottom: '0.5rem' }}>
        {Object.entries(departments).map(([key, name]) => (
          <div 
            key={key} 
            className={`premium-tab premium-tab-sm ${activeDept === key ? 'premium-tab-active' : 'premium-tab-inactive'}`}
            onClick={() => setActiveDept(key)}
          >
            <Layers size={16} />
            <span>{name}</span>
            <div className="flex gap-2 mr-3">
              <button 
                className="hover:scale-110 transition-transform opacity-80 hover:opacity-100" 
                style={{ color: activeDept === key ? '#fff' : 'var(--primary)' }}
                onClick={(e) => { e.stopPropagation(); handleOpenDeptModal({ key, name }); }}
              >
                <Edit2 size={13} />
              </button>
              {canPerformAction(user, 'DELETE', 'TASKS', globalSettings) && (
                <button 
                  className="hover:scale-110 transition-transform opacity-80 hover:opacity-100"
                  style={{ color: activeDept === key ? '#fff' : 'var(--danger)' }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteDept(key); }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
        {canPerformAction(user, 'ADD', 'TASKS', globalSettings) && (
          <button 
            className="premium-tab premium-tab-sm premium-tab-inactive"
            style={{ borderStyle: 'dashed', opacity: 1, borderWidth: '2px' }}
            onClick={() => handleOpenDeptModal()}
          >
            <Plus size={16} />
            <span>إضافة قسم</span>
          </button>
        )}
      </div>

      <div className="admin-content-layout glass-card">
          <div className="flex justify-between items-center mb-4">
            <h4 style={{ margin: 0 }}>مهام {departments[activeDept] || 'القسم'}</h4>
            {canPerformAction(user, 'ADD', 'TASKS', globalSettings) && (
              <button className="btn btn-primary" disabled={!activeDept} onClick={() => handleOpenTaskModal()}>
                <Plus size={16} /> إضافة صنف/مهمة
              </button>
            )}
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>العمليات ونطاق الهدف (يومي)</th>
                  <th>عمل الساعة (Target)</th>
                  <th style={{ textAlign: 'center' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {(tasksData[activeDept] || [])
                  .filter(task => (task.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((task, idx) => (
                  <tr key={idx}>
                    <td data-label="الصنف" style={{ fontWeight: 'bold' }}>{task.name}</td>
                    <td data-label="العمليات والهدف">
                      {Object.entries(task.ops).map(([opName, range]) => (
                        <div key={opName} style={{ display: 'block', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', margin: '0.25rem', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--primary-dark)', fontWeight: 'bold' }}>{opName}:</span> {range[0]} - {range[1]}
                        </div>
                      ))}
                    </td>
                    <td data-label="عمل الساعة">
                      {Object.entries(task.ops).map(([opName, range]) => {
                        const hrMin = range[2] !== undefined ? range[2] : Math.round(range[0]/9);
                        const hrMax = range[3] !== undefined ? range[3] : Math.round(range[1]/9);
                        return (
                          <div key={opName} style={{ display: 'block', background: '#e2e8f0', padding: '0.25rem 0.5rem', borderRadius: '4px', margin: '0.25rem', fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--primary-dark)', fontWeight: 'bold' }}>{opName}:</span> {hrMin} - {hrMax}
                          </div>
                        );
                      })}
                    </td>
                    <td data-label="إجراءات">
                      <div className="flex gap-2 justify-center">
                        {canPerformAction(user, 'EDIT', 'TASKS', globalSettings) && (
                          <button className="btn-premium-edit" title="تعديل" onClick={() => handleOpenTaskModal(task)}>
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canPerformAction(user, 'DELETE', 'TASKS', globalSettings) && (
                          <button className="btn-premium-delete" title="حذف" onClick={() => handleDeleteTask(task.name)}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!tasksData[activeDept] || tasksData[activeDept].length === 0) && (
                  <tr><td colSpan="3" className="text-center text-muted">لا يوجد مهام مسجلة في هذا القسم</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default AdminSettings;
