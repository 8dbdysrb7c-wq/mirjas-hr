import { readFileSync, writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
const source=readFileSync('src/firebase.js','utf8');
const config=Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));
const db=getFirestore(initializeApp(config));
const result={};
for(const c of ['users','employees','settings']) {const snap=await getDocs(collection(db,c));result[c]=snap.docs.map(d=>({id:d.id,...d.data()}));}
for(const c of ['hr_attendance','attendance_logs','hr_leaves']) {const snap=await getDocs(query(collection(db,c),where('date','==','2026-10-17')));result[c]=snap.docs.map(d=>({id:d.id,...d.data()}));}
writeFileSync('artifacts/attendance-2026-10-17-before.json',JSON.stringify(result,null,2));
for(const c of ['users','employees']) console.log(c,JSON.stringify(result[c].map(({id,name,employeeId,status,shiftStart,shiftEnd,workShiftName,workLocationId,allowedWorkLocations})=>({id,name,employeeId,status,shiftStart,shiftEnd,workShiftName,workLocationId,allowedWorkLocations}))));
console.log('settings',JSON.stringify(result.settings.map(x=>({id:x.id,workLocations:x.workLocations,companyLat:x.companyLat,companyLng:x.companyLng,workShifts:x.workShifts}))));
console.log('attendance',JSON.stringify(result.hr_attendance));console.log('logs',JSON.stringify(result.attendance_logs));
process.exit(0);
