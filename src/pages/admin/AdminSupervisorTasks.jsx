import React, { useState, useEffect } from 'react';
import { getSupervisorTasks, saveSupervisorTask, deleteSupervisorTask, getEmployees, isAdmin } from '../../store';
import { sendWhatsAppNotification } from '../../utils/whatsappService';
import { Plus, Clock, AlertCircle, CheckCircle2, MoreHorizontal, User, MessageSquare, Calendar, ShieldCheck, Flag, Trash2, Filter, Search, X, Loader2, Inbox, FileText, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import flatpickr from 'flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import 'flatpickr/dist/themes/light.css';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';

const MySwal = withReactContent(Swal);

const COLUMNS = [
  { id: 'جديدة', title: 'جديدة', color: '#3b82f6', bg: '#eff6ff', bgHeader: '#e0f2fe', border: '#bfdbfe', icon: FileText },
  { id: 'تم الاستلام', title: 'تم الاستلام', color: '#8b5cf6', bg: '#f5f3ff', bgHeader: '#f3e8ff', border: '#ddd6fe', icon: Inbox },
  { id: 'جاري العمل', title: 'جاري العمل', color: '#f59e0b', bg: '#fffbeb', bgHeader: '#fef3c7', border: '#fde68a', icon: Loader2 },
  { id: 'بانتظار الاعتماد', title: 'بانتظار الاعتماد', color: '#ec4899', bg: '#fff5f5', bgHeader: '#fdf2f8', border: '#fbcfe8', icon: Clock },
  { id: 'مكتملة', title: 'مكتملة', color: '#10b981', bg: '#effaf6', bgHeader: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle2 }
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
  const debouncedTaskSearch = useDebounce(filters.search);
  
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

    // Prevent supervisor from moving tasks to "جديدة"
    if (columnId === 'جديدة' && !isSuperAdmin) {
      MySwal.fire('صلاحيات مقيدة', 'لا يمكنك نقل المهمة إلى "جديدة"، هذا الإجراء خاص بالإدارة فقط.', 'warning');
      return;
    }

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
    const hasAddPerm = isSuperAdmin || user?.permissions?.supervisor_tasks?.add;
    if (!task && !hasAddPerm) {
      MySwal.fire('خطأ', 'ليس لديك صلاحية لإنشاء مهام جديدة', 'error');
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
      taskNumber: nextTaskNumber,
      status: 'جديدة'
    };

    const hasEditPerm = isSuperAdmin || user?.permissions?.supervisor_tasks?.edit;
    const isReadOnly = isEdit && !hasEditPerm;

    MySwal.fire({
      customClass: { container: 'premium-modal-container', popup: 'premium-modal-medium' },
      width: '650px',
      showCloseButton: false,
      showConfirmButton: false,
      html: `
        <style>
          .swal2-popup.premium-modal-medium {
            padding: 0 !important;
            border-radius: 24px !important;
            overflow: hidden !important;
            border: none !important;
            background: #ffffff !important;
          }
          .premium-modal-header-teal {
            background-color: #1a8d9b;
            color: #ffffff;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-family: 'Tajawal', sans-serif;
          }
          .premium-modal-body {
            padding: 24px 20px;
            direction: rtl;
            text-align: right;
            font-family: 'Tajawal', sans-serif;
            background-color: #ffffff;
          }
          .field-label {
            font-size: 12px;
            font-weight: 800;
            color: #64748b;
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
          }
          .custom-input-box {
            width: 100%;
            height: 46px;
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            padding: 0 16px;
            font-size: 13px;
            font-weight: bold;
            color: #334155;
            background-color: #f8fafc;
            outline: none;
            transition: border-color 0.2s;
            text-align: center;
          }
          .custom-input-box:focus {
            border-color: #1a8d9b;
          }
          .custom-textarea {
            width: 100%;
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            padding: 12px 16px;
            font-size: 13px;
            font-weight: bold;
            color: #334155;
            background-color: #f8fafc;
            outline: none;
            resize: vertical;
            min-height: 100px;
          }
          .custom-textarea:focus {
            border-color: #1a8d9b;
          }
          .assignee-row-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            background-color: #ffffff;
          }
          .assignee-row-card[data-selected="true"] {
            border-color: #1a8d9b;
            background-color: #effafb;
          }
          .assignee-avatar-circle {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background-color: #e2e8f0;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 11px;
            transition: all 0.2s;
            flex-shrink: 0;
          }
          .assignee-row-card[data-selected="true"] .assignee-avatar-circle {
            background-color: #1a8d9b;
            color: #ffffff;
          }
          .three-cols-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
          }
          .select-wrapper {
            position: relative;
          }
          .select-wrapper select {
            width: 100%;
            height: 46px;
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            padding: 0 12px 0 24px;
            font-size: 13px;
            font-weight: bold;
            color: #334155;
            background-color: #ffffff;
            outline: none;
            appearance: none;
            cursor: pointer;
            text-align: center;
          }
          .select-wrapper .dropdown-arrow {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            pointer-events: none;
          }
        </style>

        <div class="premium-modal-header-teal">
          <div onclick="Swal.close()" style="cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>
          <h3 style="font-size: 15px; font-weight: 800; margin: 0; text-align: center;">
            تفاصيل المهمة: ${initial.taskNumber || ''}
          </h3>
          <div style="width: 22px;"></div>
        </div>

        <div class="premium-modal-body">
          <input id="t-number" type="hidden" value="${(initial.taskNumber || '').replace('TSK-', '')}">

          <div class="three-cols-grid" style="margin-bottom: 24px;">
            <div>
              <div class="field-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                حالة المهمة
              </div>
              <div class="select-wrapper">
                <select id="t-status">
                  ${COLUMNS.map(col => {
                    const isDisabledCompleted = col.id === 'مكتملة' && !isSuperAdmin;
                    const isDisabledNew = col.id === 'جديدة' && !isSuperAdmin;
                    return `
                      <option value="${col.id}" ${initial.status === col.id ? 'selected' : ''} ${isDisabledCompleted || isDisabledNew ? 'disabled' : ''}>
                        ${col.title} ${isDisabledCompleted ? '(يتطلب اعتماد)' : ''} ${isDisabledNew ? '(خاص بالإدارة)' : ''}
                      </option>
                    `;
                  }).join('')}
                </select>
                <svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

            <div>
              <div class="field-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                مستوى الأولوية
              </div>
              <div class="select-wrapper">
                <select id="t-priority" ${isReadOnly ? 'disabled' : ''}>
                  ${Object.keys(PRIORITIES).map(p => `<option value="${p}" ${initial.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
                ${!isReadOnly ? `<svg class="dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>` : ''}
              </div>
            </div>

            <div>
              <div class="field-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                تاريخ الاستحقاق
              </div>
              <input id="t-due" type="date" class="custom-input-box" style="background-color: #ffffff; cursor: pointer; text-align: center;" value="${initial.dueDate}" ${isReadOnly ? 'disabled' : ''}>
            </div>
          </div>

          <div style="margin-bottom: 16px;">
            <div class="field-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
              عنوان المهمة
            </div>
            <input id="t-name" class="custom-input-box" style="background-color: #ffffff; font-size: 14px; font-weight: 800; color: #1e293b; text-align: right;" value="${initial.name}" ${isReadOnly ? 'disabled' : ''} placeholder="العنوان">
          </div>

          <div style="margin-bottom: 20px;">
            <div class="field-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              وصف المهمة
            </div>
            <textarea id="t-desc" rows="6" class="custom-textarea" style="background-color: #ffffff;" ${isReadOnly ? 'disabled' : ''} placeholder="تفاصيل المهمة...">${initial.description || ''}</textarea>
          </div>

          <div style="margin-bottom: 20px;">
            <div class="field-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
              المسؤولون عن التنفيذ
            </div>
             ${isReadOnly ? `
               <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                 ${Array.isArray(initial.assigneeNames) && initial.assigneeNames.length > 0 
                   ? initial.assigneeNames.map(name => {
                       const init = name ? name.trim().charAt(0) : '?';
                       return `
                         <div class="assignee-row-card" data-selected="true" style="cursor: default; pointer-events: none;">
                           <span style="font-size: 11px; font-weight: 800; color: #334155;">${name}</span>
                           <div class="assignee-avatar-circle" style="background-color: #1a8d9b; color: #ffffff;">${init}</div>
                         </div>
                       `;
                     }).join('')
                   : `<span style="color: #94a3b8; font-style: italic;">غير معين</span>`
                 }
               </div>
             ` : `
               <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                 ${employees.map(e => {
                   const isChecked = (Array.isArray(initial.assigneeIds) && initial.assigneeIds.includes(e.id)) || (initial.assigneeId === e.id);
                   const init = e.name ? e.name.trim().charAt(0) : '?';
                   return `
                     <div class="assignee-row-card" data-id="${e.id}" data-name="${e.name}" data-selected="${isChecked ? 'true' : 'false'}">
                       <span class="assignee-label" style="font-size: 11px; font-weight: 800; color: #334155;">${e.name}</span>
                       <div class="assignee-avatar-circle">
                         ${isChecked ? `
                           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                         ` : init}
                       </div>
                     </div>
                   `;
                 }).join('')}
               </div>
             `}
          </div>

          ${isEdit ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px dashed #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="font-size: 14px; font-weight: 850; color: #1e293b; margin: 0;">إضافة تعليق / تحديث</h4>
                <button id="btn-add-comment" style="padding: 0 16px; height: 36px; background-color: #1a8d9b; color: #ffffff; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 12px; transition: all 0.2s;" class="hover:opacity-90">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  إرسال
                </button>
              </div>
              
              <div style="margin-bottom: 16px;">
                <input id="t-new-comment" class="custom-input-box" style="width: 100%; text-align: right; background-color: #ffffff;" placeholder="اكتب تحديثاً...">
              </div>

              <div style="max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 10px; background-color: #f8fafc; border-radius: 18px; border: 1.5px solid #e2e8f0;">
                ${(initial.logs || []).filter(log => log.action === 'تعليق جديد').slice().reverse().map(log => {
                  const isMe = log.by === user.name;
                  return `
                    <div style="display: flex; flex-direction: column; max-width: 80%; align-self: ${isMe ? 'flex-end' : 'flex-start'}; text-align: right;">
                      <div style="background-color: ${isMe ? '#effafb' : '#ffffff'}; color: #1e293b; padding: 10px 14px; border-radius: 16px; border-top-${isMe ? 'left' : 'right'}-radius: 0px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); border: 1px solid ${isMe ? 'rgba(26,141,155,0.15)' : '#e2e8f0'};">
                        ${!isMe ? `<div style="font-size: 11px; font-weight: 800; color: #1a8d9b; margin-bottom: 4px;">${log.by}</div>` : ''}
                        <div style="font-size: 13px; line-height: 1.5; font-weight: bold;">${log.comment}</div>
                        <div style="font-size: 10px; color: #94a3b8; text-align: left; margin-top: 4px;">
                          ${new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
                ${(!initial.logs || initial.logs.filter(log => log.action === 'تعليق جديد').length === 0) ? `
                  <div style="text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; font-weight: bold;">
                    لا توجد رسائل سابقة. ابدأ المحادثة الآن!
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 30px; display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-save-task" style="padding: 0 30px; height: 46px; background-color: #1a8d9b; color: white; border: none; border-radius: 16px; font-weight: bold; font-size: 14px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(26, 141, 155, 0.25); display: inline-flex; align-items: center; gap: 8px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              حفظ المهمة
            </button>
          </div>
        </div>
      `,
      didOpen: () => {
        if (!isReadOnly) {
          const cards = document.querySelectorAll('.assignee-row-card');
          cards.forEach(card => {
            card.addEventListener('click', () => {
              const isSelected = card.getAttribute('data-selected') === 'true';
              const name = card.getAttribute('data-name');
              const init = name ? name.trim().charAt(0) : '?';
              const avatar = card.querySelector('.assignee-avatar-circle');
              
              if (isSelected) {
                card.setAttribute('data-selected', 'false');
                card.style.borderColor = '#e2e8f0';
                card.style.backgroundColor = '#ffffff';
                if (avatar) {
                  avatar.style.backgroundColor = '#e2e8f0';
                  avatar.style.color = '#475569';
                  avatar.innerHTML = init;
                }
              } else {
                card.setAttribute('data-selected', 'true');
                card.style.borderColor = '#1a8d9b';
                card.style.backgroundColor = '#effafb';
                if (avatar) {
                  avatar.style.backgroundColor = '#1a8d9b';
                  avatar.style.color = '#ffffff';
                  avatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                }
              }
            });
          });
        }

        document.getElementById('btn-save-task')?.addEventListener('click', async () => {
            const name = document.getElementById('t-name').value;
            const taskNumber = `TSK-${document.getElementById('t-number').value.trim()}`;
            const description = document.getElementById('t-desc').value;
            const dueDate = document.getElementById('t-due').value;
            const priority = document.getElementById('t-priority').value;
            const status = document.getElementById('t-status')?.value || initial.status;

            const selectedCards = document.querySelectorAll('.assignee-row-card[data-selected="true"]');
            const assigneeIds = isReadOnly 
              ? (initial.assigneeIds || (initial.assigneeId ? [initial.assigneeId] : [])) 
              : Array.from(selectedCards).map(c => c.getAttribute('data-id'));
            const assigneeNames = isReadOnly 
              ? (initial.assigneeNames || (initial.assigneeName ? [initial.assigneeName] : [])) 
              : Array.from(selectedCards).map(c => c.getAttribute('data-name'));

            if (!name || !taskNumber || assigneeIds.length === 0 || !assigneeIds[0]) {
              MySwal.showValidationMessage('يرجى ملء العنوان ورقم المهمة واختيار مسؤول واحد على الأقل');
              return;
            }

            // Check if status changed without admin privileges
            if (isEdit && status !== initial.status) {
              if (status === 'مكتملة' && !isSuperAdmin) {
                MySwal.showValidationMessage('لا يمكنك إغلاق المهمة مباشرة، يجب نقلها إلى "بانتظار الاعتماد" ليقوم المدير بذلك.');
                return;
              }
              if (status === 'جديدة' && !isSuperAdmin) {
                MySwal.showValidationMessage('لا يمكنك إعادة المهمة إلى حالة "جديدة"، هذا الإجراء خاص بالإدارة فقط.');
                return;
              }
            }

            const assigneeId = assigneeIds[0];
            const assigneeName = assigneeNames[0];

            let finalLogs = [...(initial.logs || [])];
            if (isEdit && status !== initial.status) {
              finalLogs.push({
                action: 'تغيير حالة المهمة',
                by: user.name || 'مستخدم',
                timestamp: new Date().toISOString(),
                comment: `تم تغيير الحالة من "${initial.status}" إلى "${status}"`
              });
            }

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
              status,
              logs: finalLogs,
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
    <div style={{ padding: '12px 12px 120px 12px', direction: 'rtl', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Tajawal, sans-serif' }}>
      
      {/* Header with Icon on the Right (RTL) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        padding: '4px 4px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          color: '#475569'
        }}>
          <User size={18} />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: '850', color: '#1e293b', margin: 0, textAlign: 'center', flex: 1 }}>
          إدارة مهام المشرفين
        </h2>
        <div style={{ width: '36px' }}></div>
      </div>

      {/* Unified Stats and Actions Card - Compact 3-Column Layout */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        padding: '12px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.015)',
        border: '1px solid #f1f5f9',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {isSuperAdmin && (
          <button
            onClick={() => openTaskModal()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: '#1a8d9b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              height: '36px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%'
            }}
            className="hover:opacity-90 active:scale-95"
          >
            <Plus size={14} />
            <span>إضافة مهمة جديدة</span>
          </button>
        )}

        {/* 3 Columns Row: Stats + Filter */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 0.8fr',
          gap: '8px',
          alignItems: 'center'
        }}>
          {/* Completion Rate */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            backgroundColor: '#effaf6',
            border: '1px solid #d1fae5',
            color: '#10b981',
            borderRadius: '10px',
            height: '36px',
            fontWeight: 'bold',
            fontSize: '11px'
          }}>
            <CheckCircle2 size={13} />
            <span>إنجاز: {completionRate}%</span>
          </div>

          {/* Late Tasks */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            backgroundColor: '#fff5f5',
            border: '1px solid #fee2e2',
            color: '#ef4444',
            borderRadius: '10px',
            height: '36px',
            fontWeight: 'bold',
            fontSize: '11px'
          }}>
            <AlertCircle size={13} />
            <span>متأخرة: {lateTasks}</span>
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              backgroundColor: '#1a8d9b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              height: '36px',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            className="hover:opacity-90 active:scale-95"
          >
            <Filter size={13} />
            <span>تصفية</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="premium-filter-panel" style={{ marginBottom: '24px' }}>
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
        /* Kanban Board Grid - Stacks on mobile, columns on desktop */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', paddingBottom: '20px', alignItems: 'start' }}>
          {COLUMNS.map(col => {
            const columnTasks = tasks.filter(t => {
              if (t.status !== col.id) return false;
              if (!matchesSearch([t.name, t.taskNumber, t.description, t.assigneeNames], debouncedTaskSearch)) return false;
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
                  backgroundColor: '#ffffff', 
                  border: `1.5px solid #f1f5f9`, 
                  borderRadius: '20px',
                  padding: '12px',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.015)'
                }}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '50%', 
                      backgroundColor: col.bgHeader, 
                      color: col.color 
                    }}>
                      <col.icon size={20} />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: '850', color: col.color, margin: 0 }}>
                      {col.title}
                    </h3>
                  </div>
                  <div style={{ 
                    backgroundColor: col.bgHeader, 
                    color: col.color, 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '13px', 
                    fontWeight: '800', 
                    border: `1px solid ${col.border}` 
                  }}>
                    {columnTasks.length}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
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
                          backgroundColor: col.bg, 
                          border: isTaskLate ? '2px solid #ef4444' : `1px solid ${col.border}`, 
                          borderRadius: '16px', 
                          padding: '14px', 
                          cursor: 'grab',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        className="hover:-translate-y-1 hover:shadow-md"
                      >
                        {isTaskLate && (
                          <div style={{ position: 'absolute', top: '-8px', left: '-4px', backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', padding: '2px 4px', borderRadius: '6px', fontWeight: 'bold' }}>
                            تجاوز الموعد!
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{task.taskNumber}</span>
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

                        <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', margin: '0 0 8px 0', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {task.name}
                        </h4>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '8px', flexWrap: 'wrap', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ffffff', color: col.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${col.border}` }}>
                              <User size={10} strokeWidth={2.5} />
                            </div>
                            <span 
                              style={{ fontSize: '11px', color: '#475569', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}
                              title={Array.isArray(task.assigneeNames) ? task.assigneeNames.filter(Boolean).join('، ') : (task.assigneeName || 'غير معين')}
                            >
                              {Array.isArray(task.assigneeNames) && task.assigneeNames.filter(n => typeof n === 'string').length > 0 
                                ? task.assigneeNames.filter(n => typeof n === 'string').map(n => n.split(' ')[0]).join('، ')
                                : (typeof task.assigneeName === 'string' ? task.assigneeName.split(' ')[0] : 'غير معين')}
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
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#94a3b8', 
                      fontSize: '13px', 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '14px', 
                      minHeight: '60px',
                      padding: '16px',
                      fontWeight: 'bold',
                      backgroundColor: '#fafafa'
                    }}>
                      لسحب المهام إلى هنا
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
