import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const logPath = '/workspaces/iconnext.babi/app/debug_upload.log';
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Handler Started\n`);
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const author = (formData.get('author') as string) || '';

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Validate File Type
        const allowedExtensions = ['.pdf', '.epub'];
        const allowedMimeTypes = ['application/pdf', 'application/epub+zip'];
        const fileExt = path.extname(file.name).toLowerCase();

        if (!allowedExtensions.includes(fileExt) || !allowedMimeTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and EPUB are allowed.' }, { status: 400 });
        }

        // Create book ID
        const bookId = uuidv4();
        // Sanitize title
        const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
        const folderName = `${safeTitle}_${bookId.substring(0, 8)}`;


        const buffer = Buffer.from(await file.arrayBuffer());

        // Calculate SHA-256 Hash
        const crypto = require('crypto');
        const hashSum = crypto.createHash('sha256');
        hashSum.update(buffer);
        const fileHash = hashSum.digest('hex');

        const fileHash = hashSum.digest('hex');

        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Hash Calculated: ${fileHash}\n`);

        // Check for duplicate file
        const existingBook = db.prepare('SELECT id, title FROM books WHERE fileHash = ?').get(fileHash) as { id: string, title: string };

        if (existingBook) {
            return NextResponse.json({
                error: `Duplicate file detected. This file already exists as "${existingBook.title}" (ID: ${existingBook.id})`
            }, { status: 409 });
        }

        const uploadDir = path.join(process.cwd(), '..', 'data', 'books', folderName);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const safeFileName = `${bookId}${fileExt}`;
        const filePath = path.join(uploadDir, safeFileName);

        fs.writeFileSync(filePath, buffer);

        const relativeFolderPath = path.join('data', 'books', folderName);

        // Prepare statements
        const insertBook = db.prepare(`
            INSERT INTO books (id, title, author, folderPath, fileName, fileHash)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const insertAuthor = db.prepare('INSERT OR IGNORE INTO authors (name) VALUES (?)');
        const getAuthor = db.prepare('SELECT id FROM authors WHERE name = ?');
        const linkBookAuthor = db.prepare('INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)');

        const transaction = db.transaction(() => {
            fs.appendFileSync(logPath, `[${new Date().toISOString()}] Inserting: ${bookId}, ${title}, ${fileHash}\n`);
            insertBook.run(bookId, title, author || 'Unknown', relativeFolderPath, safeFileName, fileHash);

            if (author) {
                const authorNames = author.split(';').map(n => n.trim()).filter(n => n.length > 0);
                for (const name of authorNames) {
                    insertAuthor.run(name);
                    const authorRecord = getAuthor.get(name) as { id: number };
                    if (authorRecord) {
                        linkBookAuthor.run(bookId, authorRecord.id);
                    }
                }
            }
        });

        transaction();

        return NextResponse.json({
            success: true,
            book: {
                id: bookId,
                title,
                folderPath: relativeFolderPath,
                fileName: safeFileName
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
