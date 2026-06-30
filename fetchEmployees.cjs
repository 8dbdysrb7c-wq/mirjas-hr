const https = require('https');
const fs = require('fs');

const url = 'https://firestore.googleapis.com/v1/projects/mirjaswork/databases/(default)/documents/employees?pageSize=1000';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const json = JSON.parse(data);
        const docs = json.documents || [];
        fs.writeFileSync('employees_dump.json', JSON.stringify(docs, null, 2));
        console.log(`Saved ${docs.length} employees.`);
    });
}).on('error', (e) => {
    console.error(e);
});
