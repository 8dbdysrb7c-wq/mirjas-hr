import React, { useState, useEffect } from 'react';
import { getDepartments, saveDepartments, getTasksData, saveTasksData, isAdmin, canPerformAction, getGlobalSettings } from '../../store';
import { Plus, Edit2, Trash2, X, Layers, Search, ArrowUpDown, Printer, FileSpreadsheet, FileText, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';

const MySwal = withReactContent(Swal);

const AdminSettings = ({ user }) => {
  const [departments, setDepartments] = useState({});
  const [tasksData, setTasksData] = useState({});
  const [activeDept, setActiveDept] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [deptForm, setDeptForm] = useState({ key: '', name: '', isEdit: false });

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

  const escapeHtml = (value) => String(value ?? '-').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  const handlePrintTasks = (deptKey = null) => {
    const targetDeptKeys = (deptKey && deptKey !== 'all') ? [deptKey] : Object.keys(departments);
    if (targetDeptKeys.length === 0) {
      Swal.fire('تنبيه', 'لا توجد أقسام لطباعتها', 'warning');
      return;
    }

    const popup = window.open('', '_blank', 'width=1100,height=850');
    if (!popup) {
      Swal.fire('تعذر فتح الطباعة', 'يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح ثم المحاولة مرة أخرى.', 'warning');
      return;
    }

    const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const isSingle = targetDeptKeys.length === 1;
    const singleDeptName = isSingle ? (departments[targetDeptKeys[0]] || 'القسم') : 'كافة الأقسام';

    let sectionsHtml = '';
    targetDeptKeys.forEach((dKey) => {
      const dName = departments[dKey] || dKey;
      const tasksList = (tasksData[dKey] || []).filter(task => 
        matchesSearch([task.name, task.id, task.taskNumber, task.description], debouncedSearchTerm)
      );

      let rowsHtml = '';
      if (tasksList.length === 0) {
        rowsHtml = `<tr><td colspan="5" class="empty-cell">لا توجد أصناف أو مهام مسجلة في هذا القسم</td></tr>`;
      } else {
        tasksList.forEach((task, idx) => {
          const opsEntries = Object.entries(task.ops || {});
          if (opsEntries.length === 0) {
            rowsHtml += `
              <tr>
                <td class="num-col">${idx + 1}</td>
                <td class="item-col font-bold">${escapeHtml(task.name)}</td>
                <td class="op-col">---</td>
                <td class="target-col">---</td>
                <td class="target-col">---</td>
              </tr>`;
          } else {
            opsEntries.forEach(([opName, range], opIdx) => {
              const hrMin = range[2] !== undefined ? range[2] : Math.round(range[0]/9);
              const hrMax = range[3] !== undefined ? range[3] : Math.round(range[1]/9);
              rowsHtml += `
                <tr>
                  ${opIdx === 0 ? `<td class="num-col" rowspan="${opsEntries.length}">${idx + 1}</td>` : ''}
                  ${opIdx === 0 ? `<td class="item-col font-bold" rowspan="${opsEntries.length}">${escapeHtml(task.name)}</td>` : ''}
                  <td class="op-col"><span class="badge-op">${escapeHtml(opName)}</span></td>
                  <td class="target-col"><span class="daily-target">${range[0]} - ${range[1]}</span> <span class="unit">قطعة/يوم</span></td>
                  <td class="target-col"><span class="hourly-target">${hrMin} - ${hrMax}</span> <span class="unit">قطعة/ساعة</span></td>
                </tr>`;
            });
          }
        });
      }

      sectionsHtml += `
        <div class="dept-section">
          <div class="dept-title-bar">
            <h2>قسم: ${escapeHtml(dName)}</h2>
            <span class="badge-count">إجمالي الأصناف: ${tasksList.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 45px;">#</th>
                <th style="width: 35%;">الصنف / الموديل</th>
                <th style="width: 20%;">العملية التشغيلية</th>
                <th style="width: 22%;">الهدف اليومي (Daily Target)</th>
                <th style="width: 23%;">عمل الساعة (Hourly Target)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

    popup.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كشف مساطر المهام والمستهدفات - ${escapeHtml(singleDeptName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
    * { box-sizing: border-box; font-family: 'Tajawal', -apple-system, sans-serif; margin: 0; padding: 0; }
    body { color: #0f172a; background: #fff; padding: 24px; font-size: 13px; line-height: 1.4; }
    .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 14px; margin-bottom: 20px; }
    .company-info h1 { font-size: 20px; font-weight: 900; color: #0f766e; margin-bottom: 4px; }
    .company-info p { font-size: 12px; color: #475569; font-weight: 600; }
    .report-meta { text-align: left; font-size: 12px; color: #334155; }
    .report-meta div { margin-bottom: 3px; }
    .report-meta span { font-weight: bold; color: #0f766e; }
    
    .dept-section { margin-bottom: 28px; page-break-inside: avoid; }
    .dept-title-bar { display: flex; justify-content: space-between; align-items: center; background: #f0fdfa; border: 1px solid #99f6e4; border-right: 5px solid #0f766e; padding: 8px 14px; border-radius: 6px; margin-bottom: 10px; }
    .dept-title-bar h2 { font-size: 15px; font-weight: 800; color: #115e59; }
    .badge-count { font-size: 11px; font-weight: 700; background: #0f766e; color: #fff; padding: 2px 10px; border-radius: 20px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed; }
    th { background: #0f766e; color: #ffffff; font-weight: 800; font-size: 12px; padding: 8px 10px; border: 1px solid #0f766e; text-align: center; }
    td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 12px; vertical-align: middle; text-align: center; }
    tr:nth-child(even) { background-color: #f8fafc; }
    
    .num-col { font-weight: bold; color: #64748b; }
    .item-col { text-align: right; font-weight: 800; color: #1e293b; }
    .font-bold { font-weight: 800; }
    .op-col { font-weight: 700; color: #0f766e; }
    .badge-op { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
    .target-col { font-weight: 800; }
    .daily-target { color: #047857; font-size: 13px; }
    .hourly-target { color: #2563eb; font-size: 13px; }
    .unit { font-size: 10px; color: #64748b; font-weight: 500; }
    .empty-cell { color: #94a3b8; font-style: italic; padding: 16px; }

    .footer-signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 15px; border-top: 1px dashed #cbd5e1; page-break-inside: avoid; }
    .signature-box { flex: 1; text-align: center; font-size: 12px; font-weight: 700; color: #334155; }
    .signature-line { margin-top: 35px; border-bottom: 1px solid #94a3b8; width: 70%; margin-left: auto; margin-right: auto; }
    
    .print-note { background: #fefce8; border: 1px solid #fef08a; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #713f12; margin-top: 15px; text-align: center; }

    @media print {
      body { padding: 0; }
      .dept-section { page-break-inside: avoid; }
      .footer-signatures { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="company-info">
      <h1>مصنع مرجاس للمفروشات والمنسوجات</h1>
      <p>كشف معايير ومستهدفات الإنتاج والعمليات (Target Standards)</p>
    </div>
    <div class="report-meta">
      <div>التاريخ: <span>${todayStr}</span></div>
      <div>القسم: <span>${escapeHtml(singleDeptName)}</span></div>
      <div>المصدر: <span>نظام إدارة العمليات</span></div>
    </div>
  </div>

  ${sectionsHtml}

  <div class="print-note">
    ⚠️ <strong>ملاحظة للمشرفين:</strong> هذه المساطر تمثل معايير ومستهدفات الإنجاز القياسية المعتمدة للأقسام والخطوط الإنتاجية لحساب الطاقة والكفاءة.
  </div>

  <div class="footer-signatures">
    <div class="signature-box">
      <div>مشرف القسم</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature-box">
      <div>مدير الإنتاج والعمليات</div>
      <div class="signature-line"></div>
    </div>
    <div class="signature-box">
      <div>اعتماد الإدارة العامة</div>
      <div class="signature-line"></div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 200);
    };
  </script>
</body>
</html>`);
    popup.document.close();
  };

  const handleExportExcel = async (deptKey = null) => {
    try {
      const XLSX = await import('xlsx');
      const targetDeptKeys = (deptKey && deptKey !== 'all') ? [deptKey] : Object.keys(departments);
      
      const rows = [];
      targetDeptKeys.forEach(dKey => {
        const dName = departments[dKey] || dKey;
        const tasksList = (tasksData[dKey] || []).filter(task => 
          matchesSearch([task.name, task.id, task.taskNumber, task.description], debouncedSearchTerm)
        );
        tasksList.forEach(task => {
          const opsEntries = Object.entries(task.ops || {});
          if (opsEntries.length === 0) {
            rows.push({
              'القسم': dName,
              'الصنف / الموديل': task.name,
              'العملية': 'عام',
              'الحد الأدنى اليومي': 0,
              'الحد الأعلى اليومي': 0,
              'معدل الساعة الأدنى': 0,
              'معدل الساعة الأعلى': 0
            });
          } else {
            opsEntries.forEach(([opName, range]) => {
              const hrMin = range[2] !== undefined ? range[2] : Math.round(range[0]/9);
              const hrMax = range[3] !== undefined ? range[3] : Math.round(range[1]/9);
              rows.push({
                'القسم': dName,
                'الصنف / الموديل': task.name,
                'العملية': opName,
                'الحد الأدنى اليومي': range[0] || 0,
                'الحد الأعلى اليومي': range[1] || 0,
                'معدل الساعة الأدنى': hrMin || 0,
                'معدل الساعة الأعلى': hrMax || 0
              });
            });
          }
        });
      });

      if (rows.length === 0) {
        Swal.fire('تنبيه', 'لا توجد بيانات لتصديرها', 'warning');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'مساطر_المستهدفات');
      
      const fileName = deptKey && deptKey !== 'all' 
        ? `مسطرة_المستهدفات_${departments[deptKey] || deptKey}.xlsx` 
        : `كافة_مساطر_المستهدفات_${new Date().toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      Swal.fire({ icon: 'success', title: 'تم تصدير الملف بنجاح', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error("Excel export error:", err);
      Swal.fire('خطأ', 'حدث خطأ أثناء تصدير ملف Excel', 'error');
    }
  };

  return (
    <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header matching AdminSales/AdminSalesSimple style */}
      <div className="flex-responsive mb-2 no-print flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="text-primary" /> إعدادات المهام والمساطر
          </h2>
          <p className="text-muted">تكوين الأقسام والعمليات ونطاق المستهدفات (Targets) للمشرفين والإنتاج</p>
        </div>

        {/* Action / Print Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handlePrintTasks(activeDept)}
            className="btn btn-outline flex items-center gap-1.5"
            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 'bold' }}
            title="طباعة كشف مسطرة القسم المحدد حالياً"
            disabled={!activeDept}
          >
            <Printer size={16} className="text-primary" />
            <span>طباعة مسطرة ({departments[activeDept] || 'القسم'})</span>
          </button>

          <button
            onClick={() => handlePrintTasks('all')}
            className="btn btn-outline flex items-center gap-1.5"
            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 'bold' }}
            title="طباعة كشف شامل لكافة مساطر الأقسام"
          >
            <FileText size={16} className="text-emerald-600" />
            <span>طباعة كافة الأقسام</span>
          </button>

          <button
            onClick={() => handleExportExcel(activeDept)}
            className="btn btn-outline flex items-center gap-1.5"
            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 'bold' }}
            title="تصدير مسطرة القسم كملف Excel"
            disabled={!activeDept}
          >
            <FileSpreadsheet size={16} className="text-green-600" />
            <span>تصدير Excel</span>
          </button>
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
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h4 style={{ margin: 0, fontWeight: 800 }}>مهام {departments[activeDept] || 'القسم'}</h4>
              <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
                {((tasksData[activeDept] || []).filter(task => matchesSearch([task.name, task.id, task.taskNumber, task.description], debouncedSearchTerm))).length} صنف
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintTasks(activeDept)}
                className="btn btn-outline"
                style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="طباعة مسطرة هذا القسم"
                disabled={!activeDept}
              >
                <Printer size={15} /> طباعة المسطرة
              </button>

              {canPerformAction(user, 'ADD', 'TASKS', globalSettings) && (
                <button className="btn btn-primary" disabled={!activeDept} onClick={() => handleOpenTaskModal()}>
                  <Plus size={16} /> إضافة صنف/مهمة
                </button>
              )}
            </div>
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
                  .filter(task => matchesSearch([task.name, task.id, task.taskNumber, task.description], debouncedSearchTerm))
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
                  <tr><td colSpan="4" className="text-center text-muted">لا يوجد مهام مسجلة في هذا القسم</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};

export default AdminSettings;
