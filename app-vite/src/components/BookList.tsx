import { FileText, BookOpen, Trash2, Layers } from 'lucide-react';

interface Book {
    id: string;
    title: string;
    author: string;
    description?: string;
    folderPath: string;
    fileName: string;
    path?: string; // Optional full path or url
}

interface BookListProps {
    books: Book[];
    onDelete: () => void;
}

export default function BookList({ books, onDelete }: BookListProps) {
    if (books.length === 0) {
        return (
            <div className="text-center py-16 text-slate-400">
                <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No books found</h3>
                <p>Upload your first e-book to get started.</p>
            </div>
        );
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this book?')) return;
        try {
            await window.api.deleteBook(id);
            onDelete();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleRead = (book: Book) => {
        // Construct the URL. Use local-resource protocol + absolute path if available
        // logic will be refined. For now, try to openExternal if path is provided,
        // or ask main process to open
        if (book.path) {
            // If web-friendly url
            window.open(book.path, '_blank');
        } else {
            // Fallback
            console.log('No path available for book', book);
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {books.map((book) => (
                <div key={book.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-500 transition-all duration-300 flex flex-col group">
                    <div className="h-32 bg-white/5 rounded-lg flex items-center justify-center mb-4 text-slate-500 group-hover:text-indigo-400 transition-colors">
                        <FileText className="w-12 h-12" />
                    </div>
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-100 truncate mb-1" title={book.title}>{book.title}</h3>
                        <p className="text-sm text-slate-400 truncate">{book.author}</p>
                    </div>
                    <div className="mt-auto flex gap-2">
                        <button
                            onClick={() => handleRead(book)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors font-medium text-sm"
                        >
                            <BookOpen className="w-4 h-4" /> Read
                        </button>
                        <button
                            onClick={() => handleDelete(book.id)}
                            className="flex items-center justify-center p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
