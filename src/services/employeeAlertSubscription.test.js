import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule } from 'node:vm';

test('employee subscription filters on server, excludes archived and updates on acknowledgement',async()=>{
 let source, next, onError, stopped=false;
 const dependencies={
 '../firebase':{db:{}},
 'firebase/firestore':{
 collection:(_,name)=>name,where:(...args)=>args,query:(...args)=>args,
 onSnapshot:(q,n,e)=>{source=q;next=n;onError=e;return ()=>{stopped=true;};}
 }};
 const module=new SourceTextModule(await readFile(new URL('./employeeAlertSubscription.js',import.meta.url),'utf8'));
 await module.link(name=>{const exports=dependencies[name];return new SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value);});});
 await module.evaluate();const results=[];const errors=[];
 const stop=module.namespace.subscribeToPendingEmployeeAlerts('EMP-0001',rows=>results.push(rows),e=>errors.push(e));
 assert.deepEqual(source,['employee_alerts',['employeeId','==','EMP-0001'],['status','==','pending']]);
 const rows=[{id:'a',sentAt:'2026-09-14'},{id:'b',sentAt:'2026-09-15'},{id:'c',archived:true}];
 next({docs:rows.map(row=>({id:row.id,data:()=>row}))});
 assert.deepEqual(results[0].map(r=>r.id),['b','a']);
 next({docs:[]});assert.deepEqual(results[1],[]);
 onError('quota');assert.deepEqual(errors,['quota']);stop();assert.equal(stopped,true);
 source=null;module.namespace.subscribeToPendingEmployeeAlerts('',()=>{},()=>{});assert.equal(source,null);
});
