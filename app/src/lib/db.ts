import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';

// Database path configuration
const dbPath = process.env.DATABASE_URL
  ? path.resolve(process.env.DATABASE_URL)
  : path.join(process.cwd(), '..', 'data', 'babi.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Global database instance
let db: SqlJsDatabase | null = null;
let SQL: any = null;

// Initialize sql.js
async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  SQL = await initSqlJs();

  // Load existing database file if it exists
  let database: SqlJsDatabase;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  // Assign to global
  db = database;

  // Enable foreign keys
  database.run('PRAGMA foreign_keys = ON');

  // Initialize schema
  database.run(`
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
      updatedAt DATETIME,
      fileHash TEXT
    )
  `);


  // Create Authors Table
  database.run(`
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      bio TEXT,
      photoPath TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);


  // Create Junction Table
  database.run(`
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
    { name: 'updatedAt', type: 'DATETIME' },
    { name: 'fileHash', type: 'TEXT' }
  ];

  columns.forEach(col => {
    try {
      database.run(`ALTER TABLE books ADD COLUMN ${col.name} ${col.type}`);
    } catch (err: any) {
      // Ignore error if column already exists
    }
  });


  // Run author migration
  runAuthorMigration();

  // Save to disk
  saveDb();

  return database;

}

// Save database to disk
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Run author migration
function runAuthorMigration() {
  if (!db) return;

  try {
    const bookCountResult = db.exec('SELECT COUNT(*) as count FROM books');
    const linkCountResult = db.exec('SELECT COUNT(*) as count FROM book_authors');

    const bookCount = bookCountResult.length > 0 ? bookCountResult[0].values[0][0] as number : 0;
    const linkCount = linkCountResult.length > 0 ? linkCountResult[0].values[0][0] as number : 0;

    if (bookCount > 0 && linkCount === 0) {
      console.log('[Migration] Starting Author Migration...');
      const booksResult = db.exec('SELECT id, author FROM books WHERE author IS NOT NULL');

      if (booksResult.length > 0) {
        const books = booksResult[0].values.map(row => ({
          id: row[0] as string,
          author: row[1] as string
        }));

        for (const book of books) {
          if (!book.author) continue;

          const names = book.author.split(';').map(n => n.trim()).filter(n => n.length > 0);

          for (const name of names) {
            db.run('INSERT OR IGNORE INTO authors (name) VALUES (?)', [name]);
            const authorResult = db.exec('SELECT id FROM authors WHERE name = ?', [name]);
            if (authorResult.length > 0 && authorResult[0].values.length > 0) {
              const authorId = authorResult[0].values[0][0];
              db.run('INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)', [book.id, authorId]);
            }
          }
        }
        console.log('[Migration] Author Migration Completed.');
      }
    }
  } catch (err) {
    console.error('[Migration] Error migrating authors:', err);
  }
}

// Wrapper class to provide similar API to better-sqlite3
class DatabaseWrapper {
  private initPromise: Promise<SqlJsDatabase>;

  constructor() {
    this.initPromise = initDb();
  }

  private getDb(): SqlJsDatabase {
    if (!db) {
      throw new Error('Database not initialized. Call initDb() first or use async methods.');
    }
    return db;
  }

  // Prepare statement - returns an object with run/get/all methods
  prepare(sql: string) {
    const self = this;
    return {
      run(...params: any[]) {
        const database = self.getDb();
        database.run(sql, params);
        saveDb();
        return { changes: database.getRowsModified() };
      },
      get(...params: any[]) {
        const database = self.getDb();
        const result = database.exec(sql, params);
        if (result.length === 0 || result[0].values.length === 0) {
          return undefined;
        }
        const columns = result[0].columns;
        const values = result[0].values[0];
        const row: any = {};
        columns.forEach((col, i) => {
          row[col] = values[i];
        });
        return row;
      },
      all(...params: any[]) {
        const database = self.getDb();
        const result = database.exec(sql, params);
        if (result.length === 0) {
          return [];
        }
        const columns = result[0].columns;
        return result[0].values.map(values => {
          const row: any = {};
          columns.forEach((col, i) => {
            row[col] = values[i];
          });
          return row;
        });
      }
    };
  }

  // Execute raw SQL
  exec(sql: string) {
    const database = this.getDb();
    database.run(sql);
    saveDb();
  }

  // Transaction support - compatible with better-sqlite3 API
  transaction<T>(fn: (items?: T[]) => void) {
    return (items?: T[]) => {
      const database = this.getDb();
      database.run('BEGIN TRANSACTION');
      try {
        fn(items);
        database.run('COMMIT');
        saveDb();
      } catch (err) {
        database.run('ROLLBACK');
        throw err;
      }
    };

  }

  // Pragma support
  pragma(statement: string) {
    const database = this.getDb();
    database.run(`PRAGMA ${statement}`);
  }

  // Initialize and return promise
  async init(): Promise<void> {
    await this.initPromise;
  }
}

// Create and export singleton instance
const dbWrapper = new DatabaseWrapper();

// Initialize database on module load
(async () => {
  await dbWrapper.init();
})();

export default dbWrapper;
