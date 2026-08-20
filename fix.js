const fs = require('fs');
const path = 'src/pages/admin/AdminSales.jsx';
let content = fs.readFileSync(path, 'utf8');

// Find the line that has "                      }))" and replace it with "                    })}"
const target = "                      }))";
if (content.includes(target)) {
  content = content.replace(target, "                    })}");
  fs.writeFileSync(path, content, 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Target not found!");
}
