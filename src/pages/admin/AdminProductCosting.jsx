import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, Trash2, Save, BadgeDollarSign, Settings, History, Package, Factory, Clock3, TrendingUp, ShieldCheck, AlertTriangle, Building2, Zap, Wrench, Users, Droplets, CircleDollarSign } from 'lucide-react';
import Swal from 'sweetalert2';
import Select from '../../components/SearchSelect';
import { getMasterProducts, getStock, getEmployees, getHRLeaves, getHolidays, getGlobalSettings, getProductCosting, getProductCostingHistory, getCostCenterSettings, saveCostCenterSettings, saveProductCosting, approveProductSellingPrice, saveMasterProduct } from '../../store';
import { buildVisiblePriceListCatalog } from '../../utils/priceListCatalog';

const money = (v) => (Number(v) || 0).toFixed(3);
const isActiveCostingEmployee = (employee = {}) => {
  if (employee.isActive === false || employee.active === false) return false;
  const statusText = [employee.employmentStatus, employee.status, employee.employeeStatus]
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return !['مستقيل', 'استقال', 'منتهي خدمات', 'منتهي الخدمة', 'منتهي', 'غير فعال', 'غير نشط', 'موقوف']
    .some(blockedStatus => statusText.includes(blockedStatus));
};
const DEFAULT_SETTINGS = {
  defaultMinuteCost: 0,
  directLaborEmployeeIds: [],
  breakHoursDaily: 0.5,
  expenses: [
    { name: 'إيجار المصنع', amount: 0 }, { name: 'الكهرباء', amount: 0 },
    { name: 'الصيانة واستهلاك الماكينات', amount: 0 }, { name: 'رواتب الإشراف والإدارة الصناعية', amount: 0 },
    { name: 'المياه والنظافة', amount: 0 }, { name: 'مصاريف تشغيل أخرى', amount: 0 }
  ],
  ratingRules: { excellent: 25, good: 15, weak: 5, minimum: 0 }
};
const EMPTY = {
  productId: '', productOptionValue: '', masterProductId: '', productName: '', productCode: '', productUnit: 'قطعة', quantity: 1, inputMode: 'perUnit', wastePercent: 0, directLaborEmployeeIds: [],
  materials: [{ name: '', quantityPerUnit: 0, unitPrice: 0 }],
  stages: [{ name: 'قص', minutes: 0 }, { name: 'خياطة', minutes: 0 }, { name: 'حشي', minutes: 0 }, { name: 'تشطيب', minutes: 0 }, { name: 'تغليف', minutes: 0 }],
  pricingMethod: 'markup', desiredMargin: 35, desiredMarkup: 35, salePrice: 0, targetPrice: 0, minimumPrice: 0,
  salesCommissionPercent: 1.5, includeCommissionInSalePrice: true,
  quantityTiers: [
    { from: 1, to: 99, discountPercent: 0, salePrice: 0, minimumPrice: 0 },
    { from: 100, to: 499, discountPercent: 3, salePrice: 0, minimumPrice: 0 },
    { from: 500, to: 999, discountPercent: 5, salePrice: 0, minimumPrice: 0 },
    { from: 1000, to: 4999, discountPercent: 8, salePrice: 0, minimumPrice: 0 },
    { from: 5000, to: null, discountPercent: 10, salePrice: 0, minimumPrice: 0 }
  ], notes: ''
};

