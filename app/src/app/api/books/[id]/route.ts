import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const id = params.id;

    try {
        // 1. Get book details to find file path
        const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
        const book = stmt.get(id) as any;

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // 2. Delete files
        // The folder path in DB is relative like 'uploads/UUID'
        // We need absolute path
        const uploadsDir = path.join(process.cwd(), '..', 'uploads');
        const bookDir = path.join(uploadsDir, id);

        if (fs.existsSync(bookDir)) {
            fs.rmSync(bookDir, { recursive: true, force: true });
        }

        // 3. Delete from DB
        const deleteStmt = db.prepare('DELETE FROM books WHERE id = ?');
        deleteStmt.run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const id = params.id;

    try {
        const body = await request.json();
        console.log(`[API] PUT book ${id}`, body);
        const { title, author, description, category, isbn, publisher, year, language } = body;

        const stmt = db.prepare(`
            UPDATE books 
            SET title = ?, author = ?, description = ?, category = ?, isbn = ?, publisher = ?, year = ?, language = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        const transaction = db.transaction(() => {
            stmt.run(title, author, description, category, isbn, publisher, year, language, id);

            if (author) {
                // Update authors relation
                db.prepare('DELETE FROM book_authors WHERE book_id = ?').run(id);

                const authorStr = (author as string) || '';
                const authorNames = authorStr.split(';').map(n => n.trim()).filter(n => n.length > 0);
                const insertAuthor = db.prepare('INSERT OR IGNORE INTO authors (name) VALUES (?)');
                const getAuthor = db.prepare('SELECT id FROM authors WHERE name = ?');
                const linkBookAuthor = db.prepare('INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)');

                for (const name of authorNames) {
                    insertAuthor.run(name);
                    const authorRecord = getAuthor.get(name) as { id: number };
                    if (authorRecord) {
                        linkBookAuthor.run(id, authorRecord.id);
                    }
                }
            }
        });

        transaction();
        console.log(`[API] Updated book ${id}`);

        // Fetch updated book
        const updatedBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id);

        return NextResponse.json({ success: true, book: updatedBook });

    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
