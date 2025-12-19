
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const hash = searchParams.get('hash');

    if (!hash) {
        return NextResponse.json({ error: 'Hash parameter is required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('SELECT id, title, author FROM books WHERE fileHash = ?');
        const book = stmt.get(hash) as any;

        if (book) {
            return NextResponse.json({
                exists: true,
                book: {
                    id: book.id,
                    title: book.title,
                    author: book.author
                }
            });
        }

        return NextResponse.json({ exists: false });

    } catch (error) {
        console.error('Check Hash error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
