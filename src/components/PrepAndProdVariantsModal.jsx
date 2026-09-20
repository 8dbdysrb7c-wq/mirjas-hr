import React, { useState, useEffect } from 'react';
import { Package, X, Trash2, Plus, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import SearchableDropdown from './SearchableDropdown';

export default function PrepAndProdVariantsModal({
  isMobile,
  showModal,
  setShowModal,
  variantModalIndex,
  initialPrepVariants = [],
  initialProdVariants = [],
  prepVariants: propPrepVariants,
  setPrepVariants: propSetPrepVariants,
  prodVariants: propProdVariants,
  setProdVariants: propSetProdVariants,
  formData,
  globalSettings,
  onSave
}) {
  const [localPrepVariants, setLocalPrepVariants] = useState([]);
  const [localProdVariants, setLocalProdVariants] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('prod'); // Default: Sewing ('prod' | 'prep')

  const prepVariants = propPrepVariants || localPrepVariants;
  const setPrepVariants = propSetPrepVariants || setLocalPrepVariants;
  const prodVariants = propProdVariants || localProdVariants;
  const setProdVariants = propSetProdVariants || setLocalProdVariants;

  useEffect(() => {
    if (showModal && variantModalIndex !== null && formData?.items) {
      const currentItem = formData.items[variantModalIndex];
      if (initialPrepVariants && initialPrepVariants.length > 0) {
        setLocalPrepVariants(JSON.parse(JSON.stringify(initialPrepVariants)));
      } else {
        setLocalPrepVariants([{
          productName: currentItem?.productName || '',
          quantity: currentItem?.quantity || '',
          notes: '',
          status: 'لم يتم التنفيذ'
        }]);
      }

      if (initialProdVariants && initialProdVariants.length > 0) {
        setLocalProdVariants(JSON.parse(JSON.stringify(initialProdVariants)));
      } else {
        setLocalProdVariants([{
          productName: currentItem?.productName || '',
          quantity: currentItem?.quantity || '',
          colorModel: '',
          sizeCm: '',
          thickness: '',
          notes: '',
          status: 'لم يتم التنفيذ'
        }]);
      }
      setActiveSubTab('prod');
    }
  }, [showModal, variantModalIndex, initialPrepVariants, initialProdVariants]);

  if (!showModal || variantModalIndex === null) return null;

  const item = formData?.items?.[variantModalIndex];
  if (!item) return null;

  const targetQty = Number(item.quantity) || 0;
  const prodSum = (prodVariants || []).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
  const prepSum = (prepVariants || []).reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  const colors = globalSettings?.stockColors || [
    'أبيض', 'أوف وايت', 'سكري', 'بيج', 'رمادي فاتح', 'رمادي غامق', 
    'أسود', 'كحلي', 'أزرق', 'بترولي', 'زيتي', 'خمري', 'بني', 'مورد'
  ];

  // --- Handlers for Production (الخياطة) ---
  const handleAddProdRow = () => {
    setProdVariants(prev => [
      ...(prev || []),
      {
        productName: item.productName,
        quantity: '',
        colorModel: '',
        sizeCm: '',
        thickness: '',
        notes: '',
        status: 'لم يتم التنفيذ'
      }
    ]);
  };

  const handleRemoveProdRow = (idx) => {
    if ((prodVariants || []).length <= 1) return;
    setProdVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const handleProdChange = (idx, field, val) => {
    setProdVariants(prev => {
      const next = [...(prev || [])];
      let cleaned = val;
      if (field === 'thickness') {
        cleaned = String(val).replace(/[^0-9]/g, '').slice(0, 2);
      } else if (field === 'sizeCm') {
        let raw = String(val).replace(/[^0-9*]/g, '');
        let parts = raw.split('*');
        if (parts.length > 2) {
          raw = parts[0] + '*' + parts.slice(1).join('');
          parts = raw.split('*');
        }
        if (parts[0] && parts[0].length > 3) parts[0] = parts[0].slice(0, 3);
        if (parts[1] && parts[1].length > 3) parts[1] = parts[1].slice(0, 3);
        cleaned = parts.join('*');
      }
      next[idx] = { ...next[idx], [field]: cleaned };
      return next;
    });
  };

  // --- Handlers for Preparation (التحضير) ---
  const handleAddPrepRow = () => {
    setPrepVariants(prev => [
      ...(prev || []),
      {
        productName: item.productName,
        quantity: '',
        notes: '',
        status: 'لم يتم التنفيذ'
      }
    ]);
  };

  const handleRemovePrepRow = (idx) => {
    if ((prepVariants || []).length <= 1) return;
    setPrepVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePrepChange = (idx, field, val) => {
    setPrepVariants(prev => {
      const next = [...(prev || [])];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  // --- Validate and Submit ---
  const handleSaveAll = () => {
    // 1. Check Prod Validation (Sewing)
    if (prodSum === 0 && targetQty > 0) {
      setActiveSubTab('prod');
      Swal.fire('خطأ في الإنتاج والخياطة', 'يرجى إدخال كمية لكرت الإنتاج/الخياطة أكبر من صفر.', 'error');
      return;
    }
    if (prodSum > targetQty) {
      setActiveSubTab('prod');
      Swal.fire('خطأ في الإنتاج والخياطة', `مجموع كميات الإنتاج/الخياطة (${prodSum}) يتجاوز الكمية المطلوبة للصنف (${targetQty})`, 'error');
      return;
    }

    const invalidProdColor = (prodVariants || []).findIndex(v => !v.colorModel);
    if (invalidProdColor !== -1) {
      setActiveSubTab('prod');
      Swal.fire('خطأ في كرت الخياطة', `يرجى اختيار اللون / الموديل في السطر رقم ${invalidProdColor + 1} في قسم الإنتاج والخياطة`, 'error');
      return;
    }

    // 2. Check Prep Validation (Preparation)
    if (prepSum === 0 && targetQty > 0) {
      setActiveSubTab('prep');
      Swal.fire('خطأ في التحضير', 'يرجى إدخال كمية لكرت التحضير أكبر من صفر.', 'error');
      return;
    }
    if (prepSum > targetQty) {
      setActiveSubTab('prep');
      Swal.fire('خطأ في التحضير', `مجموع كميات التحضير (${prepSum}) يتجاوز الكمية المطلوبة للصنف (${targetQty})`, 'error');
      return;
    }

    onSave({ prepVariants, prodVariants });
  };

  const isProd = activeSubTab === 'prod';
  const currentVariants = (isProd ? prodVariants : prepVariants) || [];

  return (
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
              <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                {isProd ? 'تفصيل الألوان والكميات للصنف:' : 'تفاصيل تجهيز الصنف (التحضير):'}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#0f766e', marginTop: '2px', fontWeight: 'bold' }}>
                {item.productName}
              </div>
            </div>

            <div 
              onClick={() => setShowModal(false)} 
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

          {/* Mobile Tabs */}
          <div style={{ display: 'flex', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '10px 16px', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveSubTab('prod')}
              className={`btn ${isProd ? 'btn-primary' : 'btn-outline'}`}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                justifyContent: 'center',
                borderRadius: '8px'
              }}
            >
              1. كرت الخياطة ({prodSum}/{targetQty})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('prep')}
              className={`btn ${!isProd ? 'btn-primary' : 'btn-outline'}`}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                justifyContent: 'center',
                borderRadius: '8px'
              }}
            >
              2. كرت التحضير ({prepSum}/{targetQty})
            </button>
          </div>

          {/* Scrollable Mobile List */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {currentVariants.map((variant, idx) => (
                <div 
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    borderRight: '5px solid #0f766e',
                    padding: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div 
                      style={{
                        backgroundColor: '#0f766e',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => isProd ? handleRemoveProdRow(idx) : handleRemovePrepRow(idx)}
                      disabled={currentVariants.length <= 1}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: currentVariants.length <= 1 ? '#f8fafc' : '#fef2f2',
                        color: currentVariants.length <= 1 ? '#cbd5e1' : '#ef4444',
                        border: '1px solid #fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: currentVariants.length <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {isProd ? (
                    <>
                      {/* Sewing Fields */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>اللون / الموديل</label>
                        <SearchableDropdown
                          options={colors}
                          value={variant.colorModel}
                          onChange={(val) => handleProdChange(idx, 'colorModel', val)}
                          placeholder="اختر اللون..."
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>الكمية</label>
                          <input
                            type="number"
                            className="input-field text-center font-bold"
                            style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 4px', fontSize: '0.85rem', color: '#0f766e' }}
                            value={variant.quantity}
                            onChange={(e) => handleProdChange(idx, 'quantity', e.target.value)}
                            min="1"
                          />
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>السماكة (سم)</label>
                          <input
                            type="text"
                            className="input-field text-center"
                            style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 4px', fontSize: '0.85rem' }}
                            value={variant.thickness}
                            onChange={(e) => handleProdChange(idx, 'thickness', e.target.value)}
                          />
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                          <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#475569' }}>المقاس (سم)</label>
                          <input
                            type="text"
                            className="input-field text-center"
                            style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 4px', fontSize: '0.85rem' }}
                            placeholder="مثال 200*200"
                            value={variant.sizeCm}
                            onChange={(e) => handleProdChange(idx, 'sizeCm', e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>الملاحظات</label>
                        <textarea
                          className="input-field"
                          rows="2"
                          maxLength={200}
                          style={{ minHeight: '60px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '8px 12px', fontSize: '0.85rem', resize: 'vertical' }}
                          placeholder="أضف أية تفاصيل إضافية..."
                          value={variant.notes || ''}
                          onChange={(e) => handleProdChange(idx, 'notes', e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Preparation Fields matching PreparationVariantsModal */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>الصنف</label>
                        <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#1e293b', fontWeight: 'bold' }}>
                          {item.productName}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>الكمية</label>
                        <input
                          type="number"
                          className="input-field font-bold"
                          style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 12px', fontSize: '0.85rem', color: '#0f766e' }}
                          value={variant.quantity}
                          onChange={(e) => handlePrepChange(idx, 'quantity', e.target.value)}
                          min="1"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>الملاحظات</label>
                        <textarea
                          className="input-field"
                          rows="2"
                          maxLength={200}
                          style={{ minHeight: '60px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '8px 12px', fontSize: '0.85rem', resize: 'vertical' }}
                          placeholder="أضف أية تفاصيل إضافية..."
                          value={variant.notes || ''}
                          onChange={(e) => handlePrepChange(idx, 'notes', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add row */}
            <div
              onClick={isProd ? handleAddProdRow : handleAddPrepRow}
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
                gap: '6px'
              }}
            >
              <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} />
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#0f766e' }}>{isProd ? 'إضافة لون آخر' : 'إضافة سطر آخر'}</span>
            </div>
          </div>

          {/* Mobile Footer */}
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
              onClick={handleSaveAll}
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
              onClick={() => setShowModal(false)} 
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
        /* Desktop Layout matching User Screenshot */
        <div className="modal-content wide animate-fade-in" style={{ maxWidth: '900px' }}>
          {/* Header */}
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Package className="text-primary" />
              <span>
                {isProd ? `تفصيل الألوان والكميات للصنف: ${item.productName}` : `تفاصيل تجهيز الصنف (التحضير): ${item.productName}`}
              </span>
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowModal(false)}>
              <X size={18} />
            </button>
          </div>

          {/* Subheader: Clean Tabs matching Save/Cancel Button style */}
          <div className="flex justify-start items-center mb-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('prod')}
                className={`btn ${isProd ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 'bold', borderRadius: '8px' }}
              >
                1. كرت الخياطة ({prodSum}/{targetQty})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('prep')}
                className={`btn ${!isProd ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', fontWeight: 'bold', borderRadius: '8px' }}
              >
                2. كرت التحضير ({prepSum}/{targetQty})
              </button>
            </div>
          </div>

          {/* Table: Conditional rendering based on isProd */}
          {isProd ? (
            /* 1. Sewing Table */
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
                  {prodVariants.map((variant, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-2">
                        <SearchableDropdown
                          options={colors}
                          value={variant.colorModel}
                          onChange={(val) => handleProdChange(idx, 'colorModel', val)}
                          placeholder="اختر اللون..."
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          className="input-field w-full mb-0 text-center font-bold text-primary" 
                          value={variant.quantity} 
                          onChange={(e) => handleProdChange(idx, 'quantity', e.target.value)}
                          min="1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          className="input-field w-full mb-0 text-center" 
                          placeholder="مثال 200*200"
                          value={variant.sizeCm} 
                          onChange={(e) => handleProdChange(idx, 'sizeCm', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          className="input-field w-full mb-0 text-center" 
                          value={variant.thickness} 
                          onChange={(e) => handleProdChange(idx, 'thickness', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          className="input-field w-full mb-0" 
                          placeholder="ملاحظات..."
                          value={variant.notes || ''} 
                          onChange={(e) => handleProdChange(idx, 'notes', e.target.value)}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          type="button" 
                          className="icon-btn icon-btn-delete mx-auto disabled:opacity-50"
                          onClick={() => handleRemoveProdRow(idx)}
                          disabled={prodVariants.length <= 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* 2. Preparation Table (Exact match to User Screenshot) */
            <div className="overflow-x-auto mb-4 border border-slate-200 rounded-xl">
              <table className="w-full text-right bg-white" style={{ borderCollapse: 'collapse' }}>
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-slate-700 font-bold" style={{ width: '40%' }}>الصنف</th>
                    <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '20%' }}>الكمية</th>
                    <th className="p-3 text-slate-700 font-bold" style={{ width: '30%' }}>ملاحظات</th>
                    <th className="p-3 text-slate-700 font-bold text-center" style={{ width: '10%' }}>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {prepVariants.map((variant, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 text-slate-800 font-bold">
                        {item.productName}
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          className="input-field w-full mb-0 text-center font-bold text-primary" 
                          value={variant.quantity} 
                          onChange={(e) => handlePrepChange(idx, 'quantity', e.target.value)}
                          min="1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          className="input-field w-full mb-0" 
                          placeholder="ملاحظات..."
                          value={variant.notes || ''} 
                          onChange={(e) => handlePrepChange(idx, 'notes', e.target.value)}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          type="button" 
                          className="icon-btn icon-btn-delete mx-auto disabled:opacity-50"
                          onClick={() => handleRemovePrepRow(idx)}
                          disabled={prepVariants.length <= 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Another Row Button */}
          <div className="flex justify-start mb-6">
            <button 
              type="button" 
              className="btn btn-outline border-dashed border-2 flex items-center gap-2 text-slate-600 hover:text-primary hover:border-primary transition-colors"
              onClick={isProd ? handleAddProdRow : handleAddPrepRow}
            >
              <Plus size={16} /> {isProd ? 'إضافة لون آخر' : 'إضافة سطر آخر'}
            </button>
          </div>

          {/* Footer Action Buttons matching Image */}
          <div className="flex gap-4">
            <button className="btn btn-primary flex-1" onClick={handleSaveAll}>حفظ</button>
            <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
