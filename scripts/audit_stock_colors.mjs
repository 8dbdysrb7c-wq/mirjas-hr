import {readFileSync,writeFileSync} from 'node:fs';
import {initializeApp} from 'firebase/app';
import {getFirestore,getDoc,getDocs,doc,collection,terminate} from 'firebase/firestore';
const config=Object.fromEntries([...readFileSync('src/firebase.js','utf8').matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));
const db=getFirestore(initializeApp(config));
try {
 const [settingsSnap,stockSnap]=await Promise.all([getDoc(doc(db,'settings','globalSettings')),getDocs(collection(db,'stock'))]);
 const data=settingsSnap.data();const settings=data?.value||data;
 const specs={};for(const d of stockSnap.docs){const r=d.data();const k=String(r.spec??'');specs[k]??={count:0,categories:[],examples:[]};specs[k].count++;if(!specs[k].categories.includes(r.category))specs[k].categories.push(r.category||'');if(specs[k].examples.length<2)specs[k].examples.push({id:d.id,name:r.name});}
 const result={capturedAt:new Date().toISOString(),configuredColors:settings.stockColors??null,specs};
 writeFileSync('artifacts/stock-colors-audit.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}finally{await terminate(db);}
