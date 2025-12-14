import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL)
  : path.join(process.cwd(), '..', 'data', 'babi.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    category TEXT,
    isbn TEXT,
    folderPath TEXT NOT NULL,
    fileName TEXT NOT NULL,
    coverImage TEXT,
    fileSize INTEGER,
    pageCount INTEGER,
    publisher TEXT,
    year INTEGER,
    language TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME
  )
`);

// Create Authors Table
db.exec(`
  CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    bio TEXT,
    photoPath TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create Junction Table
db.exec(`
  CREATE TABLE IF NOT EXISTS book_authors (
    book_id TEXT,
    author_id INTEGER,
    role TEXT DEFAULT 'author',
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY(author_id) REFERENCES authors(id) ON DELETE CASCADE
  )
`);

// Migration: Add new columns if they don't exist
const columns = [
  { name: 'fileSize', type: 'INTEGER' },
  { name: 'pageCount', type: 'INTEGER' },
  { name: 'publisher', type: 'TEXT' },
  { name: 'year', type: 'INTEGER' },
  { name: 'language', type: 'TEXT' },
  { name: 'updatedAt', type: 'DATETIME' }
];

columns.forEach(col => {
  try {
    db.exec(`ALTER TABLE books ADD COLUMN ${col.name} ${col.type}`);
  } catch (err: any) {
    // Ignore error if column already exists
    if (!err.message.includes('duplicate column name')) {
      console.error(`Error adding column ${col.name}:`, err);
    }
  }
});

// Migration: Split authors and populate new tables
try {
  // Check if we need migration (if book_authors is empty but books exist)
  const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get() as any;
  const linkCount = db.prepare('SELECT COUNT(*) as count FROM book_authors').get() as any;

  if (bookCount.count > 0 && linkCount.count === 0) {
    console.log('[Migration] Starting Author Migration...');
    const books = db.prepare('SELECT id, author FROM books WHERE author IS NOT NULL').all() as any[];

    const insertAuthor = db.prepare('INSERT OR IGNORE INTO authors (name) VALUES (?)');
    const getAuthor = db.prepare('SELECT id FROM authors WHERE name = ?');
    const linkBookAuthor = db.prepare('INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)');

    const transaction = db.transaction((booksToMigrate) => {
      for (const book of booksToMigrate) {
        if (!book.author) continue;

        // Split by ; or , (cleaning whitespace)
        // User specified ';' but we can be robust and handle ',' too if desired, 
        // but strictly following requirement: use ;
        const names = book.author.split(';').map((n: string) => n.trim()).filter((n: string) => n.length > 0);

        for (const name of names) {
          insertAuthor.run(name);
          const authorRecord = getAuthor.get(name) as any;
          if (authorRecord) {
            linkBookAuthor.run(book.id, authorRecord.id);
          }
        }
      }
    });

    transaction(books);
    console.log('[Migration] Author Migration Completed.');
  }
} catch (err) {
  console.error('[Migration] Error migrating authors:', err);
}

export default db;
