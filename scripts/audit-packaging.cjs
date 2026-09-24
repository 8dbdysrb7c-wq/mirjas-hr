const fs = require('node:fs');
const { getProjectDefaultAccount } = require('../.firebase-deploy-temp/node_modules/firebase-tools/lib/auth');
const { requireAuth } = require('../.firebase-deploy-temp/node_modules/firebase-tools/lib/requireAuth');
const { Client } = require('../.firebase-deploy-temp/node_modules/firebase-tools/lib/apiv2');
(async () => {
  await requireAuth({ project: 'mirjaswork', ...getProjectDefaultAccount(process.cwd()) });
  const client = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1' });
  const documents = [];
  let pageToken;
  do {
    const response = await client.get('/projects/mirjaswork/databases/(default)/documents/stock', { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } });
    documents.push(...(response.body.documents || []));
    pageToken = response.body.nextPageToken;
  } while (pageToken);
  fs.writeFileSync('scratch/packaging-stock-before.json', JSON.stringify(documents, null, 2));
  const rows = documents.map(d => ({ id: d.name.split('/').at(-1), name: d.fields.name?.stringValue, category: d.fields.category?.stringValue, code: d.fields.itemNumber?.stringValue }));
  console.log(JSON.stringify({ stockDocuments: rows.length, packaging: rows.filter(r => /تغليف|كرتون/.test(r.category || '') || /^PKG-/.test(r.code || '')) }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
