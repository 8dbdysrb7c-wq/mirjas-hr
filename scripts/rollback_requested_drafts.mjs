import fs from 'node:fs';
import {initializeApp} from 'firebase/app';
import {getFirestore,collection,getDocs,doc,runTransaction} from 'firebase/firestore';
import {buildReservedQuantityMap} from '../src/utils/stockAvailability.js';
const source=fs.readFileSync('src/firebase.js','utf8');
const config=Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId):\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));
const db=getFirestore(initializeApp(config));
const targets=new Set(['draft_admin_0a114e75-120b-4009-bdbc-f7ca0e96f823','draft_admin_745ec075-6e5c-4acd-8d3a-c08cdf291bf3','draft_admin_6e24ceda-447b-4703-b3b8-3014a94523db','draft_admin_7b9d28e0-1ffb-4f8a-a645-7e7c4859615c']);
const records=[];
for(const name of ['sales_orders','orders','preparation_orders','sales_order_draft_conversion_receipts']){
 const snap=await getDocs(collection(db,name));
 for(const d of snap.docs){const data=d.data();if(targets.has(data.sourceDraftId)||name==='sales_order_draft_conversion_receipts'&&targets.has(d.id))records.push({collection:name,id:d.id,data});}
}
fs.writeFileSync('artifacts/rollback-drafts-backup.json',JSON.stringify(records,null,2));
console.log(JSON.stringify(records.map(r=>({collection:r.collection,id:r.id,number:r.data.orderNumber,customer:r.data.customerName,salesOrderNumber:r.data.salesOrderNumber,stockDeducted:r.data.stockDeducted,status:r.data.status})),null,2));
if(process.argv.includes('--apply')){
 if(records.some(r=>r.data.stockDeducted||['منتهي','تم التسليم','تم التوصيل'].includes(r.data.status)))throw Error('Order has subsequent stock/delivery actions; cannot revert blindly');
 const reservations=buildReservedQuantityMap(records.filter(r=>r.collection==='sales_orders').map(r=>({...r.data,id:r.id})));
 await runTransaction(db,async tx=>{
  const live=await Promise.all(records.map(r=>tx.get(doc(db,r.collection,r.id))));
  const keys=Object.keys(reservations);
  const stock=await Promise.all(keys.map(k=>tx.get(doc(db,'stock_reservations',encodeURIComponent(k)))));
  live.forEach((s,i)=>{if(!s.exists()||JSON.stringify(s.data())!==JSON.stringify(records[i].data))throw Error('Record changed during rollback');});
  keys.forEach((k,i)=>{if(!stock[i].exists())throw Error('Reservation missing');const next=Number(stock[i].data().quantity||0)-reservations[k];if(next<0)throw Error('Reservation mismatch');tx.update(stock[i].ref,{quantity:next,updatedAt:new Date().toISOString()});});
  records.forEach(r=>{tx.set(doc(db,'sales_order_draft_rollback_archive',`${r.collection}_${r.id}`),{...r,rolledBackAt:new Date().toISOString()});tx.delete(doc(db,r.collection,r.id));});
 });
 console.log('ROLLBACK COMPLETE '+records.length);
}
process.exit(0);
