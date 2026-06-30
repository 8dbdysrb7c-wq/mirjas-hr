const https = require('https');
const fs = require('fs');

const url = 'https://firestore.googleapis.com/v1/projects/mirjaswork/databases/(default)/documents/hr_attendance?pageSize=1000';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const json = JSON.parse(data);
        const docs = json.documents || [];
        const todayDocs = docs.filter(doc => {
            return doc.fields && doc.fields.date && doc.fields.date.stringValue === '2026-06-20';
        });
        fs.writeFileSync('today_hr_attendance.json', JSON.stringify(todayDocs, null, 2));
        console.log(`Saved ${todayDocs.length} records for today.`);
    });
}).on('error', (e) => {
    console.error(e);
});
