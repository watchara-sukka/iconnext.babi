import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        // Cache Implementation
        const cacheKey = `google_books_${query}`;
        const cache = (global as any).googleBooksCache || new Map();
        if (!(global as any).googleBooksCache) (global as any).googleBooksCache = cache;

        if (cache.has(cacheKey)) {
            console.log(`[API] Cache hit for "${query}"`);
            return NextResponse.json(cache.get(cacheKey));
        }

        const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY || ''; // Optional: Use key if available
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1${googleApiKey ? `&key=${googleApiKey}` : ''}`;


        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Google Books API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.totalItems === 0 || !data.items || data.items.length === 0) {
            return NextResponse.json({ found: false });
        }

        const volume = data.items[0].volumeInfo;

        const result = {
            found: true,
            title: volume.title,
            author: volume.authors ? volume.authors.join('; ') : '', // Adapt to our semicolon format
            description: volume.description,
            publisher: volume.publisher,
            year: volume.publishedDate ? parseInt(volume.publishedDate.substring(0, 4)) : null,
            pageCount: volume.pageCount,
            category: volume.categories ? volume.categories.join(', ') : '',
            isbn: volume.industryIdentifiers ?
                (volume.industryIdentifiers.find((id: any) => id.type === 'ISBN_13')?.identifier ||
                    volume.industryIdentifiers.find((id: any) => id.type === 'ISBN_10')?.identifier) : '',
            language: volume.language,
            coverImage: volume.imageLinks?.thumbnail?.replace('http:', 'https:') || null
        };

        // Store in cache
        cache.set(cacheKey, result);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Google Books API Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
