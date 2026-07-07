const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminStock.jsx', 'utf8');

// 1. Add 'الموقع' column header
const thTarget = `<th className="text-center">المخزن</th>
                  <th className="text-center">المواصفة</th>`;
const thReplacement = `<th className="text-center">المخزن</th>
                  <th className="text-center">الموقع</th>
                  <th className="text-center">المواصفة</th>`;
if (!content.includes('<th className="text-center">الموقع</th>')) {
    content = content.replace(thTarget, thReplacement);
}

// 2. Add 'الموقع' column data in the main row
const tdTarget = `<td className="text-sm text-center">
                          <div className="badge bg-slate-100 text-slate-700 mx-auto">
                            {group.locations.length} {group.locations.length === 1 ? 'موقع' : 'مواقع'}
                          </div>
                        </td>
                        <td className="text-sm text-center">{displaySpec}</td>`;
const tdReplacement = `<td className="text-sm text-center">
                          <div className="badge bg-slate-100 text-slate-700 mx-auto">
                            {group.locations.length} {group.locations.length === 1 ? 'موقع' : 'مواقع'}
                          </div>
                        </td>
                        <td className="text-sm text-center font-bold text-slate-700">
                          {group.locations.length === 1 ? (group.locations[0].location || '-') : 'متعدد المواقع'}
                        </td>
                        <td className="text-sm text-center">{displaySpec}</td>`;
if (!content.includes("متعدد المواقع") && content.includes(tdTarget)) {
    content = content.replace(tdTarget, tdReplacement);
}

// 3. Add 'الموقع' column data in the expanded sub-row
const tdSubTarget = `<td className="text-center"><span className="badge badge-info opacity-70">{loc.category}</span></td>
                            <td className="text-sm text-center">
                              <div className="flex items-center justify-center gap-1"><MapPin size={12} className="text-primary" /> {loc.warehouse}</div>
                              <div className="text-[10px] text-muted">{loc.location}</div>
                            </td>
                            <td className="text-sm text-muted text-center">{loc.spec}</td>`;
const tdSubReplacement = `<td className="text-center"><span className="badge badge-info opacity-70">{loc.category}</span></td>
                            <td className="text-sm text-center">
                              <div className="flex items-center justify-center gap-1"><MapPin size={12} className="text-primary" /> {loc.warehouse}</div>
                            </td>
                            <td className="text-sm text-center font-bold">
                              {loc.location || '-'}
                            </td>
                            <td className="text-sm text-muted text-center">{loc.spec}</td>`;
if (content.includes(tdSubTarget)) {
    content = content.replace(tdSubTarget, tdSubReplacement);
}


// 4. Add the Eye icon in the main row Actions
const eyeTarget = `<button className="icon-btn icon-btn-add" title="إضافة لون/موقع آخر لنفس الصنف"
                                onClick={() => handleOpenModal(group.locations[0], true)}>
                                <Plus size={16} strokeWidth={2} />
                              </button>
                            )}
                            {canPerformAction(user, 'DELETE', 'STOCK', globalSettings) && (`;
const eyeReplacement = `<button className="icon-btn icon-btn-add" title="إضافة لون/موقع آخر لنفس الصنف"
                                onClick={() => handleOpenModal(group.locations[0], true)}>
                                <Plus size={16} strokeWidth={2} />
                              </button>
                            )}
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItemForLocations(group);
                                  setShowLocationsModal(true);
                                }}
                                className="icon-btn icon-btn-view"
                                title="عرض أماكن التواجد"
                                style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}
                              >
                                <Eye size={16} strokeWidth={2} />
                            </button>
                            {canPerformAction(user, 'DELETE', 'STOCK', globalSettings) && (`;
if (!content.includes('setShowLocationsModal(true)') && content.includes(eyeTarget)) {
    content = content.replace(eyeTarget, eyeReplacement);
}

// 5. Add the Search Layout and Modal and State
if (!content.includes('showLocationsModal')) {
    // State
    const stateTarget = `const [selectedItem, setSelectedItem] = useState(null);`;
    const stateReplacement = `const [selectedItem, setSelectedItem] = useState(null);
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [selectedItemForLocations, setSelectedItemForLocations] = useState(null);`;
    content = content.replace(stateTarget, stateReplacement);
}

const searchTarget = `              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="ابحث عن صنف..."
                  className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:border-primary w-64 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <select
                className="border rounded-lg px-4 py-2 focus:outline-none focus:border-primary bg-white text-slate-700"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="الكل">كل المستودعات</option>
                {globalSettings.warehouses?.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              <select
                className="border rounded-lg px-4 py-2 focus:outline-none focus:border-primary bg-white text-slate-700"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="الكل">كل التصنيفات</option>
                {globalSettings.categories?.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              
              <div className="relative">
                <Filter className="absolute right-3 top-2.5 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="تصفية حسب الرف..."
                  className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:border-primary w-48"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                />
              </div>`;

const searchReplacement = `              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="ابحث عن صنف..."
                  className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:border-primary transition-all w-[350px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Location Filter moved next to Search */}
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="تصفية حسب الرف..."
                  className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:border-primary w-48 transition-all"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <select
                className="border rounded-lg px-4 py-2 focus:outline-none focus:border-primary bg-white text-slate-700"
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="الكل">كل المستودعات</option>
                {globalSettings.warehouses?.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              <select
                className="border rounded-lg px-4 py-2 focus:outline-none focus:border-primary bg-white text-slate-700"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="الكل">كل التصنيفات</option>
                {globalSettings.categories?.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>`;

if (content.includes(searchTarget)) {
    content = content.replace(searchTarget, searchReplacement);
}


// Add the Modal at the bottom
const modalHtml = `      {/* Locations Modal */}
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
                          <Palette size={18} /> المواصفة / اللون
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
                      <tr key={loc.id} className={idx !== selectedItemForLocations.locations.length - 1 ? "border-b border-slate-100" : ""} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
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
      )}

    </div>
  );
};`;

if (!content.includes('showLocationsModal && selectedItemForLocations')) {
    content = content.replace(/    <\/div>\s*?\);\s*?};\s*?export default AdminStock;/g, modalHtml + "\n\nexport default AdminStock;");
}

if (!content.includes('Eye,')) {
    content = content.replace('import { Search, Plus, Upload, Download, RefreshCw, X, Box, Filter, AlertTriangle, User, History, Image as ImageIcon, MapPin, Printer, ShieldAlert, FileText, CheckCircle, Save, Calendar, Trash2, ArrowRight, ArrowLeft, MoreVertical, Edit, FileDigit, BarChart2 }',
    'import { Search, Plus, Upload, Download, RefreshCw, X, Box, Filter, AlertTriangle, User, History, Image as ImageIcon, MapPin, Printer, ShieldAlert, FileText, CheckCircle, Save, Calendar, Trash2, ArrowRight, ArrowLeft, MoreVertical, Edit, FileDigit, BarChart2, Eye, Palette }');
}

fs.writeFileSync('src/pages/admin/AdminStock.jsx', content);
console.log("AdminStock.jsx has been fixed perfectly! Location column added, Eye icon added, and modal added.");
