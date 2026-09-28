import { isAssignedMission } from '../utils/assignedMission';
import { allDeliveryItemsReady } from '../utils/deliveryMethod';
import { db } from '../firebase';
import { 
  onSnapshot,
  writeBatch,
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  addDoc,
  limit,
  orderBy
} from 'firebase/firestore';
import { syncToHRAttendance, syncDailyReportViolations } from './hr';
import { createActivityNotification, isAddAction, resolveModuleKeyFromLog, ACTIVITY_ITEM_LABELS } from './settings';
import { triggerWhatsAppRouting } from './whatsappRouter';

export const getReports = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'reports'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getReports:", error);
    return [];
  }
};

export const saveReports = async (reports) => {
  try {
    for (const report of reports) {
      const id = `${report.userId}_${report.date}`;
      await setDoc(doc(db, 'reports', id), report);
    }
  } catch (error) {
    console.error("Error in saveReports:", error);
  }
};

export const saveReport = async (report) => {
  try {
    const id = report.id || `${report.userId}_${report.date}`;
    await setDoc(doc(db, 'reports', id), report);
    await syncDailyReportViolations({ ...report, id });
    if (report.userId && report.date && report.status === 'موافق') {
      await syncToHRAttendance(report.userId, report.userName, report.date, report.timeIn, report.timeOut);
    }
  } catch (error) {
    console.error("Error in saveReport:", error);
    throw error;
  }
};

export const deleteReport = async (id) => {
  try {
    await deleteDoc(doc(db, 'reports', id));
  } catch (error) {
    console.error("Error in deleteReport:", error);
  }
};

export const getSupervisorReports = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'supervisor_reports'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getSupervisorReports:", error);
    return [];
  }
};

export const getSupervisorReportsByDateRange = async (dateFrom, dateTo) => {
  try {
    let conditions = [];
    if (dateFrom) conditions.push(where('date', '>=', dateFrom));
    if (dateTo) conditions.push(where('date', '<=', dateTo));
    const q = query(
      collection(db, 'supervisor_reports'),
      ...conditions,
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getSupervisorReportsByDateRange:", error);
    return [];
  }
};

export const saveSupervisorReport = async (report) => {
  try {
    const docRef = report.id ? doc(db, 'supervisor_reports', report.id) : doc(collection(db, 'supervisor_reports'));
    await setDoc(docRef, { ...report, id: docRef.id });
    if (report.supervisorId && report.date) {
      await syncToHRAttendance(report.supervisorId, report.supervisorName, report.date, report.timeIn, report.timeOut);
    }
  } catch (error) {
    console.error("Error in saveSupervisorReport:", error);
    throw error;
  }
};

export const deleteSupervisorReport = async (id) => {
  try {
    await deleteDoc(doc(db, 'supervisor_reports', id));
  } catch (error) {
    console.error("Error in deleteSupervisorReport:", error);
  }
};

export const getMissions = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'missions'));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getMissions:", error);
    return [];
  }
};

export const getActiveMissions = async () => {
  try {
    const q = query(collection(db, 'missions'), where('status', 'not-in', ['تم الإنجاز', 'تم الانجاز', 'ملغي', 'ملغية', 'ملغاة']));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getActiveMissions:", error);
    return [];
  }
};

export const subscribeToAssignedMissions = (user, callback, onError) => {
  const targets = [...new Set([user.id, user.employeeId].filter(Boolean).map(String))].map(id => ['assignedEmployeeId', id]);
  if (user.name) targets.push(['assignedEmployeeName', user.name]);
  const results = new Map();
  const unsubscribers = targets.map(([field, value], index) => onSnapshot(
    query(collection(db, 'missions'), where(field, '==', value)),
    snapshot => {
      results.set(index, snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      const merged = new Map();
      for (const list of results.values()) for (const mission of list) if (isAssignedMission(mission, user)) merged.set(mission.id, mission);
      callback([...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }, onError
  ));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
};

export const getMissionsForUser = async (userId, userName) => {
  try {
    // Missions might be assigned by employeeId or employeeName based on the data structure
    // Since firestore doesn't support complex OR queries without composite indexes perfectly,
    // we fetch active missions first or use two queries. Let's do two queries to be safe and merge.
    const q1 = query(collection(db, 'missions'), where('assignedEmployeeId', '==', String(userId)));
    const q2 = query(collection(db, 'missions'), where('assignedEmployeeName', '==', String(userName)));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const map = new Map();
    snap1.docs.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id }));
    snap2.docs.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id }));
    
    return Array.from(map.values()).filter(mission => isAssignedMission(mission, { id: userId, name: userName }));
  } catch (error) {
    console.error("Error in getMissionsForUser:", error);
    return [];
  }
};


