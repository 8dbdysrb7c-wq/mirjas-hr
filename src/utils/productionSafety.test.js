import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canSafelyDeleteProduction, isUnstartedProduction, sameProductionSale } from './productionSafety.js';

test('safe delete belongs only to admin account, not all administrator roles', () => {
 assert.equal(canSafelyDeleteProduction({id:'admin'}),true);
 for(const user of [null,{id:'EMP-0001',isAdmin:true},{id:'someone',role:'admin'}]) assert.equal(canSafelyDeleteProduction(user),false);
});
test('started or stock-linked cards cannot be safely deleted', () => {
 assert.equal(isUnstartedProduction({status:'لم يتم التنفيذ',items:[{status:'لم يتم التنفيذ'}]}),true);
 for(const order of [{stockDeducted:true},{stockReceived:true},{status:'مرحلة الخياطة'},{statusHistory:[{}]},{items:[{stageQuantities:{finished:1}}]}]) assert.equal(isUnstartedProduction(order),false);
});
test('sale identity matches legacy numbers and canonical IDs', () => {
 assert.equal(sameProductionSale({salesOrderId:'a'},{salesOrderId:'a'}),true);
 assert.equal(sameProductionSale({salesOrderNumber:'ORD-0002'},{salesOrderNumber:'ORD-0002'}),true);
 assert.equal(sameProductionSale({},{}),false);
});

const source=readFileSync(new URL('../services/sales.js',import.meta.url),'utf8');
function harness(seed=[]) {
 const records=new Map(seed.map(x=>[`orders/${x.id}`,x])); let count=0, tail=Promise.resolve();
 const doc=(...args)=>args.length===1?`${args[0]}/new-${++count}`:args.slice(1).join('/');
 const snap=key=>({id:key.split('/').at(-1),exists:()=>records.has(key),data:()=>records.get(key)});
 const getDocs=async path=>({docs:[...records.keys()].filter(k=>k.startsWith(path+'/')).map(snap)});
 const runTransaction=async (_,fn)=>{const next=tail.then(()=>fn({get:async key=>snap(key),set:(key,value)=>records.set(key,structuredClone(value))}));tail=next.catch(()=>{});return next;};
 const body=source.slice(source.indexOf('export const saveOrder ='),source.indexOf('export const deleteOrder =')).replace('export const saveOrder =','return ');
 const save=new Function('db','collection','getDocs','getDoc','doc','setDoc','runTransaction','sameProductionSale','triggerWhatsAppRouting','console',body)(null,(_,name)=>name,getDocs,async key=>snap(key),doc,async(k,v)=>records.set(k,v),runTransaction,sameProductionSale,()=>{},{error:()=>{}});
 return {save,records};
}
test('concurrent saves for one sales order create one card',async()=>{
 const h=harness();const results=await Promise.all([h.save({salesOrderId:'sale1'}),h.save({salesOrderId:'sale1'})]);
 assert.equal(results.filter(Boolean).length,1);
 assert.equal([...h.records.keys()].filter(k=>k.startsWith('orders/')).length,1);
});
test('legacy linked card blocks a new random card',async()=>{
 const h=harness([{id:'legacy',salesOrderId:'sale1',orderNumber:'PRO-0002'}]);
 assert.equal(await h.save({salesOrderId:'sale1'}),null);
 assert.equal(h.records.size,1);
});
test('different sales orders get distinct production numbers concurrently',async()=>{
 const h=harness();const results=await Promise.all([h.save({salesOrderId:'a'}),h.save({salesOrderId:'b'})]);
 assert.equal(new Set(results.map(x=>x.orderNumber)).size,2);
});
