const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminStock.jsx', 'utf8');

// 1. Restore the missing lines from Audit Modal
const auditModalTopPart = `                <p className="text-slate-500 text-lg mt-2 font-bold">
                  طلبية رقم: <span className="text-primary">{auditOrder.orderNumber}</span> - العميل: <span className="text-primary">{auditOrder.customerName}</span>
                </p>
                <p className="text-slate-400 text-sm mt-1 font-semibold">
                  سيتم إصدار سند برقم: <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100" style={{ direction: 'ltr', display: 'inline-block' }}>
                    MIS-{String((vouchers.filter(v => v.voucherNumber?.startsWith('MIS-')).reduce((max, v) => { const m = v.voucherNumber?.match(/MIS-(\\d+)/); return m ? Math.max(max, parseInt(m[1], 10)) : max; }, 0)) + 1).padStart(5, '0')} ({auditOrder.orderNumber})
                  </span>
                </p>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)}
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all flex items-center justify-center"
                style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f8fafc' }}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div style={{ marginBottom: '24px', marginTop: '8px' }}>
              <button onClick={addExtraAuditItem} className="btn flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.transform = 'none'; }}
              >
                <Plus size={18} strokeWidth={3} /> إضافة صنف تابع من المخزون
              </button>
            </div>

            <div className="overflow-hidden border border-slate-200 rounded-2xl mb-6 shadow-sm">
              <table className="w-full text-right bg-white">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-slate-700 font-black text-sm w-12 text-center">#</th>
                    <th className="p-4 text-slate-700 font-black text-sm">اسم الصنف</th>
                    <th className="p-4 text-slate-700 font-black text-sm" style={{ width: '250px' }}>المستودع *</th>
                    <th className="p-4 text-slate-700 font-black text-sm w-36 text-center">الكمية</th>
                    <th className="p-4 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {auditItems.map((item, idx) => (
                    <tr key={idx} className={\`border-b border-slate-100 transition-colors \${item.isExtra ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}\`}>
                      <td className="p-4 font-bold text-slate-400 text-center">{idx + 1}</td>
                      <td className="p-4">
                        {item.isExtra ? (
                          <Select
                            options={stock.filter(s => s.quantity > 0).map(s => ({ value: s.id, label: \`\${s.name}\${s.spec ? \` (\${s.spec})\` : ''} - متوفر: \${s.quantity}\`, stockData: s }))}
                            value={item.stockId ? { value: item.stockId, label: item.name } : null}
                            onChange={selected => {
                              const newItems = [...auditItems];
                              if (selected) {
                                newItems[idx].stockId = selected.stockData.id;
`;

content = content.replace(
  '                  تدقيق طلبية وخصم من المخزون\\n                </h3>\\n          <div className="modal-content wide animate-fade-in" style={{ maxWidth: \\'900px\\' }} onClick={e => e.stopPropagation()}>',
  '                  تدقيق طلبية وخصم من المخزون\\n                </h3>\\n' + auditModalTopPart + '          <div className="modal-content wide animate-fade-in" style={{ maxWidth: \\'900px\\' }} onClick={e => e.stopPropagation()}>'
);

