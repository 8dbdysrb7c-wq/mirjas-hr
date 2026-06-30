import re
import os

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Leaflet imports
if "react-leaflet" not in content:
    imports = """import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationPicker({ lat, lng, onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return lat && lng ? <Marker position={[lat, lng]} /> : null;
}
"""
    # Find the last import
    last_import_idx = content.rfind("import ")
    end_of_last_import = content.find(";", last_import_idx) + 1
    content = content[:end_of_last_import] + "\n" + imports + content[end_of_last_import:]

# 2. Add state for managing locations in AdminSettings
if "const [newLocation" not in content:
    state_injection = """
  const [newLocation, setNewLocation] = useState({ name: '', lat: 31.9539, lng: 35.9106, radius: 500 });
  const [editingLocIndex, setEditingLocIndex] = useState(-1);
  const mapCenter = [31.9539, 35.9106];

  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      MySwal.fire('خطأ', 'يرجى إدخال اسم الموقع وإحداثياته', 'error');
      return;
    }
    const currentLocs = settings.workLocations || [];
    if (editingLocIndex >= 0) {
      const updated = [...currentLocs];
      updated[editingLocIndex] = newLocation;
      setSettings({ ...settings, workLocations: updated });
      setEditingLocIndex(-1);
    } else {
      setSettings({ ...settings, workLocations: [...currentLocs, { ...newLocation, id: Date.now().toString() }] });
    }
    setNewLocation({ name: '', lat: 31.9539, lng: 35.9106, radius: 500 });
  };

  const handleEditLocation = (index) => {
    setNewLocation(settings.workLocations[index]);
    setEditingLocIndex(index);
  };

  const handleDeleteLocation = (index) => {
    const updated = [...(settings.workLocations || [])];
    updated.splice(index, 1);
    setSettings({ ...settings, workLocations: updated });
  };
"""
    # Inject after `const [activeTab, setActiveTab] = useState('home');`
    hook_idx = content.find("const [activeTab, setActiveTab] = useState('home');")
    if hook_idx != -1:
        end_hook_idx = content.find(";", hook_idx) + 1
        content = content[:end_hook_idx] + "\n" + state_injection + content[end_hook_idx:]

# 3. Replace the old GPS Settings block with the new Multi-location UI
old_gps_block_start = content.find('{/* GPS Attendance Settings */}');
# We know the old block ends with </div>\n          </div>\n          )}
# Wait, my previous cleanup might have left it as `</div>\n          )}`
# Let's use regex to replace it carefully.

# Let's find the start and end precisely.
if old_gps_block_start != -1:
    # Find the end of activeTab === 'site' condition.
    # It ends right before `{activeTab === 'statuses' && (`
    statuses_idx = content.find("{activeTab === 'statuses'")
    
    # Extract the block to replace
    block_to_replace = content[old_gps_block_start:statuses_idx]
    
    new_gps_block = """{/* GPS Multi-Locations Settings */}
            <div className="glass-panel p-6 mt-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4 text-blue-600">
                <Globe size={20} className="text-blue-500" /> إعدادات مواقع العمل (فروع الشركة)
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Map & Form */}
                <div className="space-y-4">
                  <div className="input-group">
                    <label className="font-bold flex items-center gap-2">اسم الموقع / الفرع</label>
                    <input type="text" className="input-field" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} placeholder="مثال: الفرع الرئيسي" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="input-group">
                      <label className="font-bold text-xs">خط العرض (Lat)</label>
                      <input type="number" step="any" className="input-field py-1" value={newLocation.lat} onChange={e => setNewLocation({...newLocation, lat: Number(e.target.value)})} />
                    </div>
                    <div className="input-group">
                      <label className="font-bold text-xs">خط الطول (Lng)</label>
                      <input type="number" step="any" className="input-field py-1" value={newLocation.lng} onChange={e => setNewLocation({...newLocation, lng: Number(e.target.value)})} />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label className="font-bold text-xs">النطاق المسموح (بالمتر)</label>
                    <input type="number" min="10" className="input-field py-1" value={newLocation.radius} onChange={e => setNewLocation({...newLocation, radius: Number(e.target.value)})} />
                  </div>

                  <p className="text-xs text-slate-500">انقر على الخريطة لتحديد الإحداثيات مباشرة بدلاً من إدخالها يدوياً.</p>
                  <div className="h-64 rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 relative">
                    <MapContainer center={[newLocation.lat || 31.9539, newLocation.lng || 35.9106]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      <LocationPicker lat={newLocation.lat} lng={newLocation.lng} onChange={(lat, lng) => setNewLocation({...newLocation, lat, lng})} />
                    </MapContainer>
                  </div>
                  
                  <button className="btn btn-primary w-full" onClick={handleAddLocation}>
                    {editingLocIndex >= 0 ? 'تحديث الموقع' : 'إضافة موقع عمل'}
                  </button>
                  {editingLocIndex >= 0 && (
                    <button className="btn btn-outline w-full mt-2" onClick={() => { setEditingLocIndex(-1); setNewLocation({ name: '', lat: 31.9539, lng: 35.9106, radius: 500 }); }}>
                      إلغاء التعديل
                    </button>
                  )}
                </div>

                {/* Locations List */}
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700">المواقع المضافة:</h4>
                  {(!settings.workLocations || settings.workLocations.length === 0) && (
                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-500">لم يتم إضافة أي مواقع بعد.</p>
                      <p className="text-xs text-slate-400 mt-2">قم بإضافة موقع ليتمكن الموظفون من تسجيل الدخول منه.</p>
                    </div>
                  )}
                  {(settings.workLocations || []).map((loc, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                      <div>
                        <h5 className="font-bold text-slate-800">{loc.name}</h5>
                        <p className="text-xs font-mono text-slate-500 mt-1">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
                        <p className="text-xs text-blue-500 mt-1">النطاق: {loc.radius} متر</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button className="btn btn-outline text-xs py-1 px-3" onClick={() => handleEditLocation(idx)}>تعديل</button>
                        <button className="btn btn-outline text-xs py-1 px-3 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeleteLocation(idx)}>حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
          )}
        """
    
    content = content.replace(block_to_replace, new_gps_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("AdminSettings updated with Map UI")
