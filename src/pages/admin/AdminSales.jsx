import { allDeliveryItemsReady, orderDeliveryMission } from '../../utils/deliveryMethod';
import AdminStock from './AdminStock';
import { stockWorkflowState } from '../../utils/salesStockWorkflow';
import { hasDraftItems, readLocalDrafts, mergeDrafts, writeLocalDraft, removeLocalDraft } from '../../utils/salesDrafts';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { ShoppingCart, Plus, Search, Trash2, Package, Printer, X, User, UserPlus, Edit2, Eye, Phone, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Calendar, Activity, FileText, Briefcase, Clock, Check, Save, Share2, Layers, Clipboard, CheckCircle, Copy, Archive, Truck, Lock, EyeOff, CheckSquare } from 'lucide-react';
import { approveSalesOrder, getSalesOrders, subscribeToSalesOrders, saveSalesOrder, deleteSalesOrder, getSalesOrderDrafts, saveSalesOrderDraft, deleteSalesOrderDraft, getCustomers, saveCustomer, getGlobalSettings, saveGlobalSettings, isAdmin, canPerformAction, addLog, getStock, saveStockItem, getOrders, saveOrder, getPreparationOrders, savePreparationOrder, getMissions, saveMission, deleteMission, getEmployees, createNotification, getStockVouchers } from '../../store';
import { matchesSearch, useDebounce } from '../../utils/searchEngine';
import { hasPermission } from '../../utils/permissions';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import './AdminSales.css';
import Select from '../../components/SearchSelect';
import SearchableDropdown from '../../components/SearchableDropdown';
import PreparationVariantsModal from '../../components/PreparationVariantsModal';
import PrepAndProdVariantsModal from '../../components/PrepAndProdVariantsModal';
import MultiColorSelectionModal from '../../components/MultiColorSelectionModal';
import html2pdf from 'html2pdf.js';
import { buildReservedQuantityMap, cleanStockProductName, getAvailableQuantity, isReservableSalesItem } from '../../utils/stockAvailability';
const MySwal = withReactContent(Swal);

const SALES_ITEM_STATUS_OPTIONS = [
  { value: 'جاهز', label: 'جاهز' },
  { value: 'قيد التجهيز', label: 'قيد التجهيز' },
  { value: 'قيد الإنتاج', label: 'قيد الخياطة' },
  { value: 'قيد التحضير', label: 'قيد التحضير' },
  { value: 'تحضير وإنتاج', label: 'انتاج خياطة وتحضير' },
  { value: 'ملغي', label: 'ملغي' }
];

const normalizeSalesItemStatus = status => {
  if (['إنتاج قيد الخياطة', 'إنتاج قيد التغليف'].includes(status)) return 'قيد الإنتاج';
  if (status === 'إنتاج قيد التحضير') return 'قيد التحضير';
  if (status === 'تحضير وإنتاج' || status === 'إنتاج وتحضير' || status === 'تحضير وانتاج') return 'تحضير وإنتاج';
  if (['جاهز للتسليم', 'تم التسليم', 'تم الإنتاج', 'تم التحضير', 'تم التجهيز', 'منتهي'].includes(status)) return 'جاهز';
  if (status === 'ملغى') return 'ملغي';
  return status || '';
};

const getLocalDateStr = (d) => {
  if (!d) return '';
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const getShortName = (fullName) => {
  if (!fullName || fullName === '---') return '---';
  const trimmed = String(fullName).trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 0) return '---';
  if (['عبد', 'أبو', 'ابو', 'أم', 'ام'].includes(parts[0]) && parts[1]) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0];
};

const getFirstAndLastName = (fullName) => {
  if (!fullName || fullName === '---') return '---';
  const trimmed = String(fullName).trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return trimmed;

  // التعامل مع المركبات في أول الاسم (مثل: عبد الله، أبو بكر، بهاء الدين)
  let firstPart = parts[0];
  let restIndex = 1;
  if (['عبد', 'أبو', 'ابو', 'أم', 'ام'].includes(parts[0]) && parts[1]) {
    firstPart = `${parts[0]} ${parts[1]}`;
    restIndex = 2;
  } else if (parts[1] && ['الدين', 'الله'].includes(parts[1])) {
    firstPart = `${parts[0]} ${parts[1]}`;
    restIndex = 2;
  }

  // إذا لم يتبق شيء بعد الاسم الأول المركب
  if (restIndex >= parts.length) return firstPart;

  // التعامل مع المركبات في آخر الاسم (العائلة) مثل: آل فلان، أبو فلان، عبد فلان
  let lastPart = parts[parts.length - 1];
  if (parts.length - 2 >= restIndex) {
    const prevToLast = parts[parts.length - 2];
    if (['عبد', 'أبو', 'ابو', 'آل', 'ابن', 'بن'].includes(prevToLast)) {
      lastPart = `${prevToLast} ${lastPart}`;
    }
  }

  return `${firstPart} ${lastPart}`;
};

