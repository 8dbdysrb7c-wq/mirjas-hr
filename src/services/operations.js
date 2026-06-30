import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  addDoc,
  limit,
  orderBy
} from 'firebase/firestore';
import { syncToHRAttendance } from './hr';
import { createActivityNotification, isAddAction, resolveModuleKeyFromLog, ACTIVITY_ITEM_LABELS } from './settings';

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
    if (report.userId && report.date && report.status === 'موافق') {
      await syncToHRAttendance(report.userId, report.userName, report.date, report.timeIn, report.timeOut);
    }
  } catch (error) {
    console.error("Error in saveReport:", error);
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

export const saveSupervisorReport = async (report) => {
  try {
    const docRef = report.id ? doc(db, 'supervisor_reports', report.id) : doc(collection(db, 'supervisor_reports'));
    await setDoc(docRef, { ...report, id: docRef.id });
    if (report.supervisorId && report.date) {
      await syncToHRAttendance(report.supervisorId, report.supervisorName, report.date, report.timeIn, report.timeOut);
    }
  } catch (error) {
    console.error("Error in saveSupervisorReport:", error);
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
      await setDoc(docRef, missionToSave);
      return missionToSave;
    } else {
      const docRef = doc(db, 'missions', missionToSave.id);
      missionToSave.updatedAt = new Date().toISOString();
      await setDoc(docRef, missionToSave);
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

export const updateMissionStatus = async (missionId, status, note = '') => {
  try {
    const missionRef = doc(db, 'missions', missionId);
    const updateData = { 
      status, 
      updatedAt: new Date().toISOString() 
    };
    if (note) updateData.lastNote = note;
    if (status === 'تم الاستلام') updateData.receivedAt = new Date().toISOString();
    if (status === 'تم الإنجاز') updateData.completedAt = new Date().toISOString();
    
    await setDoc(missionRef, updateData, { merge: true });
  } catch (error) {
    console.error("Error in updateMissionStatus:", error);
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