const Section = ({ title, icon, children, color = '#0f766e' }) => (
  <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
    <h3 style={{ margin: '0 0 14px', display: 'flex', gap: 8, alignItems: 'center', color: '#0f172a', fontSize: 16 }}>{React.cloneElement(icon, { size: 19, color })}{({
      '2. تكلفة المواد الخام': '3. تكلفة المواد الخام ومستهلكات الخياطة',
      '3. أجور التصنيع حسب المراحل': '4. أجور التصنيع حسب المراحل',
      '4. مصاريف التشغيل': '5. حصة مصاريف المصنع',
      '5. التكلفة النهائية': '6. التكلفة النهائية',
      '6. تحديد سعر البيع': '7. تحديد سعر البيع',
      '7. تحليل الكمية الإجمالية': '8. تحليل الكمية الإجمالية'
    }[title] || title)}</h3>
    {children}
  </section>
);
const Input = (props) => <input {...props} style={{ width: '100%', height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 9px', textAlign: props.type === 'number' ? 'center' : 'right', boxSizing: 'border-box', ...props.style }} />;

const AdminProductCosting = ({ user }) => {
  const [products, setProducts] = useState([]);
  const [productSourceFilter, setProductSourceFilter] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [data, setData] = useState(EMPTY);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('calculator');
  const [loading, setLoading] = useState(true);
  const [expandedCost, setExpandedCost] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [weekendDays, setWeekendDays] = useState(['الجمعة']);

  useEffect(() => { (async () => {
    const [master, stock, employeeData, savedSettings, leaveData, holidayData, globalSettings] = await Promise.all([getMasterProducts(), getStock(), getEmployees(), getCostCenterSettings(), getHRLeaves(), getHolidays(), getGlobalSettings()]);
    const masterList = master || [];
    let stockList = stock || [];
    // getStock returns [] when a transient Firestore read fails. Retry the
    // catalog read once so the selector cannot silently fall back to only the
    // smaller master-products subset.
    if (stockList.length === 0) stockList = (await getStock()) || [];
    const uniqueStockItems = [];
    const seenItemNumbers = new Set();
    stockList.forEach(item => {
      if (item.category !== 'بضاعة جاهزة') return;
      if (item.itemNumber && item.itemNumber.trim() !== '') {
        if (seenItemNumbers.has(item.itemNumber)) return;
        seenItemNumbers.add(item.itemNumber);
      }
      uniqueStockItems.push(item);
    });

    const findMaster = item => masterList.find(masterProduct =>
      (masterProduct.itemNumber && item.itemNumber && masterProduct.itemNumber === item.itemNumber)
      || (masterProduct.name && item.name && masterProduct.name.trim() === item.name.trim())
    );
    const toStockProduct = item => {
      const matchedMaster = findMaster(item);
      return {
        id: item.id,
        optionValue: `stock:${item.id}`,
        masterId: matchedMaster?.id || '',
        name: item.name,
        code: item.itemNumber || item.itemCode || '',
        unit: item.unit || matchedMaster?.unit || 'قطعة',
        source: 'stock'
      };
    };
    const stockCatalog = uniqueStockItems.map(toStockProduct);

    const priceListCatalog = buildVisiblePriceListCatalog(masterList, stockList).map(item => ({
      id: item.stockId || item.masterId || item.id,
      optionValue: `price_list:${item.catalogRowId}`,
      masterId: item.masterId || '',
      name: item.name,
      code: item.itemNumber === '-' ? '' : (item.itemNumber || ''),
      unit: item.unit || 'قطعة',
      source: 'price_list'
    }));

    const merged = [...stockCatalog, ...priceListCatalog];
    merged.sort((a, b) => {
      const byName = String(a.name || '').localeCompare(String(b.name || ''), 'ar', { sensitivity: 'base', numeric: true });
      return byName || String(a.code || '').localeCompare(String(b.code || ''), 'ar', { numeric: true });
    });
    setProducts(merged); setEmployees((employeeData || []).filter(isActiveCostingEmployee)); setLeaves(leaveData || []); setHolidays(holidayData || []); setWeekendDays(globalSettings?.hrSettings?.weekendDays?.length ? globalSettings.hrSettings.weekendDays : ['الجمعة']); setSettings({ ...DEFAULT_SETTINGS, ...(savedSettings || {}), breakHoursDaily: savedSettings?.breakHoursDaily ?? 0.5, ratingRules: { ...DEFAULT_SETTINGS.ratingRules, ...(savedSettings?.ratingRules || {}) } }); setLoading(false);
  })(); }, []);

  const productOptions = useMemo(() => {
    const toOption = product => ({
      value: product.optionValue,
      label: `${product.code ? `${product.code} — ` : ''}${product.name}`,
      source: product.source,
      code: product.code,
      name: product.name,
      product
    });
    const stockOptions = productSourceFilter === 'price_list'
      ? []
      : products.filter(product => product.source === 'stock').map(toOption);
    const priceListOptions = productSourceFilter === 'stock'
      ? []
      : products.filter(product => product.source === 'price_list').map(toOption);
    return [
      { label: 'أصناف المخزون', options: stockOptions },
      { label: 'الأصناف الظاهرة في قوائم الأسعار', options: priceListOptions }
    ].filter(group => group.options.length > 0);
  }, [products, productSourceFilter]);

  const expectedCapacity = useMemo(() => {
    const year = new Date().getFullYear();
    const breakMinutes = Math.max(0, Number(settings.breakHoursDaily) || 0) * 60;
    const approvedAnnualLeaves = (leaves || []).filter(leave => (leave.status === 'موافق' || leave.status === 'مقبول') && String(leave.type || '').includes('سنوية'));
    const officialHolidays = (holidays || []).filter(holiday => holiday.isActive !== false && String(holiday.type || '').includes('رسمية'));
    const perEmployeeAnnualMinutes = new Map();
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    let totalAnnualMinutes = 0;
    let totalScheduledEmployeeDays = 0;
    const dateString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const sameEmployee = (record, employee) => String(record.employeeId || '').trim() === String(employee.id || '').trim() || String(record.employeeName || '').trim() === String(employee.name || '').trim();
    const appliesHoliday = (holiday, employee, day) => {
      const from = String(holiday.fromDate || holiday.date || '').slice(0, 10); const to = String(holiday.toDate || holiday.fromDate || holiday.date || '').slice(0, 10);
      const audience = holiday.targetAudience;
      const appliesAudience = !audience || audience === 'all' || audience === 'جميع الموظفين' || audience === employee.department || (Array.isArray(audience) && audience.includes(employee.department));
      return appliesAudience && from && day >= from && day <= to;
    };
    employees.forEach(employee => {
      const [startHour, startMinute] = String(employee.shiftStart || '08:00').split(':').map(Number);
      const [endHour, endMinute] = String(employee.shiftEnd || '16:00').split(':').map(Number);
      let shiftMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute); if (shiftMinutes <= 0) shiftMinutes += 1440;
      const netShiftMinutes = Math.max(0, shiftMinutes - breakMinutes);
      let employeeAnnualMinutes = 0;
      for (let month = 0; month < 12; month += 1) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
          const date = new Date(year, month, dayNumber);
          const day = dateString(date);
          if (employee.joinDate && day < String(employee.joinDate).slice(0, 10)) continue;
          if (weekendDays.includes(arabicDays[date.getDay()])) continue;
          if (officialHolidays.some(holiday => appliesHoliday(holiday, employee, day))) continue;
          if (approvedAnnualLeaves.some(leave => sameEmployee(leave, employee) && day >= String(leave.startDate || leave.date || '').slice(0, 10) && day <= String(leave.endDate || leave.startDate || leave.date || '').slice(0, 10))) continue;
          employeeAnnualMinutes += netShiftMinutes; totalScheduledEmployeeDays += 1;
        }
      }
      totalAnnualMinutes += employeeAnnualMinutes;
      [employee.id, employee.employeeId, employee.name].filter(Boolean).forEach(key => perEmployeeAnnualMinutes.set(String(key).trim(), employeeAnnualMinutes));
    });
    return { year, totalAnnualMinutes, averageMonthlyNetMinutes: totalAnnualMinutes / 12, averageNetHoursPerDay: totalScheduledEmployeeDays ? totalAnnualMinutes / totalScheduledEmployeeDays / 60 : 0, perEmployeeAnnualMinutes, officialHolidayCount: officialHolidays.length, annualLeaveCount: approvedAnnualLeaves.length };
  }, [employees, holidays, leaves, settings.breakHoursDaily, weekendDays]);

  const monthlyExpenses = useMemo(() => (settings.expenses || []).reduce((s, x) => s + (Number(x.amount) || 0), 0), [settings.expenses]);
  const qty = Math.max(1, Number(data.quantity) || 1);
  const isProjectTotalMode = data.inputMode === 'projectTotal';
  const enteredMaterialsCost = data.materials.reduce((s, x) => s + (Number(x.quantityPerUnit) || 0) * (Number(x.unitPrice) || 0), 0);
  const materialBeforeWaste = isProjectTotalMode ? enteredMaterialsCost / qty : enteredMaterialsCost;
  const wasteCost = materialBeforeWaste * (Number(data.wastePercent) || 0) / 100;
  const materialsCost = materialBeforeWaste + wasteCost;
  const enteredTotalMinutes = data.stages.reduce((s, x) => s + (Number(x.minutes) || 0), 0);
  const totalMinutes = isProjectTotalMode ? enteredTotalMinutes / qty : enteredTotalMinutes;
  const totalHours = totalMinutes / 60;
  const totalWorkingDays = totalHours / Math.max(0.1, expectedCapacity.averageNetHoursPerDay || 8);
  const selectedDirectWorkers = employees.filter(e => (data.directLaborEmployeeIds || []).includes(String(e.id)));
  const directLaborMonthlyWages = selectedDirectWorkers.reduce((sum, e) => sum + (Number(e.basicSalary) || 0), 0);
  const directLaborAvailableMinutes = selectedDirectWorkers.reduce((sum, worker) => {
    const keys = [worker.id, worker.employeeId, worker.name].filter(Boolean).map(value => String(value).trim());
    const annualMinutes = keys.map(key => expectedCapacity.perEmployeeAnnualMinutes.get(key) || 0).find(value => value > 0) || 0;
    return sum + annualMinutes / 12;
  }, 0);
  const directLaborMinuteCost = directLaborAvailableMinutes ? directLaborMonthlyWages / directLaborAvailableMinutes : 0;
  const factoryExpenseShareMonthly = Math.max(0, monthlyExpenses - directLaborMonthlyWages);
  const actualFactoryHours = expectedCapacity.averageMonthlyNetMinutes / 60;
  const factoryExpenseHourlyRate = actualFactoryHours ? factoryExpenseShareMonthly / actualFactoryHours : 0;
  const factoryExpenseMinuteRate = factoryExpenseHourlyRate / 60;
  useEffect(() => {
    setSettings(current => Number(current.defaultMinuteCost) === directLaborMinuteCost ? current : { ...current, defaultMinuteCost: directLaborMinuteCost });
  }, [directLaborMinuteCost]);
  const stageMinuteRate = () => directLaborMinuteCost;
  const enteredLaborCost = data.stages.reduce((s, x) => s + (Number(x.minutes) || 0) * stageMinuteRate(x), 0);
  const laborCost = isProjectTotalMode ? enteredLaborCost / qty : enteredLaborCost;
  const operatingCost = totalMinutes * factoryExpenseMinuteRate;
  const finalUnitCost = materialsCost + laborCost + operatingCost;
  const salesCommissionPercent = Math.max(0, Number(data.salesCommissionPercent) || 0);
  const salesCommissionRate = Math.min(99.99, salesCommissionPercent) / 100;
  const includeCommissionInSalePrice = data.includeCommissionInSalePrice !== false;
  const breakEvenPrice = finalUnitCost / Math.max(.0001, 1 - salesCommissionRate);
  const desiredMargin = Number(data.desiredMargin) || 0;
  const desiredMarkup = Number(data.desiredMarkup) || 0;
  const calculatedSale = data.pricingMethod === 'margin'
    ? finalUnitCost / Math.max(.01, 1 - desiredMargin / 100 - (includeCommissionInSalePrice ? salesCommissionRate : 0))
    : data.pricingMethod === 'markup'
      ? finalUnitCost * (1 + desiredMarkup / 100) / (includeCommissionInSalePrice ? Math.max(.0001, 1 - salesCommissionRate) : 1)
      : (Number(data.salePrice) || 0) / (includeCommissionInSalePrice ? Math.max(.0001, 1 - salesCommissionRate) : 1);
  const salePrice = calculatedSale;
  const salesCommissionAmount = salePrice * salesCommissionRate;
  const profit = salePrice - finalUnitCost - salesCommissionAmount;
  const margin = salePrice ? profit / salePrice * 100 : 0;
  const markup = finalUnitCost ? profit / finalUnitCost * 100 : 0;
  const rating = (() => { const r = settings.ratingRules; if (profit < 0) return ['خاسرة', '#991b1b']; if (salePrice < Number(data.minimumPrice || breakEvenPrice)) return ['تحت الحد الأدنى', '#dc2626']; if (margin >= r.excellent) return ['ممتازة', '#16a34a']; if (margin >= r.good) return ['جيدة', '#65a30d']; if (margin >= r.weak) return ['ضعيفة', '#ea580c']; return ['تحت الحد الأدنى', '#dc2626']; })();

  const validationIssues = useMemo(() => {
    const issues = [];
    if (!data.productId) issues.push('يجب اختيار المنتج.');
    if (!Number(data.quantity) || Number(data.quantity) <= 0) issues.push('كمية الدراسة يجب أن تكون أكبر من صفر.');
    data.materials.forEach((material, index) => {
      const hasAnyValue = String(material.name || '').trim() || Number(material.quantityPerUnit) || Number(material.unitPrice);
      if (!hasAnyValue) return;
      if (!String(material.name || '').trim()) issues.push(`اسم المادة رقم ${index + 1} غير مدخل.`);
      if (!(Number(material.quantityPerUnit) > 0)) issues.push(`كمية المادة «${material.name || index + 1}» غير صحيحة.`);
      if (!(Number(material.unitPrice) > 0)) issues.push(`سعر المادة «${material.name || index + 1}» غير مدخل.`);
    });
    if (!data.materials.some(material => String(material.name || '').trim() && Number(material.quantityPerUnit) > 0 && Number(material.unitPrice) > 0)) issues.push('يجب إدخال مادة واحدة مكتملة على الأقل.');
    data.stages.forEach((stage, index) => {
      const hasAnyValue = String(stage.name || '').trim() || Number(stage.minutes);
      if (!hasAnyValue) return;
      if (!String(stage.name || '').trim()) issues.push(`اسم مرحلة التصنيع رقم ${index + 1} غير مدخل.`);
      if (!(Number(stage.minutes) > 0)) issues.push(`وقت مرحلة «${stage.name || index + 1}» غير مدخل.`);
    });
    if (!data.stages.some(stage => String(stage.name || '').trim() && Number(stage.minutes) > 0)) issues.push('يجب إدخال مرحلة تصنيع مكتملة واحدة على الأقل.');
    if (totalMinutes > 0 && selectedDirectWorkers.length === 0) issues.push('يجب اختيار عمال الإنتاج لحساب الأجر المباشر.');
    if (!(finalUnitCost > 0)) issues.push('التكلفة النهائية غير مكتملة أو تساوي صفرًا.');
    if (!(salePrice > 0)) issues.push('سعر البيع غير مدخل أو غير محسوب.');
    if (salePrice > 0 && salePrice < finalUnitCost) issues.push('سعر البيع أقل من التكلفة النهائية.');
    if (data.pricingMethod === 'margin' && (desiredMargin < 0 || desiredMargin >= 100)) issues.push('هامش الربح المستهدف يجب أن يكون بين 0% وأقل من 100%.');
    if (salesCommissionPercent < 0 || salesCommissionPercent >= 100) issues.push('عمولة المبيعات يجب أن تكون بين 0% وأقل من 100%.');
    if (data.pricingMethod === 'margin' && includeCommissionInSalePrice && desiredMargin + salesCommissionPercent >= 100) issues.push('مجموع هامش الربح وعمولة المبيعات يجب أن يكون أقل من 100%.');
    if (data.pricingMethod === 'markup' && desiredMarkup < 0) issues.push('الزيادة على التكلفة لا يمكن أن تكون سالبة.');
    if (salePrice > 0 && margin < Number(settings.ratingRules?.minimum || 0)) issues.push(`هامش الربح أقل من الحد الأدنى المحدد (${Number(settings.ratingRules?.minimum || 0)}%).`);
    if (Number(data.minimumPrice) > 0 && Number(data.minimumPrice) < finalUnitCost) issues.push('أقل سعر مسموح لا يجوز أن يكون أقل من التكلفة.');
    return issues;
  }, [data, finalUnitCost, margin, salePrice, selectedDirectWorkers.length, settings.ratingRules, totalMinutes, desiredMargin, desiredMarkup, salesCommissionPercent, includeCommissionInSalePrice]);
  const costingComplete = validationIssues.length === 0;

  const selectProduct = async (option) => {
    const p = option?.product || products.find(product => product.optionValue === option?.value); if (!p) return;
    setLoading(true);
    const [saved, hist] = await Promise.all([getProductCosting(p.id), getProductCostingHistory(p.id)]);
    const identity = { productId: p.id, productOptionValue: p.optionValue, masterProductId: p.masterId || '', productName: p.name, productCode: p.code, productUnit: p.unit || 'قطعة' };
    setData(saved ? { ...EMPTY, ...saved, pricingMethod: saved.pricingMethod === 'sale' || saved.pricingMethod === 'fixed' ? 'manual' : (saved.pricingMethod || 'margin'), ...identity } : { ...EMPTY, ...identity });
    setHistory(hist); setLoading(false);
  };
  const changeRow = (key, index, field, value) => setData(d => ({ ...d, [key]: d[key].map((x, i) => i === index ? { ...x, [field]: value } : x) }));
  const removeRow = (key, index) => setData(d => ({ ...d, [key]: d[key].filter((_, i) => i !== index) }));

  const buildPayload = () => ({ ...data, salesCommissionPercent, includeCommissionInSalePrice, salePrice, targetPrice: Number(data.targetPrice) || salePrice, minimumPrice: Number(data.minimumPrice) || breakEvenPrice, quantityTiers: (data.quantityTiers || []).map(tier => ({ ...tier, salePrice: salePrice * (1 - (Number(tier.discountPercent) || 0) / 100), minimumPrice: Number(tier.minimumPrice) || Number(data.minimumPrice) || breakEvenPrice })), materialBeforeWaste, wasteCost, materialsCost, totalMinutes, laborCost, factoryExpenseShareMonthly, factoryExpenseHourlyRate, factoryExpenseMinuteRate, operatingCost, finalUnitCost, breakEvenPrice, salesCommissionAmount, profitPerUnit: profit, marginPercent: margin, markupPercent: markup });
  const saveCost = async () => { if (!data.productId) return Swal.fire('تنبيه', 'اختر المنتج أولاً.', 'warning'); await saveProductCosting(buildPayload(), user); setHistory(await getProductCostingHistory(data.productId)); Swal.fire({ icon: 'success', title: 'تم حفظ التكلفة', timer: 1400, showConfirmButton: false }); };
  const approvePrice = async () => {
    if (!data.productId) return Swal.fire('تنبيه', 'اختر المنتج أولاً.', 'warning');
    if (!costingComplete) return Swal.fire({ icon: 'warning', title: 'لا يمكن اعتماد التسعير', html: `<div style="text-align:right;direction:rtl">${validationIssues.map(issue => `• ${issue}`).join('<br>')}</div>`, confirmButtonText: 'مراجعة البيانات' });
    const p = products.find(product => product.optionValue === data.productOptionValue)
      || products.find(product => product.id === data.productId && (!data.masterProductId || product.masterId === data.masterProductId));
    if (!p) return Swal.fire('تعذر الاعتماد', 'تعذر العثور على بيانات الصنف المحدد.', 'error');

    let masterProductId = data.masterProductId || p.masterId;
    if (!masterProductId) {
      const createdMaster = await saveMasterProduct({
        itemNumber: p.code || '',
        name: p.name,
        unit: data.productUnit || p.unit || 'قطعة',
        category: 'بضاعة جاهزة',
        basePrice: 0,
        targetPrice: 0,
        defaultDiscount: 0,
        quantityTiers: [],
        createdFrom: 'product_costing',
        createdAt: new Date().toISOString(),
        createdBy: user?.name || ''
      });
      masterProductId = createdMaster.id;
      setProducts(current => current.map(product => product.id === p.id ? {
        ...product,
        masterId: masterProductId
      } : product));
      setData(current => ({ ...current, masterProductId }));
    }

    const payload = buildPayload(); await saveProductCosting(payload, user); const approved = await approveProductSellingPrice(payload, masterProductId, user);
    setData(d => ({ ...d, pricingVersion: approved.pricingVersion, pricingApprovedAt: approved.pricingApprovedAt, pricingCostAtApproval: approved.pricingCostAtApproval, pricingNeedsReview: false }));
    setHistory(await getProductCostingHistory(data.productId));
    Swal.fire({ icon: 'success', title: `تم اعتماد النسخة V${approved.pricingVersion}`, text: 'تمت إضافة السعر والشرائح المعتمدة إلى قائمة الأسعار دون تغيير النسخ السابقة.', timer: 2600, showConfirmButton: false });
  };
  const saveSettings = async () => { await saveCostCenterSettings(settings, user); Swal.fire({ icon: 'success', title: 'تم حفظ إعدادات مراكز التكلفة', timer: 1400, showConfirmButton: false }); };
  const updateTierDiscount = (index, value) => setData(d => ({ ...d, quantityTiers: d.quantityTiers.map((tier, i) => i === index ? { ...tier, discountPercent: value, salePrice: Math.max(0, salePrice * (1 - (Number(value) || 0) / 100)) } : tier) }));
  const clearCalculator = async () => {
    const result = await Swal.fire({ icon: 'warning', title: 'مسح بيانات الحاسبة؟', text: 'لن يتم حذف أي تكلفة محفوظة من السجل.', showCancelButton: true, confirmButtonText: 'نعم، مسح الحقول', cancelButtonText: 'إلغاء', confirmButtonColor: '#dc2626' });
    if (result.isConfirmed) { setData(EMPTY); setHistory([]); setExpandedCost(null); }
  };
  const copyCostDetailsFromProduct = async () => {
    if (!data.productId) return Swal.fire('اختر الصنف الجديد أولًا', 'حدد الصنف الذي تريد تعبئة تكاليفه، ثم اضغط نسخ تفاصيل التكلفة.', 'warning');
    const availableSources = products.filter(product => product.id !== data.productId);
    if (!availableSources.length) return Swal.fire('لا توجد أصناف أخرى', 'لا يوجد صنف آخر متاح للنسخ منه.', 'info');
    const sourceOptions = availableSources.map(product => ({ id: product.id, label: `${product.code ? `${product.code} — ` : ''}${product.name}` }));
    const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
    const selection = await Swal.fire({
      title: 'نسخ تفاصيل التكلفة من صنف',
      text: 'سيتم نسخ المواد والهالك ومراحل التصنيع والعمال فقط، دون السعر أو نسخة الاعتماد.',
      width: 720,
      html: `<div style="direction:rtl;text-align:right;margin-top:18px"><label style="display:block;font-weight:900;margin-bottom:8px">ابحث بالكود أو اسم الصنف</label><input id="copy-cost-source-search" list="copy-cost-source-list" class="swal2-input" placeholder="اكتب جزءًا من اسم الصنف أو الكود..." autocomplete="off" style="width:100%;height:54px;margin:0;font-size:16px;padding:0 15px;box-sizing:border-box"><datalist id="copy-cost-source-list">${sourceOptions.map(option => `<option value="${escapeHtml(option.label)}"></option>`).join('')}</datalist></div>`,
      showCancelButton: true, confirmButtonText: 'نسخ التفاصيل', cancelButtonText: 'إلغاء',
      focusConfirm: false,
      didOpen: () => document.getElementById('copy-cost-source-search')?.focus(),
      preConfirm: () => {
        const typedValue = document.getElementById('copy-cost-source-search')?.value?.trim() || '';
        const exactMatch = sourceOptions.find(option => option.label === typedValue);
        const matchingOptions = sourceOptions.filter(option => option.label.toLocaleLowerCase('ar').includes(typedValue.toLocaleLowerCase('ar')));
        const selected = exactMatch || (matchingOptions.length === 1 ? matchingOptions[0] : null);
        if (!selected) { Swal.showValidationMessage(typedValue ? 'اختر صنفًا محددًا من نتائج البحث.' : 'اكتب اسم الصنف أو الكود واختره من القائمة.'); return false; }
        return selected.id;
      }
    });
    if (!selection.isConfirmed || !selection.value) return;
    const source = await getProductCosting(selection.value);
    if (!source) return Swal.fire('لا توجد تكلفة محفوظة', 'الصنف المختار لا يحتوي على تفاصيل تكلفة محفوظة يمكن نسخها.', 'warning');
    setData(current => ({
      ...current,
      inputMode: source.inputMode || 'perUnit',
      wastePercent: Number(source.wastePercent) || 0,
      materials: Array.isArray(source.materials) && source.materials.length ? source.materials.map(material => ({ name: material.name || '', quantityPerUnit: Number(material.quantityPerUnit) || 0, unitPrice: Number(material.unitPrice) || 0 })) : current.materials,
      stages: Array.isArray(source.stages) && source.stages.length ? source.stages.map(stage => ({ name: stage.name || '', minutes: Number(stage.minutes) || 0 })) : current.stages,
      directLaborEmployeeIds: Array.isArray(source.directLaborEmployeeIds) ? [...source.directLaborEmployeeIds] : []
    }));
    const sourceProduct = availableSources.find(product => product.id === selection.value);
    Swal.fire({ icon: 'success', title: 'تم نسخ تفاصيل التكلفة', text: `تم النسخ من ${sourceProduct?.name || 'الصنف المختار'}، ويمكنك الآن مراجعتها وتعديلها قبل الحفظ.`, timer: 2200, showConfirmButton: false });
  };
  const runPriceSimulation = async () => {
    const result = await Swal.fire({
      title: 'محاكاة السعر',
      html: `<div style="direction:rtl;text-align:right;display:grid;gap:10px"><label>الكمية<input id="sim-qty" type="number" class="swal2-input" value="${qty}" min="1" style="width:100%;margin:4px 0"></label><label>تغيير التكلفة %<input id="sim-cost" type="number" class="swal2-input" value="0" step="0.1" style="width:100%;margin:4px 0"></label><label>هامش الربح %<input id="sim-margin" type="number" class="swal2-input" value="${margin.toFixed(2)}" step="0.1" style="width:100%;margin:4px 0"></label><label>الخصم %<input id="sim-discount" type="number" class="swal2-input" value="0" step="0.1" style="width:100%;margin:4px 0"></label></div>`,
      showCancelButton: true, confirmButtonText: 'عرض النتيجة', cancelButtonText: 'إلغاء',
      preConfirm: () => ({ quantity: Number(document.getElementById('sim-qty').value) || 1, costChange: Number(document.getElementById('sim-cost').value) || 0, targetMargin: Number(document.getElementById('sim-margin').value) || 0, discount: Number(document.getElementById('sim-discount').value) || 0 })
    });
    if (!result.value) return;
    const simulatedCost = finalUnitCost * (1 + result.value.costChange / 100);
    const simulatedBasePrice = simulatedCost / Math.max(.01, 1 - result.value.targetMargin / 100 - (includeCommissionInSalePrice ? salesCommissionRate : 0));
    const simulatedPrice = simulatedBasePrice * (1 - result.value.discount / 100);
    const simulatedCommission = simulatedPrice * salesCommissionRate;
    const simulatedProfit = simulatedPrice - simulatedCost - simulatedCommission;
    const simulatedMargin = simulatedPrice ? simulatedProfit / simulatedPrice * 100 : 0;
    Swal.fire({ icon: simulatedProfit >= 0 ? 'success' : 'warning', title: 'نتيجة المحاكاة', html: `<div style="direction:rtl;text-align:right;line-height:2"><b>تكلفة القطعة:</b> ${money(simulatedCost)} د.أ<br><b>سعر البيع:</b> ${money(simulatedPrice)} د.أ<br><b>عمولة المبيعات:</b> ${money(simulatedCommission)} د.أ<br><b>صافي ربح القطعة:</b> ${money(simulatedProfit)} د.أ<br><b>هامش الربح الصافي:</b> ${simulatedMargin.toFixed(2)}%<br><b>إجمالي ربح الطلبية:</b> ${money(simulatedProfit * result.value.quantity)} د.أ</div>`, confirmButtonText: 'إغلاق' });
  };

  if (loading && !products.length) return <div className="glass-panel" style={{ padding: 50, textAlign: 'center' }}>جاري تحميل حاسبة التكلفة...</div>;
  const th = { padding: 8, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' };
  const td = { padding: 6, borderBottom: '1px solid #f1f5f9' };
  return <div dir="rtl" style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 60 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <div><h2 style={{ margin: 0, display: 'flex', gap: 9, alignItems: 'center' }}><Calculator color="#0f766e"/> حاسبة تسعير المنتج</h2></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className={`btn ${tab === 'calculator' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('calculator')}><Calculator size={16}/> الحاسبة</button>
        <button className={`btn ${tab === 'settings' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('settings')}><Settings size={16}/> مراكز التكلفة</button>
        <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('history')}><History size={16}/> السجل</button>
      </div>
    </div>

    {tab === 'settings' && <Section title="إعدادات مراكز التكلفة والتقييم" icon={<Settings/>}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><div><h4 style={{margin:'0 0 4px'}}>صافي ساعات العمل المتوقع شهريًا</h4><small style={{color:'#64748b'}}>محسوب من جميع أشهر سنة {expectedCapacity.year} وفق عدد أيام كل شهر ودوام كل موظف، بعد استبعاد الإجازات الرسمية والسنوية المعتمدة وخصم الاستراحة.</small></div><span style={{padding:'8px 13px',borderRadius:20,background:'#e0f2fe',color:'#0369a1',fontWeight:900}}>دراسة سنوية: 12 شهرًا</span></div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(260px,2fr) minmax(220px,1fr)',gap:12,marginBottom:18}}>
        <div style={{padding:20,border:'1px solid #99f6e4',borderRadius:15,background:'linear-gradient(135deg,#f0fdfa,#ecfdf5)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span style={{fontSize:14,color:'#475569',fontWeight:900}}>متوسط صافي الساعات المتوقع للشهر</span><strong style={{display:'block',fontSize:32,color:'#047857',marginTop:7}}>{Number(expectedCapacity.averageMonthlyNetMinutes/60).toLocaleString('en-US',{maximumFractionDigits:2})} <small style={{fontSize:14}}>ساعة / شهر</small></strong></div><span style={{width:54,height:54,borderRadius:14,background:'#fff',color:'#047857',display:'flex',alignItems:'center',justifyContent:'center'}}><Factory size={28}/></span></div>
        <label style={{padding:14,border:'1px solid #fed7aa',borderRadius:13,background:'#fff7ed',fontWeight:900}}>ساعات الاستراحة اليومية<Input type="number" min="0" max="8" step="0.05" value={settings.breakHoursDaily} onChange={e=>setSettings(s=>({...s,breakHoursDaily:Math.max(0,Number(e.target.value)||0)}))} style={{marginTop:7,background:'#fff',fontSize:17,fontWeight:900}}/><small style={{display:'block',color:'#9a3412',marginTop:5}}>0.50 = 30 دقيقة، وتُخصم مرة واحدة فقط في يوم العمل. اضغط حفظ الإعدادات لتثبيت القيمة.</small></label>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,color:'#475569',fontSize:13,fontWeight:800}}><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>الموظفون المحتسبون: {employees.length}</span><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>العطلة الأسبوعية المستبعدة: {weekendDays.join('، ')}</span><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>الإجازات الرسمية المستبعدة: {expectedCapacity.officialHolidayCount}</span><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>الإجازات السنوية المعتمدة المستبعدة: {expectedCapacity.annualLeaveCount}</span></div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'18px 0 12px'}}><h4 style={{margin:0}}>المصاريف الشهرية للمصنع</h4><strong style={{color:'#0f766e'}}>الإجمالي: {money(monthlyExpenses)} د.أ</strong></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}>{(settings.expenses||[]).map((x,i)=>{const ExpenseIcon=[Building2,Zap,Wrench,Users,Droplets,CircleDollarSign][i%6];const colors=['#2563eb','#d97706','#7c3aed','#0f766e','#0891b2','#475569'];const color=colors[i%colors.length];return <div key={i} style={{padding:14,border:'1px solid #e2e8f0',borderRadius:13,background:'#fff',boxShadow:'0 3px 12px rgba(15,23,42,.04)'}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:11}}><span style={{width:39,height:39,borderRadius:10,background:`${color}14`,color,display:'flex',alignItems:'center',justifyContent:'center'}}><ExpenseIcon size={20}/></span><Input value={x.name} onChange={e=>setSettings(s=>({...s,expenses:s.expenses.map((a,j)=>j===i?{...a,name:e.target.value}:a)}))} style={{fontWeight:800,border:0,background:'#f8fafc'}}/></div><div style={{display:'flex',gap:8,alignItems:'center'}}><Input type="number" step="0.01" value={x.amount} onChange={e=>setSettings(s=>({...s,expenses:s.expenses.map((a,j)=>j===i?{...a,amount:e.target.value}:a)}))} style={{fontSize:17,fontWeight:900}}/><span style={{whiteSpace:'nowrap',fontWeight:800}}>د.أ / شهر</span><button type="button" onClick={()=>setSettings(s=>({...s,expenses:s.expenses.filter((_,j)=>j!==i)}))} style={{width:38,height:38,border:'1px solid #fecaca',borderRadius:9,background:'#fff1f2',color:'#dc2626',cursor:'pointer'}}><Trash2 size={15}/></button></div></div>})}</div>
      <button className="btn btn-outline" style={{marginTop:12}} onClick={()=>setSettings(s=>({...s,expenses:[...s.expenses,{name:'مصروف جديد',amount:0}]}))}><Plus size={15}/> إضافة مصروف</button>
      <h4>قواعد تقييم هامش الربح</h4><div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10 }}>{[['excellent','ممتازة من %'],['good','جيدة من %'],['weak','ضعيفة من %'],['minimum','الحد الأدنى %']].map(([k,l])=><label key={k}>{l}<Input type="number" value={settings.ratingRules[k]} onChange={e=>setSettings(s=>({...s,ratingRules:{...s.ratingRules,[k]:Number(e.target.value)}}))}/></label>)}</div>
      <button className="btn btn-primary" style={{ marginTop: 15 }} onClick={saveSettings}><Save size={16}/> حفظ الإعدادات</button>
    </Section>}

    {tab === 'history' && <Section title="السجل التاريخي لتغييرات التكلفة والسعر" icon={<History/>}>
      {!data.productId ? <p>اختر منتجًا من الحاسبة أولًا.</p> : <div style={{ overflowX:'auto' }}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={th}>النسخة</th><th style={th}>التاريخ / آخر تحديث</th><th style={th}>المستخدم</th><th style={th}>التكلفة السابقة</th><th style={th}>التكلفة الحالية</th><th style={th}>نسبة التغير</th><th style={th}>السعر السابق</th><th style={th}>السعر الجديد</th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td style={{...td,fontWeight:900,color:h.type==='pricing_approval'?'#0f766e':'#64748b'}}>{h.type==='pricing_approval'?`V${h.pricingVersion||1}`:'حفظ تكلفة'}</td><td style={td}>{new Date(h.changedAt).toLocaleString('ar-JO')}</td><td style={td}>{h.changedBy||'-'}</td><td style={td}>{h.previousUnitCost==null?'-':money(h.previousUnitCost)}</td><td style={td}>{money(h.newUnitCost)}</td><td style={td}>{h.costChangePercent==null?(h.previousUnitCost?`${(((Number(h.newUnitCost)-Number(h.previousUnitCost))/Number(h.previousUnitCost))*100).toFixed(2)}%`:'-'):`${Number(h.costChangePercent).toFixed(2)}%`}</td><td style={td}>{h.previousSalePrice==null?'-':money(h.previousSalePrice)}</td><td style={td}>{money(h.newSalePrice)}</td></tr>)}</tbody></table>{!history.length&&<p>لا توجد تغييرات محفوظة بعد.</p>}</div>}
    </Section>}

    {tab === 'calculator' && <div style={{ display:'grid',gap:14 }}>
      <section style={{background:'#fff',border:'1px solid #dbe3ed',borderRadius:14,padding:16}}>
        <style>{`
          .costing-product-toolbar {
            display: grid;
            grid-template-columns: minmax(150px, .65fr) minmax(340px, 1.75fr) minmax(180px, .75fr) minmax(210px, .85fr);
            gap: 12px;
            align-items: end;
          }
          @media (max-width: 920px) {
            .costing-product-toolbar { grid-template-columns: 1fr 1fr; }
          }
          @media (max-width: 620px) {
            .costing-product-toolbar { grid-template-columns: 1fr; }
          }
        `}</style>
        <div className="costing-product-toolbar">
          <label style={{fontWeight:800}}>مصدر الصنف
            <select
              className="input-field"
              dir="rtl"
              value={productSourceFilter}
              onChange={(event) => setProductSourceFilter(event.target.value)}
              style={{width:'100%',height:38,marginTop:0,border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',fontWeight:800,fontSize:13,padding:'0 8px',color:'#0f172a',fontFamily:'inherit',cursor:'pointer'}}
            >
              <option value="all">جميع الأصناف</option>
              <option value="stock">أصناف المخزون</option>
              <option value="price_list">الأصناف الظاهرة في قوائم الأسعار</option>
            </select>
          </label>
          <label style={{fontWeight:800}}>المنتج (الكود والاسم في خانة واحدة)
            <Select
              key={productSourceFilter}
              options={productOptions}
              value={data.productId ? {
                value: data.productOptionValue || data.productId,
                label: `${data.productCode?`${data.productCode} — `:''}${data.productName}`,
                source: products.find(product => product.optionValue === data.productOptionValue)?.source
              } : null}
              onChange={selectProduct}
              placeholder={productSourceFilter === 'stock' ? 'ابحث في أصناف المخزون...' : productSourceFilter === 'price_list' ? 'ابحث في الأصناف الظاهرة في قوائم الأسعار...' : 'ابحث في المخزون أو قوائم الأسعار...'}
              noOptionsMessage={() => 'لا يوجد صنف مطابق'}
              formatGroupLabel={(group) => (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', color:'#334155', fontWeight:900, fontSize:'12px' }}>
                  <span>{group.label}</span>
                  <span style={{ minWidth:'24px', padding:'1px 7px', borderRadius:'10px', background:'#e2e8f0', color:'#475569', textAlign:'center' }}>{group.options.length}</span>
                </div>
              )}
              formatOptionLabel={(option, { context }) => context === 'value' ? option.label : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                  <span style={{ fontWeight:800 }}>{option.label}</span>
                  <span style={{ flexShrink:0, padding:'2px 7px', borderRadius:'10px', fontSize:'10px', fontWeight:900, background:option.source==='stock'?'#dcfce7':'#dbeafe', color:option.source==='stock'?'#15803d':'#1d4ed8' }}>
                    {option.source === 'stock' ? 'مخزون' : 'قائمة الأسعار'}
                  </span>
                </div>
              )}
            />
          </label>
          <label style={{fontWeight:800}}>الكمية المتوقع إنتاجها<div style={{display:'flex'}}><Input type="number" min="1" value={data.quantity} onChange={e=>setData(d=>({...d,quantity:e.target.value}))} style={{borderRadius:'0 8px 8px 0',fontSize:16,fontWeight:900}}/><span style={{display:'flex',alignItems:'center',padding:'0 11px',border:'1px solid #cbd5e1',borderRight:0,borderRadius:'8px 0 0 8px',background:'#f8fafc',fontSize:13}}>قطعة</span></div></label>
          <button type="button" className="btn btn-outline" onClick={copyCostDetailsFromProduct} style={{height:42,color:'#0f766e',borderColor:'#99f6e4',background:'#f0fdfa',fontWeight:900,whiteSpace:'nowrap',padding:'0 8px',fontSize:13}}><Package size={16}/> نسخ تفاصيل التكلفة من صنف</button>
        </div>
      </section>
      {data.pricingNeedsReview && <div style={{padding:13,background:'#fff7ed',color:'#9a3412',border:'1px solid #fdba74',borderRadius:12,display:'flex',gap:8,fontWeight:800}}><AlertTriangle size={20}/> تغيرت التكلفة منذ آخر سعر معتمد V{data.pricingVersion||1} ويجب مراجعة السعر.</div>}

      <section style={{background:'#fff',border:'1px solid #dbe3ed',borderRadius:14,padding:16}}>
        <h3 style={{margin:'0 0 14px',fontSize:18}}>1. تكلفة التصنيع للقطعة</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,alignItems:'stretch'}}>
          {[['materials','المواد الخام',materialsCost,Factory],['labor','أجور التصنيع',laborCost,Clock3],['factory','حصة مصاريف المصنع',operatingCost,Factory]].map(([key,label,value,Icon])=><div key={key} style={{padding:14,border:'1px solid #dbe3ed',borderRadius:11,textAlign:'center',background:'#fbfdff'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',color:'#475569'}}><span>{label}</span><Icon size={22}/></div><strong style={{display:'block',fontSize:21,margin:'8px 0'}}>{money(value)} د.أ</strong><button className="btn btn-outline" style={{width:'100%',height:32,padding:4}} onClick={()=>setExpandedCost(expandedCost===key?null:key)}>تفاصيل⌄</button></div>)}
          <div style={{padding:16,border:'1.5px solid #0f9f8f',borderRadius:11,textAlign:'center',background:'#f8fffd'}}><b>التكلفة النهائية للقطعة</b><strong style={{display:'block',fontSize:29,color:'#0f8b72',marginTop:14}}>{money(finalUnitCost)} د.أ</strong></div>
        </div>
        {expandedCost==='materials'&&<div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #e2e8f0'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:5,background:'#f1f5f9',borderRadius:11}}><span style={{fontWeight:900,padding:'0 8px'}}>طريقة الإدخال</span><button type="button" onClick={()=>setData(d=>({...d,inputMode:'perUnit'}))} style={{border:0,borderRadius:8,padding:'8px 15px',cursor:'pointer',fontWeight:900,background:data.inputMode==='perUnit'?'#0f8b72':'transparent',color:data.inputMode==='perUnit'?'#fff':'#475569'}}>لكل قطعة</button><button type="button" onClick={()=>setData(d=>({...d,inputMode:'projectTotal'}))} style={{border:0,borderRadius:8,padding:'8px 15px',cursor:'pointer',fontWeight:900,background:data.inputMode==='projectTotal'?'#0f8b72':'transparent',color:data.inputMode==='projectTotal'?'#fff':'#475569'}}>إجمالي المشروع</button></div>
            <div style={{padding:'9px 14px',borderRadius:10,background:'#ecfdf5',color:'#047857',fontWeight:900}}>إجمالي المواد: {money(materialsCost)} د.أ</div>
          </div>
          <div style={{overflowX:'auto'}}><div style={{minWidth:850}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr .8fr 48px',gap:10,padding:'0 12px 7px',color:'#64748b',fontSize:13,fontWeight:900}}><span>المادة</span><span style={{textAlign:'center'}}>الكمية</span><span style={{textAlign:'center'}}>سعر الوحدة</span><span style={{textAlign:'center'}}>التكلفة</span><span></span></div>
            {data.materials.map((x,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr .8fr 48px',gap:10,alignItems:'center',padding:10,marginBottom:8,border:'1px solid #e2e8f0',borderRadius:12,background:i%2===0?'#fff':'#fbfdff',boxShadow:'0 2px 7px rgba(15,23,42,.03)'}}><Input value={x.name} placeholder="اسم المادة" onChange={e=>changeRow('materials',i,'name',e.target.value)} style={{background:'#fff'}}/><Input type="number" step="0.001" value={x.quantityPerUnit} onChange={e=>changeRow('materials',i,'quantityPerUnit',e.target.value)} style={{background:'#fff'}}/><Input type="number" step="0.001" value={x.unitPrice} onChange={e=>changeRow('materials',i,'unitPrice',e.target.value)} style={{background:'#fff'}}/><div style={{height:38,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:8,background:'#f0fdf4',color:'#166534',fontWeight:950}}>{money((Number(x.quantityPerUnit)||0)*(Number(x.unitPrice)||0))}</div><button type="button" onClick={()=>removeRow('materials',i)} style={{width:38,height:38,border:'1px solid #fecaca',borderRadius:9,background:'#fff1f2',color:'#dc2626',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><Trash2 size={16}/></button></div>)}
          </div></div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:14,flexWrap:'wrap',marginTop:12,paddingTop:12,borderTop:'1px dashed #cbd5e1'}}><button className="btn btn-outline" style={{borderColor:'#86efac',color:'#15803d'}} onClick={()=>setData(d=>({...d,materials:[...d.materials,{name:'',quantityPerUnit:0,unitPrice:0}]}))}><Plus size={16}/> إضافة مادة جديدة</button><label style={{fontWeight:800,minWidth:180}}>نسبة الهالك %<Input type="number" min="0" value={data.wastePercent} onChange={e=>setData(d=>({...d,wastePercent:e.target.value}))} style={{marginTop:5,background:'#fff'}}/></label></div>
        </div>}
        {expandedCost==='labor'&&<div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #e2e8f0'}}><label style={{fontWeight:800}}>عمال الإنتاج<Select isMulti options={employees.map(e=>({value:String(e.id),label:`${e.name} — ${e.jobTitle||e.department||'عامل إنتاج'}`}))} value={selectedDirectWorkers.map(e=>({value:String(e.id),label:`${e.name} — ${e.jobTitle||e.department||'عامل إنتاج'}`}))} onChange={options=>setData(d=>({...d,directLaborEmployeeIds:(options||[]).map(o=>o.value)}))} placeholder="اختر العمال..."/></label><div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th style={th}>المرحلة</th><th style={th}>الدقائق</th><th style={th}>تكلفة الدقيقة</th><th style={th}>الإجمالي</th><th style={th}></th></tr></thead><tbody>{data.stages.map((x,i)=><tr key={i}><td style={td}><Input value={x.name} onChange={e=>changeRow('stages',i,'name',e.target.value)}/></td><td style={td}><Input type="number" step="0.1" value={x.minutes} onChange={e=>changeRow('stages',i,'minutes',e.target.value)}/></td><td style={td}><Input value={money(directLaborMinuteCost)} readOnly/></td><td style={{...td,fontWeight:900}}>{money((Number(x.minutes)||0)*directLaborMinuteCost)}</td><td style={td}><button className="btn btn-outline" onClick={()=>removeRow('stages',i)}><Trash2 size={14}/></button></td></tr>)}</tbody></table></div><button className="btn btn-outline" onClick={()=>setData(d=>({...d,stages:[...d.stages,{name:'مرحلة إضافية',minutes:0}]}))}><Plus size={14}/> مرحلة</button><span style={{marginRight:18,fontWeight:800}}>الزمن: {money(totalMinutes)} دقيقة | الأجر/دقيقة: {money(directLaborMinuteCost)} د.أ</span></div>}
        {expandedCost==='factory'&&<div style={{marginTop:14,padding:14,borderTop:'1px solid #e2e8f0',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}}><div>إجمالي المصاريف الشهرية<br/><b>{money(monthlyExpenses)} د.أ</b></div><div>حصة المصنع الشهرية<br/><b>{money(factoryExpenseShareMonthly)} د.أ</b></div><div>معدل الساعة<br/><b>{money(factoryExpenseHourlyRate)} د.أ</b></div><div>معدل الدقيقة<br/><b>{money(factoryExpenseMinuteRate)} د.أ</b></div></div>}
      </section>

      <section style={{background:'linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)',border:'1px solid #dbe3ed',borderRadius:16,padding:18,boxShadow:'0 5px 18px rgba(15,23,42,.04)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:17,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{width:38,height:38,borderRadius:10,background:'#e6f7f4',color:'#087f6b',display:'flex',alignItems:'center',justifyContent:'center'}}><BadgeDollarSign size={21}/></span><div><h3 style={{margin:0,fontSize:18}}>2. قرار التسعير</h3><small style={{color:'#64748b'}}>اختر طريقة التسعير وشاهد النتيجة مباشرة</small></div></div>
          <span style={{padding:'7px 12px',borderRadius:20,background:profit>=0?'#dcfce7':'#fee2e2',color:profit>=0?'#15803d':'#dc2626',fontWeight:900}}>{rating[0]}</span>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(225px,1fr))',gap:14,alignItems:'stretch'}}>
          <label style={{fontWeight:800,padding:13,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:11}}>طريقة التسعير<select className="input-field" dir="rtl" style={{width:'100%',height:48,marginTop:8,background:'#fff',fontWeight:800,fontSize:15,lineHeight:'normal',padding:'0 14px',textAlign:'right',color:'#0f172a',fontFamily:'inherit'}} value={data.pricingMethod} onChange={e=>setData(d=>({...d,pricingMethod:e.target.value}))}><option value="margin">هامش ربح مستهدف</option><option value="markup">زيادة على التكلفة</option><option value="manual">سعر بيع يدوي</option></select></label>
          <label style={{fontWeight:800,padding:13,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:11}}>{data.pricingMethod==='margin'?'هامش الربح المطلوب %':data.pricingMethod==='markup'?'الزيادة على التكلفة %':'سعر البيع اليدوي'}
            {data.pricingMethod==='margin'&&<Input type="number" min="0" max="99.99" value={data.desiredMargin} onChange={e=>setData(d=>({...d,desiredMargin:e.target.value}))} style={{marginTop:8,background:'#fff',fontSize:17,fontWeight:900}}/>}
            {data.pricingMethod==='markup'&&<Input type="number" min="0" value={data.desiredMarkup} onChange={e=>setData(d=>({...d,desiredMarkup:e.target.value}))} style={{marginTop:8,background:'#fff',fontSize:17,fontWeight:900}}/>}
            {data.pricingMethod==='manual'&&<Input type="number" step="0.001" value={data.salePrice} onChange={e=>setData(d=>({...d,salePrice:e.target.value}))} style={{marginTop:8,background:'#fff',fontSize:17,fontWeight:900}}/>}
          </label>
          <div style={{padding:15,border:'1px solid #a7f3d0',borderRadius:11,textAlign:'center',background:'linear-gradient(135deg,#f0fdf4,#ecfdf5)',display:'flex',flexDirection:'column',justifyContent:'center'}}><span style={{color:'#166534',fontWeight:800}}>سعر البيع المقترح</span><strong style={{display:'block',fontSize:28,color:'#07866f',marginTop:5}}>{money(salePrice)} <small style={{fontSize:15}}>د.أ</small></strong></div>
          <div style={{padding:15,border:'1px solid #bfdbfe',borderRadius:11,textAlign:'center',background:'linear-gradient(135deg,#eff6ff,#f8fbff)',display:'flex',flexDirection:'column',justifyContent:'center'}}><span style={{color:'#1e40af',fontWeight:800}}>ربح القطعة</span><strong style={{display:'block',fontSize:26,color:profit>=0?'#1d4ed8':'#dc2626',marginTop:5}}>{money(profit)} <small style={{fontSize:15}}>د.أ</small></strong></div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'minmax(220px,1fr) minmax(280px,2fr)',gap:12,marginTop:14}}>
          <label style={{fontWeight:800,padding:13,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:11}}>عمولة المبيعات %
            <Input type="number" min="0" max="99.99" step="0.1" value={data.salesCommissionPercent} onChange={e=>setData(d=>({...d,salesCommissionPercent:e.target.value}))} style={{marginTop:8,background:'#fff',fontSize:17,fontWeight:900}}/>
          </label>
          <label style={{display:'flex',alignItems:'center',gap:12,padding:14,background:includeCommissionInSalePrice?'#ecfdf5':'#f8fafc',border:`1px solid ${includeCommissionInSalePrice?'#6ee7b7':'#cbd5e1'}`,borderRadius:11,cursor:'pointer'}}>
            <input type="checkbox" checked={includeCommissionInSalePrice} onChange={e=>setData(d=>({...d,includeCommissionInSalePrice:e.target.checked}))} style={{width:21,height:21,accentColor:'#059669'}}/>
            <span><strong style={{display:'block',color:'#0f172a'}}>تضمين العمولة في سعر البيع</strong><small style={{display:'block',color:'#64748b',marginTop:4,lineHeight:1.6}}>عند التفعيل يرفع النظام سعر البيع تلقائيًا حتى يبقى الربح المطلوب كاملًا بعد دفع العمولة.</small></span>
          </label>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10,marginTop:14}}>{[
          ['تكلفة القطعة',money(finalUnitCost),'#f8fafc','#334155'],['عمولة القطعة',`${money(salesCommissionAmount)} د.أ`,'#fff7ed','#c2410c'],['هامش الربح الصافي',`${margin.toFixed(2)}%`,'#f0fdf4','#15803d'],['الزيادة الصافية على التكلفة',`${markup.toFixed(2)}%`,'#eff6ff','#1d4ed8'],['إجمالي التكلفة',`${money(finalUnitCost*qty)} د.أ`,'#fff7ed','#9a3412'],['إجمالي العمولات',`${money(salesCommissionAmount*qty)} د.أ`,'#fef2f2','#b91c1c'],['إجمالي البيع',`${money(salePrice*qty)} د.أ`,'#f5f3ff','#6d28d9'],['إجمالي الربح الصافي',`${money(profit*qty)} د.أ`,'#ecfdf5','#047857']
        ].map(([label,value,bg,color])=><div key={label} style={{padding:'11px 12px',textAlign:'center',border:'1px solid #e2e8f0',borderRadius:10,background:bg}}><span style={{fontSize:13,color:'#64748b',fontWeight:700}}>{label}</span><b style={{display:'block',fontSize:17,color,marginTop:4}}>{value}{label==='تكلفة القطعة'?' د.أ':''}</b></div>)}</div>
      </section>

      <section style={{background:'#fff',border:'1px solid #dbe3ed',borderRadius:14,padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:14}}><h3 style={{margin:0,fontSize:18}}>3. شرائح البيع حسب الكمية</h3><span style={{padding:'7px 11px',borderRadius:18,background:'#eff6ff',color:'#1d4ed8',fontSize:13,fontWeight:800}}>سعر البيع الأساسي: {money(salePrice)} د.أ — أسعار الشرائح تُحسب تلقائيًا بعد الخصم</span></div>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:980,textAlign:'center'}}><thead><tr>{['من','إلى','الخصم %','سعر البيع','العمولة','صافي ربح القطعة','هامش الربح الصافي %','الحالة',''].map(label=><th key={label} style={{...th,textAlign:'center'}}>{label}</th>)}</tr></thead><tbody>{(data.quantityTiers||[]).map((tier,index)=>{const tierSale=salePrice*(1-(Number(tier.discountPercent)||0)/100);const tierCommission=tierSale*salesCommissionRate;const tierProfit=tierSale-finalUnitCost-tierCommission;const tierMargin=tierSale?tierProfit/tierSale*100:0;const minimum=Number(tier.minimumPrice)||Number(data.minimumPrice)||breakEvenPrice;const state=tierSale<minimum?['أقل من الحد الأدنى','#fee2e2','#dc2626']:tierSale<=minimum*1.05?['سعر منخفض','#fef3c7','#d97706']:['سعر آمن','#dcfce7','#15803d'];return <tr key={index}><td style={{...td,textAlign:'center'}}><Input type="number" value={tier.from??''} onChange={e=>changeRow('quantityTiers',index,'from',e.target.value)}/></td><td style={{...td,textAlign:'center'}}><Input type="number" value={tier.to??''} placeholder="فأكثر" onChange={e=>changeRow('quantityTiers',index,'to',e.target.value)}/></td><td style={{...td,textAlign:'center'}}><Input type="number" step="0.1" value={tier.discountPercent??0} onChange={e=>updateTierDiscount(index,e.target.value)}/></td><td style={{...td,textAlign:'center'}}><Input type="number" value={money(tierSale)} readOnly style={{background:'#f0fdf4',color:'#047857',fontWeight:900}}/></td><td style={{...td,fontWeight:900,textAlign:'center',color:'#c2410c'}}>{money(tierCommission)}</td><td style={{...td,fontWeight:900,textAlign:'center'}}>{money(tierProfit)}</td><td style={{...td,fontWeight:900,textAlign:'center'}}>{tierMargin.toFixed(2)}%</td><td style={{...td,textAlign:'center'}}><span style={{display:'inline-block',padding:'5px 12px',borderRadius:20,background:state[1],color:state[2],fontWeight:900,whiteSpace:'nowrap'}}>{state[0]}</span></td><td style={{...td,textAlign:'center'}}><button className="btn btn-outline" onClick={()=>removeRow('quantityTiers',index)}><Trash2 size={14}/></button></td></tr>})}</tbody></table></div>
        <button className="btn btn-outline" style={{marginTop:10}} onClick={()=>setData(d=>({...d,quantityTiers:[...(d.quantityTiers||[]),{from:'',to:null,discountPercent:0,salePrice:salePrice,minimumPrice:data.minimumPrice||breakEvenPrice}]}))}><Plus size={14}/> إضافة شريحة</button>
      </section>

      <div style={{display:'flex',justifyContent:'center',padding:14,background:'#fff',border:'1px solid #dbe3ed',borderRadius:14}}><button className="btn" style={{background:costingComplete?'#087f5b':'#94a3b8',color:'#fff',height:48,minWidth:320}} onClick={approvePrice}><ShieldCheck size={18}/> اعتماد السعر وإضافته لقائمة الأسعار</button></div>
      <div style={{display:'flex',justifyContent:'center'}}><button className="btn btn-primary" onClick={saveCost}><Save size={17}/> حفظ التكلفة</button></div>
    </div>}
  </div>;
};

export default AdminProductCosting;
