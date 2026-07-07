import React, { useState, useEffect } from 'react';
import { getSupervisorTasks, saveSupervisorTask, deleteSupervisorTask, getEmployees, isAdmin } from '../../store';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import { Plus, Clock, AlertCircle, CheckCircle2, MoreHorizontal, User, MessageSquare, Calendar, ShieldCheck, Flag, Trash2, Filter, Search, X } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import flatpickr from 'flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';

const MySwal = withReactContent(Swal);

const COLUMNS = [
  { id: 'جديدة', title: 'جديدة', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'تم الاستلام', title: 'تم الاستلام', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'جاري العمل', title: 'جاري العمل', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { id: 'بانتظار الاعتماد', title: 'بانتظار الاعتماد', color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  { id: 'مكتملة', title: 'مكتملة', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' }
];

const PRIORITIES = {
  'عاجلة جداً': { color: '#ef4444', bg: '#fef2f2', icon: <AlertCircle size={14} /> },
  'عالية': { color: '#f97316', bg: '#fff7ed', icon: <Flag size={14} /> },
  'متوسطة': { color: '#3b82f6', bg: '#eff6ff', icon: <Clock size={14} /> },
  'منخفضة': { color: '#64748b', bg: '#f8fafc', icon: <CheckCircle2 size={14} /> }
};

const AdminSupervisorTasks = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    assigneeId: '',
    priority: ''
  });
  
  // An employer is ONLY the system owner (Anas/Mashhour/Admin)
  const isEmployer = user.id === 'admin' || String(user.name).includes('مشهور') || String(user.name).includes('انس') || String(user.name).includes('أنس') || user.name === 'المدير العام';
  const isSuperAdmin = isEmployer;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [fetchedTasks, fetchedEmployees] = await Promise.all([
      getSupervisorTasks(),
      getEmployees()
    ]);
    // Filter tasks if not admin
    if (isSuperAdmin) {
      setTasks(fetchedTasks);
    } else {
      setTasks(fetchedTasks.filter(t => {
        const isAssignedDirectly = String(t.assigneeId) === String(user.id);
        const isAssignedInArray = Array.isArray(t.assigneeIds) && t.assigneeIds.map(String).includes(String(user.id));
        return isAssignedDirectly || isAssignedInArray;
      }));
    }
    
    // Only show supervisors/admins in assignee list
    const supervisors = fetchedEmployees.filter(e => e.level === 'supervisor' || e.level === 'مشرف' || e.level === 'إدارة' || isAdmin(e));
    setEmployees(supervisors);
    setLoading(false);
  };

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Optional: make it slightly transparent
    setTimeout(() => {
      if (e.target) e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (e.target) e.target.style.opacity = '1';
    setDraggedTaskId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task) return;

    // Prevent changing to the same status
    if (task.status === columnId) return;

    // Optional: Check permissions (e.g. only admin can move to "مكتملة")
    if (columnId === 'مكتملة' && !isSuperAdmin) {
      // Supervisor moves it to "Waiting for Approval" instead
      MySwal.fire('صلاحيات مقيدة', 'لا يمكنك إغلاق المهمة مباشرة، يجب نقلها إلى "بانتظار الاعتماد" ليقوم المدير باعتمادها.', 'warning');
      return;
    }

    const previousStatus = task.status;
    const updatedTask = { ...task, status: columnId };
    
    // Optimistic UI update
    setTasks(tasks.map(t => t.id === draggedTaskId ? updatedTask : t));

    // Add log
    updatedTask.logs = [
      ...(updatedTask.logs || []),
      {
        action: 'تغيير حالة المهمة',
        by: user.name || 'مستخدم',
        timestamp: new Date().toISOString(),
        comment: `تم تغيير الحالة من "${previousStatus}" إلى "${columnId}"`
      }
    ];

    await saveSupervisorTask(updatedTask);
    MySwal.fire({ title: 'تم التحديث', text: 'تم تغيير حالة المهمة', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
  };

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    const result = await MySwal.fire({
      title: 'هل أنت متأكد؟',
      text: 'لن تتمكن من التراجع عن هذا الإجراء!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'نعم، احذفها!',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      await deleteSupervisorTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      MySwal.fire('تم الحذف!', 'تم حذف المهمة بنجاح.', 'success');
    }
  };

  const openTaskModal = (task = null) => {
    if (!task && !isSuperAdmin) {
      MySwal.fire('خطأ', 'فقط الإدارة يمكنها إنشاء مهام جديدة', 'error');
      return;
    }

    if (task && task.status === 'جديدة' && !isSuperAdmin) {
      const isAssignedDirectly = String(task.assigneeId) === String(user.id);
      const isAssignedInArray = Array.isArray(task.assigneeIds) && task.assigneeIds.map(String).includes(String(user.id));
      if (isAssignedDirectly || isAssignedInArray) {
        task = { ...task, status: 'تم الاستلام' };
        task.logs = [
          ...(task.logs || []),
          {
            action: 'تغيير حالة المهمة',
            by: user.name || 'مستخدم',
            timestamp: new Date().toISOString(),
            comment: `تم تغيير الحالة تلقائياً من "جديدة" إلى "تم الاستلام" عند فتح المهمة بواسطة ${user.name}.`
          }
        ];
        setTasks(tasks.map(t => t.id === task.id ? task : t));
        saveSupervisorTask(task);
      }
    }

    const isEdit = !!task;

    // Calculate next sequence number TSKXXX based on existing tasks
    let nextNum = 1;
    const tNumberRegex = /TSK-(\d+)/;
    tasks.forEach(t => {
      if (t.taskNumber) {
        const match = String(t.taskNumber).match(tNumberRegex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNum) {
            nextNum = num + 1;
          }
        }
      }
    });
    const nextTaskNumber = `TSK-${String(nextNum).padStart(4, '0')}`;

    const initial = isEdit ? task : {
      name: '',
      description: '',
      assigneeId: '',
      assigneeName: '',
      assigneeIds: [],
      assigneeNames: [],
      priority: 'متوسطة',
      dueDate: '',
      taskNumber: nextTaskNumber
    };

    const isReadOnly = isEdit && !isSuperAdmin;

    MySwal.fire({
      customClass: { container: 'premium-modal-container', popup: 'premium-modal-medium' },
      width: '650px',
      showCloseButton: true,
      showConfirmButton: false,
      html: `
        <div style="direction: rtl; text-align: right; padding: 5px;">
          <h3 style="font-size: 22px; font-weight: 800; margin-bottom: 25px; color: var(--primary-dark); border-bottom: 2px solid var(--surface-border); padding-bottom: 15px; display: flex; align-items: center; gap: 10px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <span>${isEdit ? `تفاصيل المهمة: ${task.taskNumber}` : 'إنشاء مهمة جديدة'}</span>
          </h3>
          
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
              <div class="form-group-premium">
                <label>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
                  رقم المهمة
                </label>
                <input id="t-number" class="form-input-premium" value="${initial.taskNumber || ''}" readonly placeholder="رقم المهمة" style="font-weight: bold; color: var(--primary-dark); text-align: center; background: #f8fafc; cursor: not-allowed; border: 1px dashed var(--surface-border);">
              </div>
              <div class="form-group-premium">
                <label>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  عنوان المهمة
                </label>
                <input id="t-name" class="form-input-premium" value="${initial.name}" ${isReadOnly ? 'disabled' : ''} placeholder="أدخل عنوان المهمة">
              </div>
            </div>

            <div class="form-group-premium">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                وصف المهمة
              </label>
              <textarea id="t-desc" rows="4" class="form-input-premium" ${isReadOnly ? 'disabled' : ''} placeholder="تفاصيل وخطوات المهمة...">${initial.description || ''}</textarea>
            </div>

            <div class="form-group-premium">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                المسؤولون عن التنفيذ
              </label>
              ${isReadOnly ? `
                <div style="width: 100%; display: flex; flex-wrap: wrap; gap: 10px;">
                  ${Array.isArray(initial.assigneeNames) && initial.assigneeNames.length > 0 
                    ? initial.assigneeNames.map(name => {
                        const init = name ? name.trim().charAt(0) : '?';
                        return `
                          <div class="premium-assignee-card" data-selected="true" style="cursor: default; pointer-events: none;">
                            <div class="assignee-avatar">${init}</div>
                            <span class="assignee-label">${name}</span>
                          </div>
                        `;
                      }).join('')
                    : `<span style="color: var(--text-muted); font-style: italic;">غير معين</span>`
                  }
                </div>
              ` : `
                <div class="assignee-grid">
                  ${employees.map(e => {
                    const isChecked = (Array.isArray(initial.assigneeIds) && initial.assigneeIds.includes(e.id)) || (initial.assigneeId === e.id);
                    const init = e.name ? e.name.trim().charAt(0) : '?';
                    return `
                      <div class="premium-assignee-card" data-id="${e.id}" data-name="${e.name}" data-selected="${isChecked ? 'true' : 'false'}">
                        <div class="assignee-avatar">
                          ${isChecked ? `
                            <svg class="check-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          ` : init}
                        </div>
                        <span class="assignee-label" title="${e.name}">${e.name.split(' ')[0]}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div class="form-group-premium">
                <label>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  تاريخ الاستحقاق (Deadline)
                </label>
                <input id="t-due" type="text" class="form-input-premium" value="${initial.dueDate}" ${isReadOnly ? 'disabled' : ''} placeholder="اختر تاريخ الاستحقاق..." style="background: var(--surface); cursor: ${isReadOnly ? 'not-allowed' : 'pointer'};">
              </div>
              <div class="form-group-premium">
                <label>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  مستوى الأولوية
                </label>
                <select id="t-priority" class="form-input-premium" ${isReadOnly ? 'disabled' : ''}>
                  ${Object.keys(PRIORITIES).map(p => '<option value="' + p + '" ' + (initial.priority === p ? 'selected' : '') + '>' + p + '</option>').join('')}
                </select>
              </div>
            </div>

            ${isEdit ? `
              <div style="margin-top: 10px; padding-top: 20px; border-top: 2px dashed var(--surface-border);">
                <label style="display: block; font-size: 14px; font-weight: bold; color: var(--text-main); margin-bottom: 10px; text-align: right;">إضافة تعليق / تحديث</label>
                <div style="display: flex; gap: 10px;">
                  <input id="t-new-comment" class="form-input-premium" style="flex: 1;" placeholder="اكتب تحديثاً أو طلب مساعدة...">
                  <button id="btn-add-comment" style="padding: 10px 20px; background: var(--primary); color: #fff; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(26, 141, 155, 0.15);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    إرسال
                  </button>
                </div>
                
                <div style="margin-top: 20px; max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 15px; background: var(--bg); border-radius: 16px; border: 1.5px solid var(--surface-border); box-shadow: inset 0 2px 6px rgba(0,0,0,0.02);">
                  ${(initial.logs || []).filter(log => log.action === 'تعليق جديد').slice().reverse().map(log => {
                    const isMe = log.by === user.name;
                    return `
                      <div style="display: flex; flex-direction: column; max-width: 75%; align-self: ${isMe ? 'flex-end' : 'flex-start'}; text-align: right;">
                        <div style="background: ${isMe ? 'var(--primary-light)' : 'var(--surface)'}; color: var(--text-main); padding: 10px 14px; border-radius: 16px; border-top-${isMe ? 'left' : 'right'}-radius: 0px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid ${isMe ? 'rgba(26,141,155,0.15)' : 'var(--surface-border)'}; position: relative;">
                          ${!isMe ? `<div style="font-size: 11px; font-weight: 800; color: var(--primary); margin-bottom: 4px;">${log.by}</div>` : ''}
                          <div style="font-size: 13px; line-height: 1.5; word-wrap: break-word; font-weight: 500;">
                            ${log.comment}
                          </div>
                          <div style="font-size: 10px; color: var(--text-muted); text-align: ${isMe ? 'left' : 'right'}; margin-top: 4px; display: flex; justify-content: ${isMe ? 'flex-start' : 'flex-end'}; align-items: center; gap: 4px;">
                            ${new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            ${isMe ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                  ${(!initial.logs || initial.logs.filter(log => log.action === 'تعليق جديد').length === 0) ? '<div style="text-align: center; background: var(--surface); padding: 8px 16px; border-radius: 20px; font-size: 12px; color: var(--text-muted); margin: 0 auto; width: fit-content; border: 1px solid var(--surface-border);">لا توجد رسائل سابقة. ابدأ المحادثة الآن!</div>' : ''}
                </div>
              </div>
            ` : ''}

          </div>

          ${!isReadOnly ? `
            <div style="margin-top: 30px; display: flex; justify-content: flex-end; gap: 10px;">
              <button id="btn-save-task" style="padding: 12px 30px; background: var(--primary); color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(26, 141, 155, 0.25); display: inline-flex; align-items: center; gap: 8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                حفظ المهمة
              </button>
            </div>
          ` : ''}
        </div>
      `,
      didOpen: () => {
        if (!isReadOnly) {
          flatpickr(document.getElementById('t-due'), {
            locale: Arabic,
            dateFormat: "Y-m-d",
            allowInput: true,
            onOpen: function(selectedDates, dateStr, instance) {
              if (instance.calendarContainer) {
                instance.calendarContainer.style.zIndex = 99999;
              }
            }
          });

          const cards = document.querySelectorAll('.premium-assignee-card');
          cards.forEach(card => {
            card.addEventListener('click', () => {
              const isSelected = card.getAttribute('data-selected') === 'true';
              const name = card.getAttribute('data-name');
              const init = name ? name.trim().charAt(0) : '?';
              const avatar = card.querySelector('.assignee-avatar');
              
              if (isSelected) {
                card.setAttribute('data-selected', 'false');
                card.style.borderColor = 'var(--surface-border)';
                card.style.backgroundColor = 'var(--surface)';
                card.style.color = 'var(--text-main)';
                const label = card.querySelector('.assignee-label');
                if (label) label.style.color = 'var(--text-main)';
                if (avatar) {
                  avatar.style.backgroundColor = 'var(--primary-light)';
                  avatar.style.color = 'var(--primary)';
                  avatar.style.borderColor = 'rgba(26, 141, 155, 0.2)';
                  avatar.innerHTML = init;
                }
              } else {
                card.setAttribute('data-selected', 'true');
                card.style.borderColor = 'var(--primary)';
                card.style.backgroundColor = 'var(--primary-light)';
                card.style.color = 'var(--primary-dark)';
                const label = card.querySelector('.assignee-label');
                if (label) label.style.color = 'var(--primary-dark)';
                if (avatar) {
                  avatar.style.backgroundColor = 'var(--primary)';
                  avatar.style.color = '#ffffff';
                  avatar.style.borderColor = 'var(--primary)';
                  avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                }
              }
            });
          });

          document.getElementById('btn-save-task')?.addEventListener('click', async () => {
            const name = document.getElementById('t-name').value;
            const taskNumber = document.getElementById('t-number').value.trim();
            const description = document.getElementById('t-desc').value;
            const dueDate = document.getElementById('t-due').value;
            const priority = document.getElementById('t-priority').value;

            const selectedCards = document.querySelectorAll('.premium-assignee-card[data-selected="true"]');
            const assigneeIds = Array.from(selectedCards).map(c => c.getAttribute('data-id'));
            const assigneeNames = Array.from(selectedCards).map(c => c.getAttribute('data-name'));

            if (!name || !taskNumber || assigneeIds.length === 0) {
              MySwal.showValidationMessage('يرجى ملء العنوان ورقم المهمة واختيار مسؤول واحد على الأقل');
              return;
            }

            const assigneeId = assigneeIds[0];
            const assigneeName = assigneeNames[0];

            const newTaskData = {
              ...initial,
              name,
              taskNumber,
              description,
              assigneeId,
              assigneeName,
              assigneeIds,
              assigneeNames,
              dueDate,
              priority,
              createdBy: user.name || 'إدارة'
            };

            await saveSupervisorTask(newTaskData);

            try {
              if (!isEdit) { // Only notify on new tasks
                const employeesList = await getEmployees();
                for (const empId of assigneeIds) {
                  const employee = Object.values(employeesList).find(e => e.id === empId);
                  if (employee && employee.phone) {
                    const msg = `مرحباً ${employee.name}،\nتم تكليفك بمهمة جديدة:\n📌 العنوان: ${name}\n📝 التفاصيل: ${description}\n⏰ تاريخ التسليم: ${dueDate}\n-- الإدارة`;
                    await sendWhatsAppNotification(employee.phone, msg, 'daily_report');
                  }
                }
              }
            } catch (err) {
              console.error('WhatsApp Error:', err);
            }

            fetchData();
            MySwal.close();
            MySwal.fire('تم الحفظ', 'تم حفظ بيانات المهمة بنجاح', 'success');
          });
        }

        if (isEdit) {
          document.getElementById('btn-add-comment')?.addEventListener('click', async () => {
            const comment = document.getElementById('t-new-comment').value;
            if (!comment) return;

            const updatedTask = { ...task };
            updatedTask.logs = [
              ...(updatedTask.logs || []),
              {
                action: 'تعليق جديد',
                by: user.name || 'مستخدم',
                timestamp: new Date().toISOString(),
                comment: comment
              }
            ];

            await saveSupervisorTask(updatedTask);
            fetchData();
            MySwal.close();
            MySwal.fire({ title: 'تم', text: 'تمت إضافة التعليق', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
          });
        }
      }
    });
  };

  // KPIs Calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'مكتملة').length;
  const lateTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'مكتملة').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ padding: '20px', direction: 'rtl', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      <div className="glass-card mb-6 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <User className="text-slate-600" size={24} /> إدارة مهام المشرفين
          </h2>
          <div className="flex flex-wrap items-center mt-4 md:mt-0" style={{ gap: '16px' }}>
            {isSuperAdmin && (
              <button 
                onClick={() => openTaskModal()} 
                className="btn btn-primary flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  border: 'none'
                }}
              >
                <Plus size={18} /> إضافة مهمة
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-primary flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '15px',
                border: 'none',
                color: 'white',
                backgroundColor: 'var(--primary)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span>تصفية</span>
            </button>
            <div 
              className="flex items-center gap-2 shadow-sm transition-all"
              style={{
                backgroundColor: '#10b981', // Emerald green
                color: 'white',
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '15px'
              }}
            >
              <CheckCircle2 size={18} />
              <span>نسبة الإنجاز: {completionRate}%</span>
            </div>
            
            <div 
              className="flex items-center gap-2 shadow-sm transition-all"
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '15px'
              }}
            >
              <AlertCircle size={18} />
              <span>مهام متأخرة: {lateTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="premium-filter-panel">
          <div style={{ flex: '1', minWidth: '200px', display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid rgba(26, 141, 155, 0.2)', borderRadius: '10px', padding: '0 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <Search size={16} color="var(--primary)" />
            <input 
              type="text" 
              placeholder="البحث بالاسم أو رقم المهمة..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--primary-dark)', fontWeight: '600' }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <select 
              value={filters.assigneeId}
              onChange={(e) => setFilters({...filters, assigneeId: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid rgba(26, 141, 155, 0.2)', borderRadius: '10px', fontSize: '14px', outline: 'none', color: 'var(--primary-dark)', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            >
              <option value="">جميع المسؤولين</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <select 
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--surface)', border: '1px solid rgba(26, 141, 155, 0.2)', borderRadius: '10px', fontSize: '14px', outline: 'none', color: 'var(--primary-dark)', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            >
              <option value="">جميع الأولويات</option>
              {Object.keys(PRIORITIES).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setFilters({ search: '', assigneeId: '', priority: '' })}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', padding: '10px 16px', borderRadius: '10px', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
          >
            <X size={16} /> مسح الفلاتر
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><div className="loading-spinner"></div></div>
      ) : (
        /* Kanban Board */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px', paddingBottom: '10px', alignItems: 'start' }}>
          {COLUMNS.map(col => {
            const columnTasks = tasks.filter(t => {
              if (t.status !== col.id) return false;
              if (filters.search && !t.name.includes(filters.search) && !t.taskNumber?.includes(filters.search)) return false;
              if (filters.assigneeId) {
                const isDirect = String(t.assigneeId) === String(filters.assigneeId);
                const isInArray = Array.isArray(t.assigneeIds) && t.assigneeIds.map(String).includes(String(filters.assigneeId));
                if (!isDirect && !isInArray) return false;
              }
              if (filters.priority && t.priority !== filters.priority) return false;
              return true;
            });
            
            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                style={{ 
                  backgroundColor: col.bg, 
                  border: `1px solid ${col.border}`, 
                  borderRadius: '12px',
                  padding: '10px',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: col.color, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.title}</h3>
                  <div style={{ backgroundColor: '#fff', color: col.color, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', border: `1px solid ${col.border}` }}>
                    {columnTasks.length}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {columnTasks.map(task => {
                    const priorityData = PRIORITIES[task.priority] || PRIORITIES['متوسطة'];
                    const isTaskLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'مكتملة';
                    const commentsCount = (task.logs || []).filter(l => l.action === 'تعليق جديد').length;

                    return (
                      <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openTaskModal(task)}
                        style={{ 
                          backgroundColor: '#fff', 
                          border: isTaskLate ? '2px solid #fca5a5' : '1px solid #e2e8f0', 
                          borderRadius: '10px', 
                          padding: '10px', 
                          cursor: 'grab',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          transition: 'transform 0.1s, box-shadow 0.1s',
                          position: 'relative'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
                      >
                        {isTaskLate && (
                          <div style={{ position: 'absolute', top: '-8px', left: '-4px', backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', padding: '2px 4px', borderRadius: '6px', fontWeight: 'bold' }}>
                            تجاوز الموعد!
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{task.taskNumber}</span>
                            {isSuperAdmin && (
                              <button
                                onClick={(e) => handleDeleteTask(e, task.id)}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                                title="حذف المهمة"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: priorityData.bg, color: priorityData.color, padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                            {priorityData.icon} {task.priority}
                          </div>
                        </div>

                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {task.name}
                        </h4>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', flexWrap: 'wrap', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <User size={10} strokeWidth={2.5} />
                            </div>
                            <span 
                              style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}
                              title={Array.isArray(task.assigneeNames) ? task.assigneeNames.join('، ') : task.assigneeName}
                            >
                              {Array.isArray(task.assigneeNames) && task.assigneeNames.length > 0 
                                ? task.assigneeNames.map(n => n.split(' ')[0]).join('، ')
                                : (task.assigneeName ? task.assigneeName.split(' ')[0] : 'غير معين')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            {commentsCount > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#64748b', fontSize: '10px' }}>
                                <MessageSquare size={10} /> {commentsCount}
                              </div>
                            )}
                            {task.dueDate && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: isTaskLate ? '#ef4444' : '#64748b', fontSize: '10px' }}>
                                <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                  
                  {columnTasks.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', border: '2px dashed #cbd5e1', borderRadius: '12px', opacity: 0.5 }}>
                      اسحب المهام إلى هنا
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSupervisorTasks;
