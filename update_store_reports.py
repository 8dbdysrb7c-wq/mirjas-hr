import re

with open('src/store.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update saveCustomer to include createdAt
# We will find:
# const fullCustomer = { ...customer, id };
# and replace it with:
# const fullCustomer = { createdAt: new Date().toISOString(), status: 'نشط', ...customer, id };
# This ensures that if the customer already has a status/createdAt, it overrides the default, 
# otherwise it defaults to 'نشط' and the current date.

old_customer = "const fullCustomer = { ...customer, id };"
new_customer = "const fullCustomer = { createdAt: new Date().toISOString(), status: 'نشط', ...customer, id };"
content = content.replace(old_customer, new_customer)


# 2. Add new fetchers ByDateRange at the bottom of the file before `// --- Initialization ---` or at the end.
# Actually I can just append them right after getMissionsByDateRange.

new_fetchers = """
export const getHRAttendanceByDateRange = async (dateFrom, dateTo) => {
  try {
    const q = query(
      collection(db, 'hr_attendance'),
      where('date', '>=', dateFrom),
      where('date', '<=', dateTo),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRAttendanceByDateRange:", error);
    return [];
  }
};

export const getHRViolationsByDateRange = async (dateFrom, dateTo) => {
  try {
    const q = query(
      collection(db, 'hr_violations'),
      where('date', '>=', dateFrom),
      where('date', '<=', dateTo),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getHRViolationsByDateRange:", error);
    return [];
  }
};

export const getSupervisorTasksByDateRange = async (dateFrom, dateTo) => {
  try {
    const q = query(
      collection(db, 'supervisor_tasks'),
      where('createdAt', '>=', dateFrom),
      where('createdAt', '<=', dateTo + 'T23:59:59'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getSupervisorTasksByDateRange:", error);
    return [];
  }
};

export const getSupervisorReportsByDateRange = async (dateFrom, dateTo) => {
  try {
    const q = query(
      collection(db, 'supervisor_reports'),
      where('date', '>=', dateFrom),
      where('date', '<=', dateTo),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error in getSupervisorReportsByDateRange:", error);
    return [];
  }
};
"""

# Let's insert it right after `export const getMissionsByDateRange` block.
pattern = re.compile(r'(export const getMissionsByDateRange.*?return \[\];\s*\}\s*\};)', re.DOTALL)
content = pattern.sub(r'\1\n' + new_fetchers, content)

with open('src/store.js', 'w', encoding='utf-8') as f:
    f.write(content)
