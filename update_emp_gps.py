import re

file_path = "c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/pages/EmployeeDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update fetchSettingsAndAttendance
old_fetch = """      setGpsSettings({
        lat: settings.companyLat,
        lng: settings.companyLng,
        radius: settings.companyRadius || 500
      });"""

new_fetch = """      setGpsSettings({
        workLocations: settings.workLocations || [],
        // Fallback for old single location if workLocations array is empty
        legacy: { lat: settings.companyLat, lng: settings.companyLng, radius: settings.companyRadius || 500 }
      });"""

content = content.replace(old_fetch, new_fetch)

# 2. Update handleGPSAction validation logic
old_validation_block = """    if (!gpsSettings?.lat || !gpsSettings?.lng) {
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
        }"""

new_validation_block = """    if (!navigator.geolocation) {
      Swal.fire('خطأ', 'متصفحك لا يدعم تحديد الموقع.', 'error');
      return;
    }

    setIsCheckingInOut(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const empLat = position.coords.latitude;
        const empLng = position.coords.longitude;
        
        let isAllowed = false;
        let minDistance = Infinity;
        let locationsToCheck = gpsSettings?.workLocations || [];
        
        // Fallback to legacy single location if no workLocations defined
        if (locationsToCheck.length === 0 && gpsSettings?.legacy?.lat) {
          locationsToCheck = [{
            id: 'legacy',
            name: 'المقر الرئيسي',
            lat: gpsSettings.legacy.lat,
            lng: gpsSettings.legacy.lng,
            radius: gpsSettings.legacy.radius
          }];
        }

        if (locationsToCheck.length === 0) {
          setIsCheckingInOut(false);
          Swal.fire('خطأ', 'لم يتم ضبط إعدادات مواقع العمل من قبل الإدارة.', 'error');
          return;
        }

        // Filter by user's allowed locations
        const userAllowedIds = user.allowedWorkLocations || ['all'];
        const allowedLocations = userAllowedIds.includes('all') 
          ? locationsToCheck 
          : locationsToCheck.filter(loc => userAllowedIds.includes(loc.id));

        if (allowedLocations.length === 0) {
          setIsCheckingInOut(false);
          Swal.fire('مرفوض', 'لم يتم تخصيص أي مواقع عمل مسموحة لك.', 'error');
          return;
        }

        for (const loc of allowedLocations) {
          if (!loc.lat || !loc.lng) continue;
          const distance = getDistanceFromLatLonInKm(empLat, empLng, loc.lat, loc.lng);
          if (distance < minDistance) minDistance = distance;
          if (distance <= (loc.radius || 500)) {
            isAllowed = true;
            break;
          }
        }

        if (!isAllowed) {
          setIsCheckingInOut(false);
          Swal.fire('مرفوض', `أنت بعيد عن مواقع العمل المسموحة لك. أقرب موقع يبعد عنك ${Math.round(minDistance)} متر.`, 'warning');
          return;
        }"""

content = content.replace(old_validation_block, new_validation_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("EmployeeDashboard.jsx updated with multi-location GPS validation")
