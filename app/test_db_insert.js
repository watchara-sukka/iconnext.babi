
const fs = require('fs');
const path = require('path');
const { FormData } = require('formdata-node');
const { fileFromPath } = require('formdata-node/file-from-path');

// Mock fetch since we are in node.
// We need to actually hit the running server or mock the logic.
// Since we can't easily hit the running server without the port (3000?), let's assume 3000.
// But wait, I can just invoke the code directly? No, it's Next.js API.
// It's safer to reproduce the Logic by running a snippet that uses the same DB functions.

// actually, let's just inspect the code again. I don't want to overcomplicate with a full fetch test if I can't guarantee the server is up on 3000.
// I will create a snippet that USES the DB logic from 'import/route.ts' but runs as a localized script.
// This confirms if the DB logic works.

const Database = require('better-sqlite3');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), '..', 'data', 'babi.db');
const db = new Database(dbPath);

const fileBuffer = Buffer.from('Dummy Content');
const hashSum = crypto.createHash('sha256');
hashSum.update(fileBuffer);
const fileHash = hashSum.digest('hex');

const bookId = uuidv4();
const title = 'Test Upload Script ' + Date.now();
const safeFileName = 'test.pdf';
const relativeFolderPath = 'data/books/test_folder';

console.log('Testing Insert with Hash:', fileHash);

try {
    const insertBook = db.prepare(`
        INSERT INTO books (id, title, author, folderPath, fileName, fileHash)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertBook.run(bookId, title, 'Test Author', relativeFolderPath, safeFileName, fileHash);

    console.log('Insert run.');

    const check = db.prepare('SELECT fileHash FROM books WHERE id = ?').get(bookId);
    console.log('Retrieved Hash:', check.fileHash);

    if (check.fileHash === fileHash) {
        console.log('SUCCESS: Hash saved correctly.');
    } else {
        console.log('FAILURE: Hash mismatch or null.');
    }

    // Cleanup
    db.prepare('DELETE FROM books WHERE id = ?').run(bookId);

} catch (e) {
    console.error(e);
}
