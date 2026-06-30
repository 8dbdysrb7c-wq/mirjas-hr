import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/admin/AdminSettings.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

injection = """
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const LocationPicker = ({ lat, lng, onChange }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={[lat || 31.9539, lng || 35.9106]} icon={customIcon} />;
};

"""

# Insert before const AdminSettings
idx = content.find("const AdminSettings = ({ user }) => {")
if idx != -1:
    content = content[:idx] + injection + content[idx:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("LocationPicker injected successfully.")
else:
    print("Could not find const AdminSettings")