const persistMission = async (ref, mission, validateAssignment = false) => {
  const batch = writeBatch(db);
  batch.set(ref, mission);
  if (mission.salesOrderNumber && mission.type === 'تسليم طلبية') {
    const orders = await getDocs(query(collection(db, 'sales_orders'), where('orderNumber', '==', mission.salesOrderNumber)));
    if (((validateAssignment && (mission.assignedEmployeeId || ['pickup', 'courier'].includes(mission.deliveryMethod))) || mission.status === 'تم الإنجاز') && (!orders.docs.length || orders.docs.some(order => !allDeliveryItemsReady(order.data())))) {
      throw new Error('لا يمكن تحديد سائق أو طريقة تسليم أو إنجاز التسليم حتى تكون جميع أصناف الطلبية بحالة جاهز');
    }
    for (const order of orders.docs) {
      batch.set(order.ref, {
        deliveryMethod: mission.deliveryMethod || (mission.assignedEmployeeId ? 'employee' : 'unassigned'),
        deliveryDriverId: mission.assignedEmployeeId || '', deliveryDriverName: mission.assignedEmployeeName || '',
        deliveryStatus: mission.status || 'بانتظار الاستلام',
        deliveryCompletedAt: mission.status === 'تم الإنجاز' ? mission.completedAt || new Date().toISOString() : null
      }, { merge: true });
    }
  }
  await batch.commit();
};

export const saveMission = async (mission) => {
  try {
    let missionToSave = { ...mission };
    if (!missionToSave.id) {
      const missions = await getMissions();
      const maxNum = missions.reduce((max, o) => {
        const str = String(o.missionNumber || '');
        if (str.startsWith('DEL-')) {
          const match = str.match(/DEL-(\d+)/);
          return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }
        return max;
      }, 0);
      missionToSave.missionNumber = `DEL-${String(maxNum + 1).padStart(4, '0')}`;
      const docRef = doc(collection(db, 'missions'));
      missionToSave.id = docRef.id;
      missionToSave.createdAt = missionToSave.createdAt || new Date().toISOString();
      missionToSave.updatedAt = new Date().toISOString();
      await persistMission(docRef, missionToSave, true);
      return missionToSave;
    } else {
      const docRef = doc(db, 'missions', missionToSave.id);
      missionToSave.updatedAt = new Date().toISOString();
      await persistMission(docRef, missionToSave, true);
      return missionToSave;
    }
  } catch (error) {
    console.error("Error in saveMission:", error);
    return null;
  }
};

export const deleteMission = async (id) => {
  try {
    await deleteDoc(doc(db, 'missions', id));
  } catch (error) {
    console.error("Error in deleteMission:", error);
  }
};

export const updateMissionStatus = async (missionId, status, note = '', actor = null) => {
  try {
    const missionRef = doc(db, 'missions', missionId);
    const updateData = { 
      status,
      completedAt: status === 'تم الإنجاز' ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString() 
    };
    if (note) updateData.lastNote = note;
    if (status === 'تم الاستلام') updateData.receivedAt = new Date().toISOString();
    if (status === 'تم الإنجاز') updateData.completedAt = new Date().toISOString();
    
    const snapshot = await getDoc(missionRef);
    if (!snapshot.exists()) throw new Error('مهمة التوصيل غير موجودة');
    if (actor && !isAssignedMission(snapshot.data(), actor)) throw new Error('تم تغيير الموظف المكلف بهذه المهمة');
    await persistMission(missionRef, { ...snapshot.data(), ...updateData });
    return true;
  } catch (error) {
    console.error("Error in updateMissionStatus:", error);
    return false;
  }
};

