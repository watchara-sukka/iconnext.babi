
const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const dbPath = path.join(__dirname, '..', 'data', 'babi.db');
const db = new Database(dbPath);

console.log('Generating dummy books...');

const insertStmt = db.prepare(`
    INSERT INTO books (id, title, author, description, category, folderPath, fileName, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

db.transaction(() => {
    for (let i = 1; i <= 60; i++) {
        const id = randomUUID();
        insertStmt.run(
            id,
            `Dummy Book ${i}`,
            `Author ${i}`,
            `Description for book ${i}`,
            'Fiction',
            `uploads/${id}`,
            `dummy_${i}.pdf`
        );
    }
})();

console.log('Inserted 60 dummy books.');
