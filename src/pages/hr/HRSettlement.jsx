import React, { useState, useEffect } from 'react';
import { getEmployees, getHRAdvances, getHRLeaves, getGlobalSettings } from '../../store';
import { FileText, User, DollarSign, Calendar, Package } from 'lucide-react';
import Select from 'react-select';

const HRSettlement = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [emps, advs, glbSettings] = await Promise.all([
        getEmployees(),
        getHRAdvances(),
        getGlobalSettings()
      ]);
      setEmployees(emps || []);
      setAdvances(advs || []);
      setSettings(glbSettings || {});
      setLoading(false);
    };
    fetchData();
  }, []);

  const employeeOptions = employees.map(emp => ({
    value: emp.id,
    label: `${emp.name} (${emp.id})`
  }));

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  let unpaidAdvances = 0;
  let vacationBalance = 0;
  let vacationValue = 0;
  let dailyRate = 0;
  let basicSalary = 0;

  if (selectedEmployee) {
    basicSalary = Number(selectedEmployee.basicSalary) || 0;
    const hrSettings = settings?.hrSettings || {};
    const workDays = hrSettings.workDaysPerMonth || 30;
    dailyRate = basicSalary / workDays;
    vacationBalance = Number(selectedEmployee.vacationBalance) || 0;
    vacationValue = vacationBalance * dailyRate;

    const empAdvances = advances.filter(a => a.employeeId === selectedEmployeeId && a.status === 'موافق');
    
    unpaidAdvances = empAdvances.reduce((sum, a) => {
      if (a.isPaid) return sum;
      let amount = Number(a.approvedAmount) || Number(a.amount) || 0;
      
      let paidSoFar = 0;
      if (a.isInstallment && a.installments) {
        a.installments.forEach(inst => {
          if (inst.isPaid) paidSoFar += Number(inst.amount);
        });
      }
      
      return sum + Math.max(0, amount - paidSoFar);
    }, 0);
  }

  return (
    <div className="glass-card flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex-responsive mb-6 border-b pb-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <FileText style={{ color: 'var(--primary)' }} /> الاستعلام ومخالصة الموظف
          </h2>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
            ملخص فوري لمستحقات وذمم الموظف
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8">جاري التحميل...</div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#1e293b' }}>اختر الموظف:</label>
            <Select
              options={employeeOptions}
              onChange={(opt) => setSelectedEmployeeId(opt ? opt.value : null)}
              isClearable
              placeholder="ابحث عن موظف..."
              styles={{
                control: (base) => ({ ...base, borderRadius: '12px', borderColor: '#e2e8f0', padding: '4px', minHeight: '50px' })
              }}
            />
          </div>

          {selectedEmployee ? (
            <div className="animate-fade-in">
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                    <User size={32} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#0f172a' }}>{selectedEmployee.name}</h3>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>الرقم: {selectedEmployee.id} | القسم: {selectedEmployee.department || '-'}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '10px', color: '#059669' }}>
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>رصيد الإجازات المتبقي</p>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>{vacationBalance} يوم</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#059669' }}>يقدر بـ {Math.round(vacationValue)} د.أ</p>
                    </div>
                  </div>

                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '10px', color: '#dc2626' }}>
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>السلف غير المسددة (ذمم)</p>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem', color: '#dc2626' }}>{Math.round(unpaidAdvances)} د.أ</p>
                    </div>
                  </div>
                  
                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', gridColumn: '1 / -1' }}>
                    <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '10px', color: '#4f46e5' }}>
                      <Package size={24} />
                    </div>
                    <div>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>الراتب الأساسي المعتمد للمخالصة</p>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem', color: '#4f46e5' }}>{basicSalary} د.أ <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(يومية: {Math.round(dailyRate)} د.أ)</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Settlement Box */}
              <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '0.9rem' }}>صافي المخالصة المبدئي (للعلم فقط)</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {Math.round((vacationValue) - unpaidAdvances)}
                    <span style={{ fontSize: '1rem', color: '#94a3b8' }}>د.أ</span>
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#cbd5e1' }}>* لا يشمل أي رواتب محتجزة أو أيام داومها خلال الشهر الحالي ولم تُدفع بعد.</p>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <button onClick={() => window.print()} className="btn btn-primary" style={{ background: '#3b82f6', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: 'bold', color: 'white', cursor: 'pointer' }}>
                    طباعة الملخص
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
              <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#64748b' }}>يرجى اختيار موظف للبدء</p>
              <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>ستتمكن من رؤية ملخص فوري للسلف، ورصيد الإجازات، والذمم.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HRSettlement;
