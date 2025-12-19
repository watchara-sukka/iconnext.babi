
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), '..', 'data', 'babi.db');
const db = new Database(dbPath);

const books = db.prepare('SELECT id, title, fileHash FROM books ORDER BY createdAt DESC LIMIT 5').all();

console.log('Last 5 books:');
books.forEach(b => {
    console.log(`[${b.title}] ID: ${b.id}`);
    console.log(`   Hash: ${b.fileHash === null ? 'NULL' : (b.fileHash === '' ? 'EMPTY STRING' : b.fileHash)}`);
});
