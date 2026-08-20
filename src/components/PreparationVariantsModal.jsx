import React from 'react';
import { Package, X, Trash2, Plus, Save } from 'lucide-react';

const PreparationVariantsModal = ({
  isMobile,
  showModal,
  setShowModal,
  variantModalIndex,
  variants,
  setVariants,
  formData,
  globalSettings,
  handleVariantChange,
  handleRemoveVariant,
  handleAddVariant,
  handleSaveVariants
}) => {
  if (!showModal || variantModalIndex === null) return null;

  const item = formData.items[variantModalIndex];
  if (!item) return null;

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
              <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>تفاصيل تجهيز الصنف (التحضير):</h3>
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
              {variants.map((variant, idx) => {
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
                          backgroundColor: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleRemoveVariant(idx)}
                        title="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Item Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>الصنف</label>
                      <div style={{ padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#1e293b', fontWeight: 'bold' }}>
                        {item.productName}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569' }}>الكمية</label>
                      <input 
                        type="number" 
                        className="input-field font-bold" 
                        style={{ height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, padding: '0 12px', fontSize: '0.85rem', color: '#0f766e' }}
                        value={variant.quantity} 
                        onChange={(e) => handleVariantChange(idx, 'quantity', e.target.value)}
                        min="1"
                      />
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
        <div className="modal-content wide animate-fade-in" style={{ maxWidth: '900px' }}>
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Package className="text-primary" />
              <span>تفاصيل تجهيز الصنف (التحضير): {item.productName}</span>
            </h3>
            <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setShowModal(false)}><X size={18} /></button>
          </div>

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
                {variants.map((variant, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 text-slate-800 font-bold">
                      {item.productName}
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
                        className="input-field w-full mb-0" 
                        placeholder="ملاحظات..."
                        value={variant.notes || ''} 
                        onChange={(e) => handleVariantChange(idx, 'notes', e.target.value)}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        type="button" 
                        className="icon-btn icon-btn-delete mx-auto"
                        onClick={() => handleRemoveVariant(idx)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          

          <div className="flex gap-4">
            <button className="btn btn-primary flex-1" onClick={handleSaveVariants}>حفظ</button>
            <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationVariantsModal;
