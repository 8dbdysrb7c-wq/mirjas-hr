import fs from 'fs';

try {
  let content = fs.readFileSync('./src/pages/admin/AdminStock.jsx', 'utf8');
  let lines = content.split('\n');

  const firstOpenModal = lines.findIndex(l => l.includes('const handleOpenVoucherModal = (type) => {'));
  
  const secondOpenModal = lines.findIndex((l, i) => i > firstOpenModal && l.includes('const handleOpenVoucherModal = (type) => {'));

  if (secondOpenModal > -1) {
    const completeHandleDelete = lines.findIndex((l, i) => i > secondOpenModal && l.includes('const handleDelete = async (id) => {'));

    if (completeHandleDelete > -1) {
      let brokenHandleDelete = -1;
      for (let i = secondOpenModal - 1; i >= firstOpenModal; i--) {
        if (lines[i].includes('const handleDelete = async (id) => {')) {
          brokenHandleDelete = i;
          break;
        }
      }

      if (brokenHandleDelete > -1) {
        const deleteCount = completeHandleDelete - brokenHandleDelete;
        lines.splice(brokenHandleDelete, deleteCount);
        console.log(`Deleted ${deleteCount} duplicated lines starting at ${brokenHandleDelete + 1}`);
        
        fs.writeFileSync('./src/pages/admin/AdminStock.jsx', lines.join('\n'));
        console.log('File successfully fixed!');
      } else {
        console.log('Could not find broken handleDelete.');
      }
    } else {
      console.log('Could not find complete handleDelete.');
    }
  } else {
    console.log('Could not find duplicate handleOpenVoucherModal.');
  }

} catch (err) {
  console.error(err);
}
