import {readFileSync,writeFileSync} from 'node:fs';
import {initializeApp} from 'firebase/app';
import {getFirestore,collection,getDocs,doc,getDoc} from 'firebase/firestore';
const source=readFileSync('src/firebase.js','utf8');const config=Object.fromEntries([...source.matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(m=>[m[1],m[2]]));const db=getFirestore(initializeApp(config));
const settings=(await getDoc(doc(db,'settings','globalSettings'))).data();
const stock=(await getDocs(collection(db,'stock'))).docs.map(d=>d.data());
const count=key=>Object.fromEntries([...new Set(stock.map(x=>x[key]).filter(Boolean))].map(k=>[k,stock.filter(x=>x[key]===k).length]));
writeFileSync('artifacts/stock-settings-review-before.json',JSON.stringify({settings,warehouses:count('warehouse'),categories:count('category')},null,2));console.log(JSON.stringify({configuredWarehouses:settings?.value?.warehouses,configuredCategories:settings?.value?.stockCategories,actualWarehouses:count('warehouse'),actualCategories:count('category')},null,2));process.exit(0);
