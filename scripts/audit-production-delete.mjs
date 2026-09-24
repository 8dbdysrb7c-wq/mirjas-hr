import { freeAuthAdmin } from './free_auth_admin.mjs';
import { isUnstartedProduction } from '../src/utils/productionSafety.js';
const {db}=await freeAuthAdmin();
try {
 for (const number of ['PRO-0002','PRO-0003']) {
 const cards=await db.collection('orders').where('orderNumber','==',number).get();
 const vouchers=await db.collection('stock_vouchers').where('orderNumber','==',number).get();
 console.log(JSON.stringify({number,cards:cards.docs.map(d=>({id:d.id,...d.data(),safe:isUnstartedProduction(d.data())})),vouchers:vouchers.docs.map(d=>({id:d.id,status:d.data().status,type:d.data().type}))},null,2));
 }
} catch(e){ console.log(JSON.stringify({error:e.message,code:e.code})); } finally { await db.terminate(); }
