code_to_append = """

export const getEmployeeAttendanceByDate = async (employeeId, dateStr) => {
  try {
    const q = query(
      collection(db, 'hr_attendance'),
      where('employeeId', '==', employeeId),
      where('date', '==', dateStr)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    return null;
  } catch (error) {
    console.error("Error in getEmployeeAttendanceByDate:", error);
    return null;
  }
};
"""

with open("c:/Users/a.awwad/.gemini/antigravity/mirjas-hr/src/store.js", "a", encoding="utf-8") as f:
    f.write(code_to_append)

print("Appended function to store.js")
