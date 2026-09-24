import fs from "fs";

const filePath = "./src/services/hr.js";
let content = fs.readFileSync(filePath, "utf-8");

const helpersToAdd = `
export const getHRAttendanceForUser = async (employeeId, employeeName = '') => {
  try {
    const q1 = query(collection(db, 'hr_attendance'), where('employeeId', '==', String(employeeId)));
    const snap1 = await getDocs(q1);
    const map = new Map();
    snap1.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));

    if (employeeName) {
      const q2 = query(collection(db, 'hr_attendance'), where('employeeName', '==', String(employeeName)));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  } catch (error) {
    console.error("Error in getHRAttendanceForUser:", error);
    return [];
  }
};

export const getHRViolationsForUser = async (employeeId, employeeName = '') => {
  try {
    const q1 = query(collection(db, 'hr_violations'), where('employeeId', '==', String(employeeId)));
    const snap1 = await getDocs(q1);
    const map = new Map();
    snap1.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));

    if (employeeName) {
      const q2 = query(collection(db, 'hr_violations'), where('employeeName', '==', String(employeeName)));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  } catch (error) {
    console.error("Error in getHRViolationsForUser:", error);
    return [];
  }
};

export const getHRAssetsForUser = async (employeeId, employeeName = '') => {
  try {
    const q1 = query(collection(db, 'hr_assets'), where('employeeId', '==', String(employeeId)));
    const snap1 = await getDocs(q1);
    const map = new Map();
    snap1.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));

    if (employeeName) {
      const q2 = query(collection(db, 'hr_assets'), where('employeeName', '==', String(employeeName)));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (error) {
    console.error("Error in getHRAssetsForUser:", error);
    return [];
  }
};
`;

if (!content.includes("getHRAttendanceForUser")) {
  content = content.trimEnd() + "\n" + helpersToAdd.trim() + "\n";
  fs.writeFileSync(filePath, content, "utf-8");
  console.log("Successfully appended HR helpers to hr.js");
} else {
  console.log("HR helpers already present in hr.js");
}
