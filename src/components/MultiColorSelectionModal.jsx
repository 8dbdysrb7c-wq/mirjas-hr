import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Minus, Plus, Search } from 'lucide-react';
import Select from './SearchSelect';
import { matchesSearch, useDebounce } from '../utils/searchEngine';
import { buildReservedQuantityMap } from '../utils/stockAvailability';

const MultiColorSelectionModal = ({ 
  isOpen, 
  onClose, 
  onAddItems, 
  stockColors = [], 
  stock = [],
  orders = [],
  title = "اختيار الألوان والكمية",
  maxQuantity = null
}) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery);
  
  // Group by product name and calculate quantities and available colors
  const groupedProducts = useMemo(() => {
    const groups = {};
    const stockMap = {};
    const reservedMap = buildReservedQuantityMap(orders);
    stock.forEach(s => { stockMap[s.id] = s; });

    stock.filter(s => {
      if (!s.name) return false;
      const cat = (s.category || '').trim();
      const isExcludedCat = ['الأقمشة', 'مستهلكات الخياطة', 'الأصول', 'أقمشة', 'أصول'].includes(cat);
      return !isExcludedCat;
    }).forEach(s => {
      let pName = String(s.name).trim();
      
      // If this is a variant, use the parent's name to group them together
      if (s.parentItemId && stockMap[s.parentItemId]) {
        pName = String(stockMap[s.parentItemId].name).trim();
      } else if (pName.includes(' - موديل ') || pName.includes(' - لون ') || pName.includes(' - مقاس ')) {
        // Fallback: extract base name from the name string itself if parentItemId is missing
        pName = pName.split(' - ')[0].trim();
      }

      if (!groups[pName]) {
        groups[pName] = {
          name: pName,
          totalQuantity: 0,
          totalReserved: 0,
          totalAvailable: 0,
          colors: {}
        };
      }
      
      // Use spec as color, or extract it from name if it's a child without spec
      let rawColor = (s.spec || '').trim();
      if (!rawColor && (s.parentItemId || String(s.name).includes(' - '))) {
         if (String(s.name).includes(' - ')) {
            const parts = String(s.name).split(' - ');
            rawColor = parts[parts.length - 1].trim();
         } else {
            rawColor = 'نسخة مخصصة';
         }
      } else if (!rawColor) {
         rawColor = 'أساسي';
      }

      // Append warehouse name to distinguish same colors in different warehouses
      const warehouse = s.warehouse || 'الرئيسي';
      let colorKey = rawColor;
      if (warehouse !== 'الرئيسي') {
         colorKey = `${rawColor} (مستودع: ${warehouse})`;
      }
      
      const qty = Number(s.quantity) || 0;
      const itemReserved = Number(reservedMap[`${pName} - ${rawColor}`] || reservedMap[`${pName} - ${colorKey}`] || 0);
      
      groups[pName].totalQuantity += qty;
      groups[pName].totalReserved += itemReserved;
      
      if (colorKey) {
        if (!groups[pName].colors[colorKey]) {
          groups[pName].colors[colorKey] = {
            physical: 0,
            reserved: 0,
            available: 0
          };
        }
        groups[pName].colors[colorKey].physical += qty;
        groups[pName].colors[colorKey].reserved = itemReserved;
        groups[pName].colors[colorKey].available = Math.max(0, groups[pName].colors[colorKey].physical - itemReserved);
      }
    });

    Object.values(groups).forEach(p => {
      p.totalAvailable = Math.max(0, p.totalQuantity - p.totalReserved);
    });
    
    // Filter only products that have actual colors (not just 'أساسي')
    return Object.values(groups)
      .filter(p => {
         const colorsList = Object.keys(p.colors);
         if (colorsList.length === 0) return false;
         
         // If all colors start with 'أساسي', it means no actual variants exist for this item
         const hasRealVariants = colorsList.some(c => !c.startsWith('أساسي'));
         return hasRealVariants;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stock, orders]);

  const productOptions = useMemo(() => {
    return groupedProducts.map(p => ({
      value: p.name,
      label: `${p.name} (الموجود: ${p.totalQuantity} | المحجوز: ${p.totalReserved} | المتاح: ${p.totalAvailable})`
    }));
  }, [groupedProducts]);

  const selectedProductData = useMemo(() => {
    return groupedProducts.find(p => p.name === selectedProduct);
  }, [groupedProducts, selectedProduct]);

  useEffect(() => {
    if (isOpen) {
      setQuantities({});
      setNotes('');
      setSearchQuery('');
      setSelectedProduct('');
    }
  }, [isOpen]);

  const handleQuantityChange = (color, delta) => {
    setQuantities(prev => {
      const current = prev[color] || 0;
      const next = Math.min(maxQuantity || Number.MAX_SAFE_INTEGER, Math.max(0, current + delta));
      const newQuantities = { ...prev };
      if (next === 0) {
        delete newQuantities[color];
      } else {
        newQuantities[color] = next;
      }
      return newQuantities;
    });
  };

  const handleDirectQuantityChange = (color, value) => {
    const val = parseInt(value, 10);
    setQuantities(prev => {
      const newQuantities = { ...prev };
      if (isNaN(val) || val <= 0) {
        delete newQuantities[color];
      } else {
        newQuantities[color] = Math.min(maxQuantity || Number.MAX_SAFE_INTEGER, val);
      }
      return newQuantities;
    });
  };

  const handleCheckboxChange = (color) => {
    setQuantities(prev => {
      const newQuantities = { ...prev };
      if (newQuantities[color]) {
        delete newQuantities[color];
      } else {
        newQuantities[color] = 1; // Default to 1 when checked
      }
      return newQuantities;
    });
  };

  const totalQuantity = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleAdd = () => {
    if (!selectedProduct) {
      alert('يرجى اختيار الصنف الأساسي أولاً');
      return;
    }
    
    if (totalQuantity === 0) {
      alert('يرجى تحديد كمية للون واحد على الأقل');
      return;
    }

    const itemsToAdd = Object.keys(quantities).map(color => ({
      productName: `${selectedProduct} - ${color}`,
      quantity: quantities[color],
      notes: notes,
      itemStatus: 'جاهز' // Default status
    }));

    onAddItems(itemsToAdd);
    onClose();
  };

  if (!isOpen) return null;

  const availableColorsForProduct = selectedProductData ? Object.keys(selectedProductData.colors).sort((a, b) => {
    const isModelA = String(a).trim().startsWith('موديل');
    const isModelB = String(b).trim().startsWith('موديل');
    if (isModelA && !isModelB) return -1;
    if (!isModelA && isModelB) return 1;
    return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
  }) : [];
  const filteredColors = availableColorsForProduct.filter(color => 
    matchesSearch(color, debouncedSearchQuery)
  );

  return createPortal(
    <div 
      style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        padding: '1rem', zIndex: 11000 
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          backgroundColor: '#fff', borderRadius: '16px', width: '100%', 
          maxWidth: '500px', maxHeight: '90vh', display: 'flex', 
          flexDirection: 'column', position: 'relative', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden',
          direction: 'rtl', fontFamily: 'Tajawal, sans-serif'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '1.125rem', color: '#1e293b' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="custom-scrollbar">
          
          {/* Base Product Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>الصنف الأساسي</label>
            <Select 
              options={productOptions}
              value={productOptions.find(o => o.value === selectedProduct) || null}
              onChange={(opt) => setSelectedProduct(opt ? opt.value : '')}
              placeholder="-- ابحث أو اختر الصنف --"
              isClearable
              noOptionsMessage={() => "لا يوجد أصناف متاحة لها ألوان"}
              menuPortalTarget={document.body}
              maxMenuHeight={450}
              styles={{
                control: (base) => ({
                  ...base,
                  padding: '4px',
                  borderRadius: '8px',
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  outline: 'none',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: 'var(--primary, #1a8d9b)'
                  }
                }),
                menuPortal: (base) => ({ ...base, zIndex: 12000 }),
                option: (base) => ({ ...base, textAlign: 'right' })
              }}
            />
          </div>

          {/* Colors Selection (only show if product is selected) */}
          {selectedProduct && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#334155' }}>اختر الألوان والكميات المطلوبة</label>
              </div>

              {/* Search colors */}
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} />
                </div>
                <input 
                  type="text"
                  placeholder="ابحث عن لون..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 2.25rem 0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Colors List */}
              <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff' }}>
                {filteredColors.length > 0 ? (
                  filteredColors.map((color, idx) => {
                    const isSelected = !!quantities[color];
                    const qty = quantities[color] || 0;
                    
                    return (
                      <div 
                        key={color} 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderBottom: idx < filteredColors.length - 1 ? '1px solid #f8fafc' : 'none', backgroundColor: isSelected ? 'rgba(26, 141, 155, 0.05)' : 'transparent', transition: 'background-color 0.2s' }}
                      >
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer' }}
                          onClick={() => handleCheckboxChange(color)}
                        >
                          <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: isSelected ? '1px solid var(--primary, #1a8d9b)' : '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? 'var(--primary, #1a8d9b)' : 'transparent' }}>
                            {isSelected && <Check size={14} color="#fff" />}
                          </div>
                          {(() => {
                            const cVal = selectedProductData?.colors[color];
                            const physical = typeof cVal === 'object' ? cVal.physical : Number(cVal || 0);
                            const reserved = typeof cVal === 'object' ? cVal.reserved : 0;
                            const available = typeof cVal === 'object' ? cVal.available : physical;
                            return (
                              <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#1e293b' : '#475569' }}>
                                {color}{' '}
                                <span style={{ color: available > 0 ? '#0d9488' : '#e11d48', fontSize: '0.75rem', marginRight: '6px', fontWeight: 'bold' }}>
                                  (الموجود: {physical} | المحجوز: {reserved} | المتاح: {available})
                                </span>
                              </span>
                            );
                          })()}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', height: '36px' }} onClick={e => e.stopPropagation()}>
                          <button 
                            type="button"
                            style={{ width: '36px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            onClick={(e) => { e.stopPropagation(); handleQuantityChange(color, 1); }}
                          >
                            <Plus size={16} />
                          </button>
                          <input 
                            type="number"
                            style={{ width: '88px', textAlign: 'center', fontSize: '0.875rem', fontWeight: 'bold', border: 'none', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', height: '100%', outline: 'none', appearance: 'textfield', backgroundColor: 'transparent' }}
                            value={qty === 0 ? '' : qty}
                            onChange={(e) => { e.stopPropagation(); handleDirectQuantityChange(color, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            min="0"
                            max={maxQuantity || undefined}
                          />
                          <button 
                            type="button"
                            style={{ width: '36px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            onClick={(e) => { e.stopPropagation(); handleQuantityChange(color, -1); }}
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>لا يوجد ألوان مطابقة للبحث</div>
                )}
              </div>
            </div>
          )}
          
          {/* Notes */}
          {selectedProduct && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#334155', marginBottom: '0.5rem' }}>ملاحظات (اختياري)</label>
              <textarea 
                placeholder="اكتب ملاحظاتك هنا..."
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '0.875rem', resize: 'none', height: '80px', boxSizing: 'border-box' }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedProduct && (
          <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', backgroundColor: '#fff', zIndex: 10 }}>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.875rem' }}>الإجمالي</span>
              <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: 'var(--primary, #1a8d9b)' }}>{totalQuantity} قطعة</span>
            </div>
            
            <button 
              onClick={handleAdd}
              disabled={totalQuantity === 0}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--primary, #1a8d9b)', color: '#fff', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: totalQuantity === 0 ? 'not-allowed' : 'pointer', opacity: totalQuantity === 0 ? 0.5 : 1 }}
            >
              <Check size={20} />
              إضافة الأصناف للطلبية
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MultiColorSelectionModal;
