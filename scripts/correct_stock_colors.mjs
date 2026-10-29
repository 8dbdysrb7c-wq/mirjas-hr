import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getFirestore, getDoc, getDocs, collection, doc, updateDoc, terminate } from 'firebase/firestore';
const config = Object.fromEntries([...readFileSync('src/firebase.js','utf8').matchAll(/(apiKey|authDomain|projectId|appId):\s*"([^"]+)"/g)].map(m => [m[1],m[2]]));
const audit = JSON.parse(readFileSync('artifacts/stock-colors-audit.json','utf8'));
const plan = JSON.parse(readFileSync('artifacts/stock-colors-correction-preview.json','utf8'));
const db = getFirestore(initializeApp(config));
const timeout = setTimeout(() => { console.error('Timed out; read back settings before retrying.'); process.exit(1); }, 45000);
try {
  const ref = doc(db, 'settings', 'globalSettings');
  const [snapshot, stock] = await Promise.all([getDoc(ref), getDocs(collection(db, 'stock'))]);
  const current = snapshot.data().value;
  assert.deepEqual(current.stockColors, audit.configuredColors, 'Colors changed since audit; inspect before applying');
  const used = [...new Set(stock.docs.map(row => row.data().spec).filter(value => typeof value === 'string' && value.trim()))];
  const colors = [...new Set([...plan.colors, ...used])];
  writeFileSync('artifacts/stock-colors-before-correction.json', JSON.stringify({ capturedAt:new Date().toISOString(), stockColors:current.stockColors }, null, 2));
  await updateDoc(ref, { 'value.stockColors': colors });
  const after = (await getDoc(ref)).data().value;
  assert.deepEqual(after.stockColors, colors);
  const omitColors = data => Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'stockColors'));
  assert.deepEqual(omitColors(after), omitColors(current), 'Other settings changed concurrently; review');
  const result = { verified:true, beforeCount:current.stockColors.length, afterCount:colors.length, allExistingSpecsPreserved:used.every(color => colors.includes(color)), sourceRevision:plan.sourceRevision, colors, savedAt:new Date().toISOString() };
  writeFileSync('artifacts/stock-colors-correction-result.json', JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
} finally { clearTimeout(timeout); await terminate(db); }
