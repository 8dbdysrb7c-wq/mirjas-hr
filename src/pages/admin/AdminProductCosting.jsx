import { isActiveEmployee } from '../../utils/employeeStatus';
import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Plus, Trash2, Save, BadgeDollarSign, Settings, History, Package, Factory, Clock3, TrendingUp, ShieldCheck, AlertTriangle, Building2, Zap, Wrench, Users, Droplets, CircleDollarSign } from 'lucide-react';
import Swal from 'sweetalert2';
import Select from '../../components/SearchSelect';
import { getMasterProducts, getStock, getEmployees, getHRLeaves, getHolidays, getGlobalSettings, getProductCosting, getProductCostings, getProductCostingHistory, getCostCenterSettings, saveCostCenterSettings, saveProductCosting, approveProductSellingPrice, saveMasterProduct } from '../../store';
import { buildVisiblePriceListCatalog } from '../../utils/priceListCatalog';

const money = (v) => (Number(v) || 0).toFixed(3);
const normalizeProductIdentity = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar');
const getProductIdentityKey = (product = {}) => {
  const code = normalizeProductIdentity(product.code || product.productCode || product.itemNumber || product.itemCode);
  if (code) return `code:${code}`;
  const name = normalizeProductIdentity(product.name || product.productName);
  return name ? `name:${name}` : `id:${String(product.id || product.optionValue || '')}`;
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
  warehouseAnnualExpenses: [
    { name: 'إيجار المستودع', amount: 0 }, { name: 'رواتب موظفي المستودع', amount: 0 },
    { name: 'كهرباء المستودع', amount: 0 }, { name: 'مياه المستودع', amount: 0 },
    { name: 'صيانة المستودع', amount: 0 }, { name: 'مصاريف تشغيل أخرى للمستودع', amount: 0 }
  ],
  linensWarehouseAnnualExpenses: [
    { name: 'إيجار المستودع', amount: 0 }, { name: 'رواتب موظفي المستودع', amount: 0 },
    { name: 'كهرباء المستودع', amount: 0 }, { name: 'مياه المستودع', amount: 0 },
    { name: 'صيانة المستودع', amount: 0 }, { name: 'مصاريف تشغيل أخرى للمستودع', amount: 0 }
  ],
  ratingRules: { excellent: 25, good: 15, weak: 5, minimum: 0 }
};
const EMPTY = {
  productId: '', productOptionValue: '', masterProductId: '', productName: '', productCode: '', productUnit: 'قطعة', costApplicability: '', manualUnitCost: 0, factoryMinutes: 0, storageFactory: '', warehouseSpacePercent: 0, storageMonths: 0, quantity: 1, inputMode: 'perUnit', wastePercent: 0, directLaborEmployeeIds: [],
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
  const [stockItems, setStockItems] = useState([]);
  const [productSourceFilter, setProductSourceFilter] = useState('');
  const [productCostingStatus, setProductCostingStatus] = useState('pending');
  const [costedProductKeys, setCostedProductKeys] = useState(() => new Set());
  const [savedProductCostings, setSavedProductCostings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [data, setData] = useState(EMPTY);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('calculator');
  const [costCenterTab, setCostCenterTab] = useState('linens');
  const [loading, setLoading] = useState(true);
  const [expandedCost, setExpandedCost] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [weekendDays, setWeekendDays] = useState(['الجمعة']);

  useEffect(() => { (async () => {
    const [master, stock, employeeData, savedSettings, leaveData, holidayData, globalSettings, savedCostings] = await Promise.all([getMasterProducts(), getStock(), getEmployees(), getCostCenterSettings(), getHRLeaves(), getHolidays(), getGlobalSettings(), getProductCostings()]);
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
    setProducts(merged); setStockItems(stockList); setSavedProductCostings(savedCostings || []); setCostedProductKeys(new Set((savedCostings || []).map(getProductIdentityKey))); setEmployees((employeeData || []).filter(isActiveEmployee)); setLeaves(leaveData || []); setHolidays(holidayData || []); setWeekendDays(globalSettings?.hrSettings?.weekendDays?.length ? globalSettings.hrSettings.weekendDays : ['الجمعة']); setSettings({ ...DEFAULT_SETTINGS, ...(savedSettings || {}), warehouseAnnualExpenses: savedSettings?.warehouseAnnualExpenses?.length ? savedSettings.warehouseAnnualExpenses : DEFAULT_SETTINGS.warehouseAnnualExpenses, linensWarehouseAnnualExpenses: savedSettings?.linensWarehouseAnnualExpenses?.length ? savedSettings.linensWarehouseAnnualExpenses : DEFAULT_SETTINGS.linensWarehouseAnnualExpenses, breakHoursDaily: savedSettings?.breakHoursDaily ?? 0.5, ratingRules: { ...DEFAULT_SETTINGS.ratingRules, ...(savedSettings?.ratingRules || {}) } }); setLoading(false);
  })(); }, []);

  const productOptions = useMemo(() => {
    if (!productSourceFilter) return [];
    const toOption = product => ({
      value: product.optionValue,
      label: `${product.code ? `${product.code} — ` : ''}${product.name}`,
      source: product.source,
      code: product.code,
      name: product.name,
      product
    });
    const statusProducts = products.filter(product => costedProductKeys.has(getProductIdentityKey(product)) === (productCostingStatus === 'completed'));
    const stockOptions = productSourceFilter === 'price_list'
      ? []
      : statusProducts.filter(product => product.source === 'stock').map(toOption);
    const priceListOptions = productSourceFilter === 'stock'
      ? []
      : statusProducts.filter(product => product.source === 'price_list').map(toOption);
    return [
      { label: 'أصناف المخزون', options: stockOptions },
      { label: 'أصناف قوائم الأسعار', options: priceListOptions }
    ].filter(group => group.options.length > 0);
  }, [products, productSourceFilter, productCostingStatus, costedProductKeys]);

  const costingStatusCounts = useMemo(() => {
    const sourceProducts = productSourceFilter
      ? products.filter(product => product.source === productSourceFilter)
      : [];
    const uniqueKeys = new Set(sourceProducts.map(getProductIdentityKey));
    let completed = 0;
    uniqueKeys.forEach(key => { if (costedProductKeys.has(key)) completed += 1; });
    return { completed, pending: Math.max(0, uniqueKeys.size - completed) };
  }, [products, productSourceFilter, costedProductKeys]);

  const changeProductSource = (source) => {
    setProductSourceFilter(source);
    setData(current => ({
      ...current,
      productId: '',
      productOptionValue: '',
      masterProductId: '',
      productName: '',
      productCode: '',
      productUnit: 'قطعة'
    }));
    setHistory([]);
  };

  const changeProductCostingStatus = (status) => {
    setProductCostingStatus(status);
    setData(EMPTY);
    setHistory([]);
    setExpandedCost(null);
  };

  const selectedStockAvailability = useMemo(() => {
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ar');
    const selectedCode = normalize(data.productCode);
    const selectedName = normalize(data.productName);
    if (!selectedCode && !selectedName) return { pillow: 0, linens: 0, unclassified: 0, total: 0 };
    return (stockItems || []).reduce((totals, item) => {
      const itemCode = normalize(item.itemNumber || item.itemCode || item.code);
      const itemName = normalize(item.name || item.productName);
      const matches = (selectedCode && itemCode === selectedCode) || (selectedName && itemName === selectedName);
      if (!matches) return totals;
      const quantity = Number(item.quantity ?? item.currentQuantity ?? item.balance ?? item.availableQuantity) || 0;
      const warehouseText = normalize([item.warehouse, item.location, item.factory, item.branch, item.department].filter(Boolean).join(' '));
      if (warehouseText.includes('مخد')) totals.pillow += quantity;
      else if (warehouseText.includes('بياض')) totals.linens += quantity;
      else totals.unclassified += quantity;
      totals.total += quantity;
      return totals;
    }, { pillow: 0, linens: 0, unclassified: 0, total: 0 });
  }, [stockItems, data.productCode, data.productName]);

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
  const pillowWarehouseAnnualExpenses = useMemo(() => (settings.warehouseAnnualExpenses || []).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0), [settings.warehouseAnnualExpenses]);
  const explicitLinensWarehouseAnnualExpenses = useMemo(() => (settings.linensWarehouseAnnualExpenses || []).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0), [settings.linensWarehouseAnnualExpenses]);
  const inferredLinensWarehouseAnnualExpenses = useMemo(() => (settings.expenses || [])
    .filter(expense => !/(?:راتب|رواتب|أجر|أجور|اشراف|إشراف|ادارة|إدارة)/.test(String(expense.name || '')))
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0) * 12, [settings.expenses]);
  const linensWarehouseAnnualExpenses = explicitLinensWarehouseAnnualExpenses > 0
    ? explicitLinensWarehouseAnnualExpenses
    : inferredLinensWarehouseAnnualExpenses;
  const isLinensStorageCostInferred = explicitLinensWarehouseAnnualExpenses <= 0 && inferredLinensWarehouseAnnualExpenses > 0;
  const totalWarehouseAnnualExpenses = data.storageFactory === 'linens' ? linensWarehouseAnnualExpenses : data.storageFactory === 'pillow' ? pillowWarehouseAnnualExpenses : 0;
  const fullCostMode = data.costApplicability === 'factory_and_labor';
  const factoryOnlyMode = data.costApplicability === 'factory_only';
  const manualCostMode = data.costApplicability === 'manual_cost';
  const storageEnabled = manualCostMode || fullCostMode;
  const materialsEnabled = fullCostMode;
  const laborEnabled = fullCostMode;
  const factoryEnabled = fullCostMode || factoryOnlyMode;
  const qty = Math.max(1, Number(data.quantity) || 1);
  const isProjectTotalMode = data.inputMode === 'projectTotal';
  const enteredMaterialsCost = data.materials.reduce((s, x) => s + (Number(x.quantityPerUnit) || 0) * (Number(x.unitPrice) || 0), 0);
  const materialBeforeWaste = isProjectTotalMode ? enteredMaterialsCost / qty : enteredMaterialsCost;
  const wasteCost = materialBeforeWaste * (Number(data.wastePercent) || 0) / 100;
  const calculatedMaterialsCost = materialBeforeWaste + wasteCost;
  const materialsCost = materialsEnabled ? calculatedMaterialsCost : 0;
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
  const calculatedLaborCost = isProjectTotalMode ? enteredLaborCost / qty : enteredLaborCost;
  const laborCost = laborEnabled ? calculatedLaborCost : 0;
  const factoryCostMinutes = factoryOnlyMode ? Math.max(0, Number(data.factoryMinutes) || 0) : totalMinutes;
  const operatingCost = factoryEnabled ? factoryCostMinutes * factoryExpenseMinuteRate : 0;
  const warehouseSpaceRate = Math.min(100, Math.max(0, Number(data.warehouseSpacePercent) || 0)) / 100;
  const storageMonths = Math.max(0, Number(data.storageMonths) || 0);
  const monthlyItemStorageShare = storageEnabled ? totalWarehouseAnnualExpenses * warehouseSpaceRate / 12 : 0;
  const storageCostPerUnit = storageEnabled ? monthlyItemStorageShare / qty * storageMonths : 0;
  const finalUnitCost = manualCostMode
    ? Math.max(0, Number(data.manualUnitCost) || 0) + storageCostPerUnit
    : materialsCost + laborCost + operatingCost + storageCostPerUnit;
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
    if (!data.costApplicability) issues.push('يجب اختيار نوع خضوع الصنف لمصاريف وأجور المصنع.');
    if (!Number(data.quantity) || Number(data.quantity) <= 0) issues.push('كمية الدراسة يجب أن تكون أكبر من صفر.');
    if (materialsEnabled) data.materials.forEach((material, index) => {
      const hasAnyValue = String(material.name || '').trim() || Number(material.quantityPerUnit) || Number(material.unitPrice);
      if (!hasAnyValue) return;
      if (!String(material.name || '').trim()) issues.push(`اسم المادة رقم ${index + 1} غير مدخل.`);
      if (!(Number(material.quantityPerUnit) > 0)) issues.push(`كمية المادة «${material.name || index + 1}» غير صحيحة.`);
      if (!(Number(material.unitPrice) > 0)) issues.push(`سعر المادة «${material.name || index + 1}» غير مدخل.`);
    });
    if (materialsEnabled && !data.materials.some(material => String(material.name || '').trim() && Number(material.quantityPerUnit) > 0 && Number(material.unitPrice) > 0)) issues.push('يجب إدخال مادة واحدة مكتملة على الأقل.');
    if (laborEnabled) data.stages.forEach((stage, index) => {
      if (Number(stage.minutes) > 0 && !String(stage.name || '').trim()) issues.push(`اسم مرحلة التصنيع رقم ${index + 1} غير مدخل.`);
    });
    if (factoryOnlyMode && !(Number(data.factoryMinutes) > 0)) issues.push('يجب إدخال زمن تحميل مصاريف المصنع بالدقائق.');
    if (manualCostMode && !(Number(data.manualUnitCost) > 0)) issues.push('يجب إدخال التكلفة الأساسية للقطعة.');
    if (!(finalUnitCost > 0)) issues.push('التكلفة النهائية غير مكتملة أو تساوي صفرًا.');
    if (!(salePrice > 0)) issues.push('سعر البيع غير مدخل أو غير محسوب.');
    if (salePrice > 0 && salePrice < finalUnitCost) issues.push('سعر البيع أقل من التكلفة النهائية.');
    if (data.pricingMethod === 'margin' && (desiredMargin < 0 || desiredMargin >= 100)) issues.push('هامش الربح المستهدف يجب أن يكون بين 0% وأقل من 100%.');
    if (salesCommissionPercent < 0 || salesCommissionPercent >= 100) issues.push('عمولة المبيعات يجب أن تكون بين 0% وأقل من 100%.');
    if (data.pricingMethod === 'margin' && includeCommissionInSalePrice && desiredMargin + salesCommissionPercent >= 100) issues.push('مجموع هامش الربح وعمولة المبيعات يجب أن يكون أقل من 100%.');
    if (data.pricingMethod === 'markup' && desiredMarkup < 0) issues.push('الزيادة على التكلفة لا يمكن أن تكون سالبة.');
    if (salePrice > 0 && margin < Number(settings.ratingRules?.minimum || 0)) issues.push(`هامش الربح أقل من الحد الأدنى المحدد (${Number(settings.ratingRules?.minimum || 0)}%).`);
    return issues;
  }, [data, finalUnitCost, margin, salePrice, selectedDirectWorkers.length, settings.ratingRules, totalMinutes, desiredMargin, desiredMarkup, salesCommissionPercent, includeCommissionInSalePrice, materialsEnabled, laborEnabled, factoryOnlyMode, manualCostMode, storageEnabled, totalWarehouseAnnualExpenses]);
  const costingComplete = validationIssues.length === 0;

  const selectProduct = async (option) => {
    const p = option?.product || products.find(product => product.optionValue === option?.value); if (!p) return;
    setLoading(true);
    const directSaved = await getProductCosting(p.id);
    const saved = directSaved || savedProductCostings.find(costing => getProductIdentityKey(costing) === getProductIdentityKey(p)) || null;
    const costingProductId = saved?.id || p.id;
    const hist = await getProductCostingHistory(costingProductId);
    const identity = { productId: costingProductId, productOptionValue: p.optionValue, masterProductId: p.masterId || saved?.masterProductId || '', productName: p.name, productCode: p.code, productUnit: p.unit || 'قطعة' };
    setData(saved ? { ...EMPTY, ...saved, salePrice: saved.salePrice === '' || saved.salePrice == null ? '' : Number(saved.salePrice).toFixed(3), pricingMethod: saved.pricingMethod === 'sale' || saved.pricingMethod === 'fixed' ? 'manual' : (saved.pricingMethod || 'margin'), ...identity } : { ...EMPTY, ...identity });
    setHistory(hist); setLoading(false);
  };
  const changeRow = (key, index, field, value) => setData(d => ({ ...d, [key]: d[key].map((x, i) => i === index ? { ...x, [field]: value } : x) }));
  const removeRow = (key, index) => setData(d => ({ ...d, [key]: d[key].filter((_, i) => i !== index) }));

  const buildPayload = () => {
    const safeMinimumPrice = Math.max(Number(data.minimumPrice) || 0, breakEvenPrice);
    return { ...data, salesCommissionPercent, includeCommissionInSalePrice, salePrice, targetPrice: Number(data.targetPrice) || salePrice, minimumPrice: safeMinimumPrice, quantityTiers: (data.quantityTiers || []).map(tier => ({ ...tier, salePrice: salePrice * (1 - (Number(tier.discountPercent) || 0) / 100), minimumPrice: Math.max(Number(tier.minimumPrice) || 0, safeMinimumPrice) })), materialBeforeWaste, wasteCost, materialsCost, totalMinutes, laborCost, factoryExpenseShareMonthly, factoryExpenseHourlyRate, factoryExpenseMinuteRate, operatingCost, totalWarehouseAnnualExpenses, monthlyItemStorageShare, storageCostPerUnit, finalUnitCost, breakEvenPrice, salesCommissionAmount, profitPerUnit: profit, marginPercent: margin, markupPercent: markup };
  };
  const saveCost = async () => { if (!data.productId) return Swal.fire('تنبيه', 'اختر المنتج أولاً.', 'warning'); if (!data.costApplicability) return Swal.fire('تنبيه', 'اختر نوع خضوع الصنف لمصاريف وأجور المصنع.', 'warning'); await saveProductCosting(buildPayload(), user); setCostedProductKeys(current => new Set([...current, getProductIdentityKey({ id: data.productId, code: data.productCode, name: data.productName })])); setHistory(await getProductCostingHistory(data.productId)); Swal.fire({ icon: 'success', title: 'تم حفظ التكلفة', timer: 1400, showConfirmButton: false }); };
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
    setCostedProductKeys(current => new Set([...current, getProductIdentityKey({ id: data.productId, code: data.productCode, name: data.productName })]));
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
    const currentProductKey = getProductIdentityKey({ id: data.productId, code: data.productCode, name: data.productName });
    const seenProductKeys = new Set();
    const savedCostings = await getProductCostings();
    const availableSources = savedCostings.filter(product => {
      const identityKey = getProductIdentityKey(product);
      if (String(product.id) === String(data.productId) || identityKey === currentProductKey || seenProductKeys.has(identityKey)) return false;
      seenProductKeys.add(identityKey);
      return true;
    });
    if (!availableSources.length) return Swal.fire('لا توجد تكاليف محفوظة', 'لا يوجد صنف آخر لديه تفاصيل تكلفة محفوظة يمكن النسخ منها.', 'info');
    const sourceOptions = availableSources.map(product => ({ id: product.id, label: `${product.productCode ? `${product.productCode} — ` : ''}${product.productName || 'صنف بدون اسم'}` }));
    const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
    const selection = await Swal.fire({
      title: 'نسخ تفاصيل التكلفة من صنف',
      text: 'سيتم نسخ تفاصيل التكلفة وإعدادات سعر البيع والشرائح. يُعتمد التسعير للصنف الجديد كنسخة مستقلة.',
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
    const source = availableSources.find(product => String(product.id) === String(selection.value));
    if (!source) return Swal.fire('لا توجد تكلفة محفوظة', 'الصنف المختار لا يحتوي على تفاصيل تكلفة محفوظة يمكن نسخها.', 'warning');
    const copiedCostApplicability = source.costApplicability
      || (Number(source.manualUnitCost) > 0 ? 'manual_cost' : Number(source.factoryMinutes) > 0 ? 'factory_only' : 'factory_and_labor');
    setData(current => ({
      ...current,
      costApplicability: copiedCostApplicability,
      inputMode: source.inputMode || 'perUnit',
      wastePercent: Number(source.wastePercent) || 0,
      manualUnitCost: Number(source.manualUnitCost) || 0,
      factoryMinutes: Number(source.factoryMinutes) || 0,
      storageFactory: source.storageFactory || '',
      warehouseSpacePercent: Number(source.warehouseSpacePercent) || 0,
      storageMonths: Number(source.storageMonths) || 0,
      pricingMethod: source.pricingMethod === 'sale' || source.pricingMethod === 'fixed' ? 'manual' : (source.pricingMethod || 'markup'),
      desiredMargin: Number(source.desiredMargin) || 0,
      desiredMarkup: Number(source.desiredMarkup) || 0,
      salePrice: source.salePrice === '' || source.salePrice == null ? '' : Number(source.salePrice).toFixed(3),
      targetPrice: Number(source.targetPrice) || Number(source.salePrice) || 0,
      minimumPrice: Number(source.minimumPrice) || Number(source.breakEvenPrice) || 0,
      salesCommissionPercent: Number(source.salesCommissionPercent) || 0,
      includeCommissionInSalePrice: source.includeCommissionInSalePrice !== false,
      quantityTiers: Array.isArray(source.quantityTiers) && source.quantityTiers.length
        ? source.quantityTiers.map(tier => ({
          from: tier.from ?? '',
          to: tier.to ?? null,
          discountPercent: Number(tier.discountPercent ?? tier.costingDiscountPercent) || 0,
          salePrice: Number(tier.salePrice ?? tier.targetPrice) || 0,
          minimumPrice: Number(tier.minimumPrice) || 0
        }))
        : current.quantityTiers,
      pricingVersion: 0,
      pricingApprovedAt: '',
      pricingApprovedBy: '',
      pricingCostAtApproval: 0,
      pricingNeedsReview: true,
      materials: Array.isArray(source.materials) && source.materials.length ? source.materials.map(material => ({ name: material.name || '', quantityPerUnit: Number(material.quantityPerUnit) || 0, unitPrice: Number(material.unitPrice) || 0 })) : current.materials,
      stages: Array.isArray(source.stages) && source.stages.length ? source.stages.map(stage => ({ name: stage.name || '', minutes: Number(stage.minutes) || 0 })) : current.stages,
      directLaborEmployeeIds: Array.isArray(source.directLaborEmployeeIds) ? [...source.directLaborEmployeeIds] : []
    }));
    Swal.fire({ icon: 'success', title: 'تم نسخ تفاصيل التكلفة', text: `تم النسخ من ${source.productName || 'الصنف المختار'}، ويمكنك الآن مراجعتها وتعديلها قبل الحفظ.`, timer: 2200, showConfirmButton: false });
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
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(220px,1fr))',gap:12,marginBottom:20}}><button type="button" onClick={()=>setCostCenterTab('linens')} style={{padding:16,borderRadius:14,border:`2px solid ${costCenterTab==='linens'?'#0f766e':'#dbe3ed'}`,background:costCenterTab==='linens'?'linear-gradient(135deg,#f0fdfa,#ecfdf5)':'#fff',color:costCenterTab==='linens'?'#0f766e':'#475569',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}><strong style={{display:'block',fontSize:17}}>مصنع البياضات</strong><small style={{display:'block',marginTop:5,fontWeight:700}}>مركز التكلفة الأساسي الحالي — مصاريف وأجور التصنيع</small></button><button type="button" onClick={()=>setCostCenterTab('pillow')} style={{padding:16,borderRadius:14,border:`2px solid ${costCenterTab==='pillow'?'#2563eb':'#dbe3ed'}`,background:costCenterTab==='pillow'?'linear-gradient(135deg,#eff6ff,#f8fbff)':'#fff',color:costCenterTab==='pillow'?'#1d4ed8':'#475569',cursor:'pointer',fontFamily:'inherit',textAlign:'right'}}><strong style={{display:'block',fontSize:17}}>مصنع المخدة</strong><small style={{display:'block',marginTop:5,fontWeight:700}}>مركز تكلفة المستودع — المصاريف السنوية للتخزين</small></button></div>
      {costCenterTab==='linens'&&<>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:14}}><div><h4 style={{margin:'0 0 4px'}}>صافي ساعات العمل المتوقع شهريًا</h4><small style={{color:'#64748b'}}>محسوب من جميع أشهر سنة {expectedCapacity.year} وفق عدد أيام كل شهر ودوام كل موظف، بعد استبعاد الإجازات الرسمية والسنوية المعتمدة وخصم الاستراحة.</small></div><span style={{padding:'8px 13px',borderRadius:20,background:'#e0f2fe',color:'#0369a1',fontWeight:900}}>دراسة سنوية: 12 شهرًا</span></div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(260px,2fr) minmax(220px,1fr)',gap:12,marginBottom:18}}>
        <div style={{padding:20,border:'1px solid #99f6e4',borderRadius:15,background:'linear-gradient(135deg,#f0fdfa,#ecfdf5)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span style={{fontSize:14,color:'#475569',fontWeight:900}}>متوسط صافي الساعات المتوقع للشهر</span><strong style={{display:'block',fontSize:32,color:'#047857',marginTop:7}}>{Number(expectedCapacity.averageMonthlyNetMinutes/60).toLocaleString('en-US',{maximumFractionDigits:2})} <small style={{fontSize:14}}>ساعة / شهر</small></strong></div><span style={{width:54,height:54,borderRadius:14,background:'#fff',color:'#047857',display:'flex',alignItems:'center',justifyContent:'center'}}><Factory size={28}/></span></div>
        <label style={{padding:14,border:'1px solid #fed7aa',borderRadius:13,background:'#fff7ed',fontWeight:900}}>ساعات الاستراحة اليومية<Input type="number" min="0" max="8" step="0.05" value={settings.breakHoursDaily} onChange={e=>setSettings(s=>({...s,breakHoursDaily:Math.max(0,Number(e.target.value)||0)}))} style={{marginTop:7,background:'#fff',fontSize:17,fontWeight:900}}/><small style={{display:'block',color:'#9a3412',marginTop:5}}>0.50 = 30 دقيقة، وتُخصم مرة واحدة فقط في يوم العمل. اضغط حفظ الإعدادات لتثبيت القيمة.</small></label>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,color:'#475569',fontSize:13,fontWeight:800}}><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>الموظفون المحتسبون: {employees.length}</span><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>العطلة الأسبوعية المستبعدة: {weekendDays.join('، ')}</span><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>الإجازات الرسمية المستبعدة: {expectedCapacity.officialHolidayCount}</span><span style={{padding:'7px 11px',background:'#f8fafc',borderRadius:18}}>الإجازات السنوية المعتمدة المستبعدة: {expectedCapacity.annualLeaveCount}</span></div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'18px 0 12px'}}><h4 style={{margin:0}}>المصاريف الشهرية للمصنع</h4><strong style={{color:'#0f766e'}}>الإجمالي: {money(monthlyExpenses)} د.أ</strong></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}>{(settings.expenses||[]).map((x,i)=>{const ExpenseIcon=[Building2,Zap,Wrench,Users,Droplets,CircleDollarSign][i%6];const colors=['#2563eb','#d97706','#7c3aed','#0f766e','#0891b2','#475569'];const color=colors[i%colors.length];return <div key={i} style={{padding:14,border:'1px solid #e2e8f0',borderRadius:13,background:'#fff',boxShadow:'0 3px 12px rgba(15,23,42,.04)'}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:11}}><span style={{width:39,height:39,borderRadius:10,background:`${color}14`,color,display:'flex',alignItems:'center',justifyContent:'center'}}><ExpenseIcon size={20}/></span><Input value={x.name} onChange={e=>setSettings(s=>({...s,expenses:s.expenses.map((a,j)=>j===i?{...a,name:e.target.value}:a)}))} style={{fontWeight:800,border:0,background:'#f8fafc'}}/></div><div style={{display:'flex',gap:8,alignItems:'center'}}><Input type="number" step="0.01" value={x.amount} onChange={e=>setSettings(s=>({...s,expenses:s.expenses.map((a,j)=>j===i?{...a,amount:e.target.value}:a)}))} style={{fontSize:17,fontWeight:900}}/><span style={{whiteSpace:'nowrap',fontWeight:800}}>د.أ / شهر</span><button type="button" onClick={()=>setSettings(s=>({...s,expenses:s.expenses.filter((_,j)=>j!==i)}))} style={{width:38,height:38,border:'1px solid #fecaca',borderRadius:9,background:'#fff1f2',color:'#dc2626',cursor:'pointer'}}><Trash2 size={15}/></button></div></div>})}</div>
      <button className="btn btn-outline" style={{marginTop:12}} onClick={()=>setSettings(s=>({...s,expenses:[...s.expenses,{name:'مصروف جديد',amount:0}]}))}><Plus size={15}/> إضافة مصروف</button>
      <div style={{margin:'22px 0 12px',paddingTop:18,borderTop:'1px solid #dbe3ed',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><h4 style={{margin:'0 0 4px'}}>مصاريف مستودع مصنع البياضات السنوية</h4><small style={{color:'#64748b'}}>{isLinensStorageCostInferred?'مستنتجة تلقائيًا من مصاريف المكان والتشغيل بعد استبعاد الرواتب والأجور. ويمكن استبدالها بإدخال مصاريف تخزين مستقلة أدناه.':'تُستخدم فقط عندما يكون الصنف مخزنًا في مصنع البياضات.'}</small></div><strong style={{padding:'8px 13px',borderRadius:20,background:'#ecfdf5',color:'#047857'}}>الإجمالي السنوي: {money(linensWarehouseAnnualExpenses)} د.أ {isLinensStorageCostInferred&&<small style={{fontSize:11}}>(مستنتج)</small>}</strong></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}>{(settings.linensWarehouseAnnualExpenses||[]).map((expense,index)=><div key={index} style={{padding:13,border:'1px solid #a7f3d0',borderRadius:12,background:'#f8fffd'}}><Input value={expense.name} onChange={e=>setSettings(s=>({...s,linensWarehouseAnnualExpenses:s.linensWarehouseAnnualExpenses.map((item,itemIndex)=>itemIndex===index?{...item,name:e.target.value}:item)}))} style={{fontWeight:800,background:'#fff',marginBottom:8}}/><div style={{display:'flex',gap:8,alignItems:'center'}}><Input type="number" min="0" step="0.01" value={expense.amount} onChange={e=>setSettings(s=>({...s,linensWarehouseAnnualExpenses:s.linensWarehouseAnnualExpenses.map((item,itemIndex)=>itemIndex===index?{...item,amount:e.target.value}:item)}))} style={{fontSize:17,fontWeight:900,background:'#fff'}}/><span style={{whiteSpace:'nowrap',fontWeight:800}}>د.أ / سنة</span><button type="button" onClick={()=>setSettings(s=>({...s,linensWarehouseAnnualExpenses:s.linensWarehouseAnnualExpenses.filter((_,itemIndex)=>itemIndex!==index)}))} style={{width:38,height:38,border:'1px solid #fecaca',borderRadius:9,background:'#fff1f2',color:'#dc2626',cursor:'pointer'}}><Trash2 size={15}/></button></div></div>)}</div>
      <button className="btn btn-outline" style={{marginTop:12,borderColor:'#6ee7b7',color:'#047857'}} onClick={()=>setSettings(s=>({...s,linensWarehouseAnnualExpenses:[...(s.linensWarehouseAnnualExpenses||[]),{name:'مصروف مستودع جديد',amount:0}]}))}><Plus size={15}/> إضافة مصروف مستودع البياضات</button>
      </>}
      {costCenterTab==='pillow'&&<><div style={{margin:'4px 0 14px',padding:16,border:'1px solid #bfdbfe',borderRadius:14,background:'#eff6ff',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><h4 style={{margin:'0 0 5px',color:'#1e40af'}}>مصاريف مستودع مصنع المخدة السنوية</h4><small style={{color:'#475569',fontWeight:700}}>أدخل كل مصروف بقيمته السنوية ثم اضغط حفظ الإعدادات. سيجمعها النظام ويجلب الإجمالي تلقائيًا إلى حاسبة التخزين.</small></div><strong style={{padding:'9px 14px',borderRadius:22,background:'#fff',border:'1px solid #93c5fd',color:'#1d4ed8'}}>الإجمالي السنوي: {money(pillowWarehouseAnnualExpenses)} د.أ</strong></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}>{(settings.warehouseAnnualExpenses||[]).map((expense,index)=>{const ExpenseIcon=[Building2,Users,Zap,Droplets,Wrench,CircleDollarSign][index%6];return <div key={index} style={{padding:14,border:'1px solid #bfdbfe',borderRadius:13,background:'#f8fbff',boxShadow:'0 3px 12px rgba(37,99,235,.04)'}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:11}}><span style={{width:39,height:39,borderRadius:10,background:'#dbeafe',color:'#2563eb',display:'flex',alignItems:'center',justifyContent:'center'}}><ExpenseIcon size={20}/></span><Input value={expense.name} onChange={e=>setSettings(s=>({...s,warehouseAnnualExpenses:s.warehouseAnnualExpenses.map((item,itemIndex)=>itemIndex===index?{...item,name:e.target.value}:item)}))} style={{fontWeight:800,border:0,background:'#fff'}}/></div><div style={{display:'flex',gap:8,alignItems:'center'}}><Input type="number" min="0" step="0.01" value={expense.amount} onChange={e=>setSettings(s=>({...s,warehouseAnnualExpenses:s.warehouseAnnualExpenses.map((item,itemIndex)=>itemIndex===index?{...item,amount:e.target.value}:item)}))} style={{fontSize:17,fontWeight:900,background:'#fff'}}/><span style={{whiteSpace:'nowrap',fontWeight:800}}>د.أ / سنة</span><button type="button" onClick={()=>setSettings(s=>({...s,warehouseAnnualExpenses:s.warehouseAnnualExpenses.filter((_,itemIndex)=>itemIndex!==index)}))} style={{width:38,height:38,border:'1px solid #fecaca',borderRadius:9,background:'#fff1f2',color:'#dc2626',cursor:'pointer'}}><Trash2 size={15}/></button></div></div>})}</div>
      <button className="btn btn-outline" style={{marginTop:12,borderColor:'#93c5fd',color:'#1d4ed8'}} onClick={()=>setSettings(s=>({...s,warehouseAnnualExpenses:[...(s.warehouseAnnualExpenses||[]),{name:'مصروف مستودع جديد',amount:0}]}))}><Plus size={15}/> إضافة مصروف مستودع</button>
      </>}
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
            grid-template-columns: minmax(145px, .6fr) minmax(300px, 1.45fr) minmax(250px, 1.1fr) minmax(165px, .7fr) minmax(195px, .8fr);
            gap: 12px;
            align-items: end;
          }
          div[style*="linear-gradient(145deg"] > div:first-child {
            grid-template-columns: repeat(6, minmax(195px, 1fr)) !important;
            align-items: stretch !important;
            overflow-x: auto;
            padding-bottom: 3px;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > * {
            min-width: 195px !important;
            height: 126px !important;
            box-sizing: border-box;
            display: flex !important;
            flex-direction: column;
            justify-content: center !important;
            text-align: center;
            padding: 14px !important;
            border-radius: 12px !important;
            line-height: 1.45;
            position: relative !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > * > span:first-child,
          div[style*="linear-gradient(145deg"] > div:first-child > label {
            color: #334155 !important;
            font-size: 12px !important;
            font-weight: 900 !important;
            line-height: 1.5 !important;
            text-align: center !important;
            white-space: nowrap !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > div > span:first-child {
            position: absolute !important;
            top: 18px !important;
            right: 8px !important;
            left: 8px !important;
            display: block !important;
            text-align: center !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > label {
            display: block !important;
            padding-top: 18px !important;
            overflow: hidden !important;
            text-align: center !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > label > span {
            display: inline !important;
            font-size: inherit !important;
            white-space: nowrap !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > * strong {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: auto !important;
            height: 40px !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 8px !important;
            border: 1.5px solid #93c5fd !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            color: #1d4ed8 !important;
            font-size: 18px !important;
            font-weight: 950 !important;
            line-height: 1.25 !important;
            white-space: nowrap !important;
            position: absolute !important;
            right: 12px !important;
            left: 12px !important;
            bottom: 14px !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > * > small {
            display: none !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child > * small {
            font-size: 11px !important;
            line-height: 1.45 !important;
          }
          div[style*="linear-gradient(145deg"] > div:first-child label input {
            width: auto !important;
            margin: 0 !important;
            height: 40px !important;
            font-size: 16px !important;
            font-weight: 900 !important;
            text-align: center !important;
            position: absolute !important;
            right: 12px !important;
            left: 12px !important;
            bottom: 14px !important;
          }
          @media (max-width: 920px) {
            .costing-product-toolbar { grid-template-columns: 1fr 1fr; }
          }
          @media (max-width: 620px) {
            .costing-product-toolbar { grid-template-columns: 1fr; }
          }
        `}</style>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(220px,1fr))',gap:10,marginBottom:14}}>
          <button type="button" onClick={()=>changeProductCostingStatus('pending')} style={{border:productCostingStatus==='pending'?'2px solid #f59e0b':'1px solid #fde68a',borderRadius:12,padding:'12px 16px',background:productCostingStatus==='pending'?'#fffbeb':'#fff',color:'#92400e',fontWeight:950,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit'}}><span>بانتظار التكليف والتسعير</span><span style={{background:'#fef3c7',borderRadius:20,padding:'3px 10px'}}>{costingStatusCounts.pending}</span></button>
          <button type="button" onClick={()=>changeProductCostingStatus('completed')} style={{border:productCostingStatus==='completed'?'2px solid #10b981':'1px solid #a7f3d0',borderRadius:12,padding:'12px 16px',background:productCostingStatus==='completed'?'#ecfdf5':'#fff',color:'#047857',fontWeight:950,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit'}}><span>تم التكليف والتسعير — للتعديل</span><span style={{background:'#d1fae5',borderRadius:20,padding:'3px 10px'}}>{costingStatusCounts.completed}</span></button>
        </div>
        <div className="costing-product-toolbar">
          <label style={{fontWeight:800}}>مصدر الصنف
            <select
              className="input-field"
              dir="rtl"
              value={productSourceFilter}
              onChange={(event) => changeProductSource(event.target.value)}
              style={{width:'100%',height:38,marginTop:0,border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',fontWeight:800,fontSize:13,padding:'0 8px',color:'#0f172a',fontFamily:'inherit',cursor:'pointer'}}
            >
              <option value="" disabled>اختر مصدر الصنف</option>
              <option value="all">جميع الأصناف</option>
              <option value="stock">أصناف المخزون</option>
              <option value="price_list">أصناف قوائم الأسعار</option>
            </select>
          </label>
          <label style={{fontWeight:800}}>المنتج (الكود والاسم في خانة واحدة)
            <Select
              key={productSourceFilter}
              options={productOptions}
              isDisabled={!productSourceFilter}
              value={data.productId ? {
                value: data.productOptionValue || data.productId,
                label: `${data.productCode?`${data.productCode} — `:''}${data.productName}`,
                source: products.find(product => product.optionValue === data.productOptionValue)?.source
              } : null}
              onChange={selectProduct}
              placeholder={!productSourceFilter ? 'اختر مصدر الصنف أولًا' : productSourceFilter === 'stock' ? 'ابحث في أصناف المخزون...' : productSourceFilter === 'price_list' ? 'ابحث في أصناف قوائم الأسعار...' : 'ابحث في المخزون أو قوائم الأسعار...'}
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
          <label style={{fontWeight:800}}>نوع احتساب التكلفة <span style={{color:'#dc2626'}}>*</span>
            <select
              className="input-field"
              dir="rtl"
              required
              disabled={!data.productId}
              value={data.costApplicability || ''}
              onChange={(event) => { setExpandedCost(null); setData(current => ({ ...current, costApplicability: event.target.value })); }}
              style={{width:'100%',height:38,marginTop:0,border:`${data.costApplicability ? '1px solid #cbd5e1' : '1.5px solid #f59e0b'}`,borderRadius:8,background:data.productId?'#fff':'#f1f5f9',fontWeight:800,fontSize:12,padding:'0 8px',color:data.productId?'#0f172a':'#94a3b8',fontFamily:'inherit',cursor:data.productId?'pointer':'not-allowed'}}
            >
              <option value="" disabled>اختر نوع الاحتساب</option>
              <option value="factory_and_labor">خاضع لمصاريف وأجور المصنع</option>
              <option value="factory_only">خاضع لمصاريف المصنع فقط</option>
              <option value="manual_cost">غير خاضع لمصاريف وأجور المصنع</option>
            </select>
          </label>
          <label style={{fontWeight:800}}>الكمية المتوقع إنتاجها<div style={{display:'flex'}}><Input type="number" min="1" value={data.quantity} onChange={e=>setData(d=>({...d,quantity:e.target.value}))} style={{borderRadius:'0 8px 8px 0',fontSize:16,fontWeight:900}}/><span style={{display:'flex',alignItems:'center',padding:'0 11px',border:'1px solid #cbd5e1',borderRight:0,borderRadius:'8px 0 0 8px',background:'#f8fafc',fontSize:13}}>قطعة</span></div></label>
          <button type="button" className="btn btn-outline" onClick={copyCostDetailsFromProduct} style={{height:42,color:'#0f766e',borderColor:'#99f6e4',background:'#f0fdfa',fontWeight:900,whiteSpace:'nowrap',padding:'0 8px',fontSize:13}}><Package size={16}/> نسخ تفاصيل التكلفة من صنف</button>
        </div>
      </section>
      {data.pricingNeedsReview && <div style={{padding:13,background:'#fff7ed',color:'#9a3412',border:'1px solid #fdba74',borderRadius:12,display:'flex',gap:8,fontWeight:800}}><AlertTriangle size={20}/> تغيرت التكلفة منذ آخر سعر معتمد V{data.pricingVersion||1} ويجب مراجعة السعر.</div>}

      <section style={{background:'#fff',border:'1px solid #dbe3ed',borderRadius:14,padding:16}}>
        <h3 style={{margin:'0 0 14px',fontSize:18}}>1. تكلفة التصنيع للقطعة</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16,alignItems:'stretch'}}>
          {fullCostMode&&<div style={{padding:14,border:'1.5px solid #60a5fa',borderRadius:11,textAlign:'center',background:'#eff6ff'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',color:'#1d4ed8',fontWeight:900}}><span>حصة مصاريف التخزين</span><Building2 size={22}/></div><label style={{display:'block',marginTop:8,textAlign:'right',fontSize:12,fontWeight:900,color:'#334155'}}>المصنع المخزن فيه الصنف<select className="input-field" dir="rtl" value={data.storageFactory||''} onChange={e=>setData(d=>({...d,storageFactory:e.target.value}))} style={{width:'100%',height:34,marginTop:4,border:'1px solid #93c5fd',borderRadius:8,background:'#fff',fontWeight:900,fontFamily:'inherit',padding:'0 8px'}}><option value="" disabled>اختر مصنع التخزين</option><option value="linens">مصنع البياضات</option><option value="pillow">مصنع المخدة</option></select></label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginTop:7}}><label style={{fontSize:11,fontWeight:800,color:'#475569'}}>المساحة %<Input type="number" min="0" max="100" step="0.01" value={data.warehouseSpacePercent} onChange={e=>setData(d=>({...d,warehouseSpacePercent:e.target.value}))} style={{height:32,marginTop:3,background:'#fff'}}/></label><label style={{fontSize:11,fontWeight:800,color:'#475569'}}>المدة/شهر<Input type="number" min="0" step="0.1" value={data.storageMonths} onChange={e=>setData(d=>({...d,storageMonths:e.target.value}))} style={{height:32,marginTop:3,background:'#fff'}}/></label></div><strong style={{display:'block',fontSize:21,margin:'9px 0 0',color:'#1d4ed8'}}>{money(storageCostPerUnit)} د.أ</strong></div>}
          {[['materials','المواد الخام',materialsCost,Factory,materialsEnabled],['labor','أجور التصنيع',laborCost,Clock3,laborEnabled],['factory','حصة مصاريف المصنع',operatingCost,Factory,factoryEnabled]].map(([key,label,value,Icon,enabled])=><div key={key} style={{padding:14,border:`1px solid ${enabled?'#dbe3ed':'#e2e8f0'}`,borderRadius:11,textAlign:'center',background:enabled?'#fbfdff':'#f1f5f9',opacity:enabled?1:.58}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',color:enabled?'#475569':'#94a3b8'}}><span>{label}</span><Icon size={22}/></div><strong style={{display:'block',fontSize:21,margin:'8px 0'}}>{money(value)} د.أ</strong><button disabled={!enabled} className="btn btn-outline" style={{width:'100%',height:32,padding:4,cursor:enabled?'pointer':'not-allowed'}} onClick={()=>enabled&&setExpandedCost(expandedCost===key?null:key)}>{enabled?'تفاصيل⌄':'غير خاضع'}</button></div>)}
          {manualCostMode&&<div style={{padding:14,border:'1.5px solid #60a5fa',borderRadius:11,textAlign:'center',background:'#eff6ff'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',color:'#1d4ed8',fontWeight:900}}><span>حصة مصاريف التخزين</span><Building2 size={22}/></div><label style={{display:'block',marginTop:10,textAlign:'right',fontSize:12,fontWeight:900,color:'#334155'}}>المصنع المخزن فيه الصنف <span style={{color:'#dc2626'}}>*</span><select className="input-field" dir="rtl" value={data.storageFactory||''} onChange={e=>setData(d=>({...d,storageFactory:e.target.value}))} style={{width:'100%',height:36,marginTop:5,border:'1px solid #93c5fd',borderRadius:8,background:'#fff',fontWeight:900,fontFamily:'inherit',padding:'0 8px'}}><option value="" disabled>اختر مصنع التخزين</option><option value="linens">مصنع البياضات</option><option value="pillow">مصنع المخدة</option></select></label><strong style={{display:'block',fontSize:21,margin:'9px 0',color:'#1d4ed8'}}>{money(storageCostPerUnit)} د.أ</strong><button className="btn btn-outline" style={{width:'100%',height:32,padding:4,borderColor:'#93c5fd',color:'#1d4ed8'}} onClick={()=>setExpandedCost(expandedCost==='storage'?null:'storage')}>تفاصيل⌄</button></div>}
          <div style={{padding:16,border:'1.5px solid #0f9f8f',borderRadius:11,textAlign:'center',background:'#f8fffd'}}><b>{manualCostMode?'التكلفة الأساسية للقطعة':'التكلفة النهائية للقطعة'}</b>{manualCostMode?<><Input type="number" min="0" step="0.001" value={data.manualUnitCost} onChange={e=>setData(d=>({...d,manualUnitCost:e.target.value}))} placeholder="أدخل تكلفة القطعة قبل التخزين" style={{marginTop:9,height:42,fontSize:18,fontWeight:950,border:'1.5px solid #0f9f8f',background:'#fff'}}/><small style={{display:'block',marginTop:8,color:'#64748b'}}>النهائية بعد التخزين: <b style={{color:'#0f8b72',fontSize:16}}>{money(finalUnitCost)} د.أ</b></small></>:<strong style={{display:'block',fontSize:29,color:'#0f8b72',marginTop:14}}>{money(finalUnitCost)} د.أ</strong>}</div>
        </div>
        {expandedCost==='storage'&&manualCostMode&&<div style={{marginTop:14,padding:18,border:'1px solid #93c5fd',borderRadius:14,background:'linear-gradient(145deg,#eff6ff 0%,#ffffff 65%)',boxShadow:'0 5px 16px rgba(37,99,235,.07)'}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:14}}><div style={{minHeight:92,padding:15,borderRadius:12,background:'#fff',border:'1px solid #bfdbfe',display:'flex',flexDirection:'column',justifyContent:'center'}}><span style={{display:'block',color:'#64748b',fontSize:13,fontWeight:800}}>إجمالي مصاريف المستودع السنوية</span><strong style={{display:'block',marginTop:7,color:'#1d4ed8',fontSize:21}}>{money(totalWarehouseAnnualExpenses)} د.أ</strong><small style={{color:'#64748b',marginTop:5}}>يُجلب تلقائيًا من مركز تكلفة مصنع المخدة</small></div><label style={{minHeight:92,padding:15,borderRadius:12,background:'#fff',border:'1px solid #bfdbfe',fontWeight:900}}>نسبة المساحة التي يشغلها الصنف <span style={{color:'#2563eb'}}>%</span><Input type="number" min="0" max="100" step="0.01" value={data.warehouseSpacePercent} onChange={e=>setData(d=>({...d,warehouseSpacePercent:e.target.value}))} style={{marginTop:9,height:42,fontSize:18,fontWeight:950,background:'#f8fbff',border:'1.5px solid #93c5fd'}}/></label><label style={{minHeight:92,padding:15,borderRadius:12,background:'#fff',border:'1px solid #bfdbfe',fontWeight:900}}>مدة التخزين المتوقعة <span style={{color:'#64748b'}}>(بالأشهر)</span><Input type="number" min="0" step="0.1" value={data.storageMonths} onChange={e=>setData(d=>({...d,storageMonths:e.target.value}))} style={{marginTop:9,height:42,fontSize:18,fontWeight:950,background:'#f8fbff',border:'1.5px solid #93c5fd'}}/></label><div style={{minHeight:92,padding:15,borderRadius:12,background:'#fff',border:'1px solid #e2e8f0',display:'flex',flexDirection:'column',justifyContent:'center'}}><span style={{display:'block',color:'#64748b',fontSize:13,fontWeight:800}}>عدد القطع المعتمد في الحساب</span><strong style={{display:'block',marginTop:7,color:'#0f172a',fontSize:21}}>{qty.toLocaleString('en-US')} <small style={{fontSize:12}}>قطعة</small></strong></div><div style={{minHeight:92,padding:15,borderRadius:12,background:'#faf5ff',border:'1px solid #ddd6fe',display:'flex',flexDirection:'column',justifyContent:'center'}}><span style={{display:'block',color:'#6d28d9',fontSize:13,fontWeight:800}}>حصة الصنف الشهرية</span><strong style={{display:'block',marginTop:7,color:'#7c3aed',fontSize:21}}>{money(monthlyItemStorageShare)} د.أ</strong></div><div style={{minHeight:92,padding:15,borderRadius:12,background:'linear-gradient(135deg,#dbeafe,#eff6ff)',border:'2px solid #60a5fa',display:'flex',flexDirection:'column',justifyContent:'center',boxShadow:'0 4px 12px rgba(37,99,235,.12)'}}><span style={{display:'block',color:'#1e40af',fontSize:13,fontWeight:900}}>حصة التخزين للقطعة</span><strong style={{display:'block',marginTop:7,color:'#1d4ed8',fontSize:24}}>{money(storageCostPerUnit)} د.أ</strong></div></div><div style={{marginTop:14,padding:'12px 15px',borderRadius:11,background:'#fff',border:'1px dashed #93c5fd',color:'#475569',fontSize:13,fontWeight:800,textAlign:'center',lineHeight:1.8,direction:'rtl'}}>حصة التخزين للقطعة = [(إجمالي مصاريف المستودع السنوية × نسبة إشغال الصنف) ÷ 12 ÷ عدد القطع] × مدة التخزين بالأشهر</div></div>}
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
        {expandedCost==='factory'&&factoryEnabled&&<div style={{marginTop:14,padding:16,borderTop:'1px solid #dbe3ed',borderRadius:'0 0 12px 12px',background:'linear-gradient(180deg,#f8fafc 0%,#ffffff 100%)',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12,alignItems:'stretch'}}>
          {factoryOnlyMode&&<label style={{display:'flex',flexDirection:'column',justifyContent:'center',padding:14,fontWeight:900,color:'#0f766e',background:'#f0fdfa',border:'1.5px solid #5eead4',borderRadius:12,boxShadow:'0 3px 10px rgba(13,148,136,.08)'}}>زمن تحميل مصاريف المصنع <small style={{color:'#64748b',fontWeight:700,marginTop:3}}>(بالدقائق لكل قطعة)</small><Input type="number" min="0" step="0.1" value={data.factoryMinutes} onChange={e=>setData(d=>({...d,factoryMinutes:e.target.value}))} placeholder="0" style={{marginTop:9,height:42,background:'#fff',border:'1px solid #99f6e4',fontSize:18,fontWeight:950,color:'#0f766e'}}/></label>}
          {[
            ['إجمالي المصاريف الشهرية', monthlyExpenses, '#2563eb', '#eff6ff'],
            ['حصة المصنع الشهرية', factoryExpenseShareMonthly, '#7c3aed', '#f5f3ff'],
            ['معدل الساعة', factoryExpenseHourlyRate, '#d97706', '#fffbeb'],
            ['معدل الدقيقة', factoryExpenseMinuteRate, '#059669', '#ecfdf5']
          ].map(([label,value,color,background])=><div key={label} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:88,padding:13,border:'1px solid #e2e8f0',borderRadius:12,background,boxShadow:'0 3px 10px rgba(15,23,42,.05)',textAlign:'center'}}><span style={{fontSize:13,color:'#64748b',fontWeight:800,marginBottom:7}}>{label}</span><strong style={{fontSize:18,color,fontWeight:950,direction:'ltr'}}>{money(value)} <small style={{fontSize:12}}>د.أ</small></strong></div>)}
        </div>}
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
            {data.pricingMethod==='manual'&&<Input type="number" step="0.001" value={data.salePrice} onChange={e=>setData(d=>({...d,salePrice:e.target.value}))} onBlur={()=>setData(d=>({...d,salePrice:d.salePrice===''?'':Number(d.salePrice).toFixed(3)}))} style={{marginTop:8,background:'#fff',fontSize:17,fontWeight:900}}/>}
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
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginBottom:14,padding:12,border:'1px solid #dbeafe',borderRadius:12,background:'#f8fbff'}}><div style={{padding:'10px 13px',borderRadius:10,background:'#fff',border:'1px solid #bfdbfe'}}><span style={{display:'block',fontSize:12,color:'#64748b',fontWeight:800}}>المتوفر في مصنع المخدة</span><strong style={{display:'block',marginTop:5,fontSize:20,color:'#1d4ed8'}}>{selectedStockAvailability.pillow.toLocaleString('en-US')} <small style={{fontSize:12}}>قطعة</small></strong></div><div style={{padding:'10px 13px',borderRadius:10,background:'#fff',border:'1px solid #a7f3d0'}}><span style={{display:'block',fontSize:12,color:'#64748b',fontWeight:800}}>المتوفر في مصنع البياضات</span><strong style={{display:'block',marginTop:5,fontSize:20,color:'#047857'}}>{selectedStockAvailability.linens.toLocaleString('en-US')} <small style={{fontSize:12}}>قطعة</small></strong></div>{selectedStockAvailability.unclassified!==0&&<div style={{padding:'10px 13px',borderRadius:10,background:'#fff',border:'1px solid #fde68a'}}><span style={{display:'block',fontSize:12,color:'#64748b',fontWeight:800}}>مخزون دون مصنع محدد</span><strong style={{display:'block',marginTop:5,fontSize:20,color:'#b45309'}}>{selectedStockAvailability.unclassified.toLocaleString('en-US')} <small style={{fontSize:12}}>قطعة</small></strong></div>}<div style={{padding:'10px 13px',borderRadius:10,background:'linear-gradient(135deg,#0f766e,#0d9488)',color:'#fff',boxShadow:'0 3px 10px rgba(15,118,110,.15)'}}><span style={{display:'block',fontSize:12,fontWeight:800,opacity:.9}}>إجمالي المخزون المتوفر</span><strong style={{display:'block',marginTop:5,fontSize:21}}>{selectedStockAvailability.total.toLocaleString('en-US')} <small style={{fontSize:12}}>قطعة</small></strong></div></div>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:980,textAlign:'center'}}><thead><tr>{['من','إلى','الخصم %','سعر البيع','العمولة','صافي ربح القطعة','هامش الربح الصافي %','الحالة',''].map(label=><th key={label} style={{...th,textAlign:'center'}}>{label}</th>)}</tr></thead><tbody>{(data.quantityTiers||[]).map((tier,index)=>{const tierSale=salePrice*(1-(Number(tier.discountPercent)||0)/100);const tierCommission=tierSale*salesCommissionRate;const tierProfit=tierSale-finalUnitCost-tierCommission;const tierMargin=tierSale?tierProfit/tierSale*100:0;const minimum=Number(tier.minimumPrice)||Number(data.minimumPrice)||breakEvenPrice;const state=tierSale<minimum?['أقل من الحد الأدنى','#fee2e2','#dc2626']:tierSale<=minimum*1.05?['سعر منخفض','#fef3c7','#d97706']:['سعر آمن','#dcfce7','#15803d'];return <tr key={index}><td style={{...td,textAlign:'center'}}><Input type="number" value={tier.from??''} onChange={e=>changeRow('quantityTiers',index,'from',e.target.value)}/></td><td style={{...td,textAlign:'center'}}><Input type="number" value={tier.to??''} placeholder="فأكثر" onChange={e=>changeRow('quantityTiers',index,'to',e.target.value)}/></td><td style={{...td,textAlign:'center'}}><Input type="number" step="0.1" value={tier.discountPercent??0} onChange={e=>updateTierDiscount(index,e.target.value)}/></td><td style={{...td,textAlign:'center'}}><Input type="number" value={money(tierSale)} readOnly style={{background:'#f0fdf4',color:'#047857',fontWeight:900}}/></td><td style={{...td,fontWeight:900,textAlign:'center',color:'#c2410c'}}>{money(tierCommission)}</td><td style={{...td,fontWeight:900,textAlign:'center'}}>{money(tierProfit)}</td><td style={{...td,fontWeight:900,textAlign:'center'}}>{tierMargin.toFixed(2)}%</td><td style={{...td,textAlign:'center'}}><span style={{display:'inline-block',padding:'5px 12px',borderRadius:20,background:state[1],color:state[2],fontWeight:900,whiteSpace:'nowrap'}}>{state[0]}</span></td><td style={{...td,textAlign:'center'}}><button className="btn btn-outline" onClick={()=>removeRow('quantityTiers',index)}><Trash2 size={14}/></button></td></tr>})}</tbody></table></div>
        <button className="btn btn-outline" style={{marginTop:10}} onClick={()=>setData(d=>({...d,quantityTiers:[...(d.quantityTiers||[]),{from:'',to:null,discountPercent:0,salePrice:salePrice,minimumPrice:data.minimumPrice||breakEvenPrice}]}))}><Plus size={14}/> إضافة شريحة</button>
      </section>

      <div style={{display:'flex',justifyContent:'center',padding:14,background:'#fff',border:'1px solid #dbe3ed',borderRadius:14}}><button className="btn" style={{background:costingComplete?'#087f5b':'#94a3b8',color:'#fff',height:48,minWidth:320}} onClick={approvePrice}><ShieldCheck size={18}/> اعتماد السعر وإضافته لقائمة الأسعار</button></div>
      <div style={{display:'flex',justifyContent:'center'}}><button className="btn btn-primary" onClick={saveCost}><Save size={17}/> حفظ التكلفة</button></div>
    </div>}
  </div>;
};

export default AdminProductCosting;
