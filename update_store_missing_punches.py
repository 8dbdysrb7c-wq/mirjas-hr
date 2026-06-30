import re

with open('src/store.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_functions = """// ==========================================
// MISSING PUNCHES (HR)
// ==========================================
export const getMissingPunches = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'missing_punches'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching missing punches:", error);
    return [];
  }
};

export const saveMissingPunch = async (request) => {
  try {
    const docRef = await addDoc(collection(db, 'missing_punches'), {
      ...request,
      createdAt: new Date().toISOString()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error saving missing punch:", error);
    return { success: false, error };
  }
};

export const updateMissingPunchStatus = async (id, status, adminName, punchData) => {
  try {
    const docRef = doc(db, 'missing_punches', id);
    await updateDoc(docRef, {
      status,
      approvedBy: adminName,
      approvedAt: new Date().toISOString()
    });
    
    if (status === 'موافق عليه' && punchData) {
      await saveHRAttendance({
        employeeId: punchData.employeeId,
        employeeName: punchData.employeeName,
        date: punchData.date,
        type: punchData.type,
        time: punchData.time,
        notes: `ختمة ناقصة معتمدة من قبل ${adminName} (${punchData.reason})`,
        isMissingPunch: true
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error updating missing punch status:", error);
    return { success: false, error };
  }
};

export const deleteMissingPunch = async (id) => {
  try {
    await deleteDoc(doc(db, 'missing_punches', id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting missing punch:", error);
    return { success: false, error };
  }
};
"""

with open('src/store.js', 'a', encoding='utf-8') as f:
    f.write("\n" + new_functions)
