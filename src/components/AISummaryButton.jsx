import React, { useEffect, useMemo, useState } from 'react';
import { startVisiblePolling } from '../utils/visiblePolling';
import { Activity, BrainCircuit, Clock3, Package, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { getLogs, getMissions, getOrders, getReports, getSalesOrders, getStock } from '../store';

const isSameLocalDay = (value, baseDate = new Date()) => {
  if (!value) return false;
  const date = new Date(value);
  return (
    date.getFullYear() === baseDate.getFullYear() &&
    date.getMonth() === baseDate.getMonth() &&
    date.getDate() === baseDate.getDate()
  );
};

const toDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (value) => {
  if (!value) return '---';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

const normalizeStatus = (value) => String(value || '').trim().toLowerCase();

const isCompletedProduction = (status) => normalizeStatus(status).includes('منتهي');
const isCompletedDelivery = (status) => normalizeStatus(status).includes('تم الإنجاز');
const isCanceledDelivery = (status) => {
  const normalized = normalizeStatus(status);
  return normalized.includes('ملغي') || normalized.includes('تعذر');
};
const isDeliveredSales = (status) => normalizeStatus(status).includes('تم التوصيل');
const isCanceledOrder = (status) => normalizeStatus(status).includes('ملغي');

const buildInsights = ({ logs, orders, salesOrders, stock, missions, reports }) => {
  const now = new Date();
  const todayKey = toDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  const todayLogs = [...logs]
    .filter((log) => isSameLocalDay(log.timestamp, now))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const completedProductionToday = orders.filter(
    (order) => isCompletedProduction(order.status) && (order.statusUpdateDate === todayKey || order.orderDate === todayKey)
  );

  const completedDeliveriesToday = missions.filter(
    (mission) => isCompletedDelivery(mission.status) && isSameLocalDay(mission.completedAt || mission.updatedAt || mission.createdAt, now)
  );

  const overdueProductionOrders = orders.filter(
    (order) => !isCompletedProduction(order.status) && !isCanceledOrder(order.status) && order.deliveryDate && order.deliveryDate < todayKey
  );

  const overdueSalesOrders = salesOrders.filter(
    (order) => !isDeliveredSales(order.status) && !isCanceledOrder(order.status) && order.deliveryDate && order.deliveryDate < todayKey
  );

  const overdueMissions = missions.filter(
    (mission) => !isCompletedDelivery(mission.status) && !isCanceledDelivery(mission.status) && mission.dueDate && mission.dueDate < todayKey
  );

  const outOfStockItems = stock.filter((item) => Number(item.quantity || 0) <= 0);
  const lowStockItems = stock.filter((item) => Number(item.quantity || 0) > 0 && Number(item.quantity || 0) <= Number(item.minLimit || 0));

  const reportCountByDepartment = (dateKey) =>
    reports.reduce((accumulator, report) => {
      if (report.date !== dateKey) return accumulator;
      const department = report.department || 'غير محدد';
      accumulator[department] = (accumulator[department] || 0) + 1;
      return accumulator;
    }, {});

  const todayDeptCounts = reportCountByDepartment(todayKey);
  const yesterdayDeptCounts = reportCountByDepartment(yesterdayKey);
  const comparisonCandidates = Object.keys(todayDeptCounts).map((department) => {
    const todayCount = todayDeptCounts[department] || 0;
    const yesterdayCount = yesterdayDeptCounts[department] || 0;
    const delta = todayCount - yesterdayCount;
    const percent = yesterdayCount > 0 ? Math.round((delta / yesterdayCount) * 100) : (todayCount > 0 ? 100 : 0);
    return { department, todayCount, delta, percent };
  });
  const bestDepartmentTrend = comparisonCandidates.sort((a, b) => b.percent - a.percent)[0] || null;

  const insightItems = [];

  if (completedProductionToday.length > 0) {
    insightItems.push({ tone: 'positive', text: `تم إنهاء ${completedProductionToday.length} طلبيات إنتاج اليوم حتى الآن.` });
  }

  if (completedDeliveriesToday.length > 0) {
    insightItems.push({ tone: 'positive', text: `فريق التوصيل أنجز ${completedDeliveriesToday.length} مهمات اليوم بنجاح.` });
  }

  if (bestDepartmentTrend && bestDepartmentTrend.todayCount > 0 && bestDepartmentTrend.delta > 0) {
    insightItems.push({ tone: 'info', text: `${bestDepartmentTrend.department} أسرع من أمس بنسبة ${bestDepartmentTrend.percent}% في عدد التقارير المنجزة.` });
  }

  if (overdueProductionOrders.length > 0) {
    insightItems.push({ tone: 'warning', text: `طلبية الإنتاج #${overdueProductionOrders[0].orderNumber} متأخرة وتحتاج متابعة فورية.` });
  }

  if (overdueSalesOrders.length > 0) {
    insightItems.push({ tone: 'warning', text: `يوجد ${overdueSalesOrders.length} طلبيات عملاء تجاوزت موعد التسليم المحدد.` });
  }

  if (lowStockItems.length > 0) {
    insightItems.push({ tone: 'warning', text: `يوجد ${lowStockItems.length} أصناف في المخزون عند الحد الأدنى أو أقل.` });
  }

  if (outOfStockItems.length > 0) {
    insightItems.push({ tone: 'critical', text: `نفد المخزون بالكامل من ${outOfStockItems.length} أصناف ويجب تعويضها سريعاً.` });
  }

  if (overdueMissions.length > 0) {
    insightItems.push({ tone: 'warning', text: `هناك ${overdueMissions.length} مهمات توصيل أو متابعة تجاوزت موعدها المحدد.` });
  }

  if (todayLogs.length > 0) {
    insightItems.push({
      tone: 'neutral',
      text: `آخر تحديث سُجّل عند ${formatTime(todayLogs[0].timestamp)} بواسطة ${todayLogs[0].userName || 'مستخدم غير محدد'}.`
    });
  }

  if (!insightItems.length) {
    insightItems.push({ tone: 'positive', text: 'لا توجد مؤشرات حرجة حالياً، والنظام يعمل بشكل مستقر حتى الآن.' });
  }

  return {
    insightItems,
    todayLogs,
    completedProductionToday,
    completedDeliveriesToday,
    lowStockItems,
    outOfStockItems
  };
};

const AISummaryButton = () => {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState({
    logs: [],
    orders: [],
    salesOrders: [],
    stock: [],
    missions: [],
    reports: []
  });
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [typedInsight, setTypedInsight] = useState('');

  const summary = useMemo(() => buildInsights(snapshot), [snapshot]);
  const activeInsight = summary.insightItems[activeInsightIndex] || summary.insightItems[0];

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const [logs, orders, salesOrders, stock, missions, reports] = await Promise.all([
        getLogs(),
        getOrders(),
        getSalesOrders(),
        getStock(),
        getMissions(),
        getReports()
      ]);

      setSnapshot({ logs, orders, salesOrders, stock, missions, reports });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return startVisiblePolling(loadSnapshot, 300000);
  }, []);

  useEffect(() => {
    if (!summary.insightItems.length) return undefined;
    const intervalId = window.setInterval(() => {
      setActiveInsightIndex((current) => (current + 1) % summary.insightItems.length);
    }, 5200);
    return () => window.clearInterval(intervalId);
  }, [summary.insightItems.length]);

  useEffect(() => {
    const nextText = activeInsight?.text || '';
    setTypedInsight('');
    if (!nextText) return undefined;

    let charIndex = 0;
    const typingInterval = window.setInterval(() => {
      charIndex += 1;
      setTypedInsight(nextText.slice(0, charIndex));
      if (charIndex >= nextText.length) {
        window.clearInterval(typingInterval);
      }
    }, 28);

    return () => window.clearInterval(typingInterval);
  }, [activeInsight?.text]);

  const summaryCards = [
    {
      label: 'طلبيات إنتاج منتهية',
      value: summary.completedProductionToday.length,
      icon: TrendingUp
    },
    {
      label: 'مهمات منجزة',
      value: summary.completedDeliveriesToday.length,
      icon: Clock3
    },
    {
      label: 'تنبيهات مخزون',
      value: summary.lowStockItems.length + summary.outOfStockItems.length,
      icon: Package
    },
    {
      label: 'الحركات المسجلة اليوم',
      value: summary.todayLogs.length,
      icon: Activity
    }
  ];

  return (
    <div className="ai-insights-shell">
      <div className={`ai-smart-widget ${activeInsight?.tone || 'neutral'}`}>
        <div className="ai-smart-widget-head">
          <div>
            <div className="ai-smart-kicker">
              <BrainCircuit size={15} />
              <span>الملخص الذكي</span>
            </div>
            <h3>النظام يتابع الأداء لحظة بلحظة</h3>
          </div>
          <button type="button" className="header-icon-button" onClick={loadSnapshot} aria-label="تحديث الملخص">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="ai-smart-typing-line">
          {loading ? 'جارٍ تحليل حركة النظام الحالية...' : typedInsight}
          <span className="ai-smart-cursor" />
        </div>

        <div className="ai-smart-mini-grid">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="ai-smart-mini-card">
                <div className="ai-smart-mini-label">
                  <Icon size={14} />
                  <span>{item.label}</span>
                </div>
                <strong>{item.value}</strong>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AISummaryButton;
