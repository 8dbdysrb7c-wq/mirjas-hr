const { exec } = require('child_process');
const fs = require('fs');
exec('npm run build', (err, stdout, stderr) => {
  fs.writeFileSync('build-log.txt', stdout + '\n' + stderr);
});
