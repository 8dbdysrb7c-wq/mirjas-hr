import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

state_injection = """
  const [newLocation, setNewLocation] = useState({ name: '', lat: 31.9539, lng: 35.9106, radius: 500 });
  const [editingLocIndex, setEditingLocIndex] = useState(-1);

  const handleAddLocation = () => {
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      Swal.fire('خطأ', 'يرجى إدخال اسم الموقع وإحداثياته', 'error');
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

hook_idx = content.find("const [activeTab, setActiveTab] = useState('site');")
if hook_idx != -1:
    end_hook_idx = content.find(";", hook_idx) + 1
    content = content[:end_hook_idx] + "\n" + state_injection + content[end_hook_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("AdminSettings.jsx hooks fixed")
