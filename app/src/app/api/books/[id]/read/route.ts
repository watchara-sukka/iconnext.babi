
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const id = params.id;

    try {
        const stmt = db.prepare('SELECT folderPath, fileName FROM books WHERE id = ?');
        const book = stmt.get(id) as { folderPath: string; fileName: string };

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // Construct absolute path
        // folderPath is stored relative to the workspace root (e.g. 'data/books/...' or 'uploads/...')
        // process.cwd() is '/workspaces/iconnext.babi/app'
        // So we need to go up one level to reach the root.
        const filePath = path.join(process.cwd(), '..', book.folderPath, book.fileName);

        if (!fs.existsSync(filePath)) {
            console.error('File not found at:', filePath);
            return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
        }

        const stats = fs.statSync(filePath);
        const fileBuffer = fs.readFileSync(filePath);

        // Determine Mime Type
        const ext = path.extname(book.fileName).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.pdf') contentType = 'application/pdf';
        else if (ext === '.epub') contentType = 'application/epub+zip';

        // Return file
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
                // 'Content-Disposition': `inline; filename="${book.fileName}"` // inline = open in browser
            }
        });

    } catch (error) {
        console.error('Read API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
