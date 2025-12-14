const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'babi.db');
console.log('DB Path:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });

    // Get Schema
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='books'").get();
    console.log('\n--- Books Table Schema ---');
    console.log(schema ? schema.sql : 'Table not found');
    console.log('--------------------------\n');

    // Get Columns Info (pragma)
    const columns = db.pragma('table_info(books)');
    console.log('--- Columns ---');
    console.table(columns);

    // Get 1 book
    const book = db.prepare("SELECT * FROM books LIMIT 1").get();
    console.log('\n--- Sample Book ---');
    console.log(book);

    console.log('\n--- Authors Table ---');
    const authors = db.prepare('SELECT * FROM authors').all();
    console.table(authors);

    console.log('\n--- Book Authors Link Table ---');
    const links = db.prepare('SELECT * FROM book_authors').all();
    console.table(links);

} catch (err) {
    console.error('Error:', err);
}