export const addLog = async (log) => {
  try {
    const fullLog = {
      ...log,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('ar-EG'),
      time: new Date().toLocaleTimeString('ar-EG')
    };
    await addDoc(collection(db, 'operations_log'), fullLog);

    if (isAddAction(log.action)) {
      const moduleKey = resolveModuleKeyFromLog(log.module);
      await createActivityNotification({
        actor: {
          id: log.userId,
          name: log.userName,
          level: log.userLevel || ''
        },
        moduleKey,
        moduleLabel: log.module,
        itemLabel: ACTIVITY_ITEM_LABELS[moduleKey] || 'عنصر',
        itemName: log.details || '',
        message: log.details || `تمت إضافة ${ACTIVITY_ITEM_LABELS[moduleKey] || 'عنصر'} جديد`,
        target: log.target || null
      });
    }
  } catch (error) {
    console.error("Error in addLog:", error);
  }
};

export const getLogs = async () => {
  try {
    const q = query(collection(db, 'operations_log'), orderBy('timestamp', 'desc'), limit(500));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getLogs:", error);
    return [];
  }
};

export const getLogsByDateRange = async (dateFrom, dateTo) => {
  try {
    const fromISO = new Date(dateFrom).toISOString();
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    const toISO = toDate.toISOString();
    
    const q = query(
      collection(db, 'operations_log'), 
      where('timestamp', '>=', fromISO),
      where('timestamp', '<=', toISO),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getLogsByDateRange:", error);
    return [];
  }
};

export const getSmokingLogs = async () => {
  try {
    const q = query(collection(db, 'smoking_logs'), orderBy('timestamp', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getSmokingLogs:", error);
    return [];
  }
};

export const saveSmokingLog = async (log) => {
  try {
    const fullLog = {
      ...log,
      timestamp: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, 'smoking_logs'), fullLog);
    return { ...fullLog, id: docRef.id };
  } catch (error) {
    console.error("Error in saveSmokingLog:", error);
    return null;
  }
};

export const getAttendanceLogs = async () => {
  try {
    const q = query(collection(db, 'attendance_logs'), orderBy('timestamp', 'desc'), limit(500));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getAttendanceLogs:", error);
    return [];
  }
};

export const getTodayAttendanceLogs = async (dateStr = null) => {
  try {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'attendance_logs'), where('date', '==', today));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getTodayAttendanceLogs:", error);
    return [];
  }
};

export const saveAttendanceLog = async (log) => {
  try {
    const docId = `${log.employeeId}_${log.date}`;
    const docRef = doc(db, 'attendance_logs', docId);
    const fullLog = {
      ...log,
      timestamp: new Date().toISOString()
    };
    await setDoc(docRef, fullLog);
    return { ...fullLog, id: docId };
  } catch (error) {
    console.error("Error in saveAttendanceLog:", error);
    return null;
  }
};

export const getSupervisorTasks = async () => {
  try {
    const q = query(collection(db, 'supervisor_tasks'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getSupervisorTasks:", error);
    return [];
  }
};

export const getSupervisorTasksForUser = async (userId) => {
  try {
    // We check array-contains for assigneeIds and == for assigneeId
    const q1 = query(collection(db, 'supervisor_tasks'), where('assigneeId', '==', String(userId)));
    const q2 = query(collection(db, 'supervisor_tasks'), where('assigneeIds', 'array-contains', String(userId)));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const map = new Map();
    snap1.docs.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id }));
    snap2.docs.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id }));
    
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (error) {
    console.error("Error in getSupervisorTasksForUser:", error);
    return [];
  }
};


