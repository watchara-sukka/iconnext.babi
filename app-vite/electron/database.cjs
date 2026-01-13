const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');

let db = null;
let dbPath = null;
let uploadsDir = null;
let dbReadyPromise = null;
let resolveDbReady = null;
let saveTimeout = null;

dbReadyPromise = new Promise((resolve) => {
    resolveDbReady = resolve;
});

async function initDatabase(customUploadsDir) {
    try {
        // We already set appropriate userData path in main.cjs (portable or standard)
        const dataDir = app.getPath('userData');
        const dbFile = 'babi.db';

        dbPath = path.join(dataDir, dbFile);
        console.log(`Database folder: ${path.dirname(dbPath)}`);
        console.log(`Database file: ${dbPath}`);

        // Use customUploadsDir if provided (portable), otherwise fallback to standard location
        uploadsDir = customUploadsDir || path.join(dataDir, 'uploads');
        console.log(`Uploads folder: ${uploadsDir}`);

        // Ensure directories exist
        if (!fs.existsSync(path.dirname(dbPath))) {
            console.log('Creating data directory...');
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        }
        if (!fs.existsSync(uploadsDir)) {
            console.log('Creating uploads directory...');
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        console.log('Initializing SQL.js...');
        const SQL = await initSqlJs();

        if (fs.existsSync(dbPath)) {
            const fileBuffer = fs.readFileSync(dbPath);
            console.log(`Loading existing database (${fileBuffer.length} bytes) from: ${dbPath}`);
            db = new SQL.Database(fileBuffer);
        } else {
            console.log('Creating new empty database');
            db = new SQL.Database();
        }

        db.run('PRAGMA foreign_keys = ON');

        try {
            const res = db.exec('SELECT COUNT(*) FROM books');
            if (res.length > 0) {
                console.log(`Total books found in database: ${res[0].values[0][0]}`);
            }
        } catch (e) {
            console.log('Books table does not exist yet');
        }

        // Ensure fileHash column exists (for existing databases)
        try {
            db.run('ALTER TABLE books ADD COLUMN fileHash TEXT');
            console.log('Added fileHash column to books table');
        } catch (e) {
            // Ignore error if column already exists
            console.log('fileHash column already exists or books table does not exist');
        }

        // Tables
        db.run(`
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

        db.run(`
    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      bio TEXT,
      photoPath TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

        db.run(`
    CREATE TABLE IF NOT EXISTS book_authors (
      book_id TEXT,
      author_id INTEGER,
      role TEXT DEFAULT 'author',
      PRIMARY KEY (book_id, author_id),
      FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY(author_id) REFERENCES authors(id) ON DELETE CASCADE
    )
  `);

        saveDb();
        resolveDbReady();
    } catch (err) {
        console.error('Database initialization failed:', err);
        resolveDbReady();
        throw err;
    }
}

/**
 * Throttled save to disk to prevent excessive IO on USB drives.
 */
function saveDb() {
    if (saveTimeout) clearTimeout(saveTimeout);

    // Throttle for 2 seconds. 
    // This collects multiple updates into a single write.
    saveTimeout = setTimeout(() => {
        forceSaveDb();
    }, 2000);
}

/**
 * Immediate save to disk. Use for critical updates or app shutdown.
 */
function forceSaveDb() {
    if (db && dbPath) {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }

        try {
            console.log(`[DB Optimization] Saving database to disk: ${dbPath}`);
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);
            console.log(`[DB Optimization] Save complete (${buffer.length} bytes)`);
        } catch (e) {
            console.error('[DB Optimization] Failed to save database:', e);
        }
    }
}

