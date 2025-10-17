const fs = require('fs');

const filePath = 'src/lib/export-utils.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all .toDate() patterns with proper casting
content = content.replace(/b\.borrowedAt\.toDate\(\)/g, '(b.borrowedAt as FirebaseTimestamp).toDate()');
content = content.replace(/b\.dueDate\.toDate\(\)/g, '(b.dueDate as FirebaseTimestamp).toDate()');
content = content.replace(/b\.returnedAt\.toDate\(\)/g, '(b.returnedAt as FirebaseTimestamp).toDate()');

fs.writeFileSync(filePath, content);
console.log('Fixed export-utils.ts TypeScript errors');