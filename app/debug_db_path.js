const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL
    ? path.resolve(process.env.DATABASE_URL)
    : path.join(process.cwd(), '..', 'data', 'babi.db');

console.log('CWD:', process.cwd());
console.log('Resolved DB Path:', dbPath);
console.log('Exists:', fs.existsSync(dbPath));
