import React, { useState } from 'react';
import { X, BookOpen, Calendar, Tag, Hash, Trash2, Edit, Save, Check } from 'lucide-react';

interface Book {
    id: string;
    title: string;
    author: string;
    description: string;
    category: string;
    isbn: string;
    folderPath: string;
    fileName: string;
    coverImage: string;
    createdAt: string;
    fileSize?: number;
    pageCount?: number;
    publisher?: string;
    year?: number;
    language?: string;
    updatedAt?: string;
    fileHash?: string;
}

interface BookDetailModalProps {
    book: Book;
    onClose: () => void;
    onUpdate?: (deletedId?: string) => void;
}

export default function BookDetailModal({ book: initialBook, onClose, onUpdate }: BookDetailModalProps) {
    const [book, setBook] = useState(initialBook);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingHash, setIsGeneratingHash] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
        category: book.category || '',
        isbn: book.isbn || '',
        publisher: book.publisher || '',
        year: book.year || '',
        language: book.language || ''
    });

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/books/${book.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                onClose();
                if (onUpdate) onUpdate(book.id);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete book');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting book');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async () => {
        if (!book.id) {
            console.error('Book ID is missing');
            alert('Error: Book ID is missing');
            return;
        }

        setIsSaving(true);
        try {
            console.log('Sending PUT request for book:', book.id);
            console.log('Data:', formData);
            const res = await fetch(`/api/books/${book.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            console.log('Response status:', res.status);

            if (res.ok) {
                const data = await res.json();
                console.log('Response data:', data);
                setBook(data.book);
                setIsEditing(false);
                if (onUpdate) onUpdate();
            } else {
                console.error('Response not ok:', await res.text());
                alert('Failed to update book');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('Error updating book');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Google Books Logic
    const [googleData, setGoogleData] = useState<Partial<Book> | null>(null);
    const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);

    const handleAskGoogle = async () => {
        const query = formData.isbn || formData.title;
        if (!query) {
            alert('Please enter a Title or ISBN to search.');
            return;
        }

        setIsSearchingGoogle(true);
        setGoogleData(null);
        try {
            const res = await fetch(`/api/external/google-books?query=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (data.found) {
                setGoogleData(data);
            } else {
                alert('No results found on Google Books.');
            }
        } catch (error) {
            console.error('Google Books search error:', error);
            alert('Error searching Google Books.');
        } finally {
            setIsSearchingGoogle(false);
        }
    };

    const handleUseGoogleData = () => {
        if (!googleData) return;
        setFormData(prev => ({
            ...prev,
            title: googleData.title || prev.title,
            author: googleData.author || prev.author,
            description: googleData.description || prev.description,
            category: googleData.category || prev.category,
            isbn: googleData.isbn || prev.isbn,
            publisher: googleData.publisher || prev.publisher,
            year: googleData.year || prev.year,
            language: googleData.language || prev.language,
        }));
        setGoogleData(null);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Left Side: Cover Image */}
                <div className="w-full md:w-1/3 bg-gray-100 flex flex-col items-center justify-center p-6 md:p-8 relative">
                    <div className="aspect-[2/3] w-full max-w-[240px] shadow-xl rounded-lg overflow-hidden relative group">
                        {book.coverImage ? (
                            <img
                                src={`/api/books/${book.id}/cover?t=${Date.now()}`} // Cache bust
                                alt={book.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-6xl">
                                📚
                            </div>
                        )}
                    </div>

                    {/* File Hash Section */}
                    <div className="mt-4 w-full px-4">
                        {book.fileHash ? (
                            <div className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-200 break-all text-center">
                                <p className="font-semibold mb-1">File Hash (SHA-256)</p>
                                {book.fileHash}
                            </div>
                        ) : (
                            <button
                                onClick={async () => {
                                    if (isGeneratingHash) return;
                                    setIsGeneratingHash(true);
                                    try {
                                        const res = await fetch(`/api/books/${book.id}/hash`, { method: 'POST' });
                                        const data = await res.json();
                                        if (res.ok) {
                                            setBook(prev => ({ ...prev, fileHash: data.fileHash }));
                                            if (onUpdate) onUpdate(); // Refresh parent to save state if needed
                                        } else {
                                            alert(data.error || 'Failed to generate hash');
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Error generating hash');
                                    } finally {
                                        setIsGeneratingHash(false);
                                    }
                                }}
                                disabled={isGeneratingHash}
                                className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded shadow transition-colors flex items-center justify-center gap-2"
                            >
                                {isGeneratingHash ? <span className="animate-spin">⌛</span> : <Hash className="w-3 h-3" />}
                                Generate Hash
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Side: Details */}
                <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col relative">
                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        {!isEditing && (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                                    title="Edit Book"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                    title="Delete Book"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all ml-2 border-l border-gray-200 pl-4"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4 mt-8 pr-2 overflow-y-auto max-h-[60vh]">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800">Edit Details</h3>
                                <button
                                    onClick={handleAskGoogle}
                                    disabled={isSearchingGoogle}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
                                >
                                    {isSearchingGoogle ? (
                                        <span className="animate-spin">⌛</span>
                                    ) : (
                                        <span>🔍</span>
                                    )}
                                    Ask Google
                                </button>
                            </div>

                            {googleData && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                                            <span>✨</span> Google Suggestion
                                        </h4>
                                        <button
                                            onClick={handleUseGoogleData}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                                        >
                                            Use Data
                                        </button>
                                    </div>
                                    <div className="text-sm text-blue-800 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                        {googleData.title && <p><span className="font-semibold">Title:</span> {googleData.title}</p>}
                                        {googleData.author && <p><span className="font-semibold">Author:</span> {googleData.author}</p>}
                                        {googleData.year && <p><span className="font-semibold">Year:</span> {googleData.year}</p>}
                                        {googleData.publisher && <p><span className="font-semibold">Pub:</span> {googleData.publisher}</p>}
                                        {googleData.category && <p><span className="font-semibold">Cat:</span> {googleData.category}</p>}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Author(s)</label>
                                <input
                                    type="text"
                                    name="author"
                                    value={formData.author}
                                    onChange={handleChange}
                                    placeholder="e.g. John Doe; Jane Smith (MIT)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">ISBN</label>
                                    <input
                                        type="text"
                                        name="isbn"
                                        value={formData.isbn}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Publisher</label>
                                    <input
                                        type="text"
                                        name="publisher"
                                        value={formData.publisher}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Year</label>
                                    <input
                                        type="number"
                                        name="year"
                                        value={formData.year}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Language</label>
                                <input
                                    type="text"
                                    name="language"
                                    value={formData.language}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                                <textarea
                                    name="description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-gray-900"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6 pr-16 mt-6">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h2>
                                <p className="text-xl text-indigo-600 font-medium">{book.author || 'Unknown Author'}</p>
                            </div>

                            <div className="flex flex-wrap gap-4 mb-8">
                                {book.category && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                        <Tag className="w-4 h-4" />
                                        {book.category}
                                    </div>
                                )}
                                {book.isbn && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                        <Hash className="w-4 h-4" />
                                        {book.isbn}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                    <Calendar className="w-4 h-4" />
                                    {book.year ? book.year : new Date(book.createdAt).getFullYear()}
                                </div>
                                {book.publisher && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                        <span className="font-semibold">Pub:</span> {book.publisher}
                                    </div>
                                )}
                                {book.pageCount && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                        <span className="font-semibold">Pages:</span> {book.pageCount}
                                    </div>
                                )}
                                {book.fileSize && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                        <span className="font-semibold">Size:</span> {(book.fileSize / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                                    <span className="font-semibold">Lang:</span> {book.language}
                                </div>

                                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                    <span className="font-medium">Added:</span> {new Date(book.createdAt).toLocaleDateString()}
                                </div>
                                {book.updatedAt && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                        <span className="font-medium">Updated:</span> {new Date(book.updatedAt).toLocaleDateString()} {new Date(book.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            <div className="prose prose-indigo max-w-none mb-8 flex-grow overflow-y-auto">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                    {book.description || 'No description available.'}
                                </p>
                            </div>

                            <div className="mt-auto pt-6 border-t border-gray-100">
                                <div className="flex gap-4">
                                    <button
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                        onClick={() => window.open(`/api/books/${book.id}/read`, '_blank')}
                                    >
                                        <BookOpen className="w-5 h-5" />
                                        Read
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-6 py-3 rounded-xl font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit className="w-5 h-5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="px-6 py-3 rounded-xl font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        Delete
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-4 text-center">
                                    File: {book.fileName}
                                </p>
                            </div>
                        </>
                    )}

                    {isEditing && (
                        <div className="flex gap-4 pt-4 border-t border-gray-100 mt-auto">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                            >
                                <X className="w-5 h-5" />
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