// 2. Replace Locations Modal
const oldLocationsModal = \`      {/* Locations Modal */}
      {showLocationsModal && selectedItemForLocations && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header">
              <h2>أماكن تواجد الصنف: {selectedItemForLocations.name}</h2>
              <button className="icon-btn" onClick={() => setShowLocationsModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body p-4">
              <div className="bg-slate-50 p-3 rounded-lg border mb-4">
                <div className="flex gap-4 mb-2">
                  <div className="font-bold text-slate-700">الرقم: <span className="font-normal text-slate-600">{selectedItemForLocations.itemNumber}</span></div>
                  {selectedItemForLocations.category && <div className="font-bold text-slate-700">التصنيف: <span className="font-normal text-slate-600">{selectedItemForLocations.category}</span></div>}
                </div>
                <div className="font-bold text-slate-700">إجمالي الكمية المتوفرة: <span className="font-bold text-primary text-lg">{selectedItemForLocations.totalQuantity} {selectedItemForLocations.unit}</span></div>
              </div>
              
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>الرف / الموقع</th>
                      <th>المواصفة / اللون</th>
                      <th className="text-center">الكمية الموجودة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItemForLocations.locations.map(loc => (
                      <tr key={loc.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400" />
                            <span className="font-bold text-slate-700">{loc.location || 'غير محدد'}</span>
                          </div>
                        </td>
                        <td>{loc.spec || '-'}</td>
                        <td className="text-center font-bold text-slate-800 bg-slate-50">{loc.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowLocationsModal(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}\`;

const newLocationsModal = \`      {/* Locations Modal */}
      {showLocationsModal && selectedItemForLocations && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-[24px] shadow-2xl relative overflow-hidden animate-fade-in" style={{ maxWidth: '750px', width: '95%', direction: 'rtl', fontFamily: '"Cairo", sans-serif' }}>
            
            {/* Header Background Graphic */}
            <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(19,137,143,0.08) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }} />
            <div style={{ position: 'absolute', top: '-50px', left: '100px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(19,137,143,0.05) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%', zIndex: 0 }} />
            
            <div className="p-7 relative z-10">
              {/* Header Section */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: '#13898f' }}>
                    <Box size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 m-0">
                    أماكن تواجد الصنف: <span className="text-slate-900">{selectedItemForLocations.name}</span>
                  </h2>
                </div>
                <button 
                  onClick={() => setShowLocationsModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors bg-white shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Info Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 mb-6 text-center shadow-sm">
                <div className="flex items-center justify-center gap-6 mb-4 text-slate-800 font-bold text-lg">
                  <div>الرقم: <span style={{ color: '#13898f' }}>{selectedItemForLocations.itemNumber}</span></div>
                  {selectedItemForLocations.category && (
                    <>
                      <div className="w-px h-6 bg-slate-200"></div>
                      <div>التصنيف: <span className="text-slate-700">{selectedItemForLocations.category}</span></div>
                    </>
                  )}
                </div>
                <div className="font-bold text-slate-800 text-lg">
                  إجمالي الكمية المتوفرة: <span style={{ color: '#13898f' }}>{selectedItemForLocations.totalQuantity} {selectedItemForLocations.unit || 'عدد'}</span>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden mb-6 bg-white shadow-sm">
                <table className="w-full text-right border-collapse">
                  <thead style={{ backgroundColor: '#13898f', color: 'white' }}>
                    <tr>
                      <th className="p-4 font-bold text-center border-l border-white/20 w-1/3">
                        <div className="flex items-center justify-center gap-2">
                          <MapPin size={18} /> الرف / الموقع
                        </div>
                      </th>
                      <th className="p-4 font-bold text-center border-l border-white/20 w-1/3">
                        <div className="flex items-center justify-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                          المواصفة / اللون
                        </div>
                      </th>
                      <th className="p-4 font-bold text-center w-1/3">
                        <div className="flex items-center justify-center gap-2">
                          <Box size={18} /> الكمية الموجودة
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItemForLocations.locations.map((loc, idx) => (
                      <tr key={loc.id} className={idx !== selectedItemForLocations.locations.length - 1 ? "border-b border-slate-100" : ""}>
                        <td className="p-4 text-center border-l border-slate-100">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-slate-800 text-lg">{loc.location || '-'}</span>
                            {loc.location && <MapPin size={18} className="text-slate-400" />}
                          </div>
                        </td>
                        <td className="p-4 text-center text-slate-700 font-bold border-l border-slate-100 text-lg">
                          {loc.spec || '-'}
                        </td>
                        <td className="p-4 text-center font-bold text-2xl text-slate-800">
                          {loc.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex justify-start">
                <button 
                  onClick={() => setShowLocationsModal(false)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors shadow-sm"
                >
                  <div className="bg-slate-800 text-white rounded-full flex items-center justify-center p-0.5" style={{ width: '22px', height: '22px' }}>
                    <X size={14} strokeWidth={3} />
                  </div>
                  إغلاق
                </button>
              </div>

            </div>
          </div>
        </div>
      )}\`;

content = content.replace(oldLocationsModal, newLocationsModal);
fs.writeFileSync('src/pages/admin/AdminStock.jsx', content);
console.log('Fixed file');
