
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), '..', 'data', 'babi.db');
const db = new Database(dbPath);

const id = uuidv4();
const title = 'Manual Insert Test';
const hash = 'aecf0987654321';

console.log('Attempting to insert:', { id, hash });

try {
    const stmt = db.prepare(`
        INSERT INTO books (id, title, author, folderPath, fileName, fileHash)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, title, 'Tester', 'data/test', 'test.pdf', hash);
    console.log('Insert executed.');

    const check = db.prepare('SELECT fileHash FROM books WHERE id = ?').get(id);
    console.log('Result in DB:', check);

    // Cleanup
    db.prepare('DELETE FROM books WHERE id = ?').run(id);
} catch (e) {
    console.error('Error:', e);
}
