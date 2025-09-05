// const fs = require('fs');
// const path = require('path');

// const ROUTES_DIR = path.join(__dirname, '../api/src/routes');

// function checkFile(filePath) {
//   const content = fs.readFileSync(filePath, 'utf8');
//   const regex = /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
//   let match;
//   while ((match = regex.exec(content)) !== null) {
//     const route = match[2];
//     if (/:\//.test(route) || /:$/g.test(route) || /:([^a-zA-Z0-9_]|$)/.test(route)) {
//       console.log(`⚠️  Suspicious route in ${filePath}: ${route}`);
//     }
//   }
// }

// fs.readdirSync(ROUTES_DIR).forEach(file => {
//   if (file.endsWith('.ts') || file.endsWith('.js')) {
//     checkFile(path.join(ROUTES_DIR, file));
//   }
// });
