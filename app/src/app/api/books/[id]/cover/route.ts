import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const stmt = db.prepare('SELECT folderPath, coverImage FROM books WHERE id = ?');
        const book = stmt.get(id) as { folderPath: string; coverImage: string } | undefined;

        if (!book || !book.coverImage) {
            return new NextResponse('Cover not found', { status: 404 });
        }

        // Construct absolute path to the cover image
        // folderPath is relative to project root (e.g., "uploads/uuid")
        // We need to resolve it relative to the app directory or where uploads are actually stored
        // Based on previous files, uploads are in `../uploads` relative to `app` (cwd)

        // In route.ts (POST), it used: path.join(process.cwd(), '..', 'uploads')
        // And stored folderPath as: `uploads/${bookId}`

        // So we need to be careful with path resolution.
        // If folderPath in DB is "uploads/UUID", and we are in "app",
        // we want "../uploads/UUID/cover.jpg"

        const uploadsRoot = path.join(process.cwd(), '..');
        // If folderPath is "uploads/..." we can just join it
        const fullPath = path.join(uploadsRoot, book.folderPath, book.coverImage);

        if (!fs.existsSync(fullPath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const fileBuffer = fs.readFileSync(fullPath);

        // Determine content type (assume jpeg for now as per UploadModal, but could be others)
        const ext = path.extname(fullPath).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.gif') contentType = 'image/gif';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error('Error serving cover:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
