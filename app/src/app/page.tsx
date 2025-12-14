import db from '@/lib/db';
import UploadModal from '@/components/UploadModal';
import ClientHome from './ClientHome';

// Force dynamic rendering so we always get the latest books, and to support searchParams
export const dynamic = 'force-dynamic';

interface GetBooksParams {
    page?: number;
    limit?: number;
    query?: string;
}

async function getBooks({ page = 1, limit = 50, query = '' }: GetBooksParams) {
    try {
        const offset = (page - 1) * limit;
        let sql = 'SELECT * FROM books';
        let countSql = 'SELECT COUNT(*) as count FROM books';
        const params: any[] = [];
        const countParams: any[] = [];

        if (query) {
            const searchClause = ` WHERE title LIKE ? OR author LIKE ? OR category LIKE ? OR isbn LIKE ?`;
            sql += searchClause;
            countSql += searchClause;
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = db.prepare(sql);
        const countStmt = db.prepare(countSql);

        const books = stmt.all(...params);
        const totalResult = countStmt.get(...countParams) as { count: number };

        return {
            books,
            totalBooks: totalResult.count,
            totalPages: Math.ceil(totalResult.count / limit)
        };
    } catch (error) {
        console.error('Database error:', error);
        return { books: [], totalBooks: 0, totalPages: 0 };
    }
}

export default async function Home({ searchParams }: { searchParams: { page?: string, q?: string } }) {
    const page = parseInt(searchParams.page || '1');
    const query = searchParams.q || '';

    const { books, totalPages } = await getBooks({ page, query });

    return (
        <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Babi E-book Portal</h1>
                    <p className="text-lg text-gray-600">Portable Library Management</p>
                </div>

                <ClientHome
                    books={books}
                    totalPages={totalPages}
                    currentPage={page}
                    currentQuery={query}
                />
            </div>
        </main>
    );
}
