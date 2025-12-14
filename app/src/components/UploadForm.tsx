'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadForm() {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [isbn, setIsbn] = useState('');
    const [uploading, setUploading] = useState(false);
    const [searching, setSearching] = useState(false);
    const router = useRouter();

    const searchGoogleBooks = async () => {
        if (!isbn && !title) {
            alert('Please enter an ISBN or Title to search.');
            return;
        }

        setSearching(true);
        try {
            let query = '';
            if (isbn) {
                query = `isbn:${isbn}`;
            } else {
                query = `intitle:${title}`;
            }

            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.totalItems > 0 && data.items && data.items.length > 0) {
                const bookInfo = data.items[0].volumeInfo;
                if (bookInfo.title) setTitle(bookInfo.title);
                if (bookInfo.authors && bookInfo.authors.length > 0) {
                    setAuthor(bookInfo.authors.join(', '));
                }
            } else {
                alert('No book found with that information.');
            }
        } catch (error) {
            console.error('Error searching Google Books:', error);
            alert('Failed to search Google Books.');
        } finally {
            setSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('author', author);

        try {
            const res = await fetch('/api/books/import', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setTitle('');
                setAuthor('');
                setIsbn('');
                setFile(null);
                router.refresh(); // Refresh server components
            } else {
                alert('Upload failed');
            }
        } catch (error) {
            console.error(error);
            alert('Error uploading file');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-bold mb-4">Import New Book</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto-fill details</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter ISBN (e.g. 9780140328721)"
                        value={isbn}
                        onChange={(e) => setIsbn(e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                    <button
                        type="button"
                        onClick={searchGoogleBooks}
                        disabled={searching}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        {searching ? 'Searching...' : 'Ask Google'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter ISBN for best results, or leave empty to search by Title below.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Author</label>
                    <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">E-book File</label>
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        required
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>
                <button
                    type="submit"
                    disabled={uploading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {uploading ? 'Uploading...' : 'Import Book'}
                </button>
            </form>
        </div>
    );
}
