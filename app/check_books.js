const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'babi.db');
const db = new Database(dbPath);

const books = db.prepare('SELECT id, title, folderPath FROM books').all();
console.log(JSON.stringify(books, null, 2));