export const saveSupervisorTask = async (task) => {
  try {
    const isNew = !task.id;
    let docRef;
    let fullTask;

    if (isNew) {
      const q = query(collection(db, 'supervisor_tasks'));
      const querySnapshot = await getDocs(q);
      const allTasks = querySnapshot.docs.map(doc => doc.data());
      
      let nextNum = 1;
      const tNumberRegex = /TSK-(\d+)/;
      
      allTasks.forEach(t => {
        if (t.taskNumber) {
          const match = String(t.taskNumber).match(tNumberRegex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num >= nextNum) {
              nextNum = num + 1;
            }
          }
        }
      });
      
      const taskNumber = `TSK-${String(nextNum).padStart(3, '0')}`;

      docRef = doc(collection(db, 'supervisor_tasks'));
      fullTask = {
        ...task,
        id: docRef.id,
        taskNumber,
        createdAt: new Date().toISOString(),
        status: task.status || 'جديدة',
        priority: task.priority || 'متوسطة',
        logs: [{
          action: 'إنشاء المهمة',
          by: task.createdBy || 'المدير',
          timestamp: new Date().toISOString(),
          comment: 'تم إنشاء المهمة وتعيينها للمسؤول.'
        }]
      };
    } else {
      docRef = doc(db, 'supervisor_tasks', task.id);
      fullTask = {
        ...task,
        updatedAt: new Date().toISOString()
      };
    }
    await setDoc(docRef, fullTask, { merge: true });

    // Send WhatsApp notifications
    try {
      if (!task.id) {
        triggerWhatsAppRouting('tasks', 'create', {
          employeeId: fullTask.assignedToId || fullTask.assignedTo || '',
          employeeName: fullTask.assignedToName || 'غير محدد',
          taskTitle: fullTask.title || 'مهمة جديدة',
          dueDate: fullTask.dueDate || 'غير محدد'
        });
      } else {
        const lastLog = fullTask.logs && fullTask.logs.length > 0 ? fullTask.logs[fullTask.logs.length - 1] : null;
        const comment = lastLog ? lastLog.comment : 'تم تعديل تفاصيل المهمة';
        triggerWhatsAppRouting('tasks', 'update', {
          employeeId: fullTask.assignedToId || fullTask.assignedTo || '',
          employeeName: fullTask.assignedToName || 'غير محدد',
          taskTitle: fullTask.title || 'المهمة',
          status: fullTask.status || 'معلق',
          updateDetails: comment
        });
      }
    } catch (e) {
      console.error('[WhatsApp Routing] Error in saveSupervisorTask notification:', e);
    }

    return { ...fullTask, id: docRef.id };
  } catch (error) {
    console.error("Error in saveSupervisorTask:", error);
    return null;
  }
};

export const deleteSupervisorTask = async (taskId) => {
  try {
    await deleteDoc(doc(db, 'supervisor_tasks', taskId));
    return true;
  } catch (error) {
    console.error("Error in deleteSupervisorTask:", error);
    return false;
  }
};

export const getReportsByDateRange = async (dateFrom, dateTo) => {
  try {
    let q = collection(db, 'reports');
    if (dateFrom || dateTo) {
      let conditions = [];
      if (dateFrom) conditions.push(where('date', '>=', dateFrom));
      if (dateTo) conditions.push(where('date', '<=', dateTo));
      q = query(q, ...conditions);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getReportsByDateRange:", error);
    return [];
  }
};

export const getMissionsByDateRange = async (dateFrom, dateTo) => {
  try {
    let q = collection(db, 'missions');
    if (dateFrom || dateTo) {
      let conditions = [];
      if (dateFrom) conditions.push(where('createdAt', '>=', dateFrom));
      if (dateTo) conditions.push(where('createdAt', '<=', dateTo + 'T23:59:59'));
      q = query(q, ...conditions);
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getMissionsByDateRange:", error);
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

export const getReportsForUser = async (userId, employeeId = null) => {
  try {
    const ids = [...new Set([userId, employeeId])].filter(Boolean).map(id => String(id).trim());
    if (ids.length === 0) return [];
    // Limit to latest 60 reports (approx 2 months) to avoid massive reads over time.
    const q = query(collection(db, 'reports'), where('userId', 'in', ids.slice(0, 10)), orderBy('date', 'desc'), limit(60));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getReportsForUser:", error);
    return [];
  }
};

export const getReportsForUserByDateRange = async (userId, employeeId, dateFrom, dateTo) => {
  try {
    const ids = [...new Set([userId, employeeId])].filter(Boolean).map(id => String(id).trim());
    if (ids.length === 0) return [];
    
    let conditions = [
      where('userId', 'in', ids.slice(0, 10))
    ];
    if (dateFrom) conditions.push(where('date', '>=', dateFrom));
    if (dateTo) conditions.push(where('date', '<=', dateTo));
    
    const q = query(collection(db, 'reports'), ...conditions, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getReportsForUserByDateRange:", error);
    return [];
  }
};

export const getAttendanceLogsByDateRange = async (dateFrom, dateTo) => {
  try {
    let conditions = [];
    if (dateFrom) conditions.push(where('date', '>=', dateFrom));
    if (dateTo) conditions.push(where('date', '<=', dateTo));
    const q = query(collection(db, 'attendance_logs'), ...conditions);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error in getAttendanceLogsByDateRange:", error);
    return [];
  }
};