const AdminSales = ({ user }) => {
  const currentUserId = user?.id || user?.employeeId || '';
  const currentUserName = user?.name || '';
  const userDept = String(user?.department || '').trim();
  const isImad = currentUserId === 'EMP-0025' || currentUserName.includes('عماد');
  const isManager = isAdmin(user) ||
    ['admin', 'إدارة', 'الادارة', 'الإدارة', 'مدير'].includes(user?.level) ||
    ['إدارة', 'الادارة', 'الإدارة'].includes(userDept) ||
    user?.role === 'admin' ||
    user?.role === 'مدير' ||
    user?.name === 'المدير العام' ||
    user?.name === 'المدير' ||
    Boolean(user?.accessAdmin) ||
    hasPermission(user, 'orders', 'final_approve');

  const canApproveOrders = isAdmin(user) || hasPermission(user, 'orders', 'final_approve');
  const canCompleteDelivery = isAdmin(user) || hasPermission(user, 'orders', 'complete_delivery');
  const canAssignDelivery = isAdmin(user) || hasPermission(user, 'orders', 'assign_delivery');

  const [stockAuditRequest, setStockAuditRequest] = useState(null);
  const closeStockAudit = async () => {
    setStockAuditRequest(null);
    const [prod, prep, sales] = await Promise.all([getOrders(), getPreparationOrders(), getSalesOrders()]);
    setProductionOrders(prod || []); setPreparationOrders(prep || []); setOrders(sales || []);
    if (typeof fetchData === 'function') fetchData().catch(() => {});
  };

  const handleIgnoreStockAudit = async (order) => {
    const confirm = await MySwal.fire({
      icon: 'question',
      title: 'تجاهل تدقيق الخصم',
      text: `هل تؤكد تجاهل تدقيق خصم المخزون للطلبية رقم ${order.orderNumber}؟ سيتم تجاوز الخصم واعتبار الخطوة مكتملة.`,
      showCancelButton: true,
      confirmButtonText: 'نعم، تجاهل التدقيق',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel'
      }
    });

    if (confirm.isConfirmed) {
      try {
        await saveSalesOrder({
          ...order,
          ignoredAudit: true,
          ignoredAuditBy: user?.name || (isImad ? 'عماد' : 'مشرف'),
          ignoredAuditAt: new Date().toISOString(),
          lastActionBy: user?.name || (isImad ? 'عماد' : 'مشرف'),
          statusUpdateDate: getLocalDateStr(new Date())
        }, { preserveStatus: true });

        await addLog({
          userId: user?.id,
          userName: user?.name || (isImad ? 'عماد' : 'مشرف'),
          module: 'طلبيات العملاء',
          action: 'تجاهل تدقيق الخصم',
          details: `تجاهل تدقيق خصم المخزون للطلبية رقم ${order.orderNumber}`
        });

        await fetchData();
        MySwal.fire({
          icon: 'success',
          title: 'تم التجاهل',
          text: `تم تسجيل تجاهل تدقيق الخصم للطلبية رقم ${order.orderNumber}`,
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        MySwal.fire('خطأ', err.message || 'تعذر حفظ التجاهل', 'error');
      }
    }
  };

  const handleUndoIgnoreStockAudit = async (order) => {
    const confirm = await MySwal.fire({
      icon: 'question',
      title: 'إلغاء التجاهل',
      text: `هل تريد إلغاء التجاهل للطلبية رقم ${order.orderNumber} وإعادتها للتدقيق؟`,
      showCancelButton: true,
      confirmButtonText: 'نعم، إعادة للتدقيق',
      cancelButtonText: 'إبقاء التجاهل',
      confirmButtonColor: '#0f766e',
      cancelButtonColor: '#64748b',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel'
      }
    });

    if (confirm.isConfirmed) {
      try {
        await saveSalesOrder({
          ...order,
          ignoredAudit: false,
          ignoredAuditBy: null,
          ignoredAuditAt: null,
          lastActionBy: user?.name || (isImad ? 'عماد' : 'مشرف'),
          statusUpdateDate: getLocalDateStr(new Date())
        }, { preserveStatus: true });

        await addLog({
          userId: user?.id,
          userName: user?.name || (isImad ? 'عماد' : 'مشرف'),
          module: 'طلبيات العملاء',
          action: 'إلغاء تجاهل التدقيق',
          details: `إلغاء تجاهل تدقيق خصم المخزون للطلبية رقم ${order.orderNumber}`
        });

        await fetchData();
      } catch (err) {
        MySwal.fire('خطأ', err.message || 'تعذر إلغاء التجاهل', 'error');
      }
    }
  };

  const handleIgnoreMaterialAudit = async (card) => {
    const confirm = await MySwal.fire({
      icon: 'question',
      title: 'تجاهل صرف المواد',
      text: `هل تؤكد تجاهل صرف المواد للطلب رقم ${card.orderNumber}؟ سيتم تجاوز الصرف واعتبار الخطوة مكتملة.`,
      showCancelButton: true,
      confirmButtonText: 'نعم، تجاهل الصرف',
      cancelButtonText: 'إلغاء',
      confirmButtonColor: '#d97706',
      cancelButtonColor: '#64748b',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel'
      }
    });

    if (confirm.isConfirmed) {
      try {
        const updated = {
          ...card,
          ignoredMaterialAudit: true,
          ignoredMaterialAuditBy: user?.name || (isImad ? 'عماد' : 'مشرف'),
          ignoredMaterialAuditAt: new Date().toISOString()
        };
        delete updated.isProduction;
        delete updated.hasDraft;
        delete updated.draftCreatedBy;

        const saved = card.productionType === 'preparation'
          ? await savePreparationOrder(updated)
          : await saveOrder(updated);

        if (!saved) throw new Error('تعذر حفظ التجاهل');

        await addLog({
          userId: user?.id,
          userName: user?.name || (isImad ? 'عماد' : 'مشرف'),
          module: 'الإنتاج والتحضير',
          action: 'تجاهل صرف المواد',
          details: `تجاهل صرف المواد للطلب رقم ${card.orderNumber}`
        });

        await closeStockAudit();
        await fetchData();
      } catch (err) {
        MySwal.fire('خطأ', err.message || 'تعذر حفظ التجاهل', 'error');
      }
    }
  };

  const handleUndoIgnoreMaterialAudit = async (card) => {
    const confirm = await MySwal.fire({
      icon: 'question',
      title: 'إلغاء التجاهل',
      text: `هل تريد إلغاء التجاهل للطلب رقم ${card.orderNumber} وإعادته لصرف المواد؟`,
      showCancelButton: true,
      confirmButtonText: 'نعم، إلغاء التجاهل',
      cancelButtonText: 'إبقاء التجاهل',
      confirmButtonColor: '#0f766e',
      cancelButtonColor: '#64748b',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel'
      }
    });

    if (confirm.isConfirmed) {
      try {
        const updated = {
          ...card,
          ignoredMaterialAudit: false,
          ignoredMaterialAuditBy: null,
          ignoredMaterialAuditAt: null
        };
        delete updated.isProduction;
        delete updated.hasDraft;
        delete updated.draftCreatedBy;

        const saved = card.productionType === 'preparation'
          ? await savePreparationOrder(updated)
          : await saveOrder(updated);

        if (!saved) throw new Error('تعذر حفظ التراجع');

        await closeStockAudit();
        await fetchData();
      } catch (err) {
        MySwal.fire('خطأ', err.message || 'تعذر إلغاء التجاهل', 'error');
      }
    }
  };

  const isDriverDeliveryCompleted = (order) => {
    if (!order) return false;
    const cleanNum = String(order.orderNumber || '').trim();
    const linkedMission = (missions || []).find(m =>
      m.type === 'تسليم طلبية' &&
      String(m.salesOrderNumber || '').trim() === cleanNum
    );
    const deliveryStatus = String(linkedMission?.status || order.deliveryStatus || '').trim();
    if (deliveryStatus === 'تم الإنجاز' || deliveryStatus === 'تم الانجاز') return true;
    if (order.status === 'تم التوصيل' || order.status === 'تم التسليم' || order.status === 'منتهي') return true;
    return false;
  };

  const handleShowDeductionDetails = async (targetOrder, isMaterial = false) => {
    try {
      const orderNum = targetOrder.orderNumber || targetOrder.salesOrderNumber || '';
      const items = targetOrder.items || [];
      const allVouchers = await getStockVouchers();
      const validVouchers = allVouchers.filter(v =>
        v.orderNumber === orderNum &&
        v.status === 'معتمد' &&
        (!targetOrder.orderDate || !v.date || v.date >= targetOrder.orderDate)
      );
      const latestVoucher = validVouchers.length > 0 ? validVouchers[validVouchers.length - 1] : null;

      const itemsHtml = items.length > 0 ? `
        <div style="margin-top: 15px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <table style="width: 100%; border-collapse: collapse; text-align: right; font-family: inherit;">
            <thead>
              <tr style="background: #f8fafc; color: #475569; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 10px 14px; font-weight: 800; font-size: 0.85rem;">الصنف</th>
                <th style="padding: 10px 14px; font-weight: 800; font-size: 0.85rem; text-align: center; width: 110px;">الكمية المخصومة</th>
                <th style="padding: 10px 14px; font-weight: 800; font-size: 0.85rem; text-align: center; width: 90px;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; font-size: 0.9rem;">
                    ${item.productName || item.name || '-'}
                    ${item.colorModel || item.spec ? `<span style="display:block; font-size:0.75rem; color:#64748b; font-weight:normal;">${item.colorModel || item.spec}</span>` : ''}
                  </td>
                  <td style="padding: 10px 14px; text-align: center; font-weight: 800; color: #0284c7; font-size: 1rem;">
                    ${item.quantity} ${item.unit || 'عدد'}
                  </td>
                  <td style="padding: 10px 14px; text-align: center;">
                    <span style="background: #dcfce7; color: #15803d; font-size: 0.75rem; font-weight: 800; padding: 4px 9px; border-radius: 6px;">مخصوم ✓</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="text-align: center; color: #64748b; margin-top: 12px; font-weight: bold;">لا توجد أصناف مسجلة لهذه الطلبية.</p>';

      MySwal.fire({
        title: `
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #059669; font-weight: 800; font-size: 1.2rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            <span>${isMaterial ? 'تم صرف مواد الإنتاج بنجاح' : 'تم خصم المخزون بنجاح'}</span>
          </div>
        `,
        html: `
          <div style="text-align: right; background: #f8fafc; padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 0.95rem; color: #334155;">طلبية رقم: <strong style="color: #0284c7;">${orderNum}</strong></span>
              ${targetOrder.customerName ? `<span style="font-size: 0.9rem; color: #334155;">العميل: <strong style="color: #0f172a;">${targetOrder.customerName}</strong></span>` : ''}
            </div>
            ${latestVoucher ? `
              <div style="font-size: 0.85rem; color: #475569; display: flex; gap: 12px; flex-wrap: wrap; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
                <span>سند الإخراج: <strong style="color: #0f766e;">${latestVoucher.voucherNumber}</strong></span>
                <span>المستودع: <strong>${latestVoucher.warehouse || 'عام'}</strong></span>
                ${latestVoucher.date ? `<span>التاريخ: <strong>${latestVoucher.date}</strong></span>` : ''}
              </div>
            ` : ''}
            <div style="color: #15803d; font-weight: bold; font-size: 0.85rem; margin-top: 6px;">
              ✓ تم تدقيق كافة بنود الطلبية وتثبيت خصم الكميات من المخزون.
            </div>
          </div>
          ${itemsHtml}
        `,
        confirmButtonText: 'إغلاق',
        confirmButtonColor: '#0f766e',
        customClass: {
          container: 'premium-modal-container',
          popup: 'premium-modal-popup',
          confirmButton: 'btn-premium-save'
        }
      });
    } catch (err) {
      console.error(err);
      MySwal.fire({
        icon: 'success',
        title: isMaterial ? 'تم صرف المواد' : 'تم الخصم',
        text: 'تم خصم كميات هذه الطلبية من المخزون بنجاح.',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#0f766e'
      });
    }
  };

  const renderStockStep = (order, material = false) => {
    const state = stockWorkflowState(order, productionOrders, preparationOrders);
    const isDelivered = isDriverDeliveryCompleted(order);

    if (!material) {
      const isDone = Boolean(order.stockDeducted);
      const isIgnored = Boolean(order.ignoredAudit);
      const isLockedByDriver = !isDone && !isIgnored && !isDelivered;
      const isActionable = !isDone && !isIgnored && !isLockedByDriver && Boolean(state.stockLabel && state.stockLabel.includes('بانتظار'));

      if (isDone) {
        return (
          <div className="sales-workflow-cell">
            <button
              type="button"
              className="sales-merged-step-card is-done"
              onClick={() => handleShowDeductionDetails(order, false)}
              title="تم الخصم بنجاح - اضغط للاطلاع على السندات"
            >
              <div className="merged-card-header">
                <Check size={12} strokeWidth={2.8} />
                <span className="merged-card-status">تم الخصم</span>
              </div>
            </button>
          </div>
        );
      }

      if (isIgnored) {
        return (
          <div className="sales-workflow-cell">
            <button
              type="button"
              className="sales-merged-step-card is-ignored"
              onClick={() => handleUndoIgnoreStockAudit(order)}
              title="تم التجاهل - اضغط للتراجع والعودة للتدقيق"
            >
              <div className="merged-card-header">
                <EyeOff size={11} strokeWidth={2.2} />
                <span className="merged-card-status">تم التجاهل</span>
              </div>
            </button>
          </div>
        );
      }

      if (isLockedByDriver) {
        return (
          <div className="sales-workflow-cell">
            <button
              type="button"
              className="sales-merged-step-card is-locked"
              onClick={() => {
                MySwal.fire({
                  icon: 'warning',
                  title: 'تدقيق المخزون مقفل',
                  text: 'لا يمكن تدقيق خصم المخزون إلا بعد أن يقوم السائق بتسجيل حالة الطلبية (تم الإنجاز).',
                  confirmButtonText: 'حسناً',
                  confirmButtonColor: '#0f766e'
                });
              }}
              title="مغلق: لا يمكن التدقيق إلا بعد أن يسجل السائق حالة (تم الإنجاز)"
            >
              <div className="merged-card-header">
                <Lock size={11} strokeWidth={2.4} />
                <span className="merged-card-status">بانتظار السائق</span>
              </div>
            </button>
          </div>
        );
      }

      if (!state.stockDone && isActionable) {
        return (
          <div className="sales-workflow-cell">
            <div className="sales-choice-step-card" title="خصم المخزون: اختر إما التدقيق أو التجاهل">
              <div className="choice-card-actions">
                <button
                  type="button"
                  className="sales-choice-btn btn-audit"
                  onClick={() => setStockAuditRequest({ order })}
                  title="فتح تدقيق وخصم أصناف البضاعة الجاهزة"
                >
                  <CheckSquare size={11} strokeWidth={2.5} />
                  <span>تدقيق</span>
                </button>
                <button
                  type="button"
                  className="sales-choice-btn btn-ignore"
                  onClick={() => handleIgnoreStockAudit(order)}
                  title="تجاهل تدقيق خصم المخزون وتجاوز هذه الخطوة"
                >
                  <EyeOff size={11} strokeWidth={2.2} />
                  <span>تجاهل</span>
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="sales-workflow-cell">
          <div className="sales-merged-step-card is-empty" title="لا يوجد خصم بضاعة جاهزة لهذه الطلبية">
            <span className="merged-card-empty-text">لا يوجد خصم</span>
          </div>
        </div>
      );
    }

    if (!state.cards.length) {
      return (
        <div className="sales-workflow-cell">
          <div className="sales-merged-step-card is-empty" title="لا يوجد صرف إنتاج لهذه الطلبية">
            <span className="merged-card-empty-text">لا يوجد صرف</span>
          </div>
        </div>
      );
    }

    return (
      <div className="sales-workflow-cell">
        {state.cards.map(card => {
          const isDone = Boolean(card.stockDeducted);
          const isIgnored = Boolean(card.ignoredMaterialAudit);
          const isLockedByDriver = !isDone && !isIgnored && !isDelivered;

          if (isDone) {
            return (
              <button
                key={card.id}
                type="button"
                className="sales-merged-step-card is-done"
                onClick={() => handleShowDeductionDetails(card, true)}
                title="تم صرف المواد بنجاح - اضغط للاطلاع على السندات"
              >
                <div className="merged-card-header">
                  <Check size={12} strokeWidth={2.8} />
                  <span className="merged-card-status">تم الصرف</span>
                </div>
              </button>
            );
          }

          if (isIgnored) {
            return (
              <button
                key={card.id}
                type="button"
                className="sales-merged-step-card is-ignored"
                onClick={() => handleUndoIgnoreMaterialAudit(card)}
                title="تم تجاهل صرف المواد - اضغط للتراجع"
              >
                <div className="merged-card-header">
                  <EyeOff size={11} strokeWidth={2.2} />
                  <span className="merged-card-status">تم التجاهل</span>
                </div>
              </button>
            );
          }

          if (isLockedByDriver) {
            return (
              <button
                key={card.id}
                type="button"
                className="sales-merged-step-card is-locked"
                onClick={() => {
                  MySwal.fire({
                    icon: 'warning',
                    title: 'صرف المواد مقفل',
                    text: 'لا يمكن صرف مواد الإنتاج إلا بعد أن يقوم السائق بتسجيل حالة الطلبية (تم الإنجاز).',
                    confirmButtonText: 'حسناً',
                    confirmButtonColor: '#0f766e'
                  });
                }}
                title="مغلق: لا يمكن الصرف إلا بعد أن يسجل السائق حالة (تم الإنجاز)"
              >
                <div className="merged-card-header">
                  <Lock size={11} strokeWidth={2.4} />
                  <span className="merged-card-status">بانتظار السائق</span>
                </div>
              </button>
            );
          }

          return (
            <div key={card.id} className="sales-choice-step-card" title="صرف مواد الإنتاج: اختر إما الصرف أو التجاهل">
              <div className="choice-card-actions">
                <button
                  type="button"
                  className="sales-choice-btn btn-audit"
                  onClick={() => setStockAuditRequest({ order: card })}
                  title="صرف مواد أمر الإنتاج/التحضير"
                >
                  <CheckSquare size={11} strokeWidth={2.5} />
                  <span>صرف</span>
                </button>
                <button
                  type="button"
                  className="sales-choice-btn btn-ignore"
                  onClick={() => handleIgnoreMaterialAudit(card)}
                  title="تجاهل صرف المواد لهذا الأمر"
                >
                  <EyeOff size={11} strokeWidth={2.2} />
                  <span>تجاهل</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const [orders, setOrders] = useState([]);
  const [orderLimit, setOrderLimit] = useState(50);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'orderNumber', direction: 'desc' });
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [linkedProductionOrder, setLinkedProductionOrder] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ productionStatuses: [], salesStatuses: [], itemStatuses: [], salesItemStatuses: [], logoUrl: '/logo-mrsleep.png', siteName: 'Mirjas HR' });

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('معلق');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [filterOrderNumber, setFilterOrderNumber] = useState('');

  // Production Variants Modal
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [variantModalIndex, setVariantModalIndex] = useState(null);
  const [productionVariants, setProductionVariants] = useState([]);

  // Preparation Variants Modal
  const [showPreparationVariantsModal, setShowPreparationVariantsModal] = useState(false);
  const [preparationVariantModalIndex, setPreparationVariantModalIndex] = useState(null);
  const [preparationVariants, setPreparationVariants] = useState([]);
  const [linkedPreparationOrder, setLinkedPreparationOrder] = useState(null);
  const [preparationOrders, setPreparationOrders] = useState([]);

  // Combined Preparation & Production Variants Modal
  const [showPrepAndProdModal, setShowPrepAndProdModal] = useState(false);
  const [prepAndProdModalIndex, setPrepAndProdModalIndex] = useState(null);
  const [prepAndProdVariants, setPrepAndProdVariants] = useState({ prepVariants: [], prodVariants: [] });

  const [showMultiColorModal, setShowMultiColorModal] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [draftSaveState, setDraftSaveState] = useState('');
  const draftReadyRef = useRef(false);
  const draftTimerRef = useRef(null);
  const draftSaveQueueRef = useRef(Promise.resolve());
  const draftRevisionRef = useRef(0);
  const draftUserId = String(user?.id || user?.uid || user?.email || user?.name || 'unknown');
  const draftStorageKey = `mirjas_sales_draft_${draftUserId}`;

  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    orderDate: getLocalDateStr(new Date()),
    deliveryDate: '',
    status: 'جديد',
    orderNotes: '',
    items: [{ productName: '', quantity: '', notes: '', itemStatus: '' }]
  });

  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    phone: '',
    sector: ''
  });

  const [stock, setStock] = useState([]);
  const [missions, setMissions] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const { stockOptions, validStockOptions, stockLookup } = React.useMemo(() => {
    const grouped = {};
    const validMap = {};
    const lookup = {};
    const reservedMap = buildReservedQuantityMap(orders);

    stock.forEach(s => {
      if (!s.name) return;
      const sName = String(s.name || '').trim();
      const specSuffix = s.spec ? ` - ${String(s.spec).trim()}` : '';
      const key = `${sName}${specSuffix}`;

      validMap[key] = true;
      const qty = Number(s.quantity || 0);

      // Only show 'بضاعة جاهزة' in the dropdown
      if (s.category === 'بضاعة جاهزة') {
        if (!grouped[key]) {
          grouped[key] = {
            name: sName,
            spec: String(s.spec || '').trim(),
            totalQuantity: 0
          };
        }
        grouped[key].totalQuantity += qty;
      }

      if (!lookup[key]) {
        lookup[key] = { total: 0, breakdown: [] };
      }
      lookup[key].total += qty;

      if (qty > 0) {
        const warehouse = String(s.warehouse || 'الرئيسي').trim();
        validMap[`${key} (مستودع: ${warehouse})`] = true;
        const existingWh = lookup[key].breakdown.find(b => b.warehouse === warehouse);
        if (existingWh) {
          existingWh.quantity += qty;
        } else {
          lookup[key].breakdown.push({ warehouse, quantity: qty });
        }
      }
    });

    const options = Object.keys(grouped)
      .sort((a, b) => {
        const isModelA = String(a).trim().startsWith('موديل');
        const isModelB = String(b).trim().startsWith('موديل');
        if (isModelA && !isModelB) return -1;
        if (!isModelA && isModelB) return 1;
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
      })
      .map(key => {
        const g = grouped[key];
        const reserved = Number(reservedMap[key] || 0);
        const available = getAvailableQuantity(g.totalQuantity, reserved);
        return `${key} (الموجود: ${g.totalQuantity} | المحجوز: ${reserved} | المتاح: ${available})`;
      });

    Object.entries(lookup).forEach(([key, value]) => {
      value.reserved = Number(reservedMap[key] || 0);
      value.available = getAvailableQuantity(value.total, value.reserved);
    });

    return { stockOptions: options, validStockOptions: validMap, stockLookup: lookup };
  }, [stock, orders]);

  useEffect(() => {
    fetchData();
    getSalesOrderDrafts(draftUserId).then(cloudDrafts => {
      const combined = mergeDrafts(cloudDrafts, readLocalDrafts(localStorage, draftStorageKey));
      setDrafts(combined);
    });
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setOrdersLoading(true);
    const unsubscribe = subscribeToSalesOrders(
      liveOrders => { setOrders(liveOrders); setOrdersLoading(false); },
      error => { setOrdersLoading(false); console.error('تعذر تحديث حجوزات الطلبيات لحظياً', error); },
      orderLimit
    );
    return unsubscribe;
  }, [orderLimit]);

  useEffect(() => () => clearTimeout(draftTimerRef.current), []);

  // Save locally immediately, then synchronize quietly to Firestore after a short debounce.
  useEffect(() => {
    const revision = ++draftRevisionRef.current;
    if (!showModal || editingOrder || !activeDraftId || !draftReadyRef.current) return;
    clearTimeout(draftTimerRef.current);
    const draft = {
      id: activeDraftId,
      userId: draftUserId,
      userName: user?.name || '',
      formData,
      linkedProductionOrder,
      linkedPreparationOrder,
      updatedAt: new Date().toISOString()
    };
    if (!hasDraftItems(draft)) {
      const wasSaved = drafts.some(d => d.id === activeDraftId)
        || readLocalDrafts(localStorage, draftStorageKey).some(d => d.id === activeDraftId);
      removeLocalDraft(localStorage, draftStorageKey, activeDraftId);
      setDrafts(prev => prev.filter(d => d.id !== activeDraftId));
      setDraftSaveState('أضف صنفًا لحفظ الطلبية كمسودة');
      if (wasSaved) {
        draftSaveQueueRef.current = draftSaveQueueRef.current
          .then(() => deleteSalesOrderDraft(activeDraftId)).catch(() => false);
      }
      return;
    }
    writeLocalDraft(localStorage, draftStorageKey, draft);
    setDrafts(prev => mergeDrafts(prev, [draft]));
    setDraftSaveState('جاري حفظ المسودة...');
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(async () => {
      const pendingSave = draftSaveQueueRef.current.then(() => saveSalesOrderDraft(draft));
      draftSaveQueueRef.current = pendingSave.catch(() => null);
      const saved = await pendingSave;
      if (revision !== draftRevisionRef.current) return;
      setDraftSaveState(saved ? 'تم حفظ المسودة تلقائيًا' : 'محفوظة على هذا الجهاز');
      if (saved) setDrafts(prev => mergeDrafts(prev, [saved]));
    }, 1500);
  }, [formData, linkedProductionOrder, linkedPreparationOrder, showModal, editingOrder, activeDraftId]);

  const fetchData = async () => {
    setLoading(true);
    const [customersData, settingsData, stockData, missionsData, prodOrdersData, prepOrdersData, employeesData] = await Promise.all([
      getCustomers(),
      getGlobalSettings(),
      getStock(),
      getMissions(),
      getOrders(),
      getPreparationOrders(),
      getEmployees()
    ]);
    setCustomers(customersData.filter(c => (c.type || 'عميل') === 'عميل'));
    setGlobalSettings(settingsData);
    setStock(stockData);
    setMissions(missionsData || []);
    setProductionOrders(prodOrdersData || []);
    setPreparationOrders(prepOrdersData || []);
    setEmployees(employeesData || []);
    setLoading(false);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ArrowUpDown size={14} className="text-muted opacity-40" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp size={14} className="text-primary font-bold" />;
    }
    return <ArrowDown size={14} className="text-primary font-bold" />;
  };

  const getBandsText = (count) => {
    if (count === 1) return 'بند واحد';
    if (count === 2) return 'بندان';
    if (count >= 3 && count <= 10) return `${count} بنود`;
    return `${count} بند`;
  };

  const isOrderDeliveryFrozen = (order) => {
    if (!order) return false;
    if (isAdmin(user) || isImad) return false; // Admins and supervisor Emad are never frozen

    // 1. If the order is already audited and deducted in the stock department
    if (order.stockDeducted) return true;

    // 2. Find if there is an associated delivery mission that is received or completed
    const assoc = missions.find(m =>
      m.type === 'تسليم طلبية' &&
      String(m.salesOrderNumber || '').trim() === String(order.orderNumber || '').trim()
    );

    if (assoc) {
      const normalizedStatus = String(assoc.status || '').trim();
      if (['تم الاستلام', 'في الطريق', 'عند الموقع', 'تم الإنجاز'].includes(normalizedStatus)) {
        return true;
      }
    }
    return false;
  };

  const isOrderFrozenByProductionOrPreparation = (order) => {
    if (!order) return false;
    if (isAdmin(user) || isImad) return false; // Admins and supervisor Emad are never frozen
    const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim();

    // Check Production
    const linkedProd = productionOrders.find(po =>
      (po.salesOrderId && po.salesOrderId === order.id) ||
      (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
      (po.orderNotes && po.orderNotes.includes(order.orderNumber))
    );
    if (linkedProd) {
      const prodStatus = normalize(linkedProd.status || 'لم يتم التنفيذ');
      let isOverallActive = !(prodStatus.includes('منتهي') || prodStatus.includes('ملغي') || prodStatus.includes('لم يتم التنفيذ'));

      let isAnyItemActive = false;
      if (linkedProd.items && linkedProd.items.length > 0) {
        isAnyItemActive = linkedProd.items.some(pi => {
          const piStatus = normalize(pi.status || 'لم يتم التنفيذ');
          return !(piStatus.includes('منتهي') || piStatus.includes('ملغي') || piStatus.includes('لم يتم التنفيذ'));
        });
      }

      if (isOverallActive || isAnyItemActive) return true;
    }

    // Check Preparation
    const linkedPrep = preparationOrders.find(po =>
      (po.salesOrderId && po.salesOrderId === order.id) ||
      (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
      (po.orderNotes && po.orderNotes.includes(order.orderNumber))
    );
    if (linkedPrep) {
      const prepStatus = normalize(linkedPrep.status || 'لم يتم التنفيذ');
      let isOverallActive = !(prepStatus.includes('منتهي') || prepStatus.includes('ملغي') || prepStatus.includes('لم يتم التنفيذ'));

      let isAnyItemActive = false;
      if (linkedPrep.items && linkedPrep.items.length > 0) {
        isAnyItemActive = linkedPrep.items.some(pi => {
          const piStatus = normalize(pi.status || 'لم يتم التنفيذ');
          return !(piStatus.includes('منتهي') || piStatus.includes('ملغي') || piStatus.includes('لم يتم التنفيذ'));
        });
      }

      if (isOverallActive || isAnyItemActive) return true;
    }

    return false;
  };

  const isOrderTotallyFrozen = (order) => {
    return isOrderDeliveryFrozen(order) || order.stockDeducted;
  };

  const getOrderMission = (orderNumber) => {
    if (!orderNumber || !missions) return null;
    const cleanNum = String(orderNumber).trim();
    return missions.find(m =>
      m.type === 'تسليم طلبية' &&
      String(m.salesOrderNumber || '').trim() === cleanNum
    ) || null;
  };

  const deliveryStaffList = React.useMemo(() => {
    if (!employees || employees.length === 0) return [];
    return [...employees].sort((a, b) => {
      const aIsDriver = (a.department || '').includes('توصيل') || (a.role || '').includes('سائق') || (a.position || '').includes('سائق') || (a.name || '').includes('بهاء');
      const bIsDriver = (b.department || '').includes('توصيل') || (b.role || '').includes('سائق') || (b.position || '').includes('سائق') || (b.name || '').includes('بهاء');
      if (aIsDriver && !bIsDriver) return -1;
      if (!aIsDriver && bIsDriver) return 1;
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
  }, [employees]);

  const getDeliveryStatusBadge = (status) => {
    switch (status) {
      case 'تم الإنجاز':
        return { label: 'تم الإنجاز', bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', dot: '#10b981' };
      case 'تم التوصيل':
        return { label: 'تم التوصيل', bg: '#f0f9ff', text: '#075985', border: '#bae6fd', dot: '#0284c7' };
      case 'عند الموقع':
        return { label: 'عند الموقع', bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff', dot: '#9333ea' };
      case 'في الطريق':
        return { label: 'في الطريق', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#2563eb' };
      case 'تم الاستلام':
        return { label: 'تم الاستلام', bg: '#fefce8', text: '#854d0e', border: '#fef08a', dot: '#ca8a04' };
      case 'بانتظار الاستلام':
        return { label: 'بانتظار الاستلام', bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#d97706' };
      case 'تم تأجيل التوصيل':
        return { label: 'تم التأجيل', bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' };
      default:
        return { label: status || 'غير محدد', bg: '#f8fafc', text: '#475569', border: '#cbd5e1', dot: '#94a3b8' };
    }
  };

  const getDeliverySelection = (order) => {
    if (order.deliveryMethod === 'pickup') return '__pickup';
    if (order.deliveryMethod === 'courier') return '__courier';
    const mission = getOrderMission(order.orderNumber);
    return mission?.assignedEmployeeId || order.deliveryDriverId || employees.find(e => e.name === (mission?.assignedEmployeeName || order.deliveryDriverName))?.id || '';
  };

  const handleAssignDriver = async (order, selection) => {
    if (!canAssignDelivery) { Swal.fire('غير مسموح', 'لا تملك صلاحية تعيين السائق وطريقة التسليم', 'warning'); return; }
    const deliveryMethod = selection === '__pickup' ? 'pickup' : selection === '__courier' ? 'courier' : selection ? 'employee' : 'unassigned';
    const driverEmployeeId = deliveryMethod === 'employee' ? selection : '';
    const methodLabel = deliveryMethod === 'pickup' ? 'استلام من الشركة' : deliveryMethod === 'courier' ? 'شركة توصيل' : 'بدون سائق';
    let correction = false;
    try {
      const allItemsReady = Boolean(
        order.items &&
        order.items.length > 0 &&
        order.items.every(item => item.itemStatus === 'جاهز')
      );

      // للمشرف عماد فقط: منع تحديد سائق أو طريقة تسليم إذا لم تكن كافة أصناف الكرت جاهزة
      if (isImad && selection && !allItemsReady) {
        MySwal.fire({
          title: 'الأصناف غير جاهزة',
          text: 'أخي المشرف عماد، لا يمكنك تحديد سائق أو طريقة تسليم للطلبية إلا بعد أن تصبح جميع أصناف وبنود الطلب بحالة "جاهز".',
          icon: 'warning',
          confirmButtonText: 'حسناً',
          customClass: {
            container: 'premium-modal-container',
            popup: 'premium-modal-popup',
            confirmButton: 'btn-premium-save'
          }
        });
        return;
      }
      const matchingEmployee = employees.find(emp => emp.id === driverEmployeeId);
      const driverName = matchingEmployee ? matchingEmployee.name : '';

      const allMissions = await getMissions();
      const linkedMission = allMissions.find(m =>
        m.type === 'تسليم طلبية' &&
        String(m.salesOrderNumber || '').trim() === String(order.orderNumber || '').trim()
      );

      if (linkedMission && ['تم الاستلام', 'في الطريق', 'عند الموقع', 'تم التوصيل', 'تم الإنجاز'].includes(String(linkedMission.status || '').trim())) {
        const confirmation = await MySwal.fire({
          title: 'تأكيد تصحيح تعيين التوصيل',
          text: 'المهمة مسجلة بحالة (' + linkedMission.status + '). أكد فقط إذا كان السائق لم يستلم الطلبية ولم يبدأ فعلياً. سيتم حفظ المهمة السابقة وسجل التصحيح.',
          icon: 'warning', showCancelButton: true,
          confirmButtonText: 'السائق لم يبدأ، تصحيح التعيين', cancelButtonText: 'إبقاء التعيين'
        });
        if (!confirmation.isConfirmed) return;
        correction = true;
      }
      if (linkedMission) {
        const archived = await saveMission({
          ...linkedMission, salesOrderNumber: '', previousSalesOrderNumber: order.orderNumber,
          status: 'ملغي', previousStatus: linkedMission.status || '',
          cancellationReason: correction ? 'تصحيح التعيين: السائق لم يستلم ولم يبدأ بحسب المشرف' : 'تغيير طريقة التسليم أو السائق',
          cancelledBy: user?.name || 'مشرف', cancelledAt: new Date().toISOString()
        });
        if (!archived) throw new Error('تعذر حفظ المهمة السابقة');
      }

      // في حال اختيار "بدون سائق" (unassigned): إلغاء التعيين وتصفير حالة التوصيل
      if (!selection || deliveryMethod === 'unassigned') {
        await saveSalesOrder({
          ...order,
          deliveryMethod: 'unassigned',
          deliveryCompletedAt: null,
          deliveryDriverId: '',
          deliveryDriverName: '',
          deliveryStatus: '',
          lastActionBy: user?.name || 'مشرف'
        });

        await addLog({
          userName: user?.name || 'مشرف',
          userId: user?.id,
          module: 'طلبيات العملاء',
          action: 'إلغاء تعيين السائق',
          details: `إعادة الطلبية رقم ${order.orderNumber} إلى (بدون سائق)`
        });

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'تم تعيين الطلبية: بدون سائق',
          showConfirmButton: false,
          timer: 1500
        });
        await fetchData();
        return;
      }

      // في حال اختيار شركة توصيل أو استلام من الشركة (بدون سائق محدد من الموظفين)
      if (!driverEmployeeId) {
        const mission = await saveMission({ ...orderDeliveryMission(order), deliveryMethod, assignedEmployeeId: '', assignedEmployeeName: '', status: 'بانتظار الاستلام' });
        if (!mission) throw new Error('تعذر حفظ طريقة التسليم');
        await saveSalesOrder({
          ...order,
          deliveryMethod,
          deliveryCompletedAt: null,
          deliveryDriverId: '',
          deliveryDriverName: '',
          deliveryStatus: 'بانتظار الاستلام',
          lastActionBy: user?.name || 'مشرف'
        });

        await addLog({
          userName: user?.name || 'مشرف',
          userId: user?.id,
          module: 'طلبيات العملاء',
          action: correction ? 'تصحيح تعيين التوصيل' : 'تغيير طريقة التسليم',
          details: `تغيير تسليم الطلبية رقم ${order.orderNumber} إلى ${methodLabel}${correction ? " — تأكيد المشرف أن السائق لم يبدأ" : ""}`
        });

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'تم الحفظ: ' + methodLabel,
          showConfirmButton: false,
          timer: 1500
        });
        await fetchData();
        return;
      }

      {
        const maxNum = allMissions.reduce((max, o) => {
          const str = String(o.missionNumber || '');
          if (str.startsWith('DEL-')) {
            const match = str.match(/DEL-(\d+)/);
            return match ? Math.max(max, parseInt(match[1], 10)) : max;
          }
          return max;
        }, 0);
        const nextMissionNumber = `DEL-${String(maxNum + 1).padStart(4, '0')}`;

        const savedMission = await saveMission({
          id: null,
          missionNumber: nextMissionNumber,
          type: 'تسليم طلبية',
          customType: '',
          sourceEntity: 'مرجاس للتجارة - قسم الاثاث',
          targetEntity: order.customerName || 'العميل',
          details: `تسليم طلبية رقم ${order.orderNumber} للعميل ${order.customerName || ''}`,
          deliveryMethod: 'employee',
          assignedEmployeeId: driverEmployeeId,
          assignedEmployeeName: driverName,
          dueDate: order.deliveryDate || order.orderDate || getLocalDateStr(new Date()),
          status: 'بانتظار الاستلام',
          salesOrderNumber: order.orderNumber
        });
        if (!savedMission) throw new Error("تعذر إنشاء مهمة التوصيل");
      }

      await saveSalesOrder({
        ...order,
        deliveryMethod: 'employee',
        deliveryCompletedAt: null,
        deliveryDriverId: driverEmployeeId,
        deliveryDriverName: driverName,
        deliveryStatus: 'بانتظار الاستلام',
        lastActionBy: user?.name || 'مشرف'
      });

      await createNotification({
        settingKey: 'delivery',
        moduleKey: 'delivery',
        moduleLabel: 'التوصيل',
        title: 'مهمة توصيل جديدة',
        message: `تم تعيينك لتوصيل الطلبية رقم ${order.orderNumber} للعميل ${order.customerName || ''}`,
        targetEmployeeId: driverEmployeeId,
        createdById: user?.id,
        createdByName: user?.name,
        createdByRole: user?.level || user?.role,
        target: { tab: 'missions' }
      }).catch(() => { });

      await addLog({
        userName: user?.name || 'مشرف',
        userId: user?.id,
        module: 'طلبيات العملاء',
        action: 'تعيين سائق',
        details: `تعيين السائق ${driverName} للطلبية رقم ${order.orderNumber}${correction ? " — تصحيح بتأكيد المشرف أن السائق السابق لم يبدأ" : ""}`
      });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `تم تعيين السائق ${driverName}`,
        showConfirmButton: false,
        timer: 1500
      });

      await fetchData();
    } catch (err) {
      console.error('Error assigning driver to sales order:', err);
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'تعذر تعيين السائق، يرجى المحاولة مرة أخرى.'
      });
    }
  };

  const [completingDelivery, setCompletingDelivery] = useState(null);
  const handleCompleteExternalDelivery = async (order) => {
    if (!canCompleteDelivery || !['pickup', 'courier'].includes(order.deliveryMethod) || order.status === 'منتهي' || completingDelivery || !allDeliveryItemsReady(order)) return;
    setCompletingDelivery(order.id);
    try {
      const current = (await getMissions()).find(m => m.type === 'تسليم طلبية' && m.salesOrderNumber === order.orderNumber);
      const saved = await saveMission({
        ...(current || orderDeliveryMission(order)), deliveryMethod: order.deliveryMethod,
        status: 'تم الإنجاز', completedAt: new Date().toISOString(), completedBy: user?.name || 'مشرف'
      });
      if (!saved) throw new Error('تعذر حفظ الإنجاز');

      // تسجيل إنجاز التوصيل فقط، مع إبقاء الطلبية معلقة لإجراء تدقيق المخزون وصرف الإنتاج قبل الموافقة النهائية
      await saveSalesOrder({
        ...order,
        deliveryStatus: 'تم الإنجاز',
        lastActionBy: user?.name || (isImad ? 'عماد' : 'مشرف'),
        statusUpdateDate: getLocalDateStr(new Date())
      }, { preserveStatus: true });

      await addLog({
        userId: user?.id,
        userName: user?.name || (isImad ? 'عماد' : 'مشرف'),
        module: 'طلبيات العملاء',
        action: 'إنجاز التوصيل',
        details: `تسجيل إنجاز تسليم الطلبية رقم ${order.orderNumber} وإتاحة تدقيق المخزون وصرف الإنتاج`
      });

      await addLog({ userId: user?.id, userName: user?.name, module: 'التوصيل', action: 'تم الإنجاز', details: 'إنجاز تسليم الطلبية ' + order.orderNumber + ' من قسم الطلبيات' });
      await fetchData();
    } catch (error) {
      Swal.fire('تعذر حفظ الإنجاز', error.message, 'error');
    } finally { setCompletingDelivery(null); }
  };
  const renderExternalDeliveryCompletion = order => ['pickup', 'courier'].includes(order.deliveryMethod) && order.status !== 'منتهي' && (getOrderMission(order.orderNumber)?.status || order.deliveryStatus) !== 'تم الإنجاز' && canCompleteDelivery ? (
    <button
      type="button"
      disabled={Boolean(completingDelivery) || !allDeliveryItemsReady(order)}
      onClick={() => handleCompleteExternalDelivery(order)}
      className="sales-ctrl-btn btn-delivery-done hover:bg-emerald-600 active:scale-95"
      title="تسجيل إتمام الاستلام / التوصيل"
    >
      <CheckCircle size={13} />
      <span>تم الإنجاز</span>
    </button>
  ) : null;

  const getOrderWorkflowAudit = (order) => {
    const workflow = stockWorkflowState(order, productionOrders, preparationOrders);
    const stockDone = Boolean(workflow.stockDone);
    const materialsDone = Boolean(workflow.materialsDone);

    const assignedId = getDeliverySelection(order);
    const method = order.deliveryMethod;
    const hasDelivery = Boolean(
      (method === 'pickup' || method === 'courier' || assignedId) &&
      method !== 'unassigned' &&
      method !== ''
    );

    const linkedMission = getOrderMission(order.orderNumber);
    const deliveryStatus = linkedMission?.status || order.deliveryStatus;
    const isDeliveryCompleted = deliveryStatus === 'تم الإنجاز';

    const allConditionsMet = stockDone && materialsDone && hasDelivery && isDeliveryCompleted;

    const checklist = [
      {
        step: 1,
        title: 'تحديد طريقة التسليم / السائق',
        done: hasDelivery,
        note: hasDelivery ? 'تم تحديد آلية التسليم' : 'الطلبية لا تزال (بدون سائق)'
      },
      {
        step: 2,
        title: 'إنجاز التوصيل والتسليم',
        done: isDeliveryCompleted,
        note: isDeliveryCompleted ? 'تم إنجاز التوصيل بنجاح' : (hasDelivery ? `حالة التوصيل: (${deliveryStatus || 'بانتظار الاستلام'}) - لم يكتمل` : 'بانتظار تعيين السائق أولاً')
      },
      {
        step: 3,
        title: 'تدقيق خصم المخزون',
        done: stockDone,
        note: stockDone ? 'تم التدقيق والخصم' : 'بانتظار تدقيق خصم البضاعة الجاهزة'
      },
      {
        step: 4,
        title: 'صرف مواد الإنتاج والتحضير',
        done: materialsDone,
        note: materialsDone ? 'تم صرف المواد أو لا يلزم' : 'بانتظار صرف مواد بطاقات التصنيع'
      }
    ];

    const pendingChecklist = checklist.filter(c => !c.done);

    return {
      stockDone,
      materialsDone,
      hasDelivery,
      isDeliveryCompleted,
      allConditionsMet,
      checklist,
      pendingChecklist
    };
  };

  const handleShowIncompleteRequirements = (order) => {
    const audit = getOrderWorkflowAudit(order);
    const orderNum = order.orderNumber || '';

    MySwal.fire({
      icon: 'info',
      title: `متطلبات إغلاق الطلبية (${orderNum})`,
      html: `
        <div style="text-align: right; font-size: 13.5px; line-height: 1.8; padding: 4px; direction: rtl;">
          <p style="color: #475569; margin-bottom: 12px; font-weight: 600;">
            لضمان سلامة الإجراءات والتدقيق، لا تتاح الموافقة النهائية إلا بعد استيفاء التسلسل التالي بالكامل:
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${audit.checklist.map(step => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 8px; border: 1px solid ${step.done ? '#a7f3d0' : '#fed7aa'}; background: ${step.done ? '#ecfdf5' : '#fffbeb'};">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; font-size: 11px; font-weight: bold; background: ${step.done ? '#10b981' : '#f59e0b'}; color: #fff;">
                    ${step.done ? '✓' : step.step}
                  </span>
                  <strong style="color: ${step.done ? '#065f46' : '#92400e'};">${step.title}</strong>
                </div>
                <span style="font-size: 12px; font-weight: 700; color: ${step.done ? '#059669' : '#b45309'};">
                  ${step.note}
                </span>
              </div>
            `).join('')}
          </div>
          ${audit.pendingChecklist.length > 0 ? `
            <div style="margin-top: 14px; padding: 9px 12px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-size: 12px; font-weight: bold;">
              💡 الخطوة التالية المطلوبة: ${audit.pendingChecklist[0].title} (${audit.pendingChecklist[0].note})
            </div>
          ` : ''}
        </div>
      `,
      confirmButtonText: 'حسناً، متابعة الإجراءات',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save'
      }
    });
  };

  const renderFinalApproval = order => {
    if (order.status === 'منتهي') {
      return (
        <div className="sales-workflow-cell">
          <div className="sales-approved-pill">
            <CheckCircle size={13} strokeWidth={2.5} />
            <span>تمت الموافقة</span>
          </div>
        </div>
      );
    }

    const audit = getOrderWorkflowAudit(order);
    const isSuperOrManager = isAdmin(user) || isManager;
    // الإدارة مستثناة ومتاح لها الزر دائماً، أما المشرف عماد فمقيد باستيفاء الشروط الـ 4
    const isManagementExempt = (isAdmin(user) || isSuperOrManager) && !isImad;
    const canApprove = isManagementExempt ? true : (isImad && audit.allConditionsMet);

    if (!canApprove) {
      const pendingDesc = audit.pendingChecklist.map(p => `• ${p.title} (${p.note})`).join('\n');
      return (
        <div className="sales-workflow-cell">
          <button
            type="button"
            onClick={() => handleShowIncompleteRequirements(order)}
            title={`الطلبية غير مستوفاة للشروط (اضغط لعرض المتطلبات المتبقية):\n${pendingDesc}`}
            className="sales-ctrl-btn btn-final-approve is-disabled"
          >
            الموافقة النهائية
          </button>
        </div>
      );
    }

    return (
      <div className="sales-workflow-cell">
        <button
          type="button"
          onClick={() => handleManagerApproveDelivery(order)}
          title={isManagementExempt ? 'موافقة واعتماد الإدارة' : 'جميع الشروط مستوفاة بالكامل - اضغط للاعتماد النهائي وإغلاق الطلبية'}
          className="sales-ctrl-btn btn-final-approve is-ready"
        >
          الموافقة النهائية
        </button>
      </div>
    );
  };

  const handleManagerApproveDelivery = async (order) => {
    const isSuperOrManager = isAdmin(user) || isManager;
    const isManagementExempt = (isAdmin(user) || isSuperOrManager) && !isImad;
    const isAuthorized = isManagementExempt || isImad;

    if (!isAuthorized) {
      MySwal.fire({
        icon: 'warning',
        title: 'صلاحية غير كافية',
        text: 'إنهاء الطلبية وإغلاقها نهائياً يتطلب صلاحية المشرف أو الإدارة.',
        confirmButtonText: 'حسناً',
        customClass: {
          container: 'premium-modal-container',
          popup: 'premium-modal-popup',
          confirmButton: 'btn-premium-save'
        }
      });
      return;
    }

    const [latestSales, latestProduction, latestPreparation, latestMissions] = await Promise.all([
      getSalesOrders(), getOrders(), getPreparationOrders(), getMissions()
    ]);
    const latestOrder = latestSales.find(row => row.id === order.id) || order;
    if (!latestOrder) { await MySwal.fire('تعذر التحقق', 'تعذر قراءة الطلبية. حاول مرة أخرى.', 'error'); return; }

    const workflow = stockWorkflowState(latestOrder, latestProduction, latestPreparation);
    const assignedId = getDeliverySelection(latestOrder);
    const method = latestOrder.deliveryMethod;
    const hasDelivery = Boolean(
      (method === 'pickup' || method === 'courier' || assignedId) &&
      method !== 'unassigned' &&
      method !== ''
    );
    const linkedMission = (latestMissions || []).find(m =>
      m.type === 'تسليم طلبية' &&
      String(m.salesOrderNumber || '').trim() === String(latestOrder.orderNumber || '').trim()
    );
    const missionStatus = linkedMission?.status || latestOrder.deliveryStatus;
    const isDeliveryCompleted = missionStatus === 'تم الإنجاز';

    // المشرف عماد فقط هو المقيد بالفحص الصارم، بينما الإدارة مستثناة
    if (isImad) {
      const missing = [];
      if (!hasDelivery) missing.push('1. تحديد السائق أو طريقة التسليم (لا تزال بدون سائق)');
      else if (!isDeliveryCompleted) missing.push(`2. إتمام التوصيل (حالة التوصيل الحالية: "${missionStatus || 'بانتظار الاستلام'}" ويجب أن تكون "تم الإنجاز")`);
      if (!workflow.stockDone) missing.push('3. تدقيق خصم المخزون للأصناف الجاهزة');
      if (!workflow.materialsDone) missing.push('4. صرف مواد الإنتاج والتحضير');

      if (missing.length > 0) {
        await MySwal.fire({
          icon: 'warning',
          title: 'الطلبية غير مستوفاة للشروط',
          html: `
            <div style="text-align: right; font-size: 13.5px; line-height: 1.8; direction: rtl;">
              <p style="margin-bottom: 8px; font-weight: bold; color: #b45309;">
                أخي المشرف عماد، يجب استيفاء جميع المراحل التالية بالكامل قبل اعتماد وإنهاء الطلبية:
              </p>
              <ul style="padding-right: 20px; color: #dc2626; font-weight: 600;">
                ${missing.map(m => `<li style="margin-bottom: 4px;">${m}</li>`).join('')}
              </ul>
            </div>
          `,
          confirmButtonText: 'حسناً',
          customClass: {
            container: 'premium-modal-container',
            popup: 'premium-modal-popup',
            confirmButton: 'btn-premium-save'
          }
        });
        return;
      }
    }

    const confirm = await MySwal.fire({
      icon: 'question',
      title: isManagementExempt ? 'موافقة الإدارة على إغلاق الطلبية' : 'اعتماد نهائي وإغلاق الطلبية',
      text: `هل تؤكد تدقيق الطلبية بالكامل وسلامة جميع تفاصيلها والموافقة النهائية على الطلبية رقم ${latestOrder.orderNumber} وتحويل حالتها إلى "منتهي"؟`,
      showCancelButton: true,
      confirmButtonText: 'نعم، إغلاق الطلبية',
      cancelButtonText: 'إلغاء',
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel'
      }
    });

    if (confirm.isConfirmed) {
      try {
        await approveSalesOrder(latestOrder.id, {
          userId: user?.id || user?.employeeId || '',
          userName: user?.name || (isManagementExempt ? 'المدير' : 'عماد'),
          date: getLocalDateStr(new Date())
        }, isManagementExempt);
      } catch (error) {
        await MySwal.fire('تعذر حفظ الموافقة النهائية', error.message || 'يرجى إعادة المحاولة', 'error');
        return;
      }

      await addLog({
        userName: user?.name || (isManagementExempt ? 'المدير' : 'عماد'),
        userId: user?.id,
        module: 'طلبيات العملاء',
        action: 'موافقة وإغلاق',
        details: isManagementExempt
          ? `موافقة الإدارة على إنهاء الطلبية رقم ${latestOrder.orderNumber} باعتماد المدير`
          : `اعتماد وإنهاء الطلبية رقم ${latestOrder.orderNumber} بموافقة المشرف عماد بعد استيفاء الشروط`
      });

      Swal.fire({
        icon: 'success',
        title: 'تم إغلاق الطلبية',
        text: 'تم اعتماد وإنهاء الطلبية بنجاح.',
        timer: 2000,
        showConfirmButton: false
      });

      await fetchData();
    }
  };

  const handleCopyOrder = async (order) => {
    if (!order) return;

    Swal.fire({
      title: 'جاري تحضير النسخة...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const todayStr = getLocalDateStr(new Date());

      const prodOrders = await getOrders();
      const prepOrdersList = await getPreparationOrders();

      const linkedProd = prodOrders.find(po =>
        (po.salesOrderId && po.salesOrderId === order.id) ||
        (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber)
      );

      const linkedPrep = prepOrdersList.find(po =>
        (po.salesOrderId && po.salesOrderId === order.id) ||
        (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber)
      );

      const maxNum = orders.reduce((max, o) => {
        const str = String(o.orderNumber || '');
        if (str.startsWith('ORD-')) {
          const match = str.match(/ORD-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      const nextOrderNumber = `ORD-${String(maxNum + 1).padStart(4, '0')}`;

      const duplicatedData = {
        ...order,
        id: '',
        orderNumber: nextOrderNumber,
        orderDate: todayStr,
        status: 'جديد',
        stockDeducted: false,
        isArchived: false,
        items: (order.items || [{ productName: order.productName, quantity: order.quantity, notes: order.notes || '' }]).map(item => ({
          ...item,
          id: '',
          itemStatus: ['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف'].includes(item.itemStatus) ? 'قيد الإنتاج' : item.itemStatus === 'قيد التحضير' || item.itemStatus === 'إنتاج قيد التحضير' ? 'قيد التحضير' : 'جديد',
          hasProductionDetails: !!(linkedProd && linkedProd.items && linkedProd.items.some(pi => pi.productName === item.productName)),
          hasPreparationDetails: !!(linkedPrep && linkedPrep.items && linkedPrep.items.some(pi => pi.productName === item.productName))
        }))
      };

      if (linkedProd) {
        setLinkedProductionOrder({
          ...linkedProd,
          id: '',
          salesOrderId: '',
          salesOrderNumber: nextOrderNumber,
          status: 'جديد',
          items: (linkedProd.items || []).map(i => ({
            ...i,
            id: '',
            status: 'جديد'
          }))
        });
      } else {
        setLinkedProductionOrder(null);
      }

      if (linkedPrep) {
        setLinkedPreparationOrder({
          ...linkedPrep,
          id: '',
          salesOrderId: '',
          salesOrderNumber: nextOrderNumber,
          status: 'جديد',
          items: (linkedPrep.items || []).map(i => ({
            ...i,
            id: '',
            status: 'جديد'
          }))
        });
      } else {
        setLinkedPreparationOrder(null);
      }

      setEditingOrder(null);
      setFormData(duplicatedData);
      startFreshDraft();

      Swal.close();
      setShowModal(true);
    } catch (e) {
      console.error(e);
      Swal.fire('خطأ', 'حدث خطأ أثناء نسخ تفاصيل الطلبية.', 'error');
    }
  };

  const readAvailableDrafts = async () => {
    const cloudDrafts = await getSalesOrderDrafts(draftUserId);
    const combined = mergeDrafts(cloudDrafts, readLocalDrafts(localStorage, draftStorageKey));
    setDrafts(combined);
    return combined;
  };

  const resumeDraft = (draft) => {
    if (!draft?.formData) return;
    draftReadyRef.current = false;
    setEditingOrder(null);
    setActiveDraftId(draft.id);
    setFormData(draft.formData);
    setLinkedProductionOrder(draft.linkedProductionOrder || null);
    setLinkedPreparationOrder(draft.linkedPreparationOrder || null);
    setDraftSaveState('تم استعادة المسودة');
    setShowModal(true);
    draftReadyRef.current = true;
  };

  const removeDraft = async (draft) => {
    if (!draft?.id) return;
    if (draft.id === activeDraftId) clearTimeout(draftTimerRef.current);
    await draftSaveQueueRef.current;
    const deleted = await deleteSalesOrderDraft(draft.id);
    if (!deleted) {
      await Swal.fire('تعذر حذف المسودة', 'احتفظنا بالنسخة المحفوظة. حاول مرة أخرى عند توفر الاتصال.', 'warning');
      return false;
    }
    removeLocalDraft(localStorage, draftStorageKey, draft.id);
    setDrafts(prev => prev.filter(d => d.id !== draft.id));
  };

  const startFreshDraft = () => {
    const draftId = `draft_${draftUserId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${crypto.randomUUID()}`;
    draftReadyRef.current = false;
    setActiveDraftId(draftId);
    setDraftSaveState('سيتم الحفظ تلقائيًا');
    draftReadyRef.current = true;
  };

  const handleShowDrafts = async () => {
    const available = await readAvailableDrafts();
    if (!available.length) {
      Swal.fire('المسودات', 'لا توجد مسودات محفوظة حاليًا.', 'info');
      return;
    }
    const options = Object.fromEntries(available.map((d, index) => {
      const customer = d.formData?.customerName || 'بدون عميل';
      const items = (d.formData?.items || []).filter(i => i.productName).length;
      const date = d.updatedAt ? new Date(d.updatedAt).toLocaleString('ar-JO') : '';
      return [d.id, `${index + 1}. ${customer} — ${items} صنف — ${date}`];
    }));
    const choice = await Swal.fire({
      title: 'مسودات الطلبيات',
      text: 'اختر المسودة التي تريد متابعتها أو حذفها',
      input: 'select', inputOptions: { '__new__': '＋ إنشاء طلبية جديدة مع الاحتفاظ بالمسودات', ...options },
      showDenyButton: true, showCancelButton: true,
      preDeny: () => Swal.getInput()?.value,
      confirmButtonText: 'متابعة المسودة', denyButtonText: 'حذف المسودة', cancelButtonText: 'إلغاء'
    });
    const selected = available.find(d => d.id === choice.value);
    if (choice.isConfirmed && choice.value === '__new__') { await handleOpenModal(); return; }
    if (choice.isConfirmed && selected) resumeDraft(selected);
    if (choice.isDenied && selected) {
      const confirmDelete = await Swal.fire({ title: 'حذف المسودة؟', text: 'لن يمكن استعادة هذه المسودة.', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، حذف', cancelButtonText: 'تراجع' });
      if (confirmDelete.isConfirmed) await removeDraft(selected);
    }
  };

  const handleOpenModal = async (order = null) => {
    if (order && isOrderTotallyFrozen(order)) {
      handleOpenPreview(order);
      return;
    }
    if (order) {
      draftReadyRef.current = false;
      setActiveDraftId(null);
      setEditingOrder(order);
      setFormData({
        ...order,
        items: (order.items || [{ productName: order.productName, quantity: order.quantity, notes: order.notes || '' }]).map(item => ({
          ...item,
          hasProductionDetails: false,
          hasPreparationDetails: false
        }))
      });
      // Fetch linked production order if any
      const prodOrders = await getOrders();
      const prepOrdersList = await getPreparationOrders();
      const linked = prodOrders.find(po =>
        (po.salesOrderId && po.salesOrderId === order.id) ||
        (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
        (po.orderNotes && po.orderNotes.includes(order.orderNumber))
      );
      setLinkedProductionOrder(linked || null);

      const linkedPrep = prepOrdersList.find(po =>
        (po.salesOrderId && po.salesOrderId === order.id) ||
        (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
        (po.orderNotes && po.orderNotes.includes(order.orderNumber))
      );
      setLinkedPreparationOrder(linkedPrep || null);

      setFormData(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف'].includes(item.itemStatus) && linked && linked.items) {
            const linkedItem = linked.items.find(li => li.productName === item.productName);
            if (linkedItem) {
              return {
                ...item,
                hasProductionDetails: true,
                colorModel: linkedItem.colorModel || item.colorModel || '',
                sizeCm: linkedItem.sizeCm || item.sizeCm || '',
                thickness: linkedItem.thickness || item.thickness || '',
                productionNotes: linkedItem.notes || item.productionNotes || ''
              };
            }
          }
          if (item.itemStatus === 'قيد التحضير' && linkedPrep && linkedPrep.items) {
            const linkedPrepItem = linkedPrep.items.find(li => li.productName === item.productName);
            if (linkedPrepItem) {
              return {
                ...item,
                hasPreparationDetails: true,
                preparationNotes: linkedPrepItem.notes || item.preparationNotes || ''
              };
            }
          }
          if (item.itemStatus === 'تحضير وإنتاج') {
            const hasProd = linked && linked.items && linked.items.some(li => li.productName === item.productName);
            const hasPrep = linkedPrep && linkedPrep.items && linkedPrep.items.some(li => li.productName === item.productName);
            if (hasProd || hasPrep) {
              return {
                ...item,
                hasPrepAndProdDetails: Boolean(hasProd && hasPrep),
                hasProductionDetails: Boolean(hasProd),
                hasPreparationDetails: Boolean(hasPrep)
              };
            }
          }
          return { ...item, hasProductionDetails: false, hasPreparationDetails: false, hasPrepAndProdDetails: false };
        })
      }));
    } else {
      setEditingOrder(null);
      setLinkedProductionOrder(null);
      setLinkedPreparationOrder(null);
      const maxNum = orders.reduce((max, o) => {
        const str = String(o.orderNumber || '');
        if (str.startsWith('ORD-')) {
          const match = str.match(/ORD-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      const nextOrderNumber = `ORD-${String(maxNum + 1).padStart(4, '0')}`;

      setFormData({
        orderNumber: nextOrderNumber,
        customerId: '',
        customerName: '',
        orderDate: getLocalDateStr(new Date()),
        status: 'جديد',
        orderNotes: '',
        items: [{ productName: '', quantity: '', notes: '', itemStatus: '' }]
      });
      startFreshDraft();
    }
    setShowModal(true);
  };

  const prepareOrderForPrint = async (order) => {
    let orderToPreview = { ...order };
    if (order.items && order.items.some(i => ['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف', 'تحضير وإنتاج'].includes(i.itemStatus))) {
      const prodOrders = await getOrders();
      const linked = prodOrders.find(po =>
        (po.salesOrderId && po.salesOrderId === order.id) ||
        (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
        (po.orderNotes && po.orderNotes.includes(order.orderNumber))
      );
      if (linked) {
        orderToPreview.productionOrderNumber = linked.orderNumber;
      }
    }
    if (order.items && order.items.some(i => ['قيد التحضير', 'إنتاج قيد التحضير', 'تحضير وإنتاج'].includes(i.itemStatus))) {
      const prepOrders = await getPreparationOrders();
      const linkedPrep = prepOrders.find(po =>
        (po.salesOrderId && po.salesOrderId === order.id) ||
        (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
        (po.orderNotes && po.orderNotes.includes(order.orderNumber))
      );
      if (linkedPrep) {
        orderToPreview.preparationOrderNumber = linkedPrep.orderNumber;
      }
    }
    return orderToPreview;
  };

  const handleOpenPreview = async (order) => {
    const orderToPreview = await prepareOrderForPrint(order);
    setSelectedOrder(orderToPreview);
    setShowPreview(true);
  };

  const handleAddMultiColors = (itemsToAdd) => {
    setFormData({
      ...formData,
      items: [...formData.items, ...itemsToAdd]
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productName: '', quantity: '', notes: '', itemStatus: '' }]
    });
  };

  const handleAddNewStockItem = () => {
    const generateNextID = (category) => {
      let prefix = 'UNK';
      if (!category) prefix = 'UNK';
      else if (category === 'بضاعة جاهزة' || category.includes('بضاعة')) prefix = 'FG';
      else if (category === 'أقمشة' || category.includes('قماش')) prefix = 'FAB';
      else if (category === 'تغليف' || category.includes('كرتون')) prefix = 'PKG';
      else if (category === 'مستهلكات' || category.includes('مستهلك')) prefix = 'CON';
      else if (category === 'أصول' || category.includes('أصل')) prefix = 'AST';

      const categoryItems = stock.filter(item => item.itemNumber && item.itemNumber.startsWith(prefix + '-'));

      if (categoryItems.length === 0) return `${prefix}-00001`;

      const ids = categoryItems.map(item => {
        const parts = item.itemNumber.split('-');
        if (parts.length > 1) {
          return parseInt(parts[1], 10) || 0;
        }
        return 0;
      });

      const maxID = Math.max(...ids, 0);
      return `${prefix}-${String(maxID + 1).padStart(5, '0')}`;
    };

    const categories = globalSettings?.stockCategories || ['الأصول', 'مستهلكات الخياطة'];
    const defaultCategory = categories[0] || 'الأصول';
    const initialData = {
      itemNumber: generateNextID(defaultCategory),
      category: defaultCategory,
      warehouse: globalSettings?.warehouses?.[0] || 'المستودع الرئيسي',
      itemCode: '',
      name: '',
      location: '',
      spec: '',
      unit: globalSettings.stockUnits?.[0] || 'عدد',
      quantity: 0,
      minLimit: 0,
      lastMovement: 'إدخال',
      lastMovementDate: new Date().toISOString().split('T')[0],
      lastRecipient: user?.name || '',
      notes: ''
    };

    MySwal.fire({
      customClass: {
        container: 'premium-modal-container',
        popup: 'premium-modal-popup premium-modal-wide',
        confirmButton: 'btn-premium-save',
        cancelButton: 'btn-premium-cancel',
        actions: 'premium-modal-actions'
      },
      buttonsStyling: false,
      showCloseButton: false,
      didOpen: () => {
        const categorySelect = document.getElementById('swal-category');
        const itemNumberInput = document.getElementById('swal-itemNumber');
        if (categorySelect && itemNumberInput) {
          categorySelect.addEventListener('change', (e) => {
            itemNumberInput.value = generateNextID(e.target.value);
          });
        }

        // Location select management
        const locationSelect = document.getElementById('swal-location');
        const addBtn = document.getElementById('swal-add-location-btn');
        if (addBtn && locationSelect) {
          addBtn.addEventListener('click', async () => {
            const { value: newLoc } = await Swal.fire({
              title: 'إضافة رف جديد',
              input: 'text',
              inputPlaceholder: 'مثال: رف 6',
              showCancelButton: true,
              confirmButtonText: 'إضافة',
              cancelButtonText: 'إلغاء'
            });
            if (newLoc && newLoc.trim()) {
              const name = newLoc.trim();
              const optionExists = Array.from(locationSelect.options).some(opt => opt.value === name);
              if (!optionExists) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                locationSelect.appendChild(opt);
              }
              locationSelect.value = name;

              const updatedLocations = [...(globalSettings.stockLocations || [])];
              if (!updatedLocations.includes(name)) {
                updatedLocations.push(name);
                await saveGlobalSettings({
                  ...globalSettings,
                  stockLocations: updatedLocations
                });
                globalSettings.stockLocations = updatedLocations;
              }
            }
          });
        }
      },
      html: `
        <div class="premium-modal-header">
          <div class="premium-modal-title">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-primary"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
             <span>إضافة صنف جديد للمخزون</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form text-right" style="direction: rtl;">
          <div class="grid grid-cols-12 gap-x-8 gap-y-8 swal-grid">
            <!-- Row 1: ID & Name -->
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6">
              <label>رقم الصنف (ID)</label>
              <input id="swal-itemNumber" class="premium-input" placeholder="SKU-00001" value="${initialData.itemNumber}" disabled style="background: var(--surface); cursor: not-allowed; font-weight: bold; color: var(--primary-dark); text-align: center;">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-8 swal-full-width">
              <label>اسم الصنف</label>
              <input id="swal-name" class="premium-input" placeholder="مثال: قماش أبيض تركي" value="${initialData.name}">
            </div>

            <!-- Row 2: Code, Category & Warehouse -->
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6">
              <label>رمز الصنف</label>
              <input id="swal-itemCode" class="premium-input" placeholder="" value="${initialData.itemCode || ''}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6">
              <label>التصنيف</label>
              <select id="swal-category" class="premium-input">
                <option value="" disabled>اختر التصنيف</option>
                ${categories.map(c => `<option value="${c}" ${initialData.category === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6">
              <label>المخزن</label>
              <select id="swal-warehouse" class="premium-input">
                <option value="" disabled>اختر المخزن</option>
                ${(globalSettings?.warehouses || ['المستودع الرئيسي']).map(w => `<option value="${w}" ${initialData.warehouse === w ? 'selected' : ''}>${w}</option>`).join('')}
              </select>
            </div>

            <!-- Row 4: Location -->
            <div class="premium-form-group col-span-12 swal-full-width" id="swal-location-container">
              <label>الموقع (داخل المخزن)</label>
              <div class="flex gap-2">
                <select id="swal-location" class="premium-input" style="flex: 1;">
                  <option value="">-- اختر الرف --</option>
                  ${(globalSettings.stockLocations || []).map(l => `<option value="${l}" ${initialData.location === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
                <button type="button" id="swal-add-location-btn" style="width: 42px; height: 42px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 0;">+</button>
              </div>
            </div>

            <!-- Row 5: Spec & Quantity -->
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6">
              <label>اللون / المواصفة</label>
              <select id="swal-spec" class="premium-input">
                <option value="">اختر اللون/المواصفة</option>
                ${(globalSettings?.stockColors || []).map(c => `<option value="${c}" ${initialData.spec === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6">
              <label class="text-primary">الكمية الحالية</label>
              <div class="flex gap-2">
                <input id="swal-quantity" type="number" class="premium-input" style="flex: 2;" value="${initialData.quantity}">
                <select id="swal-unit" class="premium-input" style="flex: 1;">
                  ${(globalSettings?.stockUnits || ['عدد', 'متر', 'كغم']).map(u => `<option value="${u}" ${initialData.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
                </select>
              </div>
            </div>

             <!-- Row 6: Min Limit & Last Movement -->
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6 swal-hide-mobile">
              <label>الحد الأدنى (تنبيه)</label>
              <input id="swal-minLimit" type="number" class="premium-input" value="${initialData.minLimit}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6 swal-hide-mobile">
              <label>آخر حركة</label>
              <select id="swal-lastMovement" class="premium-input">
                <option value="إدخال" ${initialData.lastMovement === 'إدخال' ? 'selected' : ''}>إدخال</option>
                <option value="إخراج" ${initialData.lastMovement === 'إخراج' ? 'selected' : ''}>إخراج</option>
                <option value="تحويل" ${initialData.lastMovement === 'تحويل' ? 'selected' : ''}>تحويل</option>
              </select>
            </div>

            <!-- Row 7: Date & Recipient -->
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6 swal-hide-mobile">
              <label>تاريخ آخر حركة</label>
              <input id="swal-lastMovementDate" type="date" class="premium-input" value="${initialData.lastMovementDate}">
            </div>
            <div class="premium-form-group col-span-12 md:col-span-4 swal-col-6 swal-hide-mobile">
              <label>آخر مستلم / مسؤول</label>
              <input id="swal-lastRecipient" class="premium-input" placeholder="اسم الشخص" value="${initialData.lastRecipient}">
            </div>

            <!-- Row 8: Notes -->
            <div class="premium-form-group col-span-12 swal-full-width swal-hide-mobile">
              <label>ملاحظات</label>
              <input id="swal-notes" class="premium-input" placeholder="أي ملاحظات..." value="${initialData.notes}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ الصنف الجديد',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      preConfirm: () => {
        const data = {
          itemNumber: document.getElementById('swal-itemNumber').value,
          itemCode: document.getElementById('swal-itemCode').value,
          name: document.getElementById('swal-name').value,
          category: document.getElementById('swal-category').value,
          warehouse: document.getElementById('swal-warehouse').value,
          location: document.getElementById('swal-location').value,
          spec: document.getElementById('swal-spec').value,
          quantity: Number(document.getElementById('swal-quantity').value),
          unit: document.getElementById('swal-unit').value,
          minLimit: Number(document.getElementById('swal-minLimit').value),
          lastMovement: document.getElementById('swal-lastMovement').value,
          lastMovementDate: document.getElementById('swal-lastMovementDate').value,
          lastRecipient: document.getElementById('swal-lastRecipient').value,
          notes: document.getElementById('swal-notes').value,
          id: null
        };

        if (!data.itemNumber || !data.name || !data.warehouse || !data.category) {
          Swal.showValidationMessage('يرجى ملء الاسم والتصنيف ورقم الصنف والمخزن');
          return false;
        }
        if (data.itemCode && data.itemCode.trim().length !== 13) {
          Swal.showValidationMessage('يجب أن يتكون رمز الصنف من 13 خانة بالضبط');
          return false;
        }

        const existingInWarehouse = stock.find(s =>
          s.itemNumber === data.itemNumber &&
          s.warehouse === data.warehouse &&
          s.spec === data.spec
        );
        if (existingInWarehouse) {
          Swal.showValidationMessage(`عذراً، يوجد بضاعة من هذا الصنف بنفس المواصفة/اللون مسبقاً في المستودع المختار (${data.warehouse})!`);
          return false;
        }

        return data;
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await saveStockItem(result.value);
        if (res) {
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'المخزون',
            action: 'إضافة',
            details: 'إضافة صنف مخزون من شاشة الطلبيات: ' + res.name + ' (' + res.itemNumber + ')'
          });

          Swal.fire({
            icon: 'success',
            title: 'تم الحفظ بنجاح',
            text: 'تمت إضافة الصنف للمخزون. يمكنك الآن اختياره من القائمة.',
            timer: 2000,
            showConfirmButton: false
          });

          const updatedStock = await getStock();
          setStock(updatedStock);
        }
      }
    });
  };
  const handleAddProductionItem = async (index) => {
    const item = formData.items[index];

    // Check if we already have variants for this item in the linked production order
    let existingVariants = [];
    if (linkedProductionOrder && linkedProductionOrder.items) {
      existingVariants = linkedProductionOrder.items.filter(i => i.productName === item.productName);
    }

    if (existingVariants.length > 0) {
      setProductionVariants(existingVariants);
    } else {
      setProductionVariants([{
        productName: item.productName,
        quantity: item.quantity || '',
        colorModel: '',
        sizeCm: '',
        thickness: '',
        notes: item.productionNotes || '',
        status: 'لم يتم التنفيذ'
      }]);
    }

    setVariantModalIndex(index);
    setShowVariantsModal(true);
  };

  const handleAddVariant = () => {
    const item = formData.items[variantModalIndex];
    setProductionVariants([...productionVariants, {
      productName: item.productName,
      quantity: '',
      colorModel: '',
      sizeCm: '',
      thickness: '',
      notes: '',
      status: 'لم يتم التنفيذ'
    }]);
  };

  const handleRemoveVariant = (idx) => {
    const newV = [...productionVariants];
    newV.splice(idx, 1);
    setProductionVariants(newV);
  };

  const handleVariantChange = (idx, field, val) => {
    const newV = [...productionVariants];

    if (field === 'thickness') {
      val = val.replace(/[^0-9]/g, '').slice(0, 2);
    } else if (field === 'sizeCm') {
      let cleaned = val.replace(/[^0-9*]/g, '');
      let parts = cleaned.split('*');
      if (parts.length > 2) {
        cleaned = parts[0] + '*' + parts.slice(1).join('');
        parts = cleaned.split('*');
      }
      if (parts[0].length > 3) parts[0] = parts[0].slice(0, 3);
      if (parts.length > 1 && parts[1].length > 3) parts[1] = parts[1].slice(0, 3);
      val = parts.join('*');
    }

    newV[idx][field] = val;
    setProductionVariants(newV);
  };

  const handleSaveVariants = async () => {
    const item = formData.items[variantModalIndex];
    const targetQty = Number(item.quantity) || 0;
    const sumQty = productionVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

    const invalidColorIdx = productionVariants.findIndex(v => !v.colorModel);
    if (invalidColorIdx !== -1) {
      Swal.fire('خطأ في الإدخال', `يرجى اختيار اللون / الموديل في السطر رقم ${invalidColorIdx + 1}`, 'error');
      return;
    }

    const invalidEmptySizeIdx = productionVariants.findIndex(v => !v.sizeCm || v.sizeCm.trim() === '');
    if (invalidEmptySizeIdx !== -1) {
      Swal.fire('خطأ في الإدخال', `يرجى إدخال المقاس في السطر رقم ${invalidEmptySizeIdx + 1}`, 'error');
      return;
    }



    if (sumQty > targetQty) {
      Swal.fire('خطأ في الكمية', `مجموع كميات الألوان والموديلات (${sumQty}) يجب أن لا يتجاوز الكمية المطلوبة للصنف (${targetQty})`, 'error');
      return;
    }
    if (sumQty === 0 && targetQty > 0) {
      Swal.fire('خطأ في الكمية', `يرجى إدخال كمية للإنتاج أكبر من صفر.`, 'error');
      return;
    }

    const invalidSizeIdx = productionVariants.findIndex(v => !v.sizeCm || !/^\d{1,3}\*\d{1,3}$/.test(v.sizeCm.trim()));
    if (invalidSizeIdx !== -1) {
      Swal.fire('خطأ في الإدخال', `يرجى إدخال المقاس بالصيغة الصحيحة (مثال: 200*180) مستخدماً إشارة * فقط، في السطر رقم ${invalidSizeIdx + 1}`, 'error');
      return;
    }

    let prodNum = linkedProductionOrder?.orderNumber;
    if (!prodNum) {
      try {
        const allProd = await getOrders();
        const maxNum = allProd.reduce((max, o) => {
          const match = String(o.orderNumber || '').match(/\d+/);
          return match ? Math.max(max, parseInt(match[0], 10)) : max;
        }, 0);
        prodNum = `PRO-${String(maxNum + 1).padStart(4, '0')}`;
      } catch (e) {
        prodNum = 'سيتم إنشاؤه تلقائياً';
      }
    }

    if (linkedProductionOrder) {
      const filteredItems = (linkedProductionOrder.items || []).filter(i => i.productName !== item.productName);
      setLinkedProductionOrder({
        ...linkedProductionOrder,
        orderNumber: linkedProductionOrder.orderNumber || prodNum,
        items: [...filteredItems, ...productionVariants]
      });
    } else {
      setLinkedProductionOrder({
        id: null,
        orderNumber: prodNum,
        salesOrderNumber: formData.orderNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        status: 'لم يتم التنفيذ',
        orderNotes: `مرتبط بطلبية رقم ${formData.orderNumber}`,
        items: [...productionVariants]
      });
    }

    const updatedItems = [...formData.items];
    updatedItems[variantModalIndex] = { ...updatedItems[variantModalIndex], hasProductionDetails: true };
    setFormData({ ...formData, items: updatedItems });

    Swal.fire({
      icon: 'success',
      title: 'تم الإضافة مؤقتاً',
      text: 'تمت إضافة الأصناف الفرعية لكرت الإنتاج في الذاكرة، سيتم الحفظ النهائي عند الضغط على "حفظ الطلبية".',
      timer: 3000,
      showConfirmButton: false
    });

    setShowVariantsModal(false);
  };

  const handleAddPreparationItem = async (index) => {
    const item = formData.items[index];

    // Check if we already have variants for this item in the linked preparation order
    let existingVariants = [];
    if (linkedPreparationOrder && linkedPreparationOrder.items) {
      existingVariants = linkedPreparationOrder.items.filter(i => i.productName === item.productName);
    }

    if (existingVariants.length > 0) {
      setPreparationVariants(existingVariants);
    } else {
      setPreparationVariants([{
        productName: item.productName,
        quantity: item.quantity || '',
        colorModel: '',
        sizeCm: '',
        thickness: '',
        notes: item.preparationNotes || '',
        status: 'لم يتم التنفيذ'
      }]);
    }

    setPreparationVariantModalIndex(index);
    setShowPreparationVariantsModal(true);
  };

  const handleAddPreparationVariant = () => {
    const item = formData.items[preparationVariantModalIndex];
    setPreparationVariants([...preparationVariants, {
      productName: item.productName,
      quantity: '',
      colorModel: '',
      sizeCm: '',
      thickness: '',
      notes: '',
      status: 'لم يتم التنفيذ'
    }]);
  };

  const handleRemovePreparationVariant = (idx) => {
    const newV = [...preparationVariants];
    newV.splice(idx, 1);
    setPreparationVariants(newV);
  };

  const handlePreparationVariantChange = (idx, field, val) => {
    const newV = [...preparationVariants];

    if (field === 'thickness') {
      val = val.replace(/[^0-9]/g, '').slice(0, 2);
    } else if (field === 'sizeCm') {
      let cleaned = val.replace(/[^0-9*]/g, '');
      let parts = cleaned.split('*');
      if (parts.length > 2) {
        cleaned = parts[0] + '*' + parts.slice(1).join('');
        parts = cleaned.split('*');
      }
      if (parts[0].length > 3) parts[0] = parts[0].slice(0, 3);
      if (parts.length > 1 && parts[1].length > 3) parts[1] = parts[1].slice(0, 3);
      val = parts.join('*');
    }

    newV[idx][field] = val;
    setPreparationVariants(newV);
  };

  const handleSavePreparationVariants = async () => {
    const item = formData.items[preparationVariantModalIndex];
    const targetQty = Number(item.quantity) || 0;
    const sumQty = preparationVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

    if (sumQty > targetQty) {
      Swal.fire('خطأ في الكمية', `مجموع الكميات الموزعة (${sumQty}) يجب أن لا يتجاوز الكمية المطلوبة للصنف (${targetQty})`, 'error');
      return;
    }
    if (sumQty === 0 && targetQty > 0) {
      Swal.fire('خطأ في الكمية', `يرجى إدخال كمية للتحضير أكبر من صفر.`, 'error');
      return;
    }

    let prepNum = linkedPreparationOrder?.orderNumber;
    if (!prepNum) {
      try {
        const allPrep = await getPreparationOrders();
        const maxNum = allPrep.reduce((max, o) => {
          const match = String(o.orderNumber || '').match(/\d+/);
          return match ? Math.max(max, parseInt(match[0], 10)) : max;
        }, 0);
        prepNum = `PREP-${String(maxNum + 1).padStart(4, '0')}`;
      } catch (e) {
        prepNum = 'سيتم إنشاؤه تلقائياً';
      }
    }

    if (linkedPreparationOrder) {
      const filteredItems = (linkedPreparationOrder.items || []).filter(i => i.productName !== item.productName);
      setLinkedPreparationOrder({
        ...linkedPreparationOrder,
        orderNumber: linkedPreparationOrder.orderNumber || prepNum,
        items: [...filteredItems, ...preparationVariants]
      });
    } else {
      setLinkedPreparationOrder({
        id: null,
        orderNumber: prepNum,
        salesOrderNumber: formData.orderNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        status: 'لم يتم التنفيذ',
        orderNotes: `مرتبط بطلبية رقم ${formData.orderNumber}`,
        items: [...preparationVariants]
      });
    }

    const updatedItems = [...formData.items];
    updatedItems[preparationVariantModalIndex] = { ...updatedItems[preparationVariantModalIndex], hasPreparationDetails: true };
    setFormData({ ...formData, items: updatedItems });

    Swal.fire({
      icon: 'success',
      title: 'تم الإضافة مؤقتاً',
      text: 'تمت إضافة الأصناف الفرعية لكرت التحضير في الذاكرة، سيتم الحفظ النهائي عند الضغط على "حفظ الطلبية".',
      timer: 3000,
      showConfirmButton: false
    });

    setShowPreparationVariantsModal(false);
  };

  const handleOpenPrepAndProdItem = async (index) => {
    const item = formData.items[index];

    // Find existing variants in linkedPreparationOrder and linkedProductionOrder
    let existingPrep = [];
    if (linkedPreparationOrder && linkedPreparationOrder.items) {
      existingPrep = linkedPreparationOrder.items.filter(i => i.productName === item.productName);
    }
    let existingProd = [];
    if (linkedProductionOrder && linkedProductionOrder.items) {
      existingProd = linkedProductionOrder.items.filter(i => i.productName === item.productName);
    }

    const defaultPrep = [{
      productName: item.productName,
      quantity: item.quantity || '',
      colorModel: '',
      sizeCm: '',
      thickness: '',
      notes: item.preparationNotes || '',
      status: 'لم يتم التنفيذ'
    }];

    const defaultProd = [{
      productName: item.productName,
      quantity: item.quantity || '',
      colorModel: '',
      sizeCm: '',
      thickness: '',
      notes: item.productionNotes || '',
      status: 'لم يتم التنفيذ'
    }];

    setPrepAndProdVariants({
      prepVariants: existingPrep.length > 0 ? existingPrep : defaultPrep,
      prodVariants: existingProd.length > 0 ? existingProd : defaultProd
    });

    setPrepAndProdModalIndex(index);
    setShowPrepAndProdModal(true);
  };

  const handleSavePrepAndProdVariants = async ({ prepVariants, prodVariants }) => {
    const item = formData.items[prepAndProdModalIndex];

    let prodNum = linkedProductionOrder?.orderNumber;
    if (!prodNum) {
      try {
        const allProd = await getOrders();
        const maxNum = allProd.reduce((max, o) => {
          const match = String(o.orderNumber || '').match(/\d+/);
          return match ? Math.max(max, parseInt(match[0], 10)) : max;
        }, 0);
        prodNum = `PRO-${String(maxNum + 1).padStart(4, '0')}`;
      } catch (e) {
        prodNum = 'سيتم إنشاؤه تلقائياً';
      }
    }

    let prepNum = linkedPreparationOrder?.orderNumber;
    if (!prepNum) {
      try {
        const allPrep = await getPreparationOrders();
        const maxNum = allPrep.reduce((max, o) => {
          const match = String(o.orderNumber || '').match(/\d+/);
          return match ? Math.max(max, parseInt(match[0], 10)) : max;
        }, 0);
        prepNum = `PREP-${String(maxNum + 1).padStart(4, '0')}`;
      } catch (e) {
        prepNum = 'سيتم إنشاؤه تلقائياً';
      }
    }

    // Update or create linkedProductionOrder
    if (linkedProductionOrder) {
      const filteredItems = (linkedProductionOrder.items || []).filter(i => i.productName !== item.productName);
      setLinkedProductionOrder({
        ...linkedProductionOrder,
        orderNumber: linkedProductionOrder.orderNumber || prodNum,
        items: [...filteredItems, ...prodVariants]
      });
    } else {
      setLinkedProductionOrder({
        id: null,
        orderNumber: prodNum,
        salesOrderNumber: formData.orderNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        status: 'لم يتم التنفيذ',
        orderNotes: `مرتبط بطلبية رقم ${formData.orderNumber}`,
        items: [...prodVariants]
      });
    }

    // Update or create linkedPreparationOrder
    if (linkedPreparationOrder) {
      const filteredItems = (linkedPreparationOrder.items || []).filter(i => i.productName !== item.productName);
      setLinkedPreparationOrder({
        ...linkedPreparationOrder,
        orderNumber: linkedPreparationOrder.orderNumber || prepNum,
        items: [...filteredItems, ...prepVariants]
      });
    } else {
      setLinkedPreparationOrder({
        id: null,
        orderNumber: prepNum,
        salesOrderNumber: formData.orderNumber,
        customerId: formData.customerId,
        customerName: formData.customerName,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
        status: 'لم يتم التنفيذ',
        orderNotes: `مرتبط بطلبية رقم ${formData.orderNumber}`,
        items: [...prepVariants]
      });
    }

    const updatedItems = [...formData.items];
    updatedItems[prepAndProdModalIndex] = {
      ...updatedItems[prepAndProdModalIndex],
      hasPrepAndProdDetails: true,
      hasProductionDetails: true,
      hasPreparationDetails: true
    };
    setFormData({ ...formData, items: updatedItems });

    Swal.fire({
      icon: 'success',
      title: 'تم الحفظ مؤقتاً',
      text: 'تمت إضافة تفاصيل التحضير والإنتاج في الذاكرة، سيتم الحفظ النهائي عند الضغط على "حفظ الطلبية".',
      timer: 3000,
      showConfirmButton: false
    });

    setShowPrepAndProdModal(false);
  };



  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return;
    const item = formData.items[index];
    if (item && isItemStatusDisabled(item)) {
      Swal.fire('مرفوض', 'لا يمكن حذف هذا الصنف لأنه قيد الإنتاج ولم ينتهِ أو يُلغَ بعد.', 'error');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getProductStockQuantity = (prodName) => {
    if (!prodName) return null;
    let targetWarehouse = null;
    let cleanProdName = prodName.trim();
    const warehouseMatch = cleanProdName.match(/\s*\(مستودع:\s*([^\)]+)\)\s*$/);
    if (warehouseMatch) {
      targetWarehouse = warehouseMatch[1].trim();
      cleanProdName = cleanProdName.replace(/\s*\(مستودع:\s*[^\)]+\)\s*$/, '').trim();
    }

    const stockData = stockLookup[cleanProdName];
    if (!stockData) return null;

    if (targetWarehouse) {
      const wh = stockData.breakdown.find(b => b.warehouse === targetWarehouse);
      return wh ? wh.quantity : 0;
    }

    return stockData.available;
  };

  const getProductStockSummary = (prodName) => {
    if (!prodName) return { physical: 0, reserved: 0, available: 0 };
    let targetWarehouse = null;
    let cleanProdName = String(prodName || '').trim();
    const warehouseMatch = cleanProdName.match(/\s*\(مستودع:\s*([^\)]+)\)\s*$/);
    if (warehouseMatch) {
      targetWarehouse = warehouseMatch[1].trim();
      cleanProdName = cleanProdName.replace(/\s*\(مستودع:\s*[^\)]+\)\s*$/, '').trim();
    }

    const key = cleanStockProductName(cleanProdName);
    const stockData = stockLookup[key] || {};

    let physical = Number(stockData.total || 0);
    if (targetWarehouse) {
      const wh = (stockData.breakdown || []).find(b => b.warehouse === targetWarehouse);
      physical = wh ? Number(wh.quantity || 0) : 0;
    }

    const reserved = Number(stockData.reserved || 0);
    return { physical, reserved, available: getAvailableQuantity(physical, reserved), warehouse: targetWarehouse };
  };

  const formatProductStockSummary = prodName => {
    const summary = getProductStockSummary(prodName);
    return `الموجود: ${summary.physical} | المحجوز: ${summary.reserved} | المتاح: ${summary.available}`;
  };

  const getProductStockBreakdown = (prodName) => {
    if (!prodName) return [];
    let targetWarehouse = null;
    let cleanProdName = prodName.trim();
    const warehouseMatch = cleanProdName.match(/\s*\(مستودع:\s*([^\)]+)\)\s*$/);
    if (warehouseMatch) {
      targetWarehouse = warehouseMatch[1].trim();
      cleanProdName = cleanProdName.replace(/\s*\(مستودع:\s*[^\)]+\)\s*$/, '').trim();
    }

    const stockData = stockLookup[cleanProdName];
    if (!stockData) return [];

    if (targetWarehouse) {
      const wh = stockData.breakdown.find(b => b.warehouse === targetWarehouse);
      return wh ? [wh] : [];
    }
    return stockData.breakdown.map(b => ({ warehouse: b.warehouse || 'مستودع غير محدد', quantity: b.quantity }));
  };

  const isItemStatusDisabled = (item) => {
    if (!editingOrder) return false;

    if (['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف', 'جاهز'].includes(item.itemStatus)) {
      if (linkedProductionOrder) {
        const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim();
        const overallStatus = normalize(linkedProductionOrder.status || 'لم يتم التنفيذ');
        const isOverallActive = !(overallStatus.includes('منتهي') || overallStatus.includes('ملغي') || overallStatus.includes('لم يتم التنفيذ'));

        if (linkedProductionOrder.items) {
          const prodItem = linkedProductionOrder.items.find(pi => {
            const name1 = normalize(pi.productName).replace(/\s+/g, ' ');
            const name2 = normalize(item.productName).replace(/\s+/g, ' ');
            return name1 === name2 || name1.includes(name2) || name2.includes(name1);
          });
          if (prodItem) {
            const prodStatus = normalize(prodItem.status || 'لم يتم التنفيذ');
            return !(prodStatus.includes('منتهي') || prodStatus.includes('ملغي') || prodStatus.includes('لم يتم التنفيذ'));
          }
        }

        return isOverallActive;
      }
    }

    if (item.itemStatus === 'تحضير وإنتاج') {
      const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim();
      let prodActive = false;
      let prepActive = false;
      if (linkedProductionOrder) {
        const overallStatus = normalize(linkedProductionOrder.status || 'لم يتم التنفيذ');
        prodActive = !(overallStatus.includes('منتهي') || overallStatus.includes('ملغي') || overallStatus.includes('لم يتم التنفيذ'));
      }
      if (linkedPreparationOrder) {
        const overallStatus = normalize(linkedPreparationOrder.status || 'لم يتم التنفيذ');
        prepActive = !(overallStatus.includes('منتهي') || overallStatus.includes('ملغي') || overallStatus.includes('لم يتم التنفيذ'));
      }
      return prodActive || prepActive;
    }

    if (item.itemStatus === 'قيد التحضير' || item.itemStatus === 'إنتاج قيد التحضير') {
      if (linkedPreparationOrder) {
        const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim();
        const overallStatus = normalize(linkedPreparationOrder.status || 'لم يتم التنفيذ');
        const isOverallActive = !(overallStatus.includes('منتهي') || overallStatus.includes('ملغي') || overallStatus.includes('لم يتم التنفيذ'));

        if (linkedPreparationOrder.items) {
          const prepItem = linkedPreparationOrder.items.find(pi => {
            const name1 = normalize(pi.productName).replace(/\s+/g, ' ');
            const name2 = normalize(item.productName).replace(/\s+/g, ' ');
            return name1 === name2 || name1.includes(name2) || name2.includes(name1);
          });
          if (prepItem) {
            const prepStatus = normalize(prepItem.status || 'لم يتم التنفيذ');
            return !(prepStatus.includes('منتهي') || prepStatus.includes('ملغي') || prepStatus.includes('لم يتم التنفيذ'));
          }
        }

        return isOverallActive;
      }
    }
    return false;
  };

  const getProductionItemStatus = (salesOrder, item) => {
    if (!productionOrders || !salesOrder) return null;
    const linkedDb = productionOrders.find(po =>
      (po.salesOrderId && po.salesOrderId === salesOrder.id) ||
      (po.salesOrderNumber && po.salesOrderNumber === salesOrder.orderNumber) ||
      (po.orderNotes && po.orderNotes.includes(salesOrder.orderNumber))
    );
    if (!linkedDb || !linkedDb.items) return null;

    const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim();
    const targetName = normalize(item.productName).replace(/\s+/g, ' ');

    const prodItem = linkedDb.items.find(pi => {
      const name = normalize(pi.productName).replace(/\s+/g, ' ');
      return name === targetName || name.includes(targetName) || targetName.includes(name);
    });
    return prodItem ? prodItem.status : null;
  };

  const getPreparationItemStatus = (salesOrder, item) => {
    if (!preparationOrders || !salesOrder) return null;
    const linkedDb = preparationOrders.find(po =>
      (po.salesOrderId && po.salesOrderId === salesOrder.id) ||
      (po.salesOrderNumber && po.salesOrderNumber === salesOrder.orderNumber) ||
      (po.orderNotes && po.orderNotes.includes(salesOrder.orderNumber))
    );
    if (!linkedDb || !linkedDb.items) return null;

    const normalize = (str) => String(str || '').replace(/أ|إ|آ/g, 'ا').replace(/ى/g, 'ي').trim();
    const targetName = normalize(item.productName).replace(/\s+/g, ' ');

    const prepItem = linkedDb.items.find(pi => {
      const name = normalize(pi.productName).replace(/\s+/g, ' ');
      return name === targetName || name.includes(targetName) || targetName.includes(name);
    });
    return prepItem ? prepItem.status : null;
  };

  const getDisplayedItemStatus = (salesOrder, item) => {
    if (['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف'].includes(item.itemStatus)) {
      const prodStatus = getProductionItemStatus(salesOrder, item);
      if (prodStatus && prodStatus !== 'لم يتم التنفيذ') {
        return prodStatus;
      }
      return item.itemStatus === 'إنتاج قيد التغليف' ? 'إنتاج قيد التغليف' : 'إنتاج قيد الخياطة';
    }
    if (item.itemStatus === 'قيد التحضير' || item.itemStatus === 'إنتاج قيد التحضير') {
      const prepStatus = getPreparationItemStatus(salesOrder, item);
      if (prepStatus && prepStatus !== 'لم يتم التنفيذ') {
        return prepStatus;
      }
      return 'إنتاج قيد التحضير';
    }
    if (item.itemStatus === 'تحضير وإنتاج') {
      const prodStatus = getProductionItemStatus(salesOrder, item);
      const prepStatus = getPreparationItemStatus(salesOrder, item);
      if (prodStatus && prodStatus !== 'لم يتم التنفيذ' && prepStatus && prepStatus !== 'لم يتم التنفيذ') {
        return `خياطة: ${prodStatus} | تحضير: ${prepStatus}`;
      }
      return 'تحضير وإنتاج';
    }
    return item.itemStatus || '---';
  };

  const getSalesStatusColor = (status) => {
    switch (status) {
      case 'جديد':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }; // Blue
      case 'قيد التجهيز':
        return { bg: '#fef3c7', text: '#d97706', border: '#fde68a' }; // Amber/Orange
      case 'تم التجهيز':
        return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' }; // Emerald Green
      case 'تم التسليم للتوصيل':
      case 'تم تسليمها للتوصيل':
      case 'قيد التوصيل':
        return { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' }; // Purple
      case 'تم التوصيل':
      case 'منتهي':
        return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }; // Green
      case 'تم تأجيل التوصيل':
      case 'مؤجل':
        return { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#d97706' }; // Dark Orange
      case 'ملغي':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' }; // Red
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }; // Slate
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'productName' && typeof value === 'string') {
      value = cleanStockProductName(value);
    }
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleMoveItemToIndex = (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= formData.items.length || targetIndex >= formData.items.length) return;

    const newItems = [...formData.items];
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);
    setFormData({ ...formData, items: newItems });
  };

  const handleMoveItem = (index, direction) => {
    handleMoveItemToIndex(index, index + direction);
  };

  const handleItemDragStart = (event, index) => {
    setDraggedItemIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleItemDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleItemDrop = (event, targetIndex) => {
    event.preventDefault();
    const rawSourceIndex = draggedItemIndex ?? event.dataTransfer.getData('text/plain');
    const sourceIndex = Number(rawSourceIndex);
    if (Number.isInteger(sourceIndex)) {
      handleMoveItemToIndex(sourceIndex, targetIndex);
    }
    setDraggedItemIndex(null);
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    const cust = customers.find(c => c.id === custId);
    setFormData({
      ...formData,
      customerId: custId,
      customerName: cust ? cust.name : ''
    });
  };

  const handleAddNewCustomer = () => {
    let maxNum = 0;
    customers.forEach(c => {
      if (c.customerNumber && c.customerNumber.startsWith('CLI-')) {
        const num = parseInt(c.customerNumber.replace('CLI-', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const JORDANIAN_CITIES = ['عمان', 'الزرقاء', 'إربد', 'العقبة', 'السلط', 'مادبا', 'الكرك', 'الطفيلة', 'معان', 'جرش', 'عجلون', 'المفرق'];
    const cities = (globalSettings.jordanianCities && globalSettings.jordanianCities.length > 0) ? globalSettings.jordanianCities : JORDANIAN_CITIES;
    const customerNumber = `CLI-${String(maxNum + 1).padStart(4, '0')}`;
    const initialData = { name: '', phone: '', city: '', location: '', status: 'نشط', customerNumber, sector: '' };

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
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
             <span>إضافة عميل جديد</span>
          </div>
          <div class="premium-modal-close" onclick="Swal.close()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </div>
        </div>
        <div class="premium-form">
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash text-muted"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              رقم العميل
            </label>
            <input id="swal-customerNumber" class="premium-input bg-slate-50 text-slate-500 cursor-not-allowed font-bold" value="${initialData.customerNumber}" disabled>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              اسم العميل
            </label>
            <input id="swal-name" class="premium-input" placeholder="مثال: شركة مرجاس للتجارة" value="${initialData.name}">
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone text-muted"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              رقم الهاتف
            </label>
            <input id="swal-phone" class="premium-input" placeholder="07xxxxxxxx" value="${initialData.phone || ''}">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; align-items: flex-end;">
            <div class="premium-form-group" style="margin-bottom: 0;">
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map text-muted"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                المدينة
              </label>
              <select id="swal-city" class="premium-input">
                <option value="">اختر المدينة...</option>
                ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
              </select>
            </div>
            <div class="premium-form-group" style="margin-bottom: 0;" id="swal-location-container">
              <!-- Dynamically populated -->
            </div>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-briefcase text-muted"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              القطاع
            </label>
            <select id="swal-sector" class="premium-input">
              <option value="">اختر القطاع...</option>
              ${(globalSettings.customerSectors || []).map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              البائع (مندوب الطلبيات) *
            </label>
            <select id="swal-salesRep" class="premium-input">
              <option value="زبائن الشركة" selected>زبائن الشركة</option>
              ${(globalSettings.salesReps || []).filter(rep => rep !== 'زبائن الشركة').map(rep => `<option value="${rep}">${rep}</option>`).join('')}
            </select>
          </div>
          <div class="premium-form-group">
            <label>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity text-muted"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>
              حالة العميل
            </label>
            <select id="swal-status" class="premium-input">
              <option value="نشط" selected>نشط</option>
              <option value="غير نشط">غير نشط</option>
              <option value="عميل محتمل">عميل محتمل</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'حفظ العميل',
      cancelButtonText: 'إلغاء',
      focusConfirm: false,
      didOpen: () => {
        const citySelect = document.getElementById('swal-city');
        const locationContainer = document.getElementById('swal-location-container');

        const updateLocationField = (selectedCity, currentVal) => {
          if (!locationContainer) return;
          if (selectedCity === 'عمان') {
            const areas = (globalSettings.ammanAreas && globalSettings.ammanAreas.length > 0) ? globalSettings.ammanAreas : [
              'عبدون', 'دير غبار', 'أم أذينة', 'الرابية', 'الشميساني', 'الصويفية', 'الجندويل',
              'خلدا', 'تلاع العلي', 'أم السماق', 'ضاحية الرشيد', 'ضاحية الحسين', 'مرج الحمام',
              'الجبيهة', 'شفا بدران', 'أبو نصير', 'طبربور', 'الهاشمي الشمالي', 'الهاشمي الجنوبي',
              'جبل الحسين', 'جبل عمان', 'جبل اللويبدة', 'الأشرفية', 'الوحدات', 'رأس العين',
              'وسط البلد', 'النصر', 'القويسمة', 'أبو علندا', 'خريبة السوق', 'المقابلين',
              'الجويدة', 'سحاب', 'الموقر', 'ماركا الشمالية', 'ماركا الجنوبية', 'طارق',
              'بسمان', 'البيادر', 'وادي السير', 'اليادودة', 'حسبان', 'البنيات'
            ];
            locationContainer.innerHTML = `
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة *
              </label>
              <select id="swal-location" class="premium-input">
                <option value="">اختر المنطقة...</option>
                ${areas.map(area => `<option value="${area}" ${currentVal === area ? 'selected' : ''}>${area}</option>`).join('')}
              </select>
            `;
          } else {
            locationContainer.innerHTML = `
              <label>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin text-muted"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                المنطقة
              </label>
              <input id="swal-location" class="premium-input" placeholder="مثال: وسط المدينة..." value="${selectedCity ? currentVal : ''}">
            `;
          }
        };

        if (citySelect) {
          updateLocationField(citySelect.value, '');
          citySelect.addEventListener('change', (e) => {
            updateLocationField(e.target.value, '');
          });
        }
      },
      preConfirm: () => {
        const name = document.getElementById('swal-name').value;
        const phone = document.getElementById('swal-phone').value;
        const location = document.getElementById('swal-location').value;
        const city = document.getElementById('swal-city').value;
        const sector = document.getElementById('swal-sector').value;
        const status = document.getElementById('swal-status').value;
        if (!name) {
          Swal.showValidationMessage('يرجى ملء اسم العميل');
          return false;
        }
        if (!phone || phone.trim().length !== 10 || isNaN(phone.trim())) {
          Swal.showValidationMessage('يرجى إدخال رقم هاتف يتكون من 10 أرقام حصراً');
          return false;
        }
        if (!city) {
          Swal.showValidationMessage('يرجى اختيار المدينة');
          return false;
        }
        if (city === 'عمان' && !location) {
          Swal.showValidationMessage('يرجى اختيار المنطقة لمدينة عمان');
          return false;
        }
        if (!sector) {
          Swal.showValidationMessage('يرجى اختيار القطاع');
          return false;
        }
        const salesRep = document.getElementById('swal-salesRep').value;
        if ((globalSettings.salesReps || []).length > 0 && !salesRep) {
          Swal.showValidationMessage('يرجى اختيار البائع (مندوب الطلبيات)');
          return false;
        }
        return { name, phone: phone.trim(), city, location, sector, status, salesRep, type: 'عميل', customerNumber: initialData.customerNumber };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const newCust = await saveCustomer(result.value);
        if (newCust) {
          const updatedCustomers = [...customers, newCust];
          setCustomers(updatedCustomers);
          setFormData({
            ...formData,
            customerId: newCust.id,
            customerName: newCust.name
          });
          await addLog({
            userName: user.name,
            userId: user.id,
            module: 'العملاء',
            action: 'إضافة',
            details: `إضافة العميل (من الطلبيات): ${result.value.name}`
          });
          Swal.fire({ title: 'تم الحفظ', text: 'تمت إضافة العميل بنجاح', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      }
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.customerName || formData.items.some(item => !item.productName || !item.quantity)) {
        Swal.fire('خطأ', 'يرجى ملء جميع الحقول المطلوبة (العميل والأصناف)', 'error');
        return;
      }

      if (formData.items.some(item => !item.itemStatus)) {
        Swal.fire('خطأ', 'يرجى تحديد حالة الصنف لكل الأصناف المطلوبة', 'error');
        return;
      }

      const productNames = formData.items.map(i => i.productName).filter(Boolean);
      const uniqueProductNames = new Set(productNames);
      if (uniqueProductNames.size !== productNames.length) {
        Swal.fire('خطأ', 'لا يمكن تكرار نفس الصنف في نفس الطلبية. يرجى تجميع الكمية في سطر واحد.', 'error');
        return;
      }

      const normalizeCardProduct = value => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar');
      const hasLinkedCardItem = (linkedOrder, salesItem) => (linkedOrder?.items || []).some(cardItem =>
        normalizeCardProduct(cardItem.productName || cardItem.name) === normalizeCardProduct(salesItem.productName || salesItem.name)
        && Number(cardItem.quantity || 0) > 0
      );

      const missingProductionCard = formData.items.find(item =>
        normalizeSalesItemStatus(item.itemStatus) === 'قيد الإنتاج' && !hasLinkedCardItem(linkedProductionOrder, item)
      );
      if (missingProductionCard) {
        Swal.fire('كرت الإنتاج مطلوب', `يجب إنشاء وحفظ كرت الخياطة للصنف "${missingProductionCard.productName}" قبل حفظ الطلبية.`, 'warning');
        return;
      }

      const missingPreparationCard = formData.items.find(item =>
        normalizeSalesItemStatus(item.itemStatus) === 'قيد التحضير' && !hasLinkedCardItem(linkedPreparationOrder, item)
      );
      if (missingPreparationCard) {
        Swal.fire('كرت التحضير مطلوب', `يجب إنشاء وحفظ كرت التحضير للصنف "${missingPreparationCard.productName}" قبل حفظ الطلبية.`, 'warning');
        return;
      }

      const missingPrepAndProdCard = formData.items.find(item =>
        normalizeSalesItemStatus(item.itemStatus) === 'تحضير وإنتاج' && (!hasLinkedCardItem(linkedProductionOrder, item) || !hasLinkedCardItem(linkedPreparationOrder, item))
      );
      if (missingPrepAndProdCard) {
        Swal.fire('كرت التحضير والإنتاج مطلوب', `يجب إنشاء وحفظ تفاصيل كرت الخياطة والتحضير للصنف "${missingPrepAndProdCard.productName}" قبل حفظ الطلبية.`, 'warning');
        return;
      }

      const reservedWithoutCurrentOrder = buildReservedQuantityMap(orders, editingOrder?.id || formData.id || '');
      const overbookedItem = formData.items.find(item => {
        if (!isReservableSalesItem(item)) return false;
        const key = cleanStockProductName(item.productName);
        const physical = Number(stockLookup[key]?.total || 0);
        const availableBeforeThisOrder = getAvailableQuantity(physical, reservedWithoutCurrentOrder[key] || 0);
        return Number(item.quantity || 0) > availableBeforeThisOrder;
      });
      if (overbookedItem) {
        const key = cleanStockProductName(overbookedItem.productName);
        const physical = Number(stockLookup[key]?.total || 0);
        const reserved = Number(reservedWithoutCurrentOrder[key] || 0);
        Swal.fire('الكمية غير متاحة', `الصنف "${key}" — الموجود: ${physical} | المحجوز: ${reserved} | المتاح: ${getAvailableQuantity(physical, reserved)} | المطلوب: ${Number(overbookedItem.quantity || 0)}`, 'error');
        return;
      }

      if (formData.status === 'جاهز للتسليم للتوصيل' || formData.status === 'تم التسليم للتوصيل') {
        const allReady = (formData.items || []).every(item => item.itemStatus === 'جاهز');
        if (!allReady) {
          Swal.fire('خطأ', 'لا يمكنك جعل حالة الطلب "جاهز للتسليم للتوصيل" أو "تم التسليم للتوصيل" إلا عندما تكون جميع بنود الطلب تحمل حالة "جاهز".', 'error');
          return;
        }
      }

      if (formData.status === 'منتهي' && editingOrder?.status !== 'منتهي') {
        Swal.fire('الموافقة النهائية مطلوبة', 'احفظ الطلبية أولاً ثم استخدم زر الموافقة النهائية بعد إنجاز التسليم.', 'warning');
        return;
      }
      const dataToSave = {
        ...formData,
        createdBy: formData.createdBy || user?.name || 'مدير',
        lastActionBy: user?.name || 'مدير',
        statusUpdateDate: getLocalDateStr(new Date())
      };

      const result = await saveSalesOrder(dataToSave);

      if (!result) {
        const lastErr = saveSalesOrder.lastError;
        throw new Error(lastErr?.message || 'تعذر حفظ الطلبية في قاعدة البيانات. يرجى إعادة المحاولة.');
      }

      if (result) {
        if (linkedProductionOrder && linkedProductionOrder.items?.length > 0) {
          const prodData = {
            ...linkedProductionOrder,
            customerId: result.customerId,
            customerName: result.customerName,
            deliveryDate: result.deliveryDate || linkedProductionOrder.deliveryDate,
            salesOrderId: result.id,
            salesOrderNumber: result.orderNumber,
            createdBy: linkedProductionOrder.createdBy || user?.name || 'مدير',
            lastActionBy: user?.name || 'مدير'
          };
          try {
            const savedProd = await saveOrder(prodData);
            if (savedProd) setProductionOrders(prev => [savedProd, ...prev.filter(item => item.id !== savedProd.id)]);
            if (!savedProd) {
              Swal.fire('خطأ في الإنتاج', 'تم حفظ الطلبية بنجاح، ولكن تعذر إنشاء كرت الإنتاج. يرجى مراجعة الإدارة.', 'error');
              console.error("Failed to save production order with data:", prodData);
            }
          } catch (e) {
            console.error("Error saving production order:", e, prodData);
            Swal.fire('خطأ', 'حدث خطأ غير متوقع أثناء حفظ كرت الإنتاج.', 'error');
          }
        }

        if (linkedPreparationOrder && linkedPreparationOrder.items?.length > 0) {
          const prepData = {
            ...linkedPreparationOrder,
            customerId: result.customerId,
            customerName: result.customerName,
            deliveryDate: result.deliveryDate || linkedPreparationOrder.deliveryDate,
            salesOrderId: result.id,
            salesOrderNumber: result.orderNumber,
            createdBy: linkedPreparationOrder.createdBy || user?.name || 'مدير',
            lastActionBy: user?.name || 'مدير'
          };
          try {
            const savedPrep = await savePreparationOrder(prepData);
            if (savedPrep) setPreparationOrders(prev => [savedPrep, ...prev.filter(item => item.id !== savedPrep.id)]);
            if (!savedPrep) {
              Swal.fire('خطأ في التحضير', 'تم حفظ الطلبية بنجاح، ولكن تعذر إنشاء كرت التحضير. يرجى مراجعة الإدارة.', 'error');
              console.error("Failed to save preparation order with data:", prepData);
            }
          } catch (e) {
            console.error("Error saving preparation order:", e, prepData);
            Swal.fire('خطأ', 'حدث خطأ غير متوقع أثناء حفظ كرت التحضير.', 'error');
          }
        }

        await addLog({
          userName: user.name,
          userId: user.id,
          module: 'طلبيات العملاء',
          action: editingOrder ? 'تعديل' : 'إضافة',
          details: `${editingOrder ? 'تعديل' : 'إضافة'} طلبية رقم: ${result.orderNumber} للعميل: ${result.customerName}`
        });
        await checkAndCreateMission(result, dataToSave.status);

        Swal.fire({
          title: editingOrder ? 'تم التعديل' : 'تمت الإضافة',
          text: editingOrder ? 'تم تحديث الطلبية بنجاح' : 'تم إضافة الطلبية بنجاح برقم ' + result.orderNumber,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        clearTimeout(draftTimerRef.current);
        if (!editingOrder && activeDraftId) {
          await removeDraft({ id: activeDraftId });
          setActiveDraftId(null);
        }
        setShowModal(false);
        // Orders and reservation totals are refreshed by the live subscription.
      }
    } catch (error) {
      console.error("Order submission error:", error);
      let errMsg = error.message || 'يرجى إعادة المحاولة';
      if (String(errMsg).includes('Quota exceeded') || String(errMsg).includes('RESOURCE_EXHAUSTED')) {
        errMsg = 'تم استنفاد الحصة اليومية المجانية لقاعدة بيانات Firebase (Quota exceeded). يرجى ترقية باقة Firebase إلى Blaze أو مراجعة إدارة النظام.';
      }
      Swal.fire({
        icon: 'error',
        title: 'تعذر حفظ الطلبية',
        text: errMsg
      });
    }
  };

  const checkAndCreateMission = async (order, newStatus) => {
    if (['pickup', 'courier', 'unassigned'].includes(order.deliveryMethod)) return;
    if (newStatus === 'تم التسليم للتوصيل' || newStatus === 'تم تسليمها للتوصيل' || newStatus === 'جاهز للتوصيل') {
      try {
        const allMissions = await getMissions();
        const existingMission = allMissions.find(m => m.salesOrderNumber === order.orderNumber);

        if (!existingMission) {
          const maxNum = allMissions.reduce((max, o) => {
            const str = String(o.missionNumber || '');
            if (str.startsWith('DEL-')) {
              const match = str.match(/DEL-(\d+)/);
              return match ? Math.max(max, parseInt(match[1], 10)) : max;
            }
            return max;
          }, 0);
          const nextMissionNumber = `DEL-${String(maxNum + 1).padStart(4, '0')}`;

          await saveMission({
            id: null,
            missionNumber: nextMissionNumber,
            type: 'تسليم طلبية',
            customType: '',
            sourceEntity: 'مرجاس للتجارة - قسم البياضات',
            targetEntity: order.customerName || '',
            details: `توصيل تلقائي للطلبية رقم ${order.orderNumber} ${order.orderNotes ? '- ' + order.orderNotes : ''}`,
            assignedEmployeeId: '',
            assignedEmployeeName: '',
            dueDate: getLocalDateStr(new Date()),
            status: 'بانتظار الاستلام',
            salesOrderNumber: order.orderNumber
          });
          setMissions(await getMissions());
        }
      } catch (err) {
        console.error("Error creating mission for sales order:", err);
      }
    }
  };

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
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
    });

    if (result.isConfirmed) {
      const orderToDelete = orders.find(o => o.id === id);
      await deleteSalesOrder(id);
      await addLog({
        userName: user.name,
        userId: user.id,
        module: 'طلبيات العملاء',
        action: 'حذف',
        details: `حذف طلبية رقم: ${orderToDelete?.orderNumber || id}`
      });
      Swal.fire({
        customClass: {
          container: 'premium-modal-container',
          popup: 'premium-modal-popup',
          confirmButton: 'btn-premium-save',
          actions: 'premium-modal-actions'
        },
        buttonsStyling: false,
        title: 'تم الحفظ',
        text: 'تم حذف الطلبية بنجاح',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData();
    }
  };

  const handleUpdateStatus = async (order, newStatus) => {
    if (newStatus === 'منتهي') {
      await handleManagerApproveDelivery(order);
      return;
    }
    if (!isAdmin(user) && !isImad && (newStatus === 'جاهز للتسليم للتوصيل' || newStatus === 'تم التسليم للتوصيل')) {
      const allReady = (order.items || []).every(item => item.itemStatus === 'جاهز');
      if (!allReady) {
        MySwal.fire({
          title: 'لا يمكن تغيير الحالة',
          text: 'لا يمكنك جعل حالة الطلب "جاهز للتسليم للتوصيل" أو "تم التسليم للتوصيل" إلا عندما تكون جميع بنود الطلب تحمل حالة "جاهز".',
          icon: 'error',
          confirmButtonText: 'حسناً',
          customClass: {
            container: 'premium-modal-container',
            popup: 'premium-modal-popup',
            confirmButton: 'btn-premium-save'
          }
        });
        return;
      }
    }

    if (!isAdmin(user) && !isImad && (order.status === 'تم التسليم للتوصيل' || order.status === 'تم تسليمها للتوصيل' || order.status === 'جاهز للتوصيل') &&
      (newStatus !== 'تم التسليم للتوصيل' && newStatus !== 'تم تسليمها للتوصيل' && newStatus !== 'جاهز للتوصيل')) {
      try {
        const allMissions = await getMissions();
        const linkedMission = allMissions.find(m => m.salesOrderNumber === order.orderNumber);
        if (linkedMission) {
          if (linkedMission.status !== 'بانتظار الاستلام') {
            MySwal.fire({
              title: 'لا يمكن سحب الطلبية',
              text: 'لقد قام قسم التوصيل باستلام الطلبية والبدء بها، لا يمكنك التراجع.',
              icon: 'error',
              confirmButtonText: 'حسناً',
              customClass: {
                container: 'premium-modal-container',
                popup: 'premium-modal-popup',
                confirmButton: 'btn-premium-save'
              }
            });
            fetchData();
            return;
          } else {
            await deleteMission(linkedMission.id);
          }
        }
      } catch (err) {
        console.error("Error checking linked mission:", err);
      }
    }



    await checkAndCreateMission(order, newStatus);

    await saveSalesOrder({ ...order, status: newStatus, lastActionBy: user?.name || 'مدير', statusUpdateDate: getLocalDateStr(new Date()) }, { preserveStatus: isAdmin(user) || isImad });
    await addLog({
      userName: user.name,
      userId: user.id,
      module: 'طلبيات العملاء',
      action: 'تعديل حالة',
      details: `تغيير حالة طلبية رقم: ${order.orderNumber} إلى: ${newStatus}`
    });
    fetchData();
  };

  const printOrder = (order) => {
    const originalTitle = document.title;
    if (order && order.orderNumber) {
      document.title = order.orderNumber;
    }

    // Call print immediately
    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  const triggerPrint = () => printOrder(selectedOrder);

  const handlePrintOrder = async (order) => {
    try {
      const orderToPrint = await prepareOrderForPrint(order);
      // Commit the selected order and its print portal before opening the print dialog.
      flushSync(() => setSelectedOrder(orderToPrint));
      printOrder(orderToPrint);
    } catch (error) {
      console.error('Error preparing sales order for printing:', error);
      Swal.fire({ icon: 'error', title: 'تعذر تجهيز الطلبية للطباعة', text: 'يرجى المحاولة مرة أخرى.' });
    }
  };

  const triggerSharePDF = async () => {
    const printEl = document.querySelector('.sales-print-layout');
    if (!printEl) {
      Swal.fire({
        icon: 'error',
        title: 'خطأ',
        text: 'تعذر العثور على محتوى الطباعة لتوليد الـ PDF.'
      });
      return;
    }

    Swal.fire({
      title: 'جاري تجهيز ملف PDF...',
      html: 'يرجى الانتظار لحين إنشاء ملف PDF ومشاركته.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const portal = document.getElementById('print-portal');
      const originalDisplay = portal.style.display;
      const originalPosition = portal.style.position;
      const originalTop = portal.style.top;
      const originalLeft = portal.style.left;
      const originalZIndex = portal.style.zIndex;
      const originalWidth = portal.style.width;

      portal.style.display = 'block';
      portal.style.position = 'absolute';
      portal.style.top = '0';
      portal.style.right = '0';
      portal.style.left = 'auto';
      portal.style.width = '800px'; // Force wide desktop layout
      portal.style.zIndex = '-9999';
      portal.style.direction = 'rtl';

      // Force the actual print element to be 800px as well to prevent mobile CSS conflicts
      const originalPrintElWidth = printEl.style.width;
      const originalPrintElMinWidth = printEl.style.minWidth;
      printEl.style.width = '800px';
      printEl.style.minWidth = '800px';

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `طلب_${selectedOrder.orderNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800, width: 800 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Pass the live DOM node directly to html2pdf
      const pdfBlob = await html2pdf().set(opt).from(printEl).output('blob');

      // Restore original element styles
      printEl.style.width = originalPrintElWidth;
      printEl.style.minWidth = originalPrintElMinWidth;

      // Restore original portal styles
      portal.style.display = originalDisplay;
      portal.style.position = originalPosition;
      portal.style.top = originalTop;
      portal.style.left = originalLeft;
      portal.style.width = originalWidth;
      portal.style.zIndex = originalZIndex;

      Swal.close();

      const fileName = `طلب_${selectedOrder.orderNumber}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `طلب رقم #${selectedOrder.orderNumber}`,
          text: `مرفق تفاصيل طلبية رقم #${selectedOrder.orderNumber}`
        });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = fileName;
        link.click();

        Swal.fire({
          icon: 'success',
          title: 'تم تحميل ملف PDF',
          text: 'تم تحميل ملف الـ PDF بنجاح لعدم دعم متصفحك لميزة المشاركة التلقائية.'
        });
      }
    } catch (error) {
      // Don't show error dialog if user simply canceled sharing (AbortError)
      if (error.name !== 'AbortError') {
        console.error('Error generating PDF or sharing:', error);
        Swal.fire({
          icon: 'error',
          title: 'فشلت المشاركة',
          text: 'حدث خطأ أثناء محاولة إنشاء ملف PDF أو مشاركته.'
        });
      } else {
        Swal.close();
      }
    }
  };

  const sortedOrders = React.useMemo(() => [...orders].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';

    if (sortConfig.key === 'orderNumber') {
      const numA = parseInt(String(aVal).replace(/\D/g, ''), 10);
      const numB = parseInt(String(bVal).replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const strA = String(aVal);
    const strB = String(bVal);

    return sortConfig.direction === 'asc'
      ? strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' })
      : strB.localeCompare(strA, undefined, { numeric: true, sensitivity: 'base' });
  }), [orders, sortConfig]);

  const filteredOrders = React.useMemo(() => sortedOrders.filter(o => {
    // Exclude Preparation and Production orders that might have been mistakenly saved in sales_orders
    const orderNumStr = String(o.orderNumber || '').toUpperCase();
    if (orderNumStr.startsWith('PREP-') || orderNumStr.startsWith('PRO-')) {
      return false;
    }

    const matchOrderNum = filterOrderNumber ? (o.orderNumber || '').toString().includes(filterOrderNumber) : true;
    const matchSearch = matchesSearch(
      [o.orderNumber, o.customerName, o.customerNumber, o.phone, o.items, o.productName],
      debouncedSearchTerm
    );
    const matchDateFrom = dateFrom ? o.orderDate >= dateFrom : true;
    const matchDateTo = dateTo ? o.orderDate <= dateTo : true;
    const matchCust = selectedCustomer ? o.customerId === selectedCustomer : true;
    const matchStatus = selectedStatus === 'معلق'
      ? !['منتهي', 'ملغي', 'ملغى'].includes(o.status)
      : (selectedStatus ? o.status === selectedStatus : true);
    const matchCreatedBy = filterCreatedBy ? (o.createdBy || '').includes(filterCreatedBy) : true;
    return matchOrderNum && matchSearch && matchDateFrom && matchDateTo && matchCust && matchStatus && matchCreatedBy;
  }), [sortedOrders, filterOrderNumber, debouncedSearchTerm, dateFrom, dateTo, selectedCustomer, selectedStatus, filterCreatedBy]);

  const getUniqueCreators = () => {
    const creators = orders.map(o => o.createdBy).filter(Boolean);
    return [...new Set(creators)];
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'منتهي': return 'badge-success';
      case 'تم التوصيل': return 'badge-success';
      case 'التحضير': return 'badge-info';
      case 'قيد التوصيل': return 'badge-delivery';
      case 'تم تسليمها للتوصيل': return 'badge-delivery';
      case 'تم تأجيل التوصيل': return 'badge-warning';
      case 'لم يتم التنفيذ': return 'badge-danger';
      case 'ملغي': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'منتهي':
      case 'تم التوصيل':
        return { bg: '#e8f5e9', text: '#2e7d32' };
      case 'التحضير':
        return { bg: '#e0f2f1', text: '#00796b' };
      case 'قيد التوصيل':
      case 'تم تسليمها للتوصيل':
        return { bg: '#e3f2fd', text: '#1e3a8a' };
      case 'تم تأجيل التوصيل':
        return { bg: '#fffbeb', text: '#92400e' };
      case 'لم يتم التنفيذ':
      case 'ملغي':
        return { bg: '#ffebee', text: '#c62828' };
      default:
        return { bg: '#e0f2f1', text: '#00796b' };
    }
  };

  return (
    <>
      {stockAuditRequest && <AdminStock key={`${stockAuditRequest.order.id}-${stockAuditRequest.order.isProduction ? 'material' : 'sales'}`} user={user} auditRequest={stockAuditRequest} onAuditClose={closeStockAudit} />}
      {selectedOrder && createPortal(
        <div className="sales-print-layout" style={{ direction: 'rtl', padding: '1.5cm', fontFamily: 'Tajawal, sans-serif', background: 'white', color: '#333' }}>
          <style dangerouslySetInnerHTML={{
            __html: `
            .sales-print-layout table {
              display: table !important;
              width: 100% !important;
            }
            .sales-print-layout thead {
              display: table-header-group !important;
            }
            .sales-print-layout tbody {
              display: table-row-group !important;
            }
            .sales-print-layout tr {
              display: table-row !important;
            }
            .sales-print-layout th, .sales-print-layout td {
              display: table-cell !important;
            }
            .sales-print-layout .signatures-container {
              display: table !important;
              width: 100% !important;
            }
          `}} />
          {/* Header */}
          <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img src={globalSettings.logoUrl} alt={globalSettings.siteName} style={{ height: '75px', objectFit: 'contain' }} />
              <div>
                <h1 style={{ margin: 0, fontSize: '1.7rem', color: '#0f172a' }}>{globalSettings.siteName}</h1>
                <p style={{ margin: '4px 0 0', fontSize: '1.1rem', color: '#64748b' }}>تقرير طلبية تفصيلي</p>
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', letterSpacing: '1px' }}>{selectedOrder.orderNumber}</div>
              <div style={{ fontSize: '1.2rem', color: '#64748b', marginTop: '4px', fontWeight: 'bold' }}>تاريخ الطلب: {selectedOrder.orderDate}</div>
              {(() => {
                const linkedDb = (productionOrders || []).find(po =>
                  (po.salesOrderId && po.salesOrderId === selectedOrder.id) ||
                  (po.salesOrderNumber && po.salesOrderNumber === selectedOrder.orderNumber) ||
                  (po.orderNotes && po.orderNotes.includes(selectedOrder.orderNumber))
                );
                const prodNumber = linkedDb ? linkedDb.orderNumber : selectedOrder.productionOrderNumber;

                const linkedPrepDb = (preparationOrders || []).find(po =>
                  (po.salesOrderId && po.salesOrderId === selectedOrder.id) ||
                  (po.salesOrderNumber && po.salesOrderNumber === selectedOrder.orderNumber) ||
                  (po.orderNotes && po.orderNotes.includes(selectedOrder.orderNumber))
                );
                const prepNumber = linkedPrepDb ? linkedPrepDb.orderNumber : selectedOrder.preparationOrderNumber;

                const tags = [];
                if (prodNumber) {
                  tags.push(
                    <div key="prod" style={{ marginTop: '8px', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '1rem', fontWeight: 'bold', display: 'inline-block', marginLeft: '8px' }}>
                      مرتبطة بكرت إنتاج: <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: '950' }}>{prodNumber}</span>
                    </div>
                  );
                }
                if (prepNumber) {
                  tags.push(
                    <div key="prep" style={{ marginTop: '8px', padding: '6px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '1rem', fontWeight: 'bold', display: 'inline-block', marginLeft: '8px' }}>
                      مرتبطة بكرت تحضير: <span style={{ direction: 'ltr', display: 'inline-block', fontWeight: '950' }}>{prepNumber}</span>
                    </div>
                  );
                }
                return tags.length > 0 ? <div>{tags}</div> : null;
              })()}
            </div>
          </div>

          {/* Order Details Grid Table */}
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '1.5rem 0', margin: '0 -1.5rem 2rem -1.5rem', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                {/* معلومات العميل والطلب */}
                <td style={{ width: '50%', verticalAlign: 'top', padding: 0 }}>
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%' }}>
                    <h3 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', fontWeight: 'bold' }}>معلومات العميل والطلب</h3>
                    <table style={{ width: '100%', fontSize: '1.1rem', lineHeight: '1.8' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#64748b', width: '130px', fontWeight: 'bold' }}>اسم العميل:</td>
                          <td style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1.2rem' }}>{selectedOrder.customerName}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', fontWeight: 'bold' }}>حالة الطلبية:</td>
                          <td><span style={{ background: '#e2e8f0', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold', color: '#334155' }}>{selectedOrder.status || '---'}</span></td>
                        </tr>
                        {selectedOrder.deliveryDate && (
                          <tr>
                            <td style={{ color: '#64748b', fontWeight: 'bold' }}>تاريخ التسليم:</td>
                            <td>
                              <span style={{ fontWeight: '900', color: '#dc2626', fontSize: '1.4rem', borderBottom: '2px solid #fca5a5', paddingBottom: '2px' }}>
                                {selectedOrder.deliveryDate}
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </td>
                {/* معلومات إدارية */}
                <td style={{ width: '50%', verticalAlign: 'top', padding: 0 }}>
                  <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%' }}>
                    <h3 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', color: '#0f172a', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', fontWeight: 'bold' }}>معلومات إدارية</h3>
                    <table style={{ width: '100%', fontSize: '1.1rem', lineHeight: '1.8' }}>
                      <tbody>
                        <tr>
                          <td style={{ color: '#64748b', width: '140px', fontWeight: 'bold' }}>أُنشئت بواسطة:</td>
                          <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedOrder.createdBy || '---'}</td>
                        </tr>
                        <tr>
                          <td style={{ color: '#64748b', fontWeight: 'bold' }}>آخر إجراء بواسطة:</td>
                          <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedOrder.lastActionBy || '---'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {selectedOrder.orderNotes && (
            <div style={{ background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #93c5fd', borderRight: '4px solid #3b82f6', marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: 'bold' }}>ملاحظات عامة على الطلبية:</h4>
              <p style={{ margin: 0, color: '#334155', lineHeight: '1.6', fontSize: '1.1rem', fontWeight: '500' }}>{selectedOrder.orderNotes}</p>
            </div>
          )}

          {/* Items Table */}
          <h3 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontWeight: 'bold' }}>تفاصيل الأصناف المطلوبة</h3>
          <table className="print-items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '40px', color: '#334155', fontSize: '1.1rem' }}>#</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem' }}>اسم الصنف</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '110px', color: '#334155', fontSize: '1.1rem' }}>الكمية المطلوبة</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '125px', color: '#334155', fontSize: '1.1rem' }}>المتوفر بالمخزون</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', width: '140px', color: '#334155', fontSize: '1.1rem' }}>حالة الصنف</th>
                <th style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem' }}>ملاحظات إضافية</th>
              </tr>
            </thead>
            <tbody>
              {(selectedOrder.items || []).map((item, idx) => {
                const availableQty = getProductStockQuantity(item.productName);
                const breakdown = getProductStockBreakdown(item.productName);
                return (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#64748b', fontSize: '1.1rem' }}>{idx + 1}</td>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 'bold', color: '#0f172a', fontSize: '1.2rem' }}>{item.productName}</td>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: '900', color: '#0f172a', fontSize: '1.3rem' }}>{item.quantity}</td>
                    <td style={{
                      padding: '12px',
                      border: '1px solid #cbd5e1',
                      textAlign: 'right',
                      verticalAlign: 'middle'
                    }}>
                      {breakdown.length === 0 ? (
                        <div style={{ display: 'inline-block', textAlign: 'right', fontWeight: '900', fontSize: '1.15rem', color: '#dc2626', backgroundColor: '#fee2e2', padding: '6px 16px', borderRadius: '8px', border: '1px solid #fca5a5' }}>غير متوفر</div>
                      ) : (
                        <div style={{ display: 'block', textAlign: 'right', width: '100%' }}>
                          {breakdown.map((b, bIdx) => {
                            const isZero = availableQty === null || availableQty <= 0;
                            const isPartial = availableQty < item.quantity;
                            const bgColor = isZero ? '#fee2e2' : isPartial ? '#fef3c7' : '#dcfce7';
                            const textColor = isZero ? '#dc2626' : isPartial ? '#d97706' : '#10b981';
                            const borderColor = isZero ? '#fca5a5' : isPartial ? '#fcd34d' : '#86efac';

                            return (
                              <div key={bIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', backgroundColor: bgColor, color: textColor, padding: '4px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, boxShadow: '0 1px 2px rgba(0,0,0,0.02)', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', opacity: 0.9 }}>{b.warehouse}:</span>
                                <span style={{ fontWeight: '950', fontSize: '1.15rem' }}>{b.quantity}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0f172a' }}>{item.itemStatus === 'قيد الإنتاج' ? 'إنتاج قيد الخياطة' : item.itemStatus === 'قيد التحضير' ? 'إنتاج قيد التحضير' : (item.itemStatus || '---')}</span>
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #cbd5e1', textAlign: 'right', color: '#334155', fontSize: '1.1rem', fontWeight: '500' }}>{item.notes || '---'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Signatures Table */}
          <table className="signatures-container" style={{ width: '100%', marginTop: '5rem', marginBottom: '2rem', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', textAlign: 'center', border: 'none', padding: 0 }}>
                  <div style={{ display: 'inline-block', borderTop: '2px solid #cbd5e1', width: '220px', paddingTop: '1rem', fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>توقيع مسؤول المخزون</div>
                </td>
                <td style={{ width: '50%', textAlign: 'center', border: 'none', padding: 0 }}>
                  <div style={{ display: 'inline-block', borderTop: '2px solid #cbd5e1', width: '220px', paddingTop: '1rem', fontWeight: 'bold', color: '#334155', fontSize: '1.1rem' }}>توقيع مسؤول الطلبيات</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            تم طباعة هذا المستند من نظام {globalSettings.siteName}
          </div>
        </div>,
        document.getElementById('print-portal')
      )}

      <div className="no-print">
        <div className="flex justify-between items-center" style={{ marginBottom: isMobile ? '12px' : '24px', marginTop: isMobile ? '8px' : '0', flexWrap: 'wrap', gap: '16px' }}>
          <h2 className="text-2xl font-bold flex items-center gap-2 m-0 text-right" style={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
            <ShoppingCart className="text-primary" /> إدارة الطلبات
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            {hasPermission(user, 'stock_production_receipt', 'view') && (
              <button type="button" className="sales-receipt-button" onClick={() => window.dispatchEvent(new CustomEvent('switchAdminTab', { detail: { tab: 'stock', action: 'productionReceipt' } }))}>
                <span className="sales-receipt-button-icon"><Package size={17} strokeWidth={1.8} /></span>
                <span>استلام منتجات</span>
              </button>
            )}
            {(canPerformAction(user, 'ADD', 'SALES', globalSettings)) && (
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-outline flex items-center gap-2"
                  onClick={handleShowDrafts}
                  style={{ height: '38px', borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                  <Archive size={17} /> المسودات {drafts.length > 0 && `(${drafts.length})`}
                </button>
                <button
                  className="btn btn-primary flex items-center gap-2"
                  onClick={() => handleOpenModal()}
                  disabled={loading || ordersLoading}
                  style={{
                    height: '38px',
                    borderRadius: '10px',
                    fontSize: isMobile ? '12px' : '14px',
                    padding: isMobile ? '0 12px' : '0 16px',
                    whiteSpace: 'nowrap',
                    opacity: (loading || ordersLoading) ? 0.6 : 1,
                    cursor: (loading || ordersLoading) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Plus size={18} /> طلبية جديدة
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="glass-panel mb-4 no-print" style={{ padding: '1rem' }}>
          <div className="flex flex-col gap-3 w-full">
            {/* Row 1: Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <Search className="text-slate-400" size={20} />
              <input
                type="text"
                placeholder="بحث سريع (رقم، عميل)..."
                className="input-field flex-1"
                style={{ marginBottom: 0, height: '44px', borderRadius: '12px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Row 2: Status & Filter button */}
            <div className="flex items-center gap-3 w-full">
              <select
                className="input-field flex-1"
                style={{ marginBottom: 0, height: '44px', borderRadius: '12px' }}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">جميع الحالات</option>
                <option value="معلق">معلق</option>
                {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                className="btn btn-primary flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                onClick={() => setShowFilterModal(true)}
                style={{
                  height: '44px',
                  padding: '0 20px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  border: 'none',
                  color: 'white',
                  backgroundColor: 'var(--primary)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                <span>تصفية</span>
                {(filterOrderNumber || dateFrom || dateTo || selectedCustomer || selectedStatus || filterCreatedBy) && (
                  <span className="bg-white text-primary rounded-full px-2 py-0.5 text-[0.7rem] font-bold mr-1">نشط</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {showFilterModal && (
          <div className="modal-overlay no-print" style={{ zIndex: 1000 }}>
            <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h3 className="text-xl font-bold flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-filter text-primary"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg> تصفية مخصصة</h3>
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowFilterModal(false)}><X size={18} /></button>
              </div>

              <div className="space-y-4">
                <div className="input-group">
                  <label>رقم الطلبية</label>
                  <input type="text" className="input-field" value={filterOrderNumber} onChange={(e) => setFilterOrderNumber(e.target.value)} placeholder="بحث برقم الطلبية..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group mb-0">
                    <label>من تاريخ</label>
                    <Flatpickr className="input-field w-full" value={dateFrom} onChange={([d]) => setDateFrom(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true }} placeholder="من تاريخ" />
                  </div>
                  <div className="input-group mb-0">
                    <label>إلى تاريخ</label>
                    <Flatpickr className="input-field w-full" value={dateTo} onChange={([d]) => setDateTo(getLocalDateStr(d))} options={{ dateFormat: 'Y-m-d', disableMobile: true }} placeholder="إلى تاريخ" />
                  </div>
                </div>
                <div className="input-group">
                  <label>العميل</label>
                  <select className="input-field" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                    <option value="">جميع العملاء</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>الحالة</label>
                  <select className="input-field" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                    <option value="">جميع الحالات</option>
                    <option value="معلق">معلق</option>
                    {globalSettings.salesStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>أنشئت بواسطة</label>
                  <select className="input-field" value={filterCreatedBy} onChange={(e) => setFilterCreatedBy(e.target.value)}>
                    <option value="">الجميع</option>
                    {getUniqueCreators().map((creator, i) => (
                      <option key={i} value={creator}>{creator}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-6 pt-4 border-t">
                <button className="btn btn-primary flex-1" onClick={() => setShowFilterModal(false)}>تطبيق</button>
                <button className="btn btn-outline flex-1" onClick={() => {
                  setFilterOrderNumber(''); setDateFrom(''); setDateTo(''); setSelectedCustomer(''); setSelectedStatus('معلق'); setFilterCreatedBy('');
                }}>تفريغ</button>
              </div>
            </div>
          </div>
        )}

        {showModal ? null : (loading || ordersLoading) ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : (
          <>
            {isMobile ? (
              <div className="flex flex-col gap-4 no-print" style={{ padding: '0 8px 120px 8px' }}>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <div
                      key={order.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        marginBottom: '16px'
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', direction: 'rtl', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', maxWidth: '100%', overflow: 'hidden' }}>
                            <span style={{ fontStyle: 'normal', fontWeight: '800', color: '#0284c7', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>{order.orderNumber}</span>
                            <div
                              style={{
                                padding: '0 6px',
                                height: '22px',
                                borderRadius: '6px',
                                backgroundColor: '#0d9488',
                                color: '#ffffff',
                                fontWeight: 'bold',
                                fontSize: '0.65rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(13,148,136,0.15)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                              title="عدد الأصناف"
                            >
                              {getBandsText(order.items ? order.items.length : 0)}
                            </div>
                          </div>
                          {(() => {
                            const elements = [];

                            const linkedDb = (productionOrders || []).find(po =>
                              (po.salesOrderId && po.salesOrderId === order.id) ||
                              (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
                              (po.orderNotes && po.orderNotes.includes(order.orderNumber))
                            );
                            const prodCount = order.items ? order.items.filter(i => ['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف', 'تم الإنتاج'].includes(i.itemStatus)).length : 0;

                            if (linkedDb) {
                              const finalCount = (linkedDb.items && linkedDb.items.length) || prodCount;
                              elements.push(
                                <div key="prod" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                    {linkedDb.orderNumber} 📌
                                  </span>
                                  {finalCount > 0 && (
                                    <div style={{ padding: '0 6px', height: '20px', borderRadius: '6px', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 'bold', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(234,88,12,0.15)', whiteSpace: 'nowrap' }} title="عدد أصناف الإنتاج">
                                      {getBandsText(finalCount)}
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              const notes = order.notes || '';
                              const linkedMatch = notes.match(/PRO-\d+/);
                              if (linkedMatch) {
                                const matchedPo = (productionOrders || []).find(po => po.orderNumber === linkedMatch[0]);
                                const finalCount = (matchedPo && matchedPo.items && matchedPo.items.length) || prodCount;
                                elements.push(
                                  <div key="prod-match" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                      {linkedMatch[0]} 📌
                                    </span>
                                    {finalCount > 0 && (
                                      <div style={{ padding: '0 6px', height: '20px', borderRadius: '6px', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 'bold', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(234,88,12,0.15)', whiteSpace: 'nowrap' }} title="عدد أصناف الإنتاج">
                                        {getBandsText(finalCount)}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }

                            const linkedPrep = (preparationOrders || []).find(po =>
                              (po.salesOrderId && po.salesOrderId === order.id) ||
                              (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
                              (po.orderNotes && po.orderNotes.includes(order.orderNumber))
                            );
                            const prepCount = order.items ? order.items.filter(i => i.itemStatus === 'قيد التحضير').length : 0;

                            if (linkedPrep) {
                              const finalCount = (linkedPrep.items && linkedPrep.items.length) || prepCount;
                              elements.push(
                                <div key="prep" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                    {linkedPrep.orderNumber} 📌
                                  </span>
                                  {finalCount > 0 && (
                                    <div style={{ padding: '0 6px', height: '20px', borderRadius: '6px', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 'bold', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(234,88,12,0.15)', whiteSpace: 'nowrap' }} title="عدد أصناف التحضير">
                                      {getBandsText(finalCount)}
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              const notes = order.notes || '';
                              const prepMatch = notes.match(/PREP-\d+/);
                              if (prepMatch) {
                                const matchedPo = (preparationOrders || []).find(po => po.orderNumber === prepMatch[0]);
                                const finalCount = (matchedPo && matchedPo.items && matchedPo.items.length) || prepCount;
                                elements.push(
                                  <div key="prep-match" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#fef2f2', padding: '2px 6px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                      {prepMatch[0]} 📌
                                    </span>
                                    {finalCount > 0 && (
                                      <div style={{ padding: '0 6px', height: '20px', borderRadius: '6px', backgroundColor: '#ea580c', color: '#ffffff', fontWeight: 'bold', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(234,88,12,0.15)', whiteSpace: 'nowrap' }} title="عدد أصناف التحضير">
                                        {getBandsText(finalCount)}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }

                            return elements.length > 0 ? elements : null;
                          })()}
                        </div>

                        {/* Status Select with Checkmark Icon */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <select
                            disabled={!isAdmin(user) && !isImad && isOrderTotallyFrozen(order)}
                            title={!isAdmin(user) && !isImad && isOrderTotallyFrozen(order) ? (order.stockDeducted ? 'لا يمكن تعديل الطلبية لأنه تم تدقيقها وخصمها من المخزون' : (isOrderFrozenByProductionOrPreparation(order) ? 'لا يمكن التعديل لأن الطلبية قيد التنفيذ في قسم الإنتاج أو التحضير' : 'لا يمكن تعديل حالة الطلبية لأن موظف التوصيل قد استلمها')) : ''}
                            style={{
                              textAlign: 'center',
                              textAlignLast: 'center',
                              height: '34px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              width: 'auto',
                              minWidth: '145px',
                              maxWidth: '175px',
                              backgroundColor: getStatusBadgeStyle(order.status).bg,
                              color: getStatusBadgeStyle(order.status).text,
                              border: 'none',
                              borderRadius: '20px',
                              appearance: 'none',
                              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(getStatusBadgeStyle(order.status).text)}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'left 12px center',
                              backgroundSize: '12px',
                              paddingLeft: '28px',
                              paddingRight: '32px',
                              cursor: isOrderTotallyFrozen(order) ? 'not-allowed' : 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              margin: 0,
                              direction: 'rtl'
                            }}
                            value={order.status || 'جديد'}
                            onChange={(e) => handleUpdateStatus(order, e.target.value)}
                          >
                            {(globalSettings.salesStatuses || []).map((status) => (
                              <option key={status} value={status} className="bg-white text-slate-800 font-normal">
                                {status}
                              </option>
                            ))}
                          </select>
                          {/* Checkmark circle icon */}
                          <div
                            style={{
                              position: 'absolute',
                              right: '8px',
                              pointerEvents: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: getStatusBadgeStyle(order.status).text,
                              color: '#ffffff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Check size={10} strokeWidth={4} />
                          </div>
                        </div>
                      </div>

                      {/* Card Details Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                          direction: 'rtl',
                          marginTop: '4px'
                        }}
                      >
                        {/* Item 1: العميل (Spans 2 columns) */}
                        <div
                          style={{
                            gridColumn: 'span 2',
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            direction: 'rtl',
                            borderLeft: '3px solid #22c55e',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', minWidth: 0, flex: 1 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>العميل</span>
                            <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', width: '100%' }} className="truncate">{order.customerName}</span>
                          </div>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#f0fdf4',
                              color: '#22c55e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '8px',
                              flexShrink: 0
                            }}
                          >
                            <User size={16} />
                          </div>
                        </div>

                        {/* Item 2: تاريخ الطلب */}
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            direction: 'rtl',
                            borderLeft: '3px solid #3b82f6',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', minWidth: 0, flex: 1 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>تاريخ الطلب</span>
                            <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', width: '100%' }} className="truncate">{order.orderDate || '---'}</span>
                          </div>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#eff6ff',
                              color: '#3b82f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '8px',
                              flexShrink: 0
                            }}
                          >
                            <Calendar size={16} />
                          </div>
                        </div>

                        {/* Item 3: تاريخ التسليم */}
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            direction: 'rtl',
                            borderLeft: '3px solid #ec4899',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', minWidth: 0, flex: 1 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>تاريخ التسليم</span>
                            <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', width: '100%' }} className="truncate">{order.deliveryDate || '---'}</span>
                          </div>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#fdf2f8',
                              color: '#ec4899',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '8px',
                              flexShrink: 0
                            }}
                          >
                            <Calendar size={16} />
                          </div>
                        </div>

                        {/* Item 4: آخر إجراء */}
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            direction: 'rtl',
                            borderLeft: '3px solid #f59e0b',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', minWidth: 0, flex: 1 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>آخر إجراء</span>
                            <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', width: '100%' }} className="truncate" title={order.lastActionBy || '---'}>{getShortName(order.lastActionBy)}</span>
                          </div>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#fffbeb',
                              color: '#f59e0b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '8px',
                              flexShrink: 0
                            }}
                          >
                            <Clock size={16} />
                          </div>
                        </div>

                        {/* Item 5: أنشئت بواسطة */}
                        <div
                          style={{
                            backgroundColor: '#f8fafc',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            direction: 'rtl',
                            borderLeft: '3px solid #a855f7',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'right', minWidth: 0, flex: 1 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>أنشئت بواسطة</span>
                            <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', width: '100%' }} className="truncate" title={order.createdBy || '---'}>{getShortName(order.createdBy)}</span>
                          </div>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#faf5ff',
                              color: '#a855f7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: '8px',
                              flexShrink: 0
                            }}
                          >
                            <Briefcase size={16} />
                          </div>
                        </div>

                        {/* Item 6: طريقة التسليم / السائق */}
                        <div
                          style={{
                            gridColumn: 'span 2',
                            backgroundColor: '#f0fdfa',
                            borderRadius: '12px',
                            padding: '10px 12px',
                            borderLeft: '3px solid #0d9488',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            direction: 'rtl'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Truck size={16} className="text-teal-600" />
                              <span style={{ color: '#0f766e', fontSize: '0.8rem', fontWeight: 'bold' }}>طريقة التسليم / السائق</span>
                            </div>
                            {(() => {
                              const linkedMission = getOrderMission(order.orderNumber);
                              const assignedId = getDeliverySelection(order);
                              const hasAssignedDelivery = Boolean(
                                (order.deliveryMethod === 'pickup' || order.deliveryMethod === 'courier' || assignedId) &&
                                order.deliveryMethod !== 'unassigned' &&
                                order.deliveryMethod !== ''
                              );
                              const deliveryStatus = hasAssignedDelivery ? (linkedMission?.status || order.deliveryStatus) : null;
                              if (!deliveryStatus) return null;
                              const badge = getDeliveryStatusBadge(deliveryStatus);
                              return (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    backgroundColor: badge.bg,
                                    color: badge.text,
                                    border: `1px solid ${badge.border}`
                                  }}
                                >
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              className="input-field cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              style={{ padding: '0 0.5rem', width: '100%', height: '36px', fontSize: '13px', borderRadius: '8px', marginBottom: 0, border: '1px solid var(--primary-light, #bfdbfe)', fontWeight: 'bold', backgroundColor: '#ffffff', color: '#1e293b' }}
                              value={getDeliverySelection(order)}
                              onChange={(e) => handleAssignDriver(order, e.target.value)}
                              disabled={!canAssignDelivery || order.status === 'منتهي' || (isImad && !allDeliveryItemsReady(order))}
                              title={order.status === 'منتهي' ? 'الطلبية منتهية ومغلقة' : (isImad && !allDeliveryItemsReady(order)) ? 'أخي عماد: لا يمكن تحديد سائق أو طريقة تسليم حتى تصبح جميع أصناف وبنود الطلبية بحالة (جاهز)' : 'اختر السائق لإسناد مهمة التوصيل فوراً'}
                            >
                              <option value="">بدون سائق</option>
                              <option value="__pickup" disabled={isImad && !allDeliveryItemsReady(order)}>استلام من الشركة (الزبون)</option>
                              <option value="__courier" disabled={isImad && !allDeliveryItemsReady(order)}>شركة توصيل</option>
                              {deliveryStaffList.map(emp => (
                                <option key={emp.id} value={emp.id} disabled={isImad && !allDeliveryItemsReady(order)}>
                                  {getFirstAndLastName(emp.name)}
                                </option>
                              ))}
                            </select>
                            {renderExternalDeliveryCompletion(order)}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                            <div><strong>خصم المخزون</strong>{renderStockStep(order)}</div>
                            <div><strong>صرف الإنتاج</strong>{renderStockStep(order, true)}</div>
                          </div>
                          <div style={{ marginTop: 10 }}><strong>الموافقة النهائية</strong>{renderFinalApproval(order)}</div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '12px',
                          marginTop: '8px',
                          width: '100%',
                          direction: 'rtl'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%' }}>
                          {/* Button 1: معاينة */}
                          <button
                            onClick={() => handleOpenPreview(order)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              borderRadius: '12px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#f8fafc',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              color: '#475569',
                              flex: 1
                            }}
                          >
                            <Eye size={15} className="text-slate-500" />
                            <span>معاينة</span>
                          </button>

                          {/* Button 2: تعديل */}
                          {(canPerformAction(user, 'EDIT', 'SALES', globalSettings)) && !isOrderTotallyFrozen(order) && (
                            <button
                              onClick={() => handleOpenModal(order)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                border: '1px solid #bfdbfe',
                                backgroundColor: '#eff6ff',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: '#1d4ed8',
                                flex: 1
                              }}
                            >
                              <Edit2 size={15} className="text-blue-500" />
                              <span>تحديث</span>
                            </button>
                          )}

                          {/* Button 3: حذف */}
                          {canPerformAction(user, 'DELETE', 'SALES', globalSettings) && !isOrderTotallyFrozen(order) && (
                            <button
                              onClick={() => handleDelete(order.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                border: '1px solid #fca5a5',
                                backgroundColor: '#fef2f2',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: '#dc2626',
                                flex: 1
                              }}
                            >
                              <Trash2 size={15} className="text-red-500" />
                              <span>حذف</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-primary shadow-sm border border-slate-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><circle cx="12" cy="13" r="3" /><path d="m14.5 15.5 2.5 2.5" /></svg>
                      </div>
                      <p className="font-bold text-slate-700 text-lg">لا توجد طلبات حالياً</p>
                      <p className="text-sm text-slate-500">قم بإنشاء طلبية جديدة أو تعديل الفلاتر لعرض الطلبات</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="table-container glass-panel sales-table-wrapper">
                <table className="sales-orders-table">
                  <thead>
                    <tr>
                      <th className="th-order-num text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('orderNumber')}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span>رقم الطلب</span>
                          {getSortIcon('orderNumber')}
                        </div>
                      </th>
                      <th className="th-customer text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('customerName')}>
                        <div className="flex items-center justify-start gap-1.5">
                          <span>العميل</span>
                          {getSortIcon('customerName')}
                        </div>
                      </th>
                      <th className="th-details text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('orderDate')}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span>تفاصيل الطلب</span>
                          {getSortIcon('orderDate')}
                        </div>
                      </th>
                      <th className="th-delivery text-center">
                        <span>طريقة التسليم / السائق</span>
                      </th>
                      <th className="th-stock-audit text-center">
                        <span>خصم المخزون</span>
                      </th>
                      <th className="th-material-release text-center">
                        <span>صرف الإنتاج</span>
                      </th>
                      <th className="th-approval text-center">
                        <span>موافقة</span>
                      </th>
                      <th className="th-status text-center cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                        <div className="flex items-center justify-center gap-1.5">
                          <span>تغيير الحالة</span>
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th className="th-actions text-center">
                        <span>إجراءات</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-12 text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-primary shadow-sm border border-slate-100">
                              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><circle cx="12" cy="13" r="3" /><path d="m14.5 15.5 2.5 2.5" /></svg>
                            </div>
                            <p className="font-bold text-slate-700 text-lg">لا توجد طلبات حالياً</p>
                            <p className="text-sm text-slate-500">قم بإنشاء طلبية جديدة أو تعديل الفلاتر لعرض الطلبات</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(order => (
                        <tr key={order.id}>
                          <td data-label="رقم الطلب" className="td-order-num text-center">
                            <div className="sales-order-num-badge">{order.orderNumber}</div>
                            {(() => {
                              const elements = [];

                              const linkedProd = (productionOrders || []).find(po =>
                                (po.salesOrderId && po.salesOrderId === order.id) ||
                                (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
                                (po.orderNotes && po.orderNotes.includes(order.orderNumber))
                              );
                              if (linkedProd) {
                                elements.push(
                                  <div key={`pro-${linkedProd.id || 'match'}`} className="sales-linked-tag">
                                    <Layers size={11} />
                                    <span>{linkedProd.orderNumber}</span>
                                  </div>
                                );
                              } else {
                                const notes = order.notes || order.orderNotes || '';
                                const prodMatch = notes.match(/PRO-\d+/);
                                if (prodMatch) {
                                  elements.push(
                                    <div key="pro-match" className="sales-linked-tag">
                                      <Layers size={11} />
                                      <span>{prodMatch[0]}</span>
                                    </div>
                                  );
                                }
                              }

                              const linkedPrep = (preparationOrders || []).find(po =>
                                (po.salesOrderId && po.salesOrderId === order.id) ||
                                (po.salesOrderNumber && po.salesOrderNumber === order.orderNumber) ||
                                (po.orderNotes && po.orderNotes.includes(order.orderNumber))
                              );
                              if (linkedPrep) {
                                elements.push(
                                  <div key={`prep-${linkedPrep.id || 'match'}`} className="sales-linked-tag">
                                    <Layers size={11} />
                                    <span>{linkedPrep.orderNumber}</span>
                                  </div>
                                );
                              } else {
                                const notes = order.notes || order.orderNotes || '';
                                const prepMatch = notes.match(/PREP-\d+/);
                                if (prepMatch) {
                                  elements.push(
                                    <div key="prep-match" className="sales-linked-tag">
                                      <Layers size={11} />
                                      <span>{prepMatch[0]}</span>
                                    </div>
                                  );
                                }
                              }

                              return elements.length > 0 ? (
                                <div className="sales-linked-tags-wrapper">
                                  {elements}
                                </div>
                              ) : null;
                            })()}
                          </td>
                          <td data-label="العميل" className="td-customer text-right">
                            <div className="sales-customer-name" title={order.customerName}>
                              {order.customerName}
                            </div>
                          </td>
                          <td data-label="تفاصيل الطلب" className="td-details text-center">
                            <div className="sales-order-metadata-card">
                              <div className="metadata-date" dir="ltr">
                                <Calendar size={11} />
                                <span>{order.orderDate}</span>
                              </div>
                              <div className="metadata-row" title={order.createdBy || '---'}>
                                <span className="metadata-lbl">أنشأها:</span>
                                <span className="metadata-val">{getShortName(order.createdBy)}</span>
                              </div>
                              <div className="metadata-row" title={order.lastActionBy || '---'}>
                                <span className="metadata-lbl">آخر إجراء:</span>
                                <span className="metadata-val">{getShortName(order.lastActionBy)}</span>
                              </div>
                            </div>
                          </td>
                          <td data-label="طريقة التسليم / السائق" className="td-delivery text-center">
                            {(() => {
                              const linkedMission = getOrderMission(order.orderNumber);
                              const assignedId = getDeliverySelection(order);
                              const hasAssignedDelivery = Boolean(
                                (order.deliveryMethod === 'pickup' || order.deliveryMethod === 'courier' || assignedId) &&
                                order.deliveryMethod !== 'unassigned' &&
                                order.deliveryMethod !== ''
                              );
                              const deliveryStatus = hasAssignedDelivery ? (linkedMission?.status || order.deliveryStatus) : null;
                              const badge = deliveryStatus ? getDeliveryStatusBadge(deliveryStatus) : null;
                              const allItemsReady = Boolean(order.items && order.items.length > 0 && order.items.every(item => item.itemStatus === 'جاهز'));

                              return (
                                <div className="sales-delivery-cell">
                                  <div className="delivery-select-row">
                                    <select
                                      className="sales-ctrl-select driver-select cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                      value={assignedId}
                                      onChange={(e) => handleAssignDriver(order, e.target.value)}
                                      disabled={!canAssignDelivery || order.status === 'منتهي' || (isImad && !allDeliveryItemsReady(order))}
                                      title={order.status === 'منتهي' ? 'الطلبية منتهية ومغلقة' : (isImad && !allDeliveryItemsReady(order)) ? 'أخي عماد: لا يمكن تحديد سائق أو طريقة تسليم حتى تصبح جميع أصناف وبنود الطلبية بحالة (جاهز)' : 'اختر السائق لإسناد مهمة التوصيل فوراً'}
                                    >
                                      <option value="">بدون سائق</option>
                                      <option value="__pickup" disabled={isImad && !allDeliveryItemsReady(order)}>استلام من الشركة (الزبون)</option>
                                      <option value="__courier" disabled={isImad && !allDeliveryItemsReady(order)}>شركة توصيل</option>
                                      {deliveryStaffList.map(emp => (
                                        <option key={emp.id} value={emp.id} disabled={isImad && !allDeliveryItemsReady(order)}>
                                          {getFirstAndLastName(emp.name)}
                                        </option>
                                      ))}
                                    </select>
                                    {renderExternalDeliveryCompletion(order)}
                                  </div>

                                  {badge ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '2px' }}>
                                      <span
                                        className="sales-delivery-badge"
                                        style={{
                                          backgroundColor: badge.bg,
                                          color: badge.text,
                                          borderColor: badge.border
                                        }}
                                      >
                                        <span className="badge-dot" style={{ backgroundColor: badge.dot || badge.text }} />
                                        <Truck size={12} style={{ flexShrink: 0, opacity: 0.9 }} />
                                        <span>{badge.label}</span>
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </td>
                          <td data-label="خصم المخزون" className="td-stock-audit">{renderStockStep(order)}</td>
                          <td data-label="صرف الإنتاج" className="td-material-release">{renderStockStep(order, true)}</td>
                          <td data-label="موافقة" className="td-approval text-center">{renderFinalApproval(order)}</td>
                          <td data-label="تغيير الحالة" className="td-status text-center">
                            {(() => {
                              const colors = getSalesStatusColor(order.status || 'جديد');
                              return (
                                <div className="sales-workflow-cell">
                                  <select
                                    className="sales-ctrl-select status-select cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                                    style={{
                                      backgroundColor: colors.bg,
                                      color: colors.text,
                                      borderColor: colors.border
                                    }}
                                    value={order.status || 'جديد'}
                                    onChange={(e) => handleUpdateStatus(order, e.target.value)}
                                    disabled={!isAdmin(user) && !isImad && isOrderTotallyFrozen(order)}
                                    title={!isAdmin(user) && !isImad && isOrderTotallyFrozen(order) ? (order.stockDeducted ? 'لا يمكن تعديل الطلبية لأنه تم تدقيقها وخصمها من المخزون' : (isOrderFrozenByProductionOrPreparation(order) ? 'لا يمكن التعديل لأن الطلبية قيد التنفيذ في قسم الإنتاج أو التحضير' : 'لا يمكن تعديل حالة الطلبية لأن موظف التوصيل قد استلمها')) : ''}
                                  >
                                    {globalSettings.salesStatuses.map(s => (
                                      <option key={s} value={s} className="bg-white text-slate-800 font-normal">
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })()}
                          </td>
                          <td data-label="إجراءات" className="td-actions text-center">
                            <div className="sales-actions-cluster">
                              <button className="sales-action-icon-btn btn-preview" title="معاينة" onClick={() => handleOpenPreview(order)}>
                                <Eye size={15} />
                              </button>
                              <button type="button" className="sales-action-icon-btn btn-print" title="طباعة / تصدير PDF" aria-label={`طباعة الطلبية ${order.orderNumber}`} onClick={() => handlePrintOrder(order)}>
                                <Printer size={15} />
                              </button>
                              <button className="sales-action-icon-btn btn-copy" title="نسخ الطلب كمسودة جديدة" onClick={() => handleCopyOrder(order)}>
                                <Copy size={15} />
                              </button>
                              {(canPerformAction(user, 'EDIT', 'SALES', globalSettings)) && !isOrderTotallyFrozen(order) && (
                                <button className="sales-action-icon-btn btn-edit" title="تعديل" onClick={() => handleOpenModal(order)}>
                                  <Edit2 size={15} />
                                </button>
                              )}
                              {canPerformAction(user, 'DELETE', 'SALES', globalSettings) && !isOrderTotallyFrozen(order) && (
                                <button className="sales-action-icon-btn btn-delete" title="حذف" onClick={() => handleDelete(order.id)}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load More / Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mt-4 bg-white/90 backdrop-blur rounded-2xl border border-slate-200/80 shadow-sm no-print">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {orderLimit ? (
                    `يتم حالياً عرض أحدث ${orders.length} طلبية (لتقليل استهلاك الحصة وتسريع النظام)`
                  ) : (
                    `يتم عرض كامل أرشيف الطلبيات (${orders.length} طلبية)`
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {orderLimit ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline text-xs flex items-center gap-1.5"
                      onClick={() => setOrderLimit(prev => (prev || 50) + 50)}
                      title="جلب 50 طلبية أقدم إضافية"
                    >
                      <Plus size={14} /> تحميل 50 طلبية أقدم
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline text-xs flex items-center gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => setOrderLimit(null)}
                      title="تحميل كافة الطلبيات السابقة من الأرشيف"
                    >
                      تحميل كامل الأرشيف
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline text-xs flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => setOrderLimit(50)}
                    title="إعادة التقييد بأحدث 50 طلبية لتوفير الحصة"
                  >
                    عرض أحدث 50 طلبية فقط
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content wide animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b pb-2 sales-modal-header">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText size={20} className="text-primary" />
                  {editingOrder ? (
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                      <span>تعديل طلبية {editingOrder.orderNumber}</span>
                      {linkedProductionOrder ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-sm">
                          كرت الإنتاج: {linkedProductionOrder.orderNumber} ({linkedProductionOrder.status})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          لا يوجد كرت إنتاج مرتبط
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>إنشاء طلبية جديدة</span>
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">مسودة</span>
                    </div>
                  )}
                </h3>
                <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-200 mb-6 sales-info-card">
                  <div className="grid order-dates-grid gap-3 md:gap-5">
                    {/* الصف الأول: رقم الطلب والتاريخين */}
                    <div className="col-span-1 md:col-span-4 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-1 text-xs md:text-sm">
                        <ShoppingCart size={14} className="text-primary" /> رقم الطلب المتوقع (لا يُعتمد إلا بعد الحفظ)
                      </label>
                      <input type="text" className="input-field bg-slate-100 font-bold text-primary text-xs md:text-sm px-3 text-center" style={{ height: '42px', textAlign: 'center' }} value={formData.orderNumber || ''} readOnly disabled />
                    </div>

                    <div className="col-span-1 md:col-span-4 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-1 text-xs md:text-sm">
                        <Calendar size={14} className="text-primary" /> تاريخ الطلب
                      </label>
                      <Flatpickr
                        className="input-field text-xs md:text-sm px-3 text-center"
                        style={{ height: '42px', backgroundColor: 'white' }}
                        value={formData.orderDate}
                        onChange={([d]) => {
                          const newOrderDate = getLocalDateStr(d);
                          setFormData(prev => {
                            const updated = { ...prev, orderDate: newOrderDate };
                            if (prev.deliveryDate && prev.deliveryDate < newOrderDate) {
                              updated.deliveryDate = newOrderDate;
                            }
                            return updated;
                          });
                        }}
                        options={{
                          dateFormat: 'Y-m-d',
                          disableMobile: true,
                          minDate: editingOrder ? undefined : getLocalDateStr(new Date(new Date().setDate(new Date().getDate() - 2))),
                          maxDate: editingOrder ? undefined : getLocalDateStr(new Date(new Date().setDate(new Date().getDate() + 2)))
                        }}
                      />
                    </div>

                    <div className="col-span-1 md:col-span-4 input-group mb-0">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-1 text-xs md:text-sm">
                        <Calendar size={14} className="text-orange-500" /> تاريخ التسليم
                      </label>
                      <Flatpickr
                        className="input-field text-xs md:text-sm px-3 text-center"
                        style={{ height: '42px', backgroundColor: 'white' }}
                        value={formData.deliveryDate || ''}
                        onChange={([d]) => setFormData({ ...formData, deliveryDate: getLocalDateStr(d) })}
                        options={{
                          dateFormat: 'Y-m-d',
                          disableMobile: true,
                          minDate: formData.orderDate || getLocalDateStr(new Date())
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-200 mb-6 customer-card">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 mb-1 font-bold text-slate-700 text-xs md:text-sm"><User size={16} className="text-primary" /> العميل</label>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Select
                          options={customers.map(c => ({ value: c.id, label: c.name }))}
                          value={formData.customerId ? { value: formData.customerId, label: formData.customerName } : null}
                          onChange={(selected) => handleCustomerChange({ target: { value: selected ? selected.value : '' } })}
                          placeholder="اختر عميل أو ابحث هنا..."
                          isClearable
                          isSearchable
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderColor: '#e2e8f0',
                              borderRadius: '8px',
                              minHeight: '42px',
                              boxShadow: 'none',
                              '&:hover': {
                                borderColor: 'var(--primary-light)'
                              }
                            }),
                            option: (base, state) => ({
                              ...base,
                              backgroundColor: state.isSelected ? 'var(--primary)' : state.isFocused ? '#f1f5f9' : 'white',
                              color: state.isSelected ? 'white' : '#1e293b',
                              textAlign: 'right'
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999
                            })
                          }}
                        />
                      </div>
                      <div className="flex justify-end w-full md:w-auto">
                        <button type="button" className="btn btn-primary flex items-center justify-center gap-2 shadow-sm transition-all h-[42px] w-full md:w-auto text-sm" onClick={handleAddNewCustomer} style={{ whiteSpace: 'nowrap', height: '42px' }}>
                          <Plus size={16} strokeWidth={2} /> إضافة عميل جديد
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="items-header-container mb-3 pb-2 border-b border-slate-100">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-slate-800"><Package size={20} className="text-primary" /> الأصناف المطلوبـة</h4>
                    <div className="items-header-buttons">
                      {hasPermission(user, 'stock_quick_add', 'add') && (
                        <button type="button" className="btn btn-outline flex items-center justify-center gap-1 border-primary text-primary hover:bg-primary hover:text-white transition-colors" onClick={handleAddNewStockItem}>
                          <Plus size={14} /> صنف للمخزون
                        </button>
                      )}
                      <button type="button" className="btn btn-primary flex items-center justify-center gap-1 shadow-sm" onClick={handleAddItem}>
                        <Plus size={14} /> سطر جديد للطلبية
                      </button>
                      <button type="button" className="btn btn-secondary flex items-center justify-center gap-1 shadow-sm" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }} onClick={() => setShowMultiColorModal(true)}>
                        <Layers size={14} className="text-primary" /> ألوان متعددة
                      </button>
                    </div>
                  </div>

                  <div className="modal-table-container rounded-xl border border-slate-200 overflow-hidden shadow-sm hidden md:block">
                    <table className="modal-table w-full">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th style={{ width: '60px', padding: '12px 10px', textAlign: 'center' }}>الترتيب</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', width: '43%' }}>اسم الصنف</th>
                          <th style={{ width: '65px', padding: '12px 10px', textAlign: 'center' }}>الكمية</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', width: '22%' }}>ملاحظات</th>
                          <th style={{ width: '190px', padding: '12px 10px', textAlign: 'center' }}>حالة الصنف</th>
                          <th style={{ width: '100px', padding: '12px 10px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {formData.items.map((item, index) => (
                          <tr
                            key={index}
                            className={`drag-sort-row ${draggedItemIndex === index ? 'bg-slate-50 opacity-50' : 'hover:bg-slate-50 transition-colors'}`}
                            onDragOver={handleItemDragOver}
                            onDrop={(e) => handleItemDrop(e, index)}
                            onDragEnd={() => setDraggedItemIndex(null)}
                          >
                            <td className="p-2 text-center align-middle">
                              <div className="flex justify-center items-center gap-2">
                                <div className="flex items-center gap-2 px-1">
                                  <button type="button" style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, outline: 'none', boxShadow: 'none' }} className="text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center" title="رفع الصنف" onClick={() => handleMoveItem(index, -1)} disabled={index === 0}>
                                    <ArrowUp size={16} />
                                  </button>
                                  <button type="button" style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, outline: 'none', boxShadow: 'none' }} className="text-slate-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center" title="تنزيل الصنف" onClick={() => handleMoveItem(index, 1)} disabled={index === formData.items.length - 1}>
                                    <ArrowDown size={16} />
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-center align-middle">
                              <SearchableDropdown
                                options={stockOptions}
                                value={item.productName}
                                onChange={(val) => handleItemChange(index, 'productName', val)}
                                onBlur={(currentVal) => {
                                  let val = currentVal !== undefined ? currentVal : item.productName;
                                  if (typeof val !== 'string') val = String(val || '');
                                  if (val) {
                                    val = cleanStockProductName(val);
                                  }
                                  if (val && !validStockOptions[val]) {
                                    handleItemChange(index, 'productName', item.productName || '');
                                  }
                                }}
                                disabled={isItemStatusDisabled(item)}
                              />
                              {item.productName && (
                                <div className="mt-2 flex flex-col items-center gap-1">
                                  {(() => {
                                    const qty = getProductStockQuantity(item.productName);
                                    const prodStatus = getProductionItemStatus(formData, item);
                                    const badges = [];
                                    if (prodStatus === 'ملغي') {
                                      badges.push(
                                        <span key="cancelled" style={{ fontSize: '10px', fontWeight: '800' }} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-300 shadow-sm transition-all duration-300">
                                          تم إلغاء هذا الصنف من الإنتاج
                                        </span>
                                      );
                                    }
                                    if (qty === null || qty <= 0) {
                                      badges.push(
                                        <span key="stock" style={{ fontSize: '10px', fontWeight: '800' }} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200/60 shadow-sm transition-all duration-300">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ width: '4px', height: '4px' }}></span>
                                          {formatProductStockSummary(item.productName)} (غير متوفر)
                                        </span>
                                      );
                                    } else {
                                      badges.push(
                                        <span key="stock" style={{ fontSize: '10px', fontWeight: '800' }} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-sm transition-all duration-300">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ width: '4px', height: '4px' }}></span>
                                          {formatProductStockSummary(item.productName)}
                                        </span>
                                      );
                                    }
                                    return badges;
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-center align-middle">
                              <input
                                type="text"
                                className="w-full border border-slate-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center mx-auto"
                                style={{ height: '38px', maxWidth: '50px' }}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d{1,4}$/.test(val)) {
                                    handleItemChange(index, 'quantity', val);
                                  }
                                }}
                                disabled={isItemStatusDisabled(item)}
                              />
                            </td>
                            <td className="p-2 text-center align-middle">
                              <input type="text" className="w-full border border-slate-200 rounded-lg px-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center disabled:opacity-75 disabled:bg-slate-50 disabled:cursor-not-allowed" style={{ height: '38px' }} value={item.notes} onChange={(e) => handleItemChange(index, 'notes', e.target.value)} placeholder="ملاحظات..." disabled={isItemStatusDisabled(item)} />
                            </td>
                            <td className="p-2 text-center align-middle">

                              <select
                                className="w-full border border-slate-200 rounded-lg bg-slate-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center mx-auto disabled:opacity-70 disabled:cursor-not-allowed font-bold text-slate-700"
                                style={{
                                  height: '38px',
                                  fontSize: '0.8rem',
                                  appearance: 'none',
                                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'left 8px center',
                                  backgroundSize: '14px',
                                  paddingLeft: '24px',
                                  paddingRight: '4px',
                                  minWidth: '130px'
                                }}
                                value={normalizeSalesItemStatus(item.itemStatus)}
                                onChange={(e) => handleItemChange(index, 'itemStatus', e.target.value)}
                                disabled={isItemStatusDisabled(item)}
                                title={(() => {
                                  if (!isItemStatusDisabled(item)) return '';
                                  if (linkedProductionOrder && linkedProductionOrder.items) {
                                    const prodItem = linkedProductionOrder.items.find(pi => {
                                      const name1 = String(pi.productName || '').trim().replace(/\s+/g, ' ');
                                      const name2 = String(item.productName || '').trim().replace(/\s+/g, ' ');
                                      return name1 === name2 || name1.includes(name2) || name2.includes(name1);
                                    });
                                    if (prodItem) {
                                      return `لا يمكن تعديل الحالة لأن الصنف قيد الإنتاج بحالة (${prodItem.status || 'معلق'}) ولم ينتهِ أو يُلغَ بعد`;
                                    }
                                  }
                                  if (item.itemStatus === 'قيد التحضير' && linkedPreparationOrder && linkedPreparationOrder.items) {
                                    const prepItem = linkedPreparationOrder.items.find(pi => {
                                      const name1 = String(pi.productName || '').trim().replace(/\s+/g, ' ');
                                      const name2 = String(item.productName || '').trim().replace(/\s+/g, ' ');
                                      return name1 === name2 || name1.includes(name2) || name2.includes(name1);
                                    });
                                    if (prepItem) {
                                      return `لا يمكن تعديل الحالة لأن الصنف قيد التحضير بحالة (${prepItem.status || 'معلق'}) ولم ينتهِ أو يُلغَ بعد`;
                                    }
                                    return 'لا يمكن تعديل الحالة لأن الصنف قيد التحضير';
                                  }
                                  return 'لا يمكن تعديل الحالة لأن الصنف قيد التنفيذ';
                                })()}
                              >
                                <option value="">-- اختر --</option>
                                {SALES_ITEM_STATUS_OPTIONS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                              </select>
                            </td>
                            <td className="p-2 text-center align-middle">
                              <div className="flex gap-2 justify-center items-center">
                                {['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف'].includes(item.itemStatus) && (isAdmin(user) || user?.level === 'مشرف' || user?.role === 'مشرف' || user?.level === 'supervisor' || user?.role === 'supervisor' || user?.hasProductionAccess || hasPermission(user, 'production', 'add') || hasPermission(user, 'production', 'edit')) && (
                                  <button type="button" className={`${item.hasProductionDetails ? "icon-btn text-primary hover:bg-primary/10" : "icon-btn icon-btn-add"} ${isItemStatusDisabled(item) ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => handleAddProductionItem(index)} title={isItemStatusDisabled(item) ? 'لا يمكن التعديل لأن الصنف قيد التنفيذ' : (item.hasProductionDetails ? 'تعديل تفاصيل الإنتاج' : 'إضافة لكرت الإنتاج')} disabled={isItemStatusDisabled(item)}>
                                    {item.hasProductionDetails ? <Edit2 size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={2} />}
                                  </button>
                                )}
                                {item.itemStatus === 'قيد التحضير' && (isAdmin(user) || user?.level === 'مشرف' || user?.role === 'مشرف' || user?.level === 'supervisor' || user?.role === 'supervisor' || user?.hasPreparationAccess || user?.permissions?.preparation?.add || user?.role?.permissions?.preparation?.add) && (
                                  <button type="button" className={`${item.hasPreparationDetails ? "icon-btn text-emerald-600 hover:bg-emerald-50" : "icon-btn icon-btn-add"} ${isItemStatusDisabled(item) ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => handleAddPreparationItem(index)} title={isItemStatusDisabled(item) ? 'لا يمكن التعديل لأن الصنف قيد التنفيذ' : (item.hasPreparationDetails ? 'تعديل تفاصيل التحضير' : 'إضافة لكرت التحضير')} disabled={isItemStatusDisabled(item)}>
                                    {item.hasPreparationDetails ? <Edit2 size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={2} />}
                                  </button>
                                )}
                                {item.itemStatus === 'تحضير وإنتاج' && (isAdmin(user) || user?.level === 'مشرف' || user?.role === 'مشرف' || user?.level === 'supervisor' || user?.role === 'supervisor' || user?.hasProductionAccess || user?.hasPreparationAccess || hasPermission(user, 'production', 'add') || hasPermission(user, 'production', 'edit')) && (
                                  <button
                                    type="button"
                                    className={`${(item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? "icon-btn text-blue-600 hover:bg-blue-50" : "icon-btn bg-blue-600 hover:bg-blue-700 text-white"} ${isItemStatusDisabled(item) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    style={{
                                      backgroundColor: (item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? '#eff6ff' : '#2563eb',
                                      color: (item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? '#2563eb' : '#ffffff',
                                      border: '1px solid #2563eb'
                                    }}
                                    onClick={() => handleOpenPrepAndProdItem(index)}
                                    title={isItemStatusDisabled(item) ? 'لا يمكن التعديل لأن الصنف قيد التنفيذ' : ((item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? 'تعديل تفاصيل التحضير والإنتاج' : 'إضافة لكرت التحضير والإنتاج')}
                                    disabled={isItemStatusDisabled(item)}
                                  >
                                    {(item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? <Edit2 size={16} strokeWidth={2} /> : <Plus size={16} strokeWidth={2.5} />}
                                  </button>
                                )}
                                {(() => {
                                  const isDisabled = formData.items.length === 1 || isItemStatusDisabled(item);

                                  return (
                                    <button
                                      type="button"
                                      className={`icon-btn ${isDisabled ? 'opacity-50 cursor-not-allowed text-slate-400' : 'icon-btn-delete'}`}
                                      onClick={() => handleRemoveItem(index)}
                                      disabled={isDisabled}
                                      title={isItemStatusDisabled(item) ? (isAdmin(user) ? 'حذف الصنف (متاح للمدير)' : 'لا يمكن حذف الصنف لأن قسم الإنتاج/التحضير قد بدأ العمل عليه ولم ينتهِ أو يُلغَ بعد') : 'حذف الصنف'}
                                    >
                                      <Trash2 size={16} strokeWidth={2} />
                                    </button>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List Layout (Visible only on mobile) */}
                  <div className="mobile-only-card-list md:hidden space-y-4 mt-2">
                    {formData.items.map((item, index) => {
                      const itemThemes = [
                        { border: '#3b82f6', text: '#2563eb', lightBg: '#eff6ff' },
                        { border: '#10b981', text: '#059669', lightBg: '#ecfdf5' },
                        { border: '#8b5cf6', text: '#7c3aed', lightBg: '#f5f3ff' },
                        { border: '#f97316', text: '#ea580c', lightBg: '#fff7ed' }
                      ];
                      const theme = itemThemes[index % 4];
                      return (
                        <div
                          key={index}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            borderLeft: `5px solid ${theme.border}`,
                            padding: '16px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                            marginBottom: '16px',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: '0',
                              right: '24px',
                              backgroundColor: theme.border,
                              color: '#ffffff',
                              padding: '4px 10px',
                              borderRadius: '0 0 8px 8px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              zIndex: 2
                            }}
                          >
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl', gap: '8px' }}>
                            <div
                              style={{
                                color: theme.border,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '12px',
                                flexShrink: 0
                              }}
                            >
                              <Package size={20} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <select
                                className="input-field mb-0 text-center font-bold"
                                style={{
                                  margin: 0,
                                  textAlign: 'center',
                                  textAlignLast: 'center',
                                  height: '30px',
                                  borderRadius: '8px',
                                  border: `1px solid ${getStatusBadgeStyle(item.itemStatus || "").text}25`,
                                  backgroundColor: getStatusBadgeStyle(item.itemStatus || "").bg,
                                  color: getStatusBadgeStyle(item.itemStatus || "").text,
                                  appearance: 'none',
                                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(getStatusBadgeStyle(item.itemStatus || "").text)}' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundPosition: 'left 8px center',
                                  backgroundSize: '10px',
                                  paddingLeft: '22px',
                                  paddingRight: '10px',
                                  paddingTop: 0,
                                  paddingBottom: 0,
                                  lineHeight: 'normal',
                                  fontSize: '0.75rem',
                                  maxWidth: '120px',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                                value={normalizeSalesItemStatus(item.itemStatus)}
                                onChange={(e) => handleItemChange(index, 'itemStatus', e.target.value)}
                                disabled={isItemStatusDisabled(item)}
                              >
                                <option value="">-- اختر --</option>
                                {SALES_ITEM_STATUS_OPTIONS.map(status => (
                                  <option key={status.value} value={status.value} className="bg-white text-slate-800 font-normal">{status.label}</option>
                                ))}
                              </select>

                              {['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف'].includes(item.itemStatus) && (isAdmin(user) || user?.level === 'مشرف' || user?.role === 'مشرف' || user?.level === 'supervisor' || user?.role === 'supervisor' || user?.hasProductionAccess) && (
                                <button
                                  type="button"
                                  className="transition-all"
                                  onClick={() => handleAddProductionItem(index)}
                                  title={item.hasProductionDetails ? 'تعديل تفاصيل الإنتاج' : 'إضافة لكرت الإنتاج'}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: item.hasProductionDetails ? '#eff6ff' : '#ecfdf5',
                                    color: item.hasProductionDetails ? '#3b82f6' : '#10b981',
                                    border: `1px solid ${item.hasProductionDetails ? '#dbeafe' : '#d1fae5'}`,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {item.hasProductionDetails ? <Edit2 size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                                </button>
                              )}

                              {item.itemStatus === 'قيد التحضير' && (isAdmin(user) || user?.level === 'مشرف' || user?.role === 'مشرف' || user?.level === 'supervisor' || user?.role === 'supervisor' || user?.hasPreparationAccess || user?.permissions?.preparation?.add || user?.role?.permissions?.preparation?.add) && (
                                <button
                                  type="button"
                                  className="transition-all"
                                  onClick={() => handleAddPreparationItem(index)}
                                  title={item.hasPreparationDetails ? 'تعديل تفاصيل التحضير' : 'إضافة لكرت التحضير'}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: item.hasPreparationDetails ? '#ecfdf5' : '#f0fdf4',
                                    color: item.hasPreparationDetails ? '#059669' : '#16a34a',
                                    border: `1px solid ${item.hasPreparationDetails ? '#d1fae5' : '#bbf7d0'}`,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {item.hasPreparationDetails ? <Edit2 size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                                </button>
                              )}

                              {item.itemStatus === 'تحضير وإنتاج' && (isAdmin(user) || user?.level === 'مشرف' || user?.role === 'مشرف' || user?.level === 'supervisor' || user?.role === 'supervisor' || user?.hasProductionAccess || user?.hasPreparationAccess) && (
                                <button
                                  type="button"
                                  className="transition-all"
                                  onClick={() => handleOpenPrepAndProdItem(index)}
                                  title={(item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? 'تعديل تفاصيل التحضير والإنتاج' : 'إضافة لكرت التحضير والإنتاج'}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: (item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? '#eff6ff' : '#2563eb',
                                    color: (item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? '#2563eb' : '#ffffff',
                                    border: `1px solid ${(item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? '#dbeafe' : '#1d4ed8'}`,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {(item.hasPrepAndProdDetails || (item.hasProductionDetails && item.hasPreparationDetails)) ? <Edit2 size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                                </button>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="transition-all hover:bg-slate-200"
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    backgroundColor: index === 0 ? '#f8fafc' : '#f1f5f9',
                                    color: index === 0 ? '#cbd5e1' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: index === 0 ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={() => handleMoveItem(index, -1)}
                                  disabled={index === 0}
                                  title="تحريك لأعلى"
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="transition-all hover:bg-slate-200"
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    backgroundColor: index === formData.items.length - 1 ? '#f8fafc' : '#f1f5f9',
                                    color: index === formData.items.length - 1 ? '#cbd5e1' : '#475569',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 'none',
                                    cursor: index === formData.items.length - 1 ? 'not-allowed' : 'pointer'
                                  }}
                                  onClick={() => handleMoveItem(index, 1)}
                                  disabled={index === formData.items.length - 1}
                                  title="تحريك لأسفل"
                                >
                                  <ArrowDown size={14} />
                                </button>
                              </div>

                              {(() => {
                                const isDisabled = formData.items.length === 1 || isItemStatusDisabled(item);
                                return (
                                  <button
                                    type="button"
                                    className="transition-all"
                                    style={{
                                      width: '30px',
                                      height: '30px',
                                      borderRadius: '8px',
                                      backgroundColor: isDisabled ? '#f8fafc' : '#fef2f2',
                                      color: isDisabled ? '#cbd5e1' : '#ef4444',
                                      border: isDisabled ? '1px solid #f1f5f9' : '1px solid #fee2e2',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: isDisabled ? 'not-allowed' : 'pointer'
                                    }}
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={isDisabled}
                                    title={isItemStatusDisabled(item) ? (isAdmin(user) ? 'حذف الصنف (متاح للمدير)' : 'لا يمكن حذف الصنف لأن قسم الإنتاج/التحضير قد بدأ العمل عليه ولم ينتهِ أو يُلغَ بعد') : 'حذف الصنف'}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Field 1: اسم الصنف Dropdown & Stock Message */}
                          <div className="space-y-1">
                            <SearchableDropdown
                              options={stockOptions}
                              value={item.productName}
                              onChange={(val) => handleItemChange(index, 'productName', val)}
                              onBlur={(currentVal) => {
                                let val = currentVal !== undefined ? currentVal : item.productName;
                                if (typeof val !== 'string') val = String(val || '');
                                if (val) {
                                  val = cleanStockProductName(val);
                                }
                                const validOptions = Object.keys(
                                  stock.reduce((acc, s) => {
                                    if (!s.name) return acc;
                                    const sName = String(s.name || '').trim();
                                    const specSuffix = s.spec ? ` - ${String(s.spec).trim()}` : '';
                                    acc[`${sName}${specSuffix}`] = true;
                                    return acc;
                                  }, {})
                                );
                                if (val && !validOptions.includes(val)) {
                                  handleItemChange(index, 'productName', item.productName || '');
                                }
                              }}
                              disabled={isItemStatusDisabled(item)}
                            />
                            {item.productName && (
                              <div className="mt-1 text-center">
                                {(() => {
                                  const qty = getProductStockQuantity(item.productName);
                                  if (qty === null || qty <= 0) {
                                    return (
                                      <span style={{ fontSize: '11px', fontWeight: '800', color: theme.border }}>
                                        {formatProductStockSummary(item.productName)} (غير متوفر)
                                      </span>
                                    );
                                  }
                                  return (
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: theme.text }}>
                                      {formatProductStockSummary(item.productName)}
                                    </span>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Quantity and Notes side-by-side (Explicit Flex Layout to prevent collapsing) */}
                          <div style={{ display: 'flex', gap: '12px', width: '100%', direction: 'rtl', marginTop: '4px' }}>
                            {/* Quantity Column */}
                            <div style={{ width: '30%', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.text, display: 'block' }}>الكمية</label>
                              <input
                                type="text"
                                className="border border-slate-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-center px-2"
                                style={{ height: '38px', width: '100%', backgroundColor: '#ffffff' }}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d{1,4}$/.test(val)) {
                                    handleItemChange(index, 'quantity', val);
                                  }
                                }}
                                placeholder="الكمية"
                                disabled={isItemStatusDisabled(item)}
                              />
                            </div>

                            {/* Notes Column */}
                            <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.text, display: 'block' }}>ملاحظات الصنف</label>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  backgroundColor: theme.lightBg || '#f8fafc',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '4px 8px',
                                  height: '38px',
                                  width: '100%',
                                  direction: 'rtl',
                                  gap: '8px'
                                }}
                              >
                                {/* Edit Icon Square */}
                                <div
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '6px',
                                    border: `1px solid ${theme.border}`,
                                    backgroundColor: '#ffffff',
                                    color: theme.border,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}
                                >
                                  <Edit2 size={12} />
                                </div>
                                {/* Text Input */}
                                <input
                                  type="text"
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    width: '100%',
                                    height: '100%',
                                    fontSize: '0.8rem',
                                    color: '#1e293b',
                                    padding: 0,
                                    margin: 0
                                  }}
                                  value={item.notes || ''}
                                  onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                  placeholder="لا توجد ملاحظات"
                                  disabled={isItemStatusDisabled(item)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* أزرار إضافة سطور من أسفل القائمة لتسهيل العمل */}
                <div className="flex justify-center mt-2 mb-6">
                  <button type="button" className="btn btn-outline flex items-center justify-center gap-2 border-dashed border-2 border-slate-300 text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 w-full md:w-1/2 rounded-xl py-3 transition-all font-bold" onClick={handleAddItem}>
                    <Plus size={18} strokeWidth={2} /> سطر جديد للطلبية
                  </button>
                </div>

                <div className="bg-slate-50 p-4 md:p-5 rounded-xl border border-slate-200 mb-8 sales-extra-container">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-12 input-group mb-0 relative">
                      <label className="font-bold text-slate-700 mb-2 block flex items-center gap-2 text-xs md:text-sm"><FileText size={16} className="text-slate-500" /> ملاحظات الطلبية</label>
                      <textarea
                        className="input-field"
                        rows="3"
                        maxLength={250}
                        style={{ minHeight: '80px', backgroundColor: 'white', resize: 'vertical', paddingBottom: '20px' }}
                        value={formData.orderNotes || ''}
                        onChange={(e) => setFormData({ ...formData, orderNotes: e.target.value.slice(0, 250) })}
                        placeholder="أضف أية ملاحظات عامة تخص هذه الطلبية..."
                      />
                      <span className="absolute bottom-2 left-3 text-[10px] text-slate-400 font-bold">
                        {(formData.orderNotes || '').length}/250
                      </span>
                    </div>
                  </div>
                </div>

                <div className="premium-modal-actions">
                  {!editingOrder && draftSaveState && (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1" aria-live="polite">
                      <CheckCircle size={14} className="text-emerald-500" /> {draftSaveState}
                    </span>
                  )}
                  <button type="submit" className="btn-premium-save flex items-center justify-center gap-1">
                    <FileText size={16} />
                    {editingOrder ? 'حفظ التعديلات' : 'حفظ الطلبية'}
                  </button>
                  <button type="button" className="btn-premium-cancel" onClick={() => setShowModal(false)}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPreview && selectedOrder && (
          isMobile ? (
            <div className="modal-overlay no-print" style={{ zIndex: 10500 }}>
              <div
                className="modal-content animate-fade-in"
                style={{
                  width: '100vw',
                  height: '100vh',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  margin: 0,
                  borderRadius: 0,
                  padding: 0,
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Header */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    direction: 'rtl'
                  }}
                >
                  <div style={{ width: '38px' }} />

                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>تفاصيل الطلبية</h3>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', fontWeight: 'bold' }}>{selectedOrder.orderNumber}#</div>
                  </div>

                  <div
                    onClick={() => setShowPreview(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <X size={18} className="text-slate-600" />
                  </div>
                </div>

                {/* Scrollable Content Pane */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    paddingBottom: '20px',
                    direction: 'rtl'
                  }}
                >
                  {/* First Block: Stats cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Left Card: Order No */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ backgroundColor: '#f0f9ff', color: '#0284c7', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>رقم الطلب</span>
                        <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '0.85rem', marginTop: '4px' }}>{selectedOrder.orderNumber}#</span>
                      </div>
                    </div>

                    {/* Right Card: Due Date */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>تاريخ التسليم</span>
                        <span style={{ color: '#1e293b', fontSize: '0.85rem', fontWeight: '800', marginTop: '4px' }}>{selectedOrder.deliveryDate || '---'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Second Block: Details Grid Card */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        border: '1px solid #f1f5f9',
                        borderRadius: '12px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Row 1 Right: اسم العميل */}
                      <div style={{ gridColumn: '2', gridRow: '1', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'right' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <User size={12} style={{ color: '#0284c7' }} /> اسم العميل
                        </span>
                        <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.customerName}</span>
                      </div>

                      {/* Row 1 Left: الحالة */}
                      <div style={{ gridColumn: '1', gridRow: '1', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'right' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Activity size={12} style={{ color: getStatusBadgeStyle(selectedOrder.status).text }} /> الحالة
                        </span>
                        <span style={{ color: getStatusBadgeStyle(selectedOrder.status).text, fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.status || 'جديد'}</span>
                      </div>

                      {/* Row 2 Right: أنشئت بواسطة */}
                      <div style={{ gridColumn: '2', gridRow: '2', borderBottom: '1px solid #f1f5f9', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'right' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <User size={12} style={{ color: '#64748b' }} /> أنشئت بواسطة
                        </span>
                        <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.createdBy || '---'}</span>
                      </div>

                      {/* Row 2 Left: تاريخ الإنشاء */}
                      <div style={{ gridColumn: '1', gridRow: '2', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'right' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Calendar size={12} style={{ color: '#64748b' }} /> تاريخ الإنشاء
                        </span>
                        <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.orderDate || '---'}</span>
                      </div>

                      {/* Row 3 Right: آخر إجراء */}
                      <div style={{ gridColumn: '2', gridRow: '3', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'right' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <User size={12} style={{ color: '#64748b' }} /> آخر إجراء
                        </span>
                        <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>{selectedOrder.lastActionBy || '---'}</span>
                      </div>

                      {/* Row 3 Left: كرت الإنتاج */}
                      <div style={{ gridColumn: '1', gridRow: '3', display: 'flex', flexDirection: 'column', padding: '10px 8px', textAlign: 'right' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <FileText size={12} style={{ color: '#64748b' }} /> كرت الإنتاج / التحضير
                        </span>
                        <span style={{ color: '#1e293b', fontSize: '0.82rem', fontWeight: '800' }}>
                          {(() => {
                            const linkedDb = (productionOrders || []).find(po =>
                              (po.salesOrderId && po.salesOrderId === selectedOrder.id) ||
                              (po.salesOrderNumber && po.salesOrderNumber === selectedOrder.orderNumber) ||
                              (po.orderNotes && po.orderNotes.includes(selectedOrder.orderNumber))
                            );
                            const prodNumber = linkedDb ? linkedDb.orderNumber : selectedOrder.productionOrderNumber;
                            const prodItems = (selectedOrder.items || []).filter(i => ['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف', 'تم الإنتاج'].includes(i.itemStatus));
                            const count = (linkedDb && linkedDb.items) ? linkedDb.items.length : prodItems.length;
                            const countText = count > 0 ? (count === 1 ? 'صنف واحد' : count === 2 ? 'صنفان' : `${count} أصناف`) : '';

                            const linkedPrepDb = (preparationOrders || []).find(po =>
                              (po.salesOrderId && po.salesOrderId === selectedOrder.id) ||
                              (po.salesOrderNumber && po.salesOrderNumber === selectedOrder.orderNumber) ||
                              (po.orderNotes && po.orderNotes.includes(selectedOrder.orderNumber))
                            );
                            const prepNumber = linkedPrepDb ? linkedPrepDb.orderNumber : selectedOrder.preparationOrderNumber;
                            const prepItems = (selectedOrder.items || []).filter(i => i.itemStatus === 'قيد التحضير');
                            const countPrep = (linkedPrepDb && linkedPrepDb.items) ? linkedPrepDb.items.length : prepItems.length;
                            const countPrepText = countPrep > 0 ? (countPrep === 1 ? 'صنف واحد' : countPrep === 2 ? 'صنفان' : `${countPrep} أصناف`) : '';

                            const texts = [];
                            if (prodNumber) texts.push(count > 0 ? `${prodNumber} (${countText})` : prodNumber);
                            if (prepNumber) texts.push(countPrep > 0 ? `${prepNumber} (${countPrepText})` : prepNumber);

                            return texts.length > 0 ? texts.join(' | ') : 'لا يوجد';
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Order Notes */}
                    {selectedOrder.orderNotes && (
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 'bold' }}>ملاحظات الطلبية</span>
                        <span style={{ color: '#475569', fontSize: '0.82rem', fontWeight: 'bold' }}>{selectedOrder.orderNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Third Block: Items details Card */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Card Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <Package size={18} className="text-primary" />
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>تفاصيل الأصناف</span>
                    </div>

                    {/* Summary Grid */}
                    {(() => {
                      const items = selectedOrder.items || [];
                      const readyQty = items.filter(i => i.itemStatus === 'جاهز' || i.itemStatus === 'تم الإنتاج' || i.itemStatus === 'تم التسليم' || i.itemStatus === 'منتهي').length;
                      const inProdQty = items.filter(i => ['قيد الإنتاج', 'إنتاج قيد الخياطة', 'إنتاج قيد التغليف'].includes(i.itemStatus)).length;
                      const inPrepQty = items.filter(i => !i.itemStatus || i.itemStatus === 'قيد التجهيز' || i.itemStatus === 'جديد').length;
                      const remainingQty = inProdQty + inPrepQty;
                      return (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginTop: '4px',
                            marginBottom: '8px',
                            backgroundColor: '#ffffff'
                          }}
                        >
                          <div style={{ borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 2px', textAlign: 'center' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '4px' }}>جاهز</span>
                            <CheckCircle size={14} style={{ color: '#10b981', marginBottom: '4px' }} />
                            <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold' }}>{readyQty}</span>
                          </div>
                          <div style={{ borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 2px', textAlign: 'center' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '4px' }}>قيد التجهيز</span>
                            <Package size={14} style={{ color: '#8b5cf6', marginBottom: '4px' }} />
                            <span style={{ color: '#8b5cf6', fontSize: '0.85rem', fontWeight: 'bold' }}>{inPrepQty}</span>
                          </div>
                          <div style={{ borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 2px', textAlign: 'center' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '4px' }}>قيد الإنتاج</span>
                            <Clipboard size={14} style={{ color: '#3b82f6', marginBottom: '4px' }} />
                            <span style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: 'bold' }}>{inProdQty}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 2px', textAlign: 'center' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '4px' }}>المتبقي</span>
                            <Clock size={14} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                            <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 'bold' }}>{remainingQty}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Items Cards Layout */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(selectedOrder.items || []).map((item, idx) => {
                        const itemThemes = [
                          { border: '#3b82f6', text: '#2563eb', lightBg: '#eff6ff' },
                          { border: '#10b981', text: '#059669', lightBg: '#ecfdf5' },
                          { border: '#8b5cf6', text: '#7c3aed', lightBg: '#f5f3ff' },
                          { border: '#f97316', text: '#ea580c', lightBg: '#fff7ed' }
                        ];
                        const theme = itemThemes[idx % 4];
                        return (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: '16px',
                              border: '1px solid #e2e8f0',
                              borderLeft: `5px solid ${theme.border}`,
                              padding: '16px',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              direction: 'rtl'
                            }}
                          >
                            {/* Dog-ear Ribbon Badge */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '0',
                                right: '24px',
                                backgroundColor: theme.border,
                                color: '#ffffff',
                                padding: '4px 10px',
                                borderRadius: '0 0 8px 8px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                zIndex: 2
                              }}
                            >
                              {String(idx + 1).padStart(2, '0')}
                            </div>

                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl', gap: '8px' }}>
                              {/* Right side: Simple Package Icon */}
                              <div
                                style={{
                                  color: theme.border,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginTop: '12px',
                                  flexShrink: 0
                                }}
                              >
                                <Package size={20} />
                              </div>

                              {/* Left side: Status Badge */}
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '24px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  backgroundColor: getStatusBadgeStyle(item.itemStatus || "").bg,
                                  color: getStatusBadgeStyle(item.itemStatus || "").text,
                                  borderRadius: '6px',
                                  padding: '0 8px',
                                  direction: 'rtl'
                                }}
                              >
                                {item.itemStatus || 'جديد'}
                              </span>
                            </div>

                            {/* Product Name & Stock Msg */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right', marginTop: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' }}>{item.productName}</span>
                                {(() => {
                                  const prodStatus = getProductionItemStatus(selectedOrder, item);
                                  if (prodStatus === 'ملغي') {
                                    return (
                                      <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center' }}>
                                        تم إلغاء الإنتاج
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              {(() => {
                                const qty = getProductStockQuantity(item.productName);
                                if (qty === null || qty <= 0) {
                                  return (
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: theme.border }}>
                                      {formatProductStockSummary(item.productName)} (غير متوفر)
                                    </span>
                                  );
                                }
                                return (
                                  <span style={{ fontSize: '11px', fontWeight: '800', color: theme.text }}>
                                    {formatProductStockSummary(item.productName)}
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Quantity and Notes side-by-side */}
                            <div style={{ display: 'flex', gap: '12px', width: '100%', direction: 'rtl', textAlign: 'right' }}>
                              {/* Quantity Column */}
                              <div style={{ width: '75px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center', flexShrink: 0 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.text, display: 'block' }}>الكمية</label>
                                <div
                                  style={{
                                    height: '38px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '900',
                                    color: '#0f172a',
                                    fontSize: '1rem'
                                  }}
                                >
                                  {item.quantity}
                                </div>
                              </div>

                              {/* Notes Column */}
                              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: theme.text, display: 'block' }}>ملاحظات الصنف</label>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: theme.lightBg || '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    minHeight: '38px',
                                    height: 'auto',
                                    direction: 'rtl',
                                    width: '100%'
                                  }}
                                >
                                  <span style={{ fontSize: '0.8rem', color: item.notes ? '#1e293b' : '#94a3b8', fontWeight: 'bold', wordBreak: 'break-word' }}>
                                    {item.notes || 'لا توجد ملاحظات'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '16px 16px calc(24px + env(safe-area-inset-bottom, 0px)) 16px',
                    display: 'flex',
                    gap: '8px',
                    direction: 'rtl',
                    boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)'
                  }}
                >
                  <button
                    onClick={triggerPrint}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      color: 'white',
                      flex: 1
                    }}
                  >
                    <Printer size={15} />
                    <span>طباعة / تصدير PDF</span>
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      color: '#475569',
                      flex: 1
                    }}
                  >
                    <span>إغلاق</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="modal-overlay no-print">
              <div className="modal-content wide animate-fade-in">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-xl font-bold">معاينة الطلبية وتصدير PDF</h3>
                  <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowPreview(false)}><X size={18} /></button>
                </div>

                <div className="bg-white p-8 border rounded-2xl shadow-sm mb-6 relative overflow-hidden" style={{ direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" style={{ zIndex: 0 }}></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-tr-full" style={{ zIndex: 0 }}></div>

                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100 relative" style={{ zIndex: 1 }}>
                    <div>
                      <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                        <span className="text-primary">طلبية رقم</span> #{selectedOrder.orderNumber}
                      </h2>
                      {(() => {
                        const linkedDb = (productionOrders || []).find(po =>
                          (po.salesOrderId && po.salesOrderId === selectedOrder.id) ||
                          (po.salesOrderNumber && po.salesOrderNumber === selectedOrder.orderNumber) ||
                          (po.orderNotes && po.orderNotes.includes(selectedOrder.orderNumber))
                        );
                        const prodNumber = linkedDb ? linkedDb.orderNumber : selectedOrder.productionOrderNumber;

                        const linkedPrepDb = (preparationOrders || []).find(po =>
                          (po.salesOrderId && po.salesOrderId === selectedOrder.id) ||
                          (po.salesOrderNumber && po.salesOrderNumber === selectedOrder.orderNumber) ||
                          (po.orderNotes && po.orderNotes.includes(selectedOrder.orderNumber))
                        );
                        const prepNumber = linkedPrepDb ? linkedPrepDb.orderNumber : selectedOrder.preparationOrderNumber;

                        const elements = [];
                        if (prodNumber) {
                          elements.push(
                            <div key="prod" className="mb-2 inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl ml-2">
                              <span className="text-red-600 font-black text-xl">مرتبطة بكرت إنتاج:</span>
                              <span className="text-red-700 font-black text-2xl tracking-wider" dir="ltr">{prodNumber}</span>
                            </div>
                          );
                        }
                        if (prepNumber) {
                          elements.push(
                            <div key="prep" className="mb-2 inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl ml-2">
                              <span className="text-red-600 font-black text-xl">مرتبطة بكرت تحضير:</span>
                              <span className="text-red-700 font-black text-2xl tracking-wider" dir="ltr">{prepNumber}</span>
                            </div>
                          );
                        }
                        return elements.length > 0 ? <div>{elements}</div> : null;
                      })()}
                      <div className="text-slate-500 font-bold flex items-center gap-2">
                        <Calendar size={16} /> {selectedOrder.orderDate}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 text-primary">
                        الحالة: {selectedOrder.status || '---'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 relative" style={{ zIndex: 1 }}>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-sm font-bold">اسم العميل</span>
                      <span className="text-slate-800 font-bold text-lg">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-sm font-bold">تاريخ التسليم</span>
                      <span className="text-slate-800 font-bold text-lg" style={{ color: '#dc2626' }}>{selectedOrder.deliveryDate || 'غير محدد'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-sm font-bold">ملاحظات الطلبية</span>
                      <span className="text-slate-800 font-bold">{selectedOrder.orderNotes || 'لا توجد ملاحظات'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-sm font-bold">أُنشئت بواسطة</span>
                      <span className="text-slate-700 font-bold">{selectedOrder.createdBy || '---'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400 text-sm font-bold">آخر إجراء</span>
                      <span className="text-slate-700 font-bold">{selectedOrder.lastActionBy || '---'}</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2 relative" style={{ zIndex: 1 }}>
                    <Package size={20} className="text-primary" /> الأصناف المطلوبة
                  </h4>

                  <div className="overflow-hidden rounded-xl border-2 border-slate-300 relative" style={{ zIndex: 1 }}>
                    <table className="w-full text-right" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 text-sm text-right">
                          <th className="p-3 font-bold border border-slate-300 w-12 text-right">#</th>
                          <th className="p-3 font-bold border border-slate-300 text-right">اسم الصنف</th>
                          <th className="p-3 font-bold border border-slate-300 text-right" style={{ width: '110px' }}>الكمية المطلوبة</th>
                          <th className="p-3 font-bold border border-slate-300 text-right" style={{ width: '130px' }}>المتوفر بالمخزون</th>
                          <th className="p-3 font-bold border border-slate-300 text-right" style={{ width: '120px' }}>الحالة</th>
                          <th className="p-3 font-bold border border-slate-300 text-right">ملاحظات الصنف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedOrder.items || []).map((item, i) => {
                          const availableQty = getProductStockQuantity(item.productName);
                          const breakdown = getProductStockBreakdown(item.productName);
                          return (
                            <tr key={i} className="hover:bg-slate-50 transition-colors text-right">
                              <td className="p-3 text-right text-slate-700 font-bold border border-slate-300">{i + 1}</td>
                              <td className="p-3 font-bold text-primary border border-slate-300 text-right">{item.productName}</td>
                              <td className="p-3 text-right font-black text-slate-800 bg-slate-50/50 border border-slate-300">{item.quantity}</td>
                              <td className="p-3 border border-slate-300 text-xs font-bold text-right" style={{
                                color: availableQty === null || availableQty <= 0 ? '#dc2626' : availableQty < item.quantity ? '#d97706' : '#10b981',
                                backgroundColor: availableQty === null || availableQty <= 0 ? '#fef2f2' : availableQty < item.quantity ? '#fffbeb' : '#f0fdf4'
                              }}>
                                {breakdown.length === 0 ? (
                                  <div className="text-right font-black" style={{ fontSize: '0.85rem' }}>غير متوفر</div>
                                ) : (
                                  <div className="flex flex-col gap-1 text-right">
                                    {breakdown.map((b, bIdx) => (
                                      <div key={bIdx} className="flex justify-start gap-2 whitespace-nowrap">
                                        <span>• {b.warehouse}:</span>
                                        <span className="font-black">{b.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-right border border-slate-300">
                                <span className="inline-flex px-3 py-1 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-300 shadow-sm text-right">
                                  {item.itemStatus || '---'}
                                </span>
                              </td>
                              <td className="p-3 text-sm text-slate-700 font-bold border border-slate-300 text-right">{item.notes || '---'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="btn btn-primary flex-1" onClick={isMobile ? triggerSharePDF : triggerPrint}><Printer size={18} /> طباعة / تصدير PDF</button>
                  <button className="btn btn-outline flex-1" onClick={() => setShowPreview(false)}>إغلاق</button>
                </div>
              </div>
            </div>
          )
        )}

        {/* Variants Modal */}
        {showVariantsModal && variantModalIndex !== null && (
          <div className="modal-overlay no-print" style={{ zIndex: 10600 }}>
            {isMobile ? (
              <div
                className="modal-content animate-fade-in"
                style={{
                  width: '100vw',
                  height: '100vh',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  margin: 0,
                  borderRadius: 0,
                  padding: 0,
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  direction: 'rtl'
                }}
              >
                {/* Mobile Header */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px' }}>
                    <Package size={22} />
                  </div>

                  <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>تفاصيل الألوان والكميات للصنف:</h3>
                    <div style={{ fontSize: '0.85rem', color: '#0f766e', marginTop: '2px', fontWeight: 'bold' }}>
                      {formData.items[variantModalIndex]?.productName}
                    </div>
                  </div>

                  <div
                    onClick={() => setShowVariantsModal(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <X size={18} className="text-slate-600" />
                  </div>
                </div>

                {/* Scrollable Content Pane */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    paddingBottom: '20px'
                  }}
                >

                  {/* Variants list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {productionVariants.map((variant, idx) => {
                      const itemThemes = [
                        { border: '#0f766e', text: '#0f766e', lightBg: '#f0fdf4' },
                        { border: '#3b82f6', text: '#2563eb', lightBg: '#eff6ff' },
                        { border: '#8b5cf6', text: '#7c3aed', lightBg: '#f5f3ff' },
                        { border: '#f97316', text: '#ea580c', lightBg: '#fff7ed' }
                      ];
                      const theme = itemThemes[idx % 4];
                      return (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            borderRight: `5px solid ${theme.border}`,
                            padding: '16px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          {/* Card Header (Ribbon on the right, Delete on the left) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '24px', marginBottom: '4px' }}>
                            {/* Ribbon Badge (First child -> Renders on the Right in RTL) */}
                            <div
                              style={{
                                backgroundColor: theme.border,
                                color: '#ffffff',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              {String(idx + 1).padStart(2, '0')}
                            </div>

                            {/* Delete button (Second child -> Renders on the Left in RTL) */}
                            <button
                              type="button"
                              className="transition-all"
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: productionVariants.length <= 1 ? '#f8fafc' : '#fef2f2',
                                color: productionVariants.length <= 1 ? '#cbd5e1' : '#ef4444',
                                border: productionVariants.length <= 1 ? '1px solid #f1f5f9' : '1px solid #fee2e2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: productionVariants.length <= 1 ? 'not-allowed' : 'pointer'
                              }}
                              onClick={() => handleRemoveVariant(idx)}
                              disabled={productionVariants.length <= 1}
                              title="حذف اللون"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Dropdown: اللون / الموديل */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>اللون / الموديل</label>
                            <SearchableDropdown
                              options={globalSettings.stockColors || []}
                              value={variant.colorModel}
                              onChange={(val) => handleVariantChange(idx, 'colorModel', val)}
                              placeholder="اختر اللون..."
                            />
                          </div>

                          {/* Three boxes side-by-side: Quantity, Thickness, Size */}
                          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            {/* Qty (Left in DOM -> Left visually because of Flex alignment) */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>الكمية</label>
                              <input
                                type="number"
                                className="input-field text-center font-bold"
                                style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 4px', fontSize: '0.85rem', color: '#0f766e' }}
                                value={variant.quantity}
                                onChange={(e) => handleVariantChange(idx, 'quantity', e.target.value)}
                                min="1"
                              />
                            </div>

                            {/* Thickness (Middle) */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>السماكة (سم)</label>
                              <input
                                type="text"
                                className="input-field text-center"
                                style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 4px', fontSize: '0.85rem' }}
                                value={variant.thickness}
                                onChange={(e) => handleVariantChange(idx, 'thickness', e.target.value)}
                              />
                            </div>

                            {/* Size (Right in DOM -> Right visually in RTL) */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>المقاس (سم)</label>
                              <input
                                type="text"
                                className="input-field text-center"
                                style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 4px', fontSize: '0.85rem' }}
                                placeholder="مثال 200*200"
                                value={variant.sizeCm}
                                onChange={(e) => handleVariantChange(idx, 'sizeCm', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Notes Textarea */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right', position: 'relative' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>الملاحظات</label>
                            <textarea
                              className="input-field"
                              rows="2"
                              maxLength={200}
                              style={{ minHeight: '60px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '8px 12px', paddingBottom: '20px', fontSize: '0.85rem', resize: 'vertical' }}
                              placeholder="أضف أية تفاصيل إضافية..."
                              value={variant.notes || ''}
                              onChange={(e) => handleVariantChange(idx, 'notes', e.target.value.slice(0, 200))}
                            />
                            <span style={{ position: 'absolute', bottom: '6px', left: '10px', fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' }}>
                              {(variant.notes || '').length}/200
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dash Card: Add Another Color */}
                  <div
                    onClick={handleAddVariant}
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '16px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      textAlign: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    className="hover:border-primary hover:bg-slate-50"
                  >
                    <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={20} />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0f766e' }}>إضافة لون آخر</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>يمكنك إضافة أكثر من لون للصنف</span>
                  </div>
                </div>

                {/* Mobile Sticky Footer */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e2e8f0',
                    padding: '16px 16px calc(24px + env(safe-area-inset-bottom, 0px)) 16px',
                    display: 'flex',
                    gap: '8px',
                    boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)'
                  }}
                >
                  <button
                    onClick={handleSaveVariants}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#0f766e',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: 'white',
                      flex: 1
                    }}
                  >
                    <Save size={16} />
                    <span>حفظ</span>
                  </button>

                  <button
                    onClick={() => setShowVariantsModal(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                      color: '#475569',
                      flex: 1
                    }}
                  >
                    <span>إلغاء</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-content wide animate-fade-in" style={{ maxWidth: '900px' }}>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Package className="text-primary" />
                    <span>تفصيل الألوان والكميات للصنف: {formData.items[variantModalIndex]?.productName}</span>
                  </h3>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowVariantsModal(false)}><X size={18} /></button>
                </div>


                <div className="overflow-x-auto mb-4 border border-slate-200 rounded-xl">
                  <table className="w-full text-right bg-white" style={{ borderCollapse: 'collapse' }}>
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-slate-700 font-bold" style={{ width: '25%' }}>اللون / الموديل</th>
                        <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '15%' }}>الكمية</th>
                        <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '15%' }}>المقاس (سم)</th>
                        <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '15%' }}>السماكة (سم)</th>
                        <th className="p-3 text-slate-700 font-bold" style={{ width: '20%' }}>ملاحظات</th>
                        <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '10%' }}>حذف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productionVariants.map((variant, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2">
                            <SearchableDropdown
                              options={globalSettings.stockColors || []}
                              value={variant.colorModel}
                              onChange={(val) => handleVariantChange(idx, 'colorModel', val)}
                              placeholder="اختر اللون..."
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              className="input-field w-full mb-0 text-center font-bold text-primary"
                              value={variant.quantity}
                              onChange={(e) => handleVariantChange(idx, 'quantity', e.target.value)}
                              min="1"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              className="input-field w-full mb-0 text-center"
                              placeholder="مثال 200*200"
                              value={variant.sizeCm}
                              onChange={(e) => handleVariantChange(idx, 'sizeCm', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              className="input-field w-full mb-0 text-center"
                              value={variant.thickness}
                              onChange={(e) => handleVariantChange(idx, 'thickness', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              className="input-field w-full mb-0"
                              placeholder="ملاحظات..."
                              value={variant.notes || ''}
                              onChange={(e) => handleVariantChange(idx, 'notes', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              className="icon-btn icon-btn-delete mx-auto disabled:opacity-50"
                              onClick={() => handleRemoveVariant(idx)}
                              disabled={productionVariants.length <= 1}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-start mb-6">
                  <button type="button" className="btn btn-outline border-dashed border-2 flex items-center gap-2 text-slate-600 hover:text-primary hover:border-primary transition-colors" onClick={handleAddVariant}>
                    <Plus size={16} /> إضافة لون آخر
                  </button>
                </div>

                <div className="flex gap-4">
                  <button className="btn btn-primary flex-1" onClick={handleSaveVariants}>حفظ</button>
                  <button className="btn btn-outline flex-1" onClick={() => setShowVariantsModal(false)}>إلغاء</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preparation Variants Modal */}
        <PreparationVariantsModal
          isMobile={isMobile}
          showModal={showPreparationVariantsModal}
          setShowModal={setShowPreparationVariantsModal}
          variantModalIndex={preparationVariantModalIndex}
          variants={preparationVariants}
          setVariants={setPreparationVariants}
          formData={formData}
          globalSettings={globalSettings}
          handleVariantChange={handlePreparationVariantChange}
          handleRemoveVariant={handleRemovePreparationVariant}
          handleAddVariant={handleAddPreparationVariant}
          handleSaveVariants={handleSavePreparationVariants}
        />

        {/* Combined Preparation & Production Variants Modal */}
        <PrepAndProdVariantsModal
          isMobile={isMobile}
          showModal={showPrepAndProdModal}
          setShowModal={setShowPrepAndProdModal}
          variantModalIndex={prepAndProdModalIndex}
          formData={formData}
          globalSettings={globalSettings}
          initialPrepVariants={prepAndProdVariants.prepVariants}
          initialProdVariants={prepAndProdVariants.prodVariants}
          onSave={handleSavePrepAndProdVariants}
        />

      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        #print-portal { display: none; }
        .sales-receipt-button {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 38px; padding: 0 12px; border: 1px solid #c7d2fe; border-radius: 10px;
          background: #eef2ff; color: #273c86; font-family: inherit; font-size: 14px;
          font-weight: 800; white-space: nowrap; cursor: pointer;
          transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
        }
        .sales-receipt-button:hover { background: #e0e7ff; border-color: #a5b4fc; box-shadow: 0 3px 8px rgba(39,60,134,.12); }
        .sales-receipt-button:focus-visible { outline: 3px solid #818cf8; outline-offset: 3px; }
        .sales-receipt-button:active { background: #c7d2fe; }
        .sales-receipt-button-icon { display: inline-flex; align-items: center; justify-content: center; width: 25px; height: 25px; border-radius: 7px; background: #dce4ff; }
        @media (max-width: 767px) { .sales-receipt-button { font-size: 12px; } }
        .badge-info { background: #e0f2f1; color: #00796b; border: 1px solid #b2dfdb; }
        .badge-cutting { background: #fff3e0; color: #ef6c00; border: 1px solid #ffcc80; }
        .badge-warehouse { background: #fffde7; color: #fbc02d; border: 1px solid #fff59d; }
        .badge-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
        .badge-danger { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }
        .badge-delivery { background: #e3f2fd; color: #1e3a8a; border: 1px solid #bfdbfe; }
        .badge-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .mobile-only-card-list {
          display: none !important;
        }

        @media (min-width: 768px) {
          .modal-content.wide {
            max-width: 1050px !important;
          }
          .sales-info-card {
            margin-bottom: 0 !important;
            border-bottom: none !important;
            border-bottom-left-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
          }
          .customer-card {
            border-top: none !important;
            border-top-left-radius: 0 !important;
            border-top-right-radius: 0 !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
          }
        }

        @media (max-width: 767px) {
          /* Full screen modal sheet */
          .modal-overlay {
            padding: 0 !important;
            background: white !important;
            align-items: flex-start !important;
            overflow-y: auto !important;
          }
          .modal-content.wide {
            max-width: 100% !important;
            max-height: none !important;
            height: auto !important;
            min-height: 100vh !important;
            border-radius: 0 !important;
            padding: 1.2rem 0.5rem 120px 0.5rem !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .modal-content.wide form {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          /* Title Bar */
          .sales-modal-header {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 0.75rem !important;
            margin-bottom: 1.25rem !important;
          }
          .sales-modal-header button.btn-outline {
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            color: #64748b !important;
            width: 38px !important;
            height: 38px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 0 !important;
          }

          /* Info Card */
          .sales-info-card {
            background: white !important;
            border: 1px solid #f1f5f9 !important;
            border-radius: 1rem !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
            padding: 1rem !important;
            margin-bottom: 1rem !important;
          }
          .order-dates-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
          }
          .order-dates-grid .input-field {
            font-size: 11px !important;
            padding: 0 4px !important;
          }
          .order-dates-grid label {
            font-size: 10px !important;
            margin-bottom: 4px !important;
          }

          /* Customer Card */
          .customer-card {
            background: white !important;
            border: 1px solid #f1f5f9 !important;
            border-radius: 1rem !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
            padding: 1rem !important;
            margin-bottom: 1.25rem !important;
          }
          .customer-card button {
            width: 100% !important;
            background-color: #13898f !important;
            color: white !important;
            font-weight: bold !important;
            border-radius: 8px !important;
            height: 42px !important;
          }

          /* Items section header buttons */
          .items-header-container {
            display: flex !important;
            flex-direction: column-reverse !important;
            border-bottom: none !important;
            margin-bottom: 0.5rem !important;
            padding-bottom: 0 !important;
            gap: 12px !important;
          }
          .items-header-container h4 {
            font-size: 15px !important;
          }
          .items-header-buttons {
            display: flex !important;
            flex-direction: row-reverse !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .items-header-buttons button {
            flex: 1 !important;
            height: 42px !important;
            border-radius: 8px !important;
            font-size: 13px !important;
            font-weight: bold !important;
          }
          .items-header-buttons button.btn-primary {
            background-color: #13898f !important;
          }
          .items-header-buttons button.btn-outline {
            border: 1px solid #e2e8f0 !important;
            color: #64748b !important;
            background-color: white !important;
          }

          /* Table inputs & alignment */
          .modal-table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          .modal-table-container {
            display: none !important;
          }
          .mobile-only-card-list {
            display: block !important;
          }
          .modal-table th, .modal-table td {
            padding: 6px 2px !important;
            font-size: 11px !important;
          }
          .modal-table input[type="text"], .modal-table select {
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            height: 32px !important;
            font-size: 11px !important;
            padding: 0 4px !important;
          }
          /* Explicit cell widths on mobile */
          .modal-table th:nth-child(1), .modal-table td:nth-child(1) {
            width: 30px !important;
            min-width: 30px !important;
          }
          .modal-table th:nth-child(2), .modal-table td:nth-child(2) {
            width: 135px !important;
            min-width: 135px !important;
          }
          .modal-table th:nth-child(3), .modal-table td:nth-child(3) {
            width: 40px !important;
            min-width: 40px !important;
          }
          .modal-table th:nth-child(4), .modal-table td:nth-child(4) {
            width: 65px !important;
            min-width: 65px !important;
          }
          .modal-table th:nth-child(5), .modal-table td:nth-child(5) {
            width: 65px !important;
            min-width: 65px !important;
          }
          .modal-table th:nth-child(6), .modal-table td:nth-child(6) {
            width: 24px !important;
            min-width: 24px !important;
          }
          
          /* Dropdown arrow position override */
          .modal-table td:nth-child(2) input {
            padding: 0 1.25rem 0 0.25rem !important;
            font-size: 10px !important;
          }
          .modal-table td:nth-child(3) input {
            max-width: 100% !important;
            padding: 0 !important;
            text-align: center !important;
          }
          
          /* Stack the sorting buttons */
          .modal-table td:nth-child(1) .flex-center,
          .modal-table td:nth-child(1) .flex {
            gap: 2px !important;
            flex-direction: column !important;
          }
          .modal-table td:nth-child(1) button {
            padding: 0 !important;
            width: 16px !important;
            height: 16px !important;
          }
          .modal-table td:nth-child(1) button svg {
            width: 12px !important;
            height: 12px !important;
          }
          
          /* Stack action buttons / shrink trash bin */
          .modal-table td:nth-child(6) .flex {
            gap: 4px !important;
            justify-content: center !important;
          }
          .modal-table td:nth-child(6) button {
            width: 24px !important;
            height: 24px !important;
            padding: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .modal-table td:nth-child(6) button svg {
            width: 13px !important;
            height: 13px !important;
          }

          /* Extra cards */
          .sales-extra-container {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin-bottom: 1.5rem !important;
          }
          .sales-extra-container .grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .sales-extra-container .input-group {
            background: white !important;
            border: 1px solid #f1f5f9 !important;
            border-radius: 1rem !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
            padding: 1rem !important;
            margin-bottom: 0 !important;
          }

          /* Footer Actions */
          .premium-modal-actions {
            display: flex !important;
            flex-direction: row-reverse !important;
            gap: 12px !important;
            margin-top: auto !important;
            padding-top: 1rem !important;
          }
          .premium-modal-actions button {
            flex: 1 !important;
            height: 44px !important;
            border-radius: 10px !important;
            font-size: 14px !important;
            font-weight: bold !important;
            margin: 0 !important;
          }
          .premium-modal-actions button.btn-premium-save {
            background-color: #13898f !important;
            color: white !important;
          }
          .premium-modal-actions button.btn-premium-cancel {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            color: #64748b !important;
          }

          /* SweetAlert Popup Compact Design on Mobile */
          .premium-modal-container .premium-modal-popup {
            width: 95% !important;
            padding: 0.75rem 0.5rem !important;
          }
          .premium-modal-container .premium-modal-header {
            padding-bottom: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          .premium-modal-container .premium-modal-title {
            font-size: 14px !important;
          }
          .premium-modal-container .premium-modal-title svg {
            width: 18px !important;
            height: 18px !important;
          }
          .premium-modal-container .premium-modal-close {
            width: 28px !important;
            height: 28px !important;
          }
          .premium-modal-container .premium-form {
            margin-top: 0.25rem !important;
          }
          .premium-modal-container .swal-grid {
            gap: 6px !important;
          }
           .premium-modal-container .premium-form-group {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
            margin-bottom: 0 !important;
          }
          .premium-modal-container .premium-form-group label {
            font-size: 10px !important;
            margin-bottom: 2px !important;
            text-align: right !important;
          }
          .premium-modal-container .premium-input {
            height: 32px !important;
            font-size: 11px !important;
            padding: 0.25rem 0.5rem !important;
            border-radius: 6px !important;
            width: 100% !important;
          }
          .premium-modal-container button#swal-add-location-btn {
            width: 32px !important;
            height: 32px !important;
            border-radius: 6px !important;
            font-size: 14px !important;
          }
          .premium-modal-container .swal-col-6 {
            grid-column: span 6 !important;
          }
          .premium-modal-container .swal-full-width {
            grid-column: span 12 !important;
          }
          .premium-modal-container .swal-hide-mobile {
            display: none !important;
          }
          .preview-item-badge {
            display: inline-flex !important;
            height: 28px !important;
            font-size: 0.78rem !important;
            width: auto !important;
            padding: 0 10px !important;
            border-radius: 6px !important;
          }
          .premium-modal-container .premium-modal-actions {
            margin-top: 0.75rem !important;
            padding-top: 0.5rem !important;
            display: flex !important;
            flex-direction: row-reverse !important;
            gap: 8px !important;
          }
          .premium-modal-container .premium-modal-actions button {
            height: 36px !important;
            font-size: 12px !important;
            flex: 1 !important;
            margin: 0 !important;
          }
        }
      `}} />
      <MultiColorSelectionModal
        isOpen={showMultiColorModal}
        onClose={() => setShowMultiColorModal(false)}
        onAddItems={handleAddMultiColors}
        stockColors={globalSettings.stockColors || []}
        stock={stock}
        orders={orders}
      />
    </>
  );
};

export default AdminSales;
