import React, { useState, useEffect } from 'react';
import { ChevronRight, User, Phone, Briefcase, Calendar, Clock, MapPin, DollarSign, AlertTriangle, FileText, CheckCircle2, X , ArrowUpDown, Package } from 'lucide-react';
import { getEmployees, getHRAttendance, getHRLeaves, getHRViolations, saveHRAdvance, getGlobalSettings, getHRAssets } from '../../store';
import Flatpickr from 'react-flatpickr';
import Swal from 'sweetalert2';

const EmployeeProfile = ({ user, employeeId, onBack }) => {
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [violations, setViolations] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [employeeAssets, setEmployeeAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    type: 'سلفة شخصية',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    reason: '',
    paymentMethod: 'خصم من الراتب القادم',
    status: 'معلق'
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [emps, att, lvs, viols, settings, allAssets] = await Promise.all([
        getEmployees(), getHRAttendance(), getHRLeaves(), getHRViolations(), getGlobalSettings(), getHRAssets()
      ]);
      const emp = emps.find(e => e.id === employeeId);
      setEmployee(emp);
      setGlobalSettings(settings || {});
      
      if (emp) {
        setAttendance(att.filter(a => a.employeeId === emp.id).sort((a,b) => new Date(b.date) - new Date(a.date)));
        setLeaves(lvs.filter(l => l.employeeId === emp.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setViolations(viols.filter(v => v.employeeId === emp.id).sort((a,b) => new Date(b.date) - new Date(a.date)));
        setEmployeeAssets(allAssets.filter(a => a.employeeId === emp.id).sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      }
      setLoading(false);
    };
    fetchData();
  }, [employeeId]);

  if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!employee) return <div className="text-center p-10 text-gray-500">الموظف غير موجود</div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Profile Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button onClick={onBack} className="premium-tab premium-tab-active" style={{ border: 'none', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
            <ChevronRight size={18} /> العودة لقائمة الموظفين
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(globalSettings?.hrSettings?.allowAdvances !== false) && (
              <button onClick={() => setShowAdvanceModal(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.375rem', borderRadius: '0.5rem' }}>
                <DollarSign size={16} /> طلب سلفة
              </button>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{employee.name}</h1>
              <p style={{ color: 'var(--primary)', fontWeight: '500', margin: '0.5rem 0 0 0', fontSize: '1.1rem' }}>{employee.jobTitle || 'موظف'}</p>
            </div>
            <span style={{ 
              padding: '0.375rem 1rem', 
              borderRadius: '9999px', 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              border: '1px solid',
              ...(employee.employmentStatus === 'فعال' ? { backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#d1fae5' } : { backgroundColor: '#fff1f2', color: '#e11d48', borderColor: '#ffe4e6' })
            }}>
              {employee.employmentStatus || 'فعال'}
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <Briefcase size={18} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>القسم: <strong style={{ color: '#1e293b' }}>{employee.department || '-'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <User size={18} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>الرقم الوظيفي: <strong style={{ color: '#1e293b' }}>{employee.id}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <Phone size={18} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>رقم الهاتف: <strong style={{ color: '#1e293b' }} dir="ltr">{employee.phone || '-'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <Calendar size={18} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>تاريخ التعيين: <strong style={{ color: '#1e293b' }}>{employee.joinDate || '-'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
              <Calendar size={18} style={{ color: '#94a3b8' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>تاريخ الميلاد: <strong style={{ color: '#1e293b' }}>{employee.dateOfBirth || '-'}</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
        {/* Sidebar Tabs */}
        <div className="premium-tabs-container" style={{ padding: '1rem', borderBottom: '1px solid var(--surface-border)', margin: 0 }}>
          <div onClick={() => setActiveTab('info')} className={`premium-tab ${activeTab === 'info' ? 'premium-tab-active' : 'premium-tab-inactive'}`}>
            <User size={18} /> <span>المعلومات العامة</span>
          </div>
          <div onClick={() => setActiveTab('attendance')} className={`premium-tab ${activeTab === 'attendance' ? 'premium-tab-active' : 'premium-tab-inactive'}`}>
            <Clock size={18} /> <span>سجل الحضور</span>
          </div>
          <div onClick={() => setActiveTab('leaves')} className={`premium-tab ${activeTab === 'leaves' ? 'premium-tab-active' : 'premium-tab-inactive'}`}>
            <Calendar size={18} /> <span>الإجازات والمغادرات</span>
          </div>
          <div onClick={() => setActiveTab('violations')} className={`premium-tab ${activeTab === 'violations' ? 'premium-tab-active' : 'premium-tab-inactive'}`}>
            <AlertTriangle size={18} /> <span>المخالفات</span>
          </div>
          <div onClick={() => setActiveTab('assets')} className={`premium-tab ${activeTab === 'assets' ? 'premium-tab-active' : 'premium-tab-inactive'}`}>
            <Package size={18} /> <span>العهد والأصول</span>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-6 flex-1 bg-white">
          
          {activeTab === 'info' && (
            <div className="animate-fade-in max-w-4xl" style={{ margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.75rem' }}>التفاصيل الوظيفية</h3>
              
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '2.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b', fontWeight: '500', width: '33%', borderLeft: '1px solid #e2e8f0' }}>الراتب الأساسي</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1e293b', fontSize: '1.125rem' }}>{employee.basicSalary || 0} د.أ</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b', fontWeight: '500', width: '33%', borderLeft: '1px solid #e2e8f0' }}>بدل مواصلات</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1e293b', fontSize: '1.125rem' }}>{employee.transportationAllowance || 0} د.أ</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b', fontWeight: '500', width: '33%', borderLeft: '1px solid #e2e8f0' }}>رصيد الإجازات السنوي</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1e293b', fontSize: '1.125rem' }}>{employee.vacationBalance || 0} يوم</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#64748b', fontWeight: '500', width: '33%', borderLeft: '1px solid #e2e8f0' }}>المدير المباشر</td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: '#1e293b', fontSize: '1.125rem' }}>{employee.directManagerId || 'غير محدد'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.5rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: 'bold', color: '#1e293b' }}>صلاحية طلب السلف</h4>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>السماح للموظف بتقديم طلبات سلف من خلال حسابه.</p>
                </div>
                <label className="premium-switch">
                  <input
                    type="checkbox"
                    checked={employee.allowAdvances !== false}
                    onChange={async (e) => {
                      const updated = { ...employee, allowAdvances: e.target.checked };
                      setEmployee(updated);
                      await saveEmployee(updated);
                      Swal.fire({
                        title: 'تم الحفظ',
                        text: 'تم تحديث صلاحية السلف للموظف',
                        icon: 'success',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                      });
                    }}
                  />
                  <span>{employee.allowAdvances !== false ? 'مسموح' : 'ممنوع'}</span>
                </label>
              </div>

              {employee.hrNotes && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">ملاحظات إدارية</h3>
                  <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm leading-relaxed border border-amber-100">
                    {employee.hrNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2">سجل الحضور والانصراف</h3>
              {attendance.length === 0 ? (
                <p className="text-gray-500 text-center py-10 bg-gray-50 rounded-xl">لا توجد سجلات حضور مسجلة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm">
                        <th className="py-3 px-4 font-medium rounded-r-xl">التاريخ</th>
                        <th className="py-3 px-4 font-medium">الدخول</th>
                        <th className="py-3 px-4 font-medium">الخروج</th>
                        <th className="py-3 px-4 font-medium">الوضع</th>
                        <th className="py-3 px-4 font-medium">الإضافي</th>
                        <th className="py-3 px-4 font-medium rounded-l-xl">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attendance.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 text-slate-800 font-medium">{a.date}</td>
                          <td className="py-3 px-4 text-gray-600">{a.timeIn || '-'}</td>
                          <td className="py-3 px-4 text-gray-600">{a.timeOut || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${a.status==='مداوم'?'bg-emerald-50 text-emerald-600':a.status==='متأخر'?'bg-amber-50 text-amber-600':a.status==='إجازة'?'bg-blue-50 text-blue-600':'bg-rose-50 text-rose-600'}`}>{a.status}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{a.overtimeHours ? `${a.overtimeHours} ساعة` : '-'}</td>
                          <td className="py-3 px-4 text-gray-500 text-sm">{a.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2">الطلبات والمغادرات</h3>
              {leaves.length === 0 ? (
                <p className="text-gray-500 text-center py-10 bg-gray-50 rounded-xl">لا توجد طلبات إجازة مسجلة</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm">
                        <th className="py-3 px-4 font-medium rounded-r-xl">النوع</th>
                        <th className="py-3 px-4 font-medium">تاريخ الطلب</th>
                        <th className="py-3 px-4 font-medium">المدة</th>
                        <th className="py-3 px-4 font-medium">التاريخ الفعلي</th>
                        <th className="py-3 px-4 font-medium">الحالة</th>
                        <th className="py-3 px-4 font-medium rounded-l-xl">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {leaves.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-medium text-slate-800">{l.type}</td>
                          <td className="py-3 px-4 text-gray-500 text-sm">{new Date(l.createdAt).toLocaleDateString('ar-EG')}</td>
                          <td className="py-3 px-4 text-gray-600">{l.duration}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{l.startDate}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${l.status==='موافق'?'bg-emerald-50 text-emerald-600':l.status==='مرفوض'?'bg-rose-50 text-rose-600':'bg-amber-50 text-amber-600'}`}>{l.status}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-sm">{l.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'violations' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2">المخالفات والخصومات</h3>
              {violations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                  <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
                  <p className="text-emerald-700 font-medium text-lg">سجل الموظف نظيف</p>
                  <p className="text-emerald-600/70 text-sm">لا توجد مخالفات مسجلة على هذا الموظف.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-rose-50 text-rose-700 text-sm">
                        <th className="py-3 px-4 font-medium rounded-r-xl">التاريخ</th>
                        <th className="py-3 px-4 font-medium">النوع</th>
                        <th className="py-3 px-4 font-medium">الإجراء</th>
                        <th className="py-3 px-4 font-medium">قيمة الخصم</th>
                        <th className="py-3 px-4 font-medium rounded-l-xl">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {violations.map(v => (
                        <tr key={v.id} className="hover:bg-rose-50/30">
                          <td className="py-3 px-4 font-medium text-slate-800">{v.date}</td>
                          <td className="py-3 px-4 text-rose-600 font-medium">{v.type}</td>
                          <td className="py-3 px-4 text-slate-700">{v.action}</td>
                          <td className="py-3 px-4 text-rose-600 font-bold">{v.deductionAmount ? `${v.deductionAmount} د.أ` : '-'}</td>
                          <td className="py-3 px-4 text-gray-600 text-sm">{v.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2 flex items-center gap-2">
                <Package className="text-primary" size={24} />
                العهد المسلمة للموظف
              </h3>
              {employeeAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border border-slate-100 rounded-2xl">
                  <Package size={40} className="text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium text-lg">لا يوجد عهد مسجلة باسم الموظف</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-sm">
                        <th className="py-3 px-4 font-bold rounded-r-xl">رقم العهدة</th>
                        <th className="py-3 px-4 font-bold">اسم العهدة</th>
                        <th className="py-3 px-4 font-bold">التصنيف</th>
                        <th className="py-3 px-4 font-bold">تاريخ التسليم</th>
                        <th className="py-3 px-4 font-bold">الحالة</th>
                        <th className="py-3 px-4 font-bold rounded-l-xl">سجل الحركات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {employeeAssets.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-medium text-slate-600" dir="ltr">{a.assetNumber}</td>
                          <td className="py-3 px-4 text-primary font-bold">{a.name}</td>
                          <td className="py-3 px-4 text-slate-600">{a.category || '-'}</td>
                          <td className="py-3 px-4 text-slate-600 text-sm">{a.handoverDate}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${a.status==='نشطة'?'bg-emerald-100 text-emerald-700':a.status==='مسترجعة'?'bg-blue-100 text-blue-700':'bg-rose-100 text-rose-700'}`}>{a.status}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-sm">
                            <button className="text-primary hover:underline font-bold" onClick={() => {
                               let historyHtml = '<div class="text-right" style="direction: rtl; max-height: 300px; overflow-y: auto;">';
                               if (!a.history || a.history.length === 0) historyHtml += '<p>لا يوجد سجل</p>';
                               else {
                                 [...a.history].sort((x,y) => new Date(y.date) - new Date(x.date)).forEach(h => {
                                   historyHtml += `
                                     <div class="mb-3 p-3 border-r-4 border-primary bg-slate-50 rounded">
                                       <strong class="text-primary">${h.action}</strong>
                                       <p class="text-sm mt-1">${h.details}</p>
                                       <span class="text-xs text-slate-500">${new Date(h.date).toLocaleDateString('en-GB')} - بواسطة: ${h.by || 'النظام'}</span>
                                     </div>
                                   `;
                                 });
                               }
                               historyHtml += '</div>';
                               Swal.fire({ title: `سجل ${a.name}`, html: historyHtml, confirmButtonText: 'إغلاق' });
                            }}>
                              عرض السجل ({a.history?.length || 0})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Advance Request Modal */}
      {showAdvanceModal && (
        <div className="modal-overlay" style={{ zIndex: 10500 }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-lg text-slate-800">طلب سلفة</h3>
              <button type="button" onClick={() => setShowAdvanceModal(false)} className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!advanceForm.amount || advanceForm.amount <= 0) {
                Swal.fire('تنبيه', 'الرجاء إدخال مبلغ صحيح', 'warning');
                return;
              }
              const amountNum = Number(advanceForm.amount);
              const maxPct = globalSettings?.hrSettings?.maxAdvancePercentage ?? 50;
              const maxAmount = (employee.basicSalary * maxPct) / 100;
              
              if (amountNum > maxAmount) {
                Swal.fire('مرفوض', `لا يمكن أن تتجاوز السلفة ${maxPct}% من الراتب الأساسي (${maxAmount} د.أ)`, 'error');
                return;
              }

              if (!advanceForm.reason || advanceForm.reason.trim() === '') {
                Swal.fire('تنبيه', 'الرجاء إدخال سبب السلفة', 'warning');
                return;
              }

              try {
                await saveHRAdvance({
                  ...advanceForm,
                  amount: amountNum,
                  employeeId: employee.id,
                  employeeName: employee.name,
                  department: employee.department || 'غير محدد'
                }, user);
                
                Swal.fire('نجاح', 'تم تقديم طلب السلفة بنجاح وهو بانتظار الموافقة', 'success');
                setShowAdvanceModal(false);
                setAdvanceForm({ type: 'سلفة شخصية', date: new Date().toISOString().split('T')[0], amount: '', reason: '', paymentMethod: 'خصم من الراتب القادم', status: 'معلق' });
              } catch (error) {
                Swal.fire('خطأ', 'حدث خطأ أثناء حفظ الطلب', 'error');
              }
            }}>
              <div className="p-5" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>نوع السلفة *</label>
                    <select 
                      value={advanceForm.type} 
                      onChange={e => {
                        const newType = e.target.value;
                        setAdvanceForm({
                          ...advanceForm, 
                          type: newType,
                          paymentMethod: newType === 'سلفة شخصية' ? 'خصم من الراتب القادم' : 'تصرف نقداً'
                        });
                      }} 
                      className="input-field" 
                      required
                    >
                      <option value="سلفة شخصية">سلفة شخصية</option>
                      <option value="سلفة عمل">سلفة عمل</option>
                    </select>
                  </div>
                  
                  <div className="input-group">
                    <label>التاريخ *</label>
                    <Flatpickr 
                      value={advanceForm.date} 
                      onChange={(dates, dateStr) => setAdvanceForm({...advanceForm, date: dateStr})} 
                      className="input-field" 
                      options={{ dateFormat: 'Y-m-d' }}
                      required
                    />
                  </div>
                  
                  {advanceForm.type === 'سلفة شخصية' ? (
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex items-center gap-2">
                        <span className="font-bold">توضيح:</span> سيتم خصم قيمة هذه السلفة من الراتب القادم.
                      </div>
                    </div>
                  ) : (
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>طريقة الصرف *</label>
                      <select 
                        value={advanceForm.paymentMethod} 
                        onChange={e => setAdvanceForm({...advanceForm, paymentMethod: e.target.value})} 
                        className="input-field" 
                        required
                      >
                        <option value="تصرف نقداً">تصرف نقداً</option>
                        <option value="تصرف على الراتب القادم">تصرف على الراتب القادم</option>
                      </select>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>قيمة السلفة (د.أ) *</label>
                    <input type="number" step="1" min="1" value={advanceForm.amount} onChange={e=>setAdvanceForm({...advanceForm, amount: e.target.value})} className="input-field" required />
                    <p className="text-xs text-gray-500 mt-1">الحد الأقصى المسموح: {((employee.basicSalary * (globalSettings?.hrSettings?.maxAdvancePercentage ?? 50)) / 100).toFixed(0)} د.أ</p>
                  </div>
                </div>

                <div className="input-group">
                  <label>السبب *</label>
                  <textarea rows={3} value={advanceForm.reason} onChange={e=>setAdvanceForm({...advanceForm, reason: e.target.value})} className="input-field" required></textarea>
                </div>
              </div>
              <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: '#fff', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
                <button type="button" onClick={() => setShowAdvanceModal(false)} className="btn btn-outline">إلغاء</button>
                <button type="submit" className="btn btn-primary px-6">إرسال الطلب</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
