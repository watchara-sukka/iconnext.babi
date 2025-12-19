
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const id = params.id;

    try {
        // 1. Get book details
        const stmt = db.prepare('SELECT * FROM books WHERE id = ?');
        const book = stmt.get(id) as any;

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // 2. Find file
        const bookDir = path.join(process.cwd(), '..', book.folderPath);
        const filePath = path.join(bookDir, book.fileName);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Book file not found on server' }, { status: 404 });
        }

        // 3. Calculate Hash
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const fileHash = hashSum.digest('hex');

        // 4. Update DB
        const updateStmt = db.prepare('UPDATE books SET fileHash = ? WHERE id = ?');
        updateStmt.run(fileHash, id);

        return NextResponse.json({ success: true, fileHash });

    } catch (error) {
        console.error('Hash generation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
