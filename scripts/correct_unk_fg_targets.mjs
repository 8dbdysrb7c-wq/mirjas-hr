import {isDeepStrictEqual} from 'node:util';
import {readFileSync,writeFileSync} from 'node:fs';import {initializeApp} from 'firebase/app';import {getFirestore,collection,getDocs,doc,runTransaction} from 'firebase/firestore';
const source=readFileSync('src/firebase.js','utf8');const config=Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));const db=getFirestore(initializeApp(config));
const backup=JSON.parse(readFileSync('artifacts/unk-fg-targets-before.json','utf8'));const ids=new Set(backup.targets.map(x=>x.id));if(ids.size!==5)throw Error('Expected five targets');
const collections=['stock','stock_vouchers','orders','preparation_orders','sales_orders','product_costings','barcodes','hr_assets','stocktakes'];const all=[];
for(const c of collections){const snap=await getDocs(collection(db,c));for(const d of snap.docs)all.push({collection:c,ref:d.ref,id:d.id,data:d.data()});}
const stocks=all.filter(x=>x.collection==='stock');const targets=stocks.filter(x=>ids.has(x.id)).sort((a,b)=>a.data.name.localeCompare(b.data.name,'ar',{numeric:true}));
const counterRef=doc(db,'stock_sequences','FG');const auditRef=doc(collection(db,'operations_log'));const time=new Date().toISOString();
const result=await runTransaction(db,async tx=>{
 const counter=await tx.get(counterRef);let next=Math.max(Number(counter.data()?.lastNumber)||0,...stocks.map(x=>/^FG-\d+$/.test(x.data.itemNumber)?Number(x.data.itemNumber.slice(3)):0));
 const mapping=new Map();for(const x of targets){const expected=backup.targets.find(y=>y.id===x.id);if(x.data.itemNumber!==expected.itemNumber||x.data.name!==expected.name)throw Error('Target changed');const same=stocks.find(y=>!ids.has(y.id)&&y.data.name===x.data.name&&/^FG-\d+$/.test(y.data.itemNumber));mapping.set(x.data.itemNumber,same?.data.itemNumber||`FG-${String(++next).padStart(5,'0')}`);}
 const keys=new Set(['itemNumber','stockItemNumber','productCode','stockItemCode','productNumber']);
 const replace=(v,key='')=>Array.isArray(v)?v.map(x=>replace(x)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,replace(x,k)])):keys.has(key)&&mapping.has(v)?mapping.get(v):v;
 const changes=[];for(const x of all){let value=replace(x.data);if(x.collection==='stock'&&ids.has(x.id))value={...value,category:'بضاعة جاهزة'};if(JSON.stringify(value)!==JSON.stringify(x.data))changes.push({...x,value:{...value,updatedAt:time}});}
 if(changes.length>450)throw Error('Too many reference changes');
 const latest=await Promise.all(changes.map(x=>tx.get(x.ref)));for(let i=0;i<changes.length;i++)if(!isDeepStrictEqual(latest[i].data(),changes[i].data))throw Error('Concurrent modification: '+changes[i].id);
 writeFileSync('artifacts/unk-fg-correction-backup.json',JSON.stringify(changes.map(x=>({collection:x.collection,id:x.id,before:x.data,after:x.value})),null,2));
 for(const x of changes)tx.set(x.ref,x.value);
 tx.set(counterRef,{lastNumber:next,updatedAt:time},{merge:true});const rows=targets.map(x=>({id:x.id,name:x.data.name,oldNumber:x.data.itemNumber,newNumber:mapping.get(x.data.itemNumber)}));tx.set(auditRef,{action:'تصحيح تصنيف وترقيم أصناف ميرانا',date:'2026-10-17',timestamp:time,userName:'المدير العام',details:'تحويل خمسة أصناف إلى بضاعة جاهزة بأرقام FG مع تحديث المراجع وحفظ الكميات',rows,referenceChanges:changes.length});return {rows,referenceChanges:changes.length};
});
const after=(await getDocs(collection(db,'stock'))).docs.map(d=>({...d.data(),id:d.id}));for(const x of result.rows){const row=after.find(y=>y.id===x.id),old=backup.targets.find(y=>y.id===x.id);if(row.category!=='بضاعة جاهزة'||row.itemNumber!==x.newNumber||row.quantity!==old.quantity||row.warehouse!==old.warehouse)throw Error('Verification failed');if(after.some(y=>y.id!==row.id&&y.itemNumber===row.itemNumber&&y.name!==row.name))throw Error('Duplicate number');}
writeFileSync('artifacts/unk-fg-correction-result.json',JSON.stringify({...result,verified:true},null,2));console.log(JSON.stringify({...result,verified:true},null,2));process.exit(0);