function handleDatabaseIpc(ipcMain) {

    // GET ALL BOOKS (WITH PAGINATION)
    ipcMain.handle('books:getAll', async (event, options = {}) => {
        await dbReadyPromise;
        try {
            const { page = 1, limit = 50, searchTerm = '' } = options;
            const offset = (page - 1) * limit;

            let sql = 'SELECT * FROM books';
            let params = [];

            if (searchTerm) {
                sql += ' WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ?';
                const searchPattern = `%${searchTerm}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            sql += ' ORDER BY updatedAt DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = db.prepare(sql);
            if (params.length > 0) stmt.bind(params);

            const result = [];
            while (stmt.step()) result.push(stmt.getAsObject());
            stmt.free();
            return result;
        } catch (e) {
            console.error('getAll error', e);
            return [];
        }
    });

    // GET TOTAL BOOKS COUNT
    ipcMain.handle('books:count', async (event, searchTerm = '') => {
        await dbReadyPromise;
        try {
            let sql = 'SELECT COUNT(*) as count FROM books';
            let params = [];

            if (searchTerm) {
                sql += ' WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ?';
                const searchPattern = `%${searchTerm}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            const res = db.exec(sql, params);
            if (res.length > 0) {
                return res[0].values[0][0];
            }
            return 0;
        } catch (e) {
            console.error('count error', e);
            return 0;
        }
    });

    // GET ONE BOOK
    ipcMain.handle('books:get', async (event, id) => {
        await dbReadyPromise;
        const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
        const result = stmt.getAsObject([id]);
        stmt.free();
        return result.id ? result : null;
    });

    // UPLOAD & ADD BOOK
    ipcMain.handle('upload:book', async (event, fileBuffer, fileName, fileType) => {
        await dbReadyPromise;
        try {
            const id = uuidv4();
            const bookFolder = path.join(uploadsDir, id);
            fs.mkdirSync(bookFolder, { recursive: true });

            const filePath = path.join(bookFolder, fileName);
            fs.writeFileSync(filePath, Buffer.from(fileBuffer));

            return { success: true, id, folderPath: id, fileName };
        } catch (e) {
            console.error('Upload failed', e);
            throw e;
        }
    });

    // UPLOAD COVER
    ipcMain.handle('upload:cover', async (event, bookId, fileBuffer) => {
        await dbReadyPromise;
        try {
            const bookFolder = path.join(uploadsDir, bookId);
            if (!fs.existsSync(bookFolder)) fs.mkdirSync(bookFolder, { recursive: true });

            const coverPath = path.join(bookFolder, 'cover.jpg');
            fs.writeFileSync(coverPath, Buffer.from(fileBuffer));
            console.log(`Cover saved for book ${bookId} at ${coverPath}`);

            return { success: true };
        } catch (e) {
            console.error('Cover upload failed', e);
            throw e;
        }
    });

    // ADD BOOK ENTRY
    ipcMain.handle('books:add', async (event, bookData) => {
        await dbReadyPromise;
        const {
            id, title, author, description, category, isbn,
            folderPath, fileName, fileSize, pageCount, language, publisher, year, fileHash
        } = bookData;

        const stmt = db.prepare(`
        INSERT INTO books (id, title, author, description, category, isbn, folderPath, fileName, fileSize, pageCount, language, publisher, year, createdAt, updatedAt, fileHash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

        const now = new Date().toISOString();
        stmt.run([id, title, author, description, category, isbn, folderPath, fileName, fileSize, pageCount, language, publisher, year, now, now, fileHash]);
        stmt.free();
        forceSaveDb(); // Critical event: Force save immediately
        return { success: true, id };
    });

    // CHECK HASH
    ipcMain.handle('books:checkHash', async (event, hash) => {
        await dbReadyPromise;
        const stmt = db.prepare('SELECT * FROM books WHERE fileHash = ?');
        const result = stmt.getAsObject([hash]);
        stmt.free();
        return { exists: !!result.id, book: result.id ? result : null };
    });

    // GOOGLE BOOKS SEARCH
    ipcMain.handle('books:searchGoogle', async (event, query) => {
        try {
            console.log('Searching Google Books for:', query);
            if (typeof fetch === 'undefined') {
                console.error('FETCH IS UNDEFINED in Main Process');
                throw new Error('fetch is not defined in this Node environment');
            }
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
            console.log('Google Books response status:', res.status);
            if (!res.ok) {
                throw new Error(`Google Books API failed: ${res.status} ${res.statusText}`);
            }
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const info = data.items[0].volumeInfo;
                return {
                    found: true,
                    title: info.title,
                    author: info.authors ? info.authors.join('; ') : '',
                    description: info.description,
                    category: info.categories ? info.categories[0] : '',
                    isbn: info.industryIdentifiers ? info.industryIdentifiers.find(i => i.type === 'ISBN_13')?.identifier || info.industryIdentifiers[0]?.identifier : '',
                    publisher: info.publisher,
                    year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
                    language: info.language,
                    pageCount: info.pageCount
                };
            }
            return { found: false };
        } catch (error) {
            console.error('Google Books error:', error);
            // Return error object so frontend handles it (but if invoke throws, frontend catches)
            // If we throw here, invoke throws in frontend.
            // If we return object, frontend sees successful invoke with error property.
            return { found: false, error: error.message };
        }
    });

    // UPDATE BOOK
    ipcMain.handle('books:update', async (event, id, data) => {
        await dbReadyPromise;
        // Construct dynamic update query
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(k => `${k} = ?`).join(', ');

        const sql = `UPDATE books SET ${setClause}, updatedAt = ? WHERE id = ?`;
        values.push(new Date().toISOString());
        values.push(id);

        db.run(sql, values);
        saveDb();
        return { success: true };
    });

    // DELETE BOOK
    ipcMain.handle('books:delete', async (event, id) => {
        await dbReadyPromise;
        // Get folder path first
        const stmt = db.prepare('SELECT folderPath FROM books WHERE id = ?');
        const result = stmt.getAsObject([id]);
        stmt.free();

        if (result.folderPath) {
            const folderPath = result.folderPath;
            const fullPath = path.join(uploadsDir, folderPath);
            if (fs.existsSync(fullPath)) {
                fs.rmSync(fullPath, { recursive: true, force: true });
            }
        }

        db.run('DELETE FROM books WHERE id = ?', [id]);
        forceSaveDb(); // Critical event: Force save immediately
        return { success: true };
    });
}

module.exports = {
    initDatabase,
    handleDatabaseIpc,
    getUploadsDir: () => uploadsDir,
    forceSaveDb
};
