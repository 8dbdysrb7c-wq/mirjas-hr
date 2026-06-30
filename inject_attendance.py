import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
if "saveHRAttendance" not in content:
    content = content.replace("saveMissingPunch } from '../store';", "saveMissingPunch, saveHRAttendance, getEmployeeAttendanceByDate } from '../store';")

# 2. Add Haversine function outside the component
haversine_code = """
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);  
  const dLon = (lon2 - lon1) * (Math.PI / 180); 
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d * 1000; 
};

"""
if "getDistanceFromLatLonInKm" not in content:
    content = content.replace("const EmployeeDashboard = ({ user, onLogout }) => {", haversine_code + "const EmployeeDashboard = ({ user, onLogout }) => {")

# 3. Add states and logic inside the component
logic_code = """
  const [liveTime, setLiveTime] = useState(new Date());
  const [gpsSettings, setGpsSettings] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isCheckingInOut, setIsCheckingInOut] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchSettingsAndAttendance = async () => {
      const settings = await getGlobalSettings();
      setGpsSettings({
        lat: settings.companyLat,
        lng: settings.companyLng,
        radius: settings.companyRadius || 500
      });

      const todayStr = getLocalDateStr(new Date());
      const att = await getEmployeeAttendanceByDate(user.id, todayStr);
      setTodayAttendance(att);
    };
    fetchSettingsAndAttendance();
  }, [user.id]);

  const handleGPSAction = async (actionType) => {
    if (!gpsSettings?.lat || !gpsSettings?.lng) {
      Swal.fire('خطأ', 'لم يتم ضبط إعدادات الموقع للشركة من قبل الإدارة.', 'error');
      return;
    }

    if (!navigator.geolocation) {
      Swal.fire('خطأ', 'متصفحك لا يدعم تحديد الموقع.', 'error');
      return;
    }

    setIsCheckingInOut(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const empLat = position.coords.latitude;
        const empLng = position.coords.longitude;
        const distance = getDistanceFromLatLonInKm(empLat, empLng, gpsSettings.lat, gpsSettings.lng);

        if (distance > gpsSettings.radius) {
          setIsCheckingInOut(false);
          Swal.fire('مرفوض', `أنت بعيد عن موقع الشركة بمسافة ${Math.round(distance)} متر. المسموح هو ${gpsSettings.radius} متر فقط.`, 'warning');
          return;
        }

        const todayStr = getLocalDateStr(new Date());
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        try {
          if (actionType === 'in') {
            const newRecord = {
              ...(todayAttendance || {}),
              employeeId: user.id,
              employeeName: user.name,
              date: todayStr,
              timeIn: timeStr,
              status: 'مداوم',
              notes: 'تسجيل دخول جغرافي'
            };
            const result = await saveHRAttendance(newRecord);
          } else if (actionType === 'out') {
            const record = {
              ...(todayAttendance || {}),
              employeeId: user.id,
              employeeName: user.name,
              date: todayStr,
              timeOut: timeStr,
              status: 'مداوم'
            };
            if (!todayAttendance?.timeIn) {
              record.timeIn = timeStr;
              record.notes = 'تسجيل خروج بدون دخول مسبق';
            }
            await saveHRAttendance(record);
          }

          const updatedAtt = await getEmployeeAttendanceByDate(user.id, todayStr);
          setTodayAttendance(updatedAtt);
          
          Swal.fire({
            icon: 'success',
            title: 'تم',
            text: actionType === 'in' ? 'تم تسجيل الدخول بنجاح' : 'تم تسجيل الخروج بنجاح',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (error) {
          console.error(error);
          Swal.fire('خطأ', 'حدث خطأ أثناء الحفظ', 'error');
        } finally {
          setIsCheckingInOut(false);
        }
      },
      (error) => {
        setIsCheckingInOut(false);
        let msg = 'تعذر تحديد موقعك.';
        if (error.code === 1) msg = 'يرجى السماح بصلاحية الموقع من إعدادات المتصفح.';
        Swal.fire('خطأ', msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
"""

if "const [liveTime, setLiveTime]" not in content:
    content = content.replace("const [activeTab, setActiveTab] = useState('home');", "const [activeTab, setActiveTab] = useState('home');\n" + logic_code)

# 4. Insert UI in hr_requests tab
ui_code = """
            {/* GPS Live Attendance Card */}
            <div className="mb-8 rounded-2xl shadow-lg border border-slate-200 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0f4c81, #1a8d9b)' }}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Globe size={100} />
              </div>
              <div className="relative p-6 text-white text-center">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin className="text-blue-200" />
                    <span className="font-bold text-sm">موقع الشركة (GPS)</span>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold font-mono tracking-wider" dir="ltr">
                      {liveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                    <div className="text-sm text-blue-100 opacity-90 mt-1">
                      {liveTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  {/* Check IN Button */}
                  {todayAttendance?.timeIn ? (
                    <div className="bg-white/20 backdrop-blur border border-white/30 rounded-xl p-4 flex flex-col items-center justify-center transition-all">
                      <CheckCircle2 size={32} className="text-green-300 mb-2" />
                      <span className="font-bold">مكتمل</span>
                      <span className="text-xs mt-1 text-blue-100 font-mono">{todayAttendance.timeIn}</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleGPSAction('in')}
                      disabled={isCheckingInOut}
                      className="bg-white hover:bg-slate-50 text-slate-800 rounded-xl p-4 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-md disabled:opacity-50"
                    >
                      {isCheckingInOut ? <div className="spinner mb-2 border-primary"></div> : <Fingerprint size={32} className="text-primary mb-2" />}
                      <span className="font-bold">تسجيل الدخول</span>
                    </button>
                  )}

                  {/* Check OUT Button */}
                  {todayAttendance?.timeOut ? (
                    <div className="bg-white/20 backdrop-blur border border-white/30 rounded-xl p-4 flex flex-col items-center justify-center transition-all">
                      <CheckCircle2 size={32} className="text-green-300 mb-2" />
                      <span className="font-bold">مكتمل</span>
                      <span className="text-xs mt-1 text-blue-100 font-mono">{todayAttendance.timeOut}</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleGPSAction('out')}
                      disabled={isCheckingInOut}
                      className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl p-4 flex flex-col items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-md disabled:opacity-50 border border-slate-700"
                    >
                      {isCheckingInOut ? <div className="spinner mb-2 border-white"></div> : <LogOut size={32} className="text-white mb-2" />}
                      <span className="font-bold">تسجيل الخروج</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
"""

# Replace exact anchor for UI
if "GPS Live Attendance Card" not in content:
    anchor = """      case 'hr_requests':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
"""
    content = content.replace(anchor, anchor + ui_code)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected logic and UI.")
