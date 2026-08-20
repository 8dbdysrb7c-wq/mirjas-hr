import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, Package, Truck, ClipboardList, AlertCircle, RefreshCw, Share2, Calendar, Clock, Building2, Copy, Factory, User } from 'lucide-react';
import html2canvas from 'html2canvas';
import { getSalesOrders, getOrders, getMissions } from '../store';
import Swal from 'sweetalert2';
import { matchesSearch, useDebounce } from '../utils/searchEngine';

const OrderTrackerModal = ({ initialOrderNumber, onClose }) => {
  const [searchTerm, setSearchTerm] = useState(initialOrderNumber || '');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);
  const debouncedSearchTerm = useDebounce(searchTerm);

  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      handleSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  const handleSearch = async (orderNumberToSearch = searchTerm) => {
    if (!orderNumberToSearch.trim()) return;
    setLoading(true);
    setError(null);
    setOrderData(null);

    try {
      const salesOrders = await getSalesOrders();
      const order = salesOrders.find(o => matchesSearch(
        [o.orderNumber, o.salesOrderNumber, o.customerName, o.customerNumber, o.phone],
        orderNumberToSearch
      ));

      if (!order) {
        setError('لم يتم العثور على طلبية بهذا الرقم');
        setLoading(false);
        return;
      }

      const productionOrders = await getOrders();
      const relatedProd = productionOrders.find(p => String(p.salesOrderNumber || p.orderNumber) === String(order.orderNumber));

      const missions = await getMissions();
      const relatedMission = missions.find(m => m.salesOrderNumber === order.orderNumber || m.orderNumber === order.orderNumber || m.items?.some(i => i.orderNumber === order.orderNumber));

      let productionProgress = 0;
      let totalProdItems = 0;
      let completedProdItems = 0;
      let nonProdTotal = 0;
      let nonProdReady = 0;
      let hasProductionItems = false;

      if (order.items) {
        order.items.forEach(item => {
          if (item.needsProduction) {
            hasProductionItems = true;
          } else {
            nonProdTotal++;
            const st = item.itemStatus || item.status;
            if (st === 'جاهز للتسليم' || st === 'تم التسليم' || st === 'جاهز') {
              nonProdReady++;
            }
          }
        });
      }

      if (relatedProd && relatedProd.items) {
        relatedProd.items.forEach(item => {
          totalProdItems += Number(item.quantity) || 0;
          if (item.status === 'منتهي') {
            completedProdItems += Number(item.quantity) || 0;
          }
        });
        if (totalProdItems > 0) {
          productionProgress = Math.round((completedProdItems / totalProdItems) * 100);
        }
      }

      setOrderData({
        sales: {
          orderNumber: order.orderNumber,
          orderDate: order.orderDate || order.date || '',
          customerName: order.customerName || order.customer || '',
          deliveryDate: order.deliveryDate || order.dueDate || '',
          status: order.status || 'قيد التنفيذ'
        },
        production: relatedProd,
        mission: relatedMission,
        productionProgress,
        nonProdTotal,
        nonProdReady,
        hasProductionItems
      });
    } catch (err) {
      setError('حدث خطأ أثناء البحث عن الطلبية');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActiveStep = () => {
    if (!orderData) return 0;
    const s = orderData.sales?.status;
    if (s === 'تم التسليم' || s === 'تم التوصيل' || s === 'منتهي' || (orderData.mission && orderData.mission.status === 'تم الإنجاز')) return 6;
    if (['قيد التوصيل', 'تم التسليم للتوصيل', 'تم تسليمها للتوصيل', 'جاهز للتوصيل', 'جاهز للتسليم للتوصيل'].includes(s) || (orderData.mission && orderData.mission.status !== 'تم الإنجاز')) return 5;
    if (s === 'جاهز' || s === 'جاهز للتسليم' || (orderData.production && orderData.production.status === 'منتهي')) return 4;
    if (s === 'قيد الإنتاج' || s === 'تجهيز داخلي' || orderData.productionProgress > 0 || (orderData.production && orderData.production.status !== 'منتهي' && orderData.production.status !== 'لم يتم التنفيذ')) return 3;
    if (s === 'قيد التجهيز' || orderData.production || s === 'بانتظار التأكيد') return 2;
    return 1;
  };

  const activeStep = getActiveStep();

  const getStep2Subtext = () => {
    if (!orderData) return 'بانتظار';
    if (activeStep < 2) return 'بانتظار';
    
    const { nonProdTotal, nonProdReady, hasProductionItems } = orderData;
    
    if (nonProdTotal > 0 && nonProdReady === nonProdTotal && !hasProductionItems) {
      return 'مكتمل';
    }

    if (nonProdTotal === 0 && hasProductionItems) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', lineHeight: '1.4', marginTop: '4px' }}>
          <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>أصناف تفصيل (للإنتاج)</span>
        </div>
      );
    }

    if (nonProdTotal > 0 || hasProductionItems) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', lineHeight: '1.4', marginTop: '6px', textAlign: 'center' }}>
          {nonProdTotal > 0 && (
            <span style={{ color: nonProdReady === nonProdTotal ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
              بضاعة المخزون: {nonProdReady === nonProdTotal ? 'مكتملة (جاهزة)' : 'قيد التجهيز'}
            </span>
          )}
          {hasProductionItems && (
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>
              أصناف تفصيل: ذاهبة للإنتاج
            </span>
          )}
        </div>
      );
    }
    
    return activeStep >= 2 ? 'مكتمل' : 'بانتظار';
  };

  const handleShare = async () => {
    try {
      const element = document.querySelector('.otm-card');
      if (!element) return;
      
      const noPrintElements = document.querySelectorAll('.otm-no-print');
      noPrintElements.forEach(el => el.style.display = 'none');
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      
      noPrintElements.forEach(el => el.style.display = '');

      const image = canvas.toDataURL('image/png');

      if (navigator.share) {
        try {
          const blob = await (await fetch(image)).blob();
          const file = new File([blob], `order-${orderData?.sales?.orderNumber || 'tracking'}.png`, { type: 'image/png' });
          await navigator.share({
            title: 'تتبع الطلب',
            files: [file]
          });
          return;
        } catch (shareErr) {
          console.log("Share API failed", shareErr);
        }
      }
      
      const link = document.createElement('a');
      link.href = image;
      link.download = `order-${orderData?.sales?.orderNumber || 'tracking'}.png`;
      link.click();
    } catch (err) {
      console.error("Error sharing", err);
      Swal.fire('خطأ', 'حدث خطأ أثناء محاولة المشاركة', 'error');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    Swal.fire({ 
      toast: true, 
      position: 'top-end', 
      showConfirmButton: false, 
      timer: 1500, 
      icon: 'success', 
      title: 'تم النسخ!' 
    });
  };

  const getStatusPill = (status) => {
    if (!status) return (
      <div className="otm-status-pill" style={{backgroundColor: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0'}}>
        <span className="dot" style={{backgroundColor: '#cbd5e1'}}></span>
        <span>بانتظار الطلب</span>
      </div>
    );
    const isCompleted = status === 'تم التسليم' || status === 'جاهز' || status === 'منتهي' || status === 'تم التوصيل';
    return (
      <div className={`otm-status-pill ${isCompleted ? 'completed' : 'in-progress'}`}>
        <span className="dot"></span>
        <span>{status}</span>
      </div>
    );
  };

  const getStep5Subtext = () => {
    if (!orderData) return 'بانتظار';
    if (activeStep < 5) return 'بانتظار';
    
    const mStatus = orderData.mission?.status;
    if (mStatus) {
      if (['بانتظار التسليم', 'تم الاستلام'].includes(mStatus)) return 'قيد التحميل';
      if (mStatus === 'في الطريق') return 'قيد التوصيل';
      if (mStatus === 'تم الإنجاز') return 'مكتمل';
      if (mStatus === 'ملغي' || mStatus === 'لم يتم التنفيذ') return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>تم الإلغاء</span>;
    }
    
    if (activeStep > 5) return 'مكتمل';
    return 'قيد التجهيز';
  };

  const steps = [
    { num: 1, title: 'تم إنشاء الطلب', icon: <ClipboardList size={26} />, subtext: orderData?.sales?.orderDate || 'بانتظار', color: '#4f46e5', bgTint: '#EEF2FF' },
    { num: 2, title: 'جزء جاهز / بحاجة تحضير', icon: <Package size={26} />, subtext: getStep2Subtext(), color: '#2563eb', bgTint: '#EFF6FF' },
    { num: 3, title: 'قيد الإنتاج', icon: <Factory size={26} />, subtext: activeStep >= 3 ? (activeStep === 3 ? (orderData?.productionProgress > 0 ? `${orderData.productionProgress}% قيد التنفيذ` : '40% قيد التنفيذ') : 'مكتمل') : 'بانتظار', color: '#16a34a', bgTint: '#F0FDF4' },
    { num: 4, title: 'جاهز في المستودع', icon: <Building2 size={26} />, subtext: activeStep >= 4 ? 'مكتمل' : 'بانتظار', color: '#f59e0b', bgTint: '#FFFBEB' },
    { num: 5, title: 'قيد التوصيل', icon: <Truck size={26} />, subtext: getStep5Subtext(), color: '#7c3aed', bgTint: '#F5F3FF' },
    { num: 6, title: 'تم التسليم', icon: <CheckCircle size={26} />, subtext: activeStep >= 6 ? 'مكتمل' : 'بانتظار', color: '#64748b', bgTint: '#F8FAFC' }
  ];

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('otm-overlay')) {
      onClose();
    }
  };

  return (
    <div className="otm-overlay" onClick={handleOverlayClick}>
      <div className="otm-card">
        
        {/* Header */}
        <div className="otm-header">
          {/* Action buttons (Left in RTL) */}
          <div className="otm-header-left otm-no-print">
            <button className="otm-btn-icon" onClick={onClose} title="إغلاق">
              <X size={20} />
            </button>
            <button className="otm-btn-outline" onClick={() => handleSearch()} title="تحديث">
              <RefreshCw size={16} />
              <span>تحديث</span>
            </button>
            <button 
              className="otm-btn-primary" 
              onClick={handleShare} 
              title="مشاركة"
              disabled={!orderData}
              style={{ opacity: !orderData ? 0.5 : 1, cursor: !orderData ? 'not-allowed' : 'pointer' }}
            >
              <Share2 size={16} />
              <span>مشاركة</span>
            </button>
          </div>

          {/* Title and Icon (Right in RTL) */}
          <div className="otm-header-right">
            <div className="otm-header-text">
              <h2 className="otm-header-title">تتبع الطلب الداخلي</h2>
              <span className="otm-header-subtitle">عرض حالة الطلب داخل النظام</span>
            </div>
            <div className="otm-header-icon">
              <ClipboardList size={26} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="otm-body">
          {/* Search Section */}
          <div className="otm-search-container otm-no-print">
            <div className="otm-search-wrapper">
              <Search className="otm-search-icon" size={18} />
              <input 
                type="text" 
                className="otm-search-input"
                placeholder="أدخل رقم الطلب..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="otm-search-btn" onClick={() => handleSearch()} disabled={loading}>
              {loading ? '...' : 'تتبع'}
            </button>
          </div>

          {error && (
            <div className="otm-error-alert otm-no-print">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {/* Order Info Grid */}
          <div className="otm-info-grid">
            {/* Column 1: Order Number */}
            <div className="otm-info-col">
              <div className="otm-info-label-row">
                <Copy size={16} />
                <span>رقم الطلب</span>
              </div>
              <div className="otm-info-value-row">
                <span dir="ltr" style={{ color: orderData?.sales?.orderNumber ? '#1e293b' : '#94a3b8' }}>{orderData?.sales?.orderNumber || '---'}</span>
                {orderData?.sales?.orderNumber && (
                  <button onClick={() => handleCopy(orderData.sales.orderNumber)} className="otm-info-copy-btn" title="نسخ رقم الطلب">
                    <Copy size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Column 2: Customer Name */}
            <div className="otm-info-col">
              <div className="otm-info-label-row">
                <User size={16} />
                <span>اسم العميل</span>
              </div>
              <div className="otm-info-value-row">
                <span style={{ color: orderData?.sales?.customerName ? '#1e293b' : '#94a3b8', fontWeight: 'bold' }}>{orderData?.sales?.customerName || '---'}</span>
              </div>
            </div>

            {/* Column 3: Order Date */}
            <div className="otm-info-col">
              <div className="otm-info-label-row">
                <Calendar size={16} />
                <span>تاريخ الطلب</span>
              </div>
              <div className="otm-info-value-row">
                <span dir="ltr" style={{ color: orderData?.sales?.orderDate ? '#1e293b' : '#94a3b8' }}>{orderData?.sales?.orderDate || '---'}</span>
              </div>
            </div>

            {/* Column 3: Delivery Date */}
            <div className="otm-info-col">
              <div className="otm-info-label-row">
                <Clock size={16} />
                <span>تاريخ التسليم المطلوب</span>
              </div>
              <div className="otm-info-value-row">
                <span dir="ltr" style={{ color: orderData?.sales?.deliveryDate ? '#1e293b' : '#94a3b8' }}>{orderData?.sales?.deliveryDate || '---'}</span>
              </div>
            </div>

            {/* Column 4: Status */}
            <div className="otm-info-col">
              <div className="otm-info-label-row">
                <span>الحالة الإجمالية</span>
              </div>
              <div className="otm-info-value-row" style={{ marginTop: '4px' }}>
                {getStatusPill(orderData?.sales?.status)}
              </div>
            </div>
          </div>

          {/* Stepper Card */}
          <div className="otm-stepper-card">
            <div className="otm-stepper-wrapper">
              {/* Dashed Background Line */}
              <div className="otm-step-line-bg"></div>
              
              {/* Solid Active Progress Line */}
              <div 
                className="otm-step-line-active" 
                style={{ 
                  width: `${activeStep > 0 ? ((activeStep - 1) / 5) * 84 : 0}%`,
                  background: 'linear-gradient(to left, #4F46E5, #2563EB, #16A34A, #F59E0B, #7C3AED)'
                }}
              ></div>

              {steps.map((step) => {
                const isCompleted = activeStep >= step.num;
                const isCurrent = activeStep === step.num;
                
                return (
                  <div key={step.num} className="otm-step">
                    {/* Number Circle */}
                    <div 
                      className="otm-step-num"
                      style={{ 
                        backgroundColor: step.color,
                        opacity: isCompleted ? 1 : 0.4
                      }}
                    >
                      {step.num}
                    </div>

                    {/* Icon Square */}
                    <div 
                      className="otm-step-icon-wrap"
                      style={{ 
                        borderColor: isCompleted ? step.color : '#e2e8f0',
                        color: isCompleted ? step.color : '#94a3b8',
                        backgroundColor: isCompleted ? step.bgTint : '#ffffff',
                        boxShadow: isCurrent ? `0 0 0 4px ${step.color}20` : 'none'
                      }}
                    >
                      {step.icon}
                    </div>

                    {/* Label */}
                    <div className="otm-step-title" style={{ color: isCompleted ? '#1e293b' : '#94a3b8' }}>
                      {step.title}
                    </div>
                    
                    {/* Subtext */}
                    <div 
                      className="otm-step-sub" 
                      style={{ color: isCompleted ? step.color : '#94a3b8' }}
                    >
                      {step.subtext}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Overlay and Card basic layout */
        .otm-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .otm-card {
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 1100px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          direction: rtl;
          font-family: 'Tajawal', sans-serif !important;
          animation: otmFadeIn 0.3s ease-out;
        }

        @keyframes otmFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        /* Modal Header */
        .otm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 32px;
          border-bottom: 1.5px solid #f1f5f9;
          background: #ffffff;
        }

        .otm-header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .otm-header-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background-color: #EEF2FF;
          color: #4F46E5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .otm-header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: right;
        }

        .otm-header-title {
          font-size: 22px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        .otm-header-subtitle {
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          margin: 0;
        }

        .otm-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Controls buttons */
        .otm-btn-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .otm-btn-icon:hover {
          background-color: #f8fafc;
          border-color: #cbd5e1;
          color: #1e293b;
        }

        .otm-btn-outline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: #ffffff;
          color: #4F46E5;
          border: 1.5px solid #E0E7FF;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .otm-btn-outline:hover {
          background-color: #F5F7FF;
          border-color: #C7D2FE;
        }

        .otm-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background-color: #4F46E5;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .otm-btn-primary:hover {
          background-color: #4338CA;
        }

        /* Modal Body */
        .otm-body {
          padding: 32px;
          background-color: #f8fafc;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
          flex-grow: 1;
        }

        /* Search Area */
        .otm-search-container {
          display: flex;
          gap: 12px;
          max-width: 500px;
          margin: 0 auto 8px auto;
          width: 100%;
        }

        .otm-search-wrapper {
          position: relative;
          flex-grow: 1;
        }

        .otm-search-icon {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .otm-search-input {
          width: 100%;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 48px 12px 16px;
          font-size: 15px;
          font-weight: 600;
          outline: none;
          background-color: #ffffff;
          transition: border-color 0.2s ease;
          text-align: right;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .otm-search-input:focus {
          border-color: #4F46E5;
        }

        .otm-search-btn {
          background-color: #4F46E5;
          color: #ffffff;
          border: none;
          padding: 0 24px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .otm-search-btn:hover {
          background-color: #4338CA;
        }

        /* Info Card Grid */
        .otm-info-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          align-items: center;
        }

        .otm-info-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          text-align: center;
          gap: 8px;
        }

        @media (min-width: 769px) {
          .otm-info-col:not(:last-child) {
            border-left: 1.5px solid #f1f5f9;
          }
        }

        @media (max-width: 768px) {
          .otm-info-grid {
            grid-template-columns: 1fr;
            gap: 20px;
            padding: 20px;
          }
          .otm-info-col:not(:last-child) {
            border-bottom: 1.5px solid #f1f5f9;
            padding-bottom: 16px;
          }
        }

        .otm-info-label-row {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
        }

        .otm-info-value-row {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1e293b;
          font-size: 16px;
          font-weight: 800;
        }

        .otm-info-copy-btn {
          background: none;
          border: none;
          padding: 2px;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .otm-info-copy-btn:hover {
          color: #4F46E5;
        }

        /* Status Pill */
        .otm-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
        }

        .otm-status-pill.in-progress {
          background-color: #FFFBEB;
          color: #D97706;
          border: 1px solid #FEF3C7;
        }

        .otm-status-pill.in-progress .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #F59E0B;
        }

        .otm-status-pill.completed {
          background-color: #ECFDF5;
          color: #059669;
          border: 1px solid #D1FAE5;
        }

        .otm-status-pill.completed .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #10B981;
        }

        /* Stepper Card */
        .otm-stepper-card {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 48px 32px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          position: relative;
          overflow-x: auto;
        }

        .otm-stepper-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          width: 100%;
          min-width: 900px;
        }

        /* Line connectors */
        .otm-step-line-bg {
          position: absolute;
          top: 72px;
          left: 8%;
          right: 8%;
          height: 2px;
          border-top: 2px dashed #E2E8F0;
          z-index: 0;
        }

        .otm-step-line-active {
          position: absolute;
          top: 71px;
          right: 8%;
          height: 4px;
          border-radius: 2px;
          z-index: 0;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Individual Step */
        .otm-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 120px;
          z-index: 1;
          text-align: center;
          background-color: #ffffff;
        }

        .otm-step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          color: #ffffff;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          z-index: 2;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .otm-step-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border: 2px solid;
          transition: all 0.3s ease;
          z-index: 2;
        }

        .otm-step-title {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .otm-step-sub {
          font-size: 12px;
          font-weight: 700;
        }

        /* Empty State */
        .otm-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          border: 2px dashed #cbd5e1;
          border-radius: 20px;
          text-align: center;
          color: #94a3b8;
          gap: 16px;
          background-color: #ffffff;
          max-width: 500px;
          margin: 16px auto 0 auto;
          width: 100%;
        }

        .otm-empty-title {
          font-size: 18px;
          font-weight: 800;
          color: #64748b;
          margin: 0;
        }

        .otm-empty-desc {
          font-size: 14px;
          font-weight: 500;
          color: #94a3b8;
          margin: 0;
          max-width: 320px;
          line-height: 1.5;
        }

        /* Error Alert */
        .otm-error-alert {
          background-color: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FEE2E2;
          padding: 14px 24px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
          max-width: 500px;
          margin: 0 auto 16px auto;
          width: 100%;
        }

        /* Print Media Styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .otm-overlay {
            position: absolute;
            left: 0;
            top: 0;
            background: white !important;
            width: 100%;
            height: auto;
            display: block;
            padding: 0;
            backdrop-filter: none;
            z-index: 99999;
          }
          .otm-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .otm-body {
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          .otm-info-grid, .otm-stepper-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
          }
          .otm-card, .otm-body, .otm-info-grid, .otm-stepper-card, .otm-stepper-card * {
            visibility: visible;
          }
          .otm-no-print {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
};
export default OrderTrackerModal;
