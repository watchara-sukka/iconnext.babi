import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

export async function GET() {
    try {
        const stmt = db.prepare('SELECT * FROM books ORDER BY createdAt DESC');
        const books = stmt.all();
        return NextResponse.json({ books });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const cover = formData.get('cover') as File;
        const title = formData.get('title') as string;
        const author = (formData.get('author') as string) || '';
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const isbn = formData.get('isbn') as string;
        const publisher = formData.get('publisher') as string;
        const year = parseInt(formData.get('year') as string) || null;
        const pageCount = parseInt(formData.get('pageCount') as string) || null;
        const language = formData.get('language') as string;
        const fileSize = file.size; // Get file size from the file object

        // Validate File Type
        const allowedExtensions = ['.pdf', '.epub'];
        const allowedMimeTypes = ['application/pdf', 'application/epub+zip'];
        const fileExt = path.extname(file.name).toLowerCase();

        if (!allowedExtensions.includes(fileExt) || !allowedMimeTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and EPUB are allowed.' }, { status: 400 });
        }

        const uploadsDir = path.join(process.cwd(), '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Create book directory
        const bookId = randomUUID();
        const bookDir = path.join(uploadsDir, bookId);
        if (!fs.existsSync(bookDir)) {
            fs.mkdirSync(bookDir, { recursive: true });
        }

        // Save book file with sanitized name (UUID + ext)
        // Save book file with sanitized name (UUID + ext)
        const safeFileName = `${bookId}${fileExt}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        // Calculate Hash
        const hashSum = crypto.createHash('sha256');
        hashSum.update(buffer);
        const fileHash = hashSum.digest('hex');

        // Check for duplicate file
        const existingBook = db.prepare('SELECT id, title FROM books WHERE fileHash = ?').get(fileHash) as { id: string, title: string };
        if (existingBook) {
            return NextResponse.json({
                error: `Duplicate file detected. This file already exists as "${existingBook.title}"`
            }, { status: 409 });
        }

        const filePath = path.join(bookDir, safeFileName);
        await fs.promises.writeFile(filePath, buffer);

        // Save cover image if exists
        let coverImageName: string | null = null;
        if (cover) {
            const allowedCoverExtensions = ['.jpg', '.jpeg', '.png'];
            const allowedCoverMimeTypes = ['image/jpeg', 'image/png'];
            const coverExt = path.extname(cover.name).toLowerCase();

            if (allowedCoverExtensions.includes(coverExt) && allowedCoverMimeTypes.includes(cover.type)) {
                coverImageName = `cover${coverExt}`;
                const coverBuffer = Buffer.from(await cover.arrayBuffer());
                await fs.promises.writeFile(path.join(bookDir, coverImageName), coverBuffer);
            }
        }

        // Save to Database
        const stmt = db.prepare(`
            INSERT INTO books (id, title, author, description, category, isbn, folderPath, fileName, coverImage, fileSize, pageCount, publisher, year, language, createdAt, fileHash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        `);

        const insertAuthor = db.prepare('INSERT OR IGNORE INTO authors (name) VALUES (?)');
        const getAuthor = db.prepare('SELECT id FROM authors WHERE name = ?');
        const linkBookAuthor = db.prepare('INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)');

        const transaction = db.transaction(() => {
            stmt.run(bookId, title, author, description, category, isbn, `uploads/${bookId}`, safeFileName, coverImageName, fileSize, pageCount, publisher, year, language, fileHash);

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

        return NextResponse.json({ success: true, id: bookId });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
