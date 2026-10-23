import Swal from 'sweetalert2';
import { createEmployeeAlert } from '../services/hr';

export const promptEmployeeAlert = async ({ employeeId, employeeName, source, sourceReference = '', suggestedMessage = '', user }) => {
  const result = await Swal.fire({
    titleText: `إرسال ملاحظة إلى ${employeeName}`,
    html: `<div dir="rtl" style="text-align:right"><label style="display:block;margin-bottom:7px;font-weight:800">نص الملاحظة</label><textarea id="employee-alert-message" class="swal2-textarea" style="width:100%;margin:0;min-height:140px" placeholder="اكتب الملاحظة بوضوح..."></textarea><small style="display:block;margin-top:8px;color:#64748b">المصدر: </small></div>`,
    didOpen: () => {
      document.getElementById('employee-alert-message').value = suggestedMessage;
      const sourceLabel = Swal.getHtmlContainer()?.querySelector('small');
      if (sourceLabel) sourceLabel.textContent = 'المصدر: ' + source;
    },
    showCancelButton: true,
    confirmButtonText: 'إرسال الملاحظة',
    cancelButtonText: 'إلغاء',
    confirmButtonColor: '#0f8b8d',
    preConfirm: () => {
      const message = document.getElementById('employee-alert-message')?.value.trim();
      if (!message) return Swal.showValidationMessage('أدخل نص الملاحظة');
      return message;
    }
  });
  if (!result.isConfirmed) return false;
  try {
  await createEmployeeAlert({ employeeId, employeeName, message: result.value, source, sourceReference, sentById: user?.id || '', sentByName: user?.name || 'الإدارة' });
  await Swal.fire({ icon: 'success', title: 'تم إرسال الملاحظة', text: 'سيظهر للموظف عند فتح التطبيق حتى يؤكد استلامه.', confirmButtonColor: '#0f8b8d' });
  return true;
  } catch (error) {
    await Swal.fire({ icon: 'error', titleText: 'تعذر إرسال الملاحظة', text: error.message || 'يرجى إعادة المحاولة' });
    return false;
  }
};
