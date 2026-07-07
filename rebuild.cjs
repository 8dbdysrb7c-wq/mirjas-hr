const fs = require('fs');

const lines = fs.readFileSync('C:/Users/a.awwad/.gemini/antigravity-ide/brain/afeb6f71-4110-45c7-bff3-6bf7483aec7c/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

const reconstructedFile = {};

for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    // Include both READ_FILE and VIEW_FILE
    if ((obj.type === 'VIEW_FILE' || obj.type === 'READ_FILE' || obj.type === 'REPLACE_FILE_CONTENT') && obj.content && obj.content.includes('AdminStock.jsx')) {
      const contentLines = obj.content.split('\n');
      let inCode = false;
      for (const cl of contentLines) {
        if (cl.startsWith('The following code has been modified')) {
          inCode = true;
          continue;
        }
        if (cl.startsWith('The above content')) {
          inCode = false;
          continue;
        }
        if (inCode) {
          const match = cl.match(/^(\d+):\s?(.*)$/);
          if (match) {
            const lineNum = parseInt(match[1]);
            const text = match[2];
            // Only add if we don't have it, to preserve the oldest state
            // Wait, we want the OLDEST state! Since we process chronologically, the first time we see a line, it's the oldest!
            if (reconstructedFile[lineNum] === undefined) {
               reconstructedFile[lineNum] = text;
            }
          }
        }
      }
    }
  } catch (e) {}
}

const maxLine = Math.max(...Object.keys(reconstructedFile).map(Number));
console.log("Max line found: " + maxLine);

// See if we have lines 2200 to 2300 (where the table is)
let foundTable = false;
for (let i = 2240; i <= 2265; i++) {
   if (reconstructedFile[i]) {
       console.log(`${i}: ${reconstructedFile[i]}`);
       if (reconstructedFile[i].includes('الموقع')) foundTable = true;
   }
}

console.log("Found location column in old data: " + foundTable);
