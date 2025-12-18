'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
const UploadModal = dynamic(() => import('@/components/UploadModal'), { ssr: false });
import BookDetailModal from '@/components/BookDetailModal';
import { UploadCloud, LayoutGrid, List, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ClientHomeProps {
    books: any[];
    totalPages: number;
    currentPage: number;
    currentQuery: string;
}

export default function ClientHome({ books, totalPages, currentPage, currentQuery }: ClientHomeProps) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedBook, setSelectedBook] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState(currentQuery);
    const [deletedBookIds, setDeletedBookIds] = useState<Set<string>>(new Set());
    const router = useRouter();

    // Update local search state if URL query changes (e.g. back button)
    useEffect(() => {
        setSearchQuery(currentQuery);
        setDeletedBookIds(new Set()); // Reset deleted list when navigating/searching
    }, [currentQuery, currentPage, books]); // Reset when data likely changed

    // Filter out deleted books
    const visibleBooks = books.filter(b => !deletedBookIds.has(b.id));

    // Handle Search
    const handleSearch = (term: string) => {
        setSearchQuery(term);
        // Basic debounce could be added here, currently searching on Enter or Button
    };

    const executeSearch = () => {
        if (searchQuery === currentQuery) return;
        router.push(`/?q=${encodeURIComponent(searchQuery)}&page=1`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            executeSearch();
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage === currentPage || newPage < 1 || newPage > totalPages) return;
        const queryPart = currentQuery ? `&q=${encodeURIComponent(currentQuery)}` : '';
        router.push(`/?page=${newPage}${queryPart}`);
    };

    return (
        <>
            <div className="flex justify-center mb-8">
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg transition-all"
                >
                    <UploadCloud className="w-5 h-5" />
                    Upload New Book
                </button>
            </div>

            {showUploadModal && (
                <UploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUploadSuccess={() => {
                        setShowUploadModal(false);
                        router.refresh();
                    }}
                />
            )}

            {selectedBook && (
                <BookDetailModal
                    book={selectedBook}
                    onClose={() => setSelectedBook(null)}
                    onUpdate={(deletedId) => {
                        if (deletedId) {
                            // Optimistic update: Hide it immediately
                            setDeletedBookIds(prev => new Set(prev).add(deletedId));
                            setSelectedBook(null); // Close modal
                        }
                        router.refresh(); // Fetch real data in background
                    }}
                />
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-md flex flex-col min-h-[600px]">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Library Collection
                    </h3>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-grow sm:flex-grow-0">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                placeholder="Search books..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={executeSearch}
                            />
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg flex-shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title="List View"
                            >
                                <List className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-grow">
                    {viewMode === 'list' ? (
                        <ul role="list" className="divide-y divide-gray-200">
                            {visibleBooks.length === 0 ? (
                                <li className="px-4 py-8 text-center text-gray-500">
                                    {currentQuery ? 'No books match your search.' : 'No books in the library yet. Import one above!'}
                                </li>
                            ) : (
                                visibleBooks.map((book: any) => (
                                    <li
                                        key={book.id}
                                        className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedBook(book)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex-shrink-0 h-24 w-16 bg-gray-200 rounded overflow-hidden shadow-sm relative">
                                                {book.coverImage ? (
                                                    <img
                                                        src={`/api/books/${book.id}/cover`}
                                                        alt={book.title}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                            const icon = document.createElement('span');
                                                            icon.innerHTML = '📚';
                                                            icon.className = 'text-2xl';
                                                            e.currentTarget.parentElement?.appendChild(icon);
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-2xl">
                                                        📚
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-lg font-bold text-indigo-600 truncate">{book.title}</h4>
                                                <p className="text-sm text-gray-500">
                                                    by <span className="font-medium text-gray-900">{book.author || 'Unknown'}</span>
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {book.category && <span className="mr-2 px-2 py-0.5 rounded bg-gray-100">{book.category}</span>}
                                                    ISBN: {book.isbn || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="ml-4 flex-shrink-0">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Available
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    ) : (
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                            {visibleBooks.length === 0 ? (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    {currentQuery ? 'No books match your search.' : 'No books in the library yet. Import one above!'}
                                </div>
                            ) : (
                                visibleBooks.map((book: any) => (
                                    <div
                                        key={book.id}
                                        className="group relative flex flex-col cursor-pointer"
                                        onClick={() => setSelectedBook(book)}
                                    >
                                        <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 shadow-md group-hover:shadow-xl transition-all relative">
                                            {book.coverImage ? (
                                                <img
                                                    src={`/api/books/${book.id}/cover`}
                                                    alt={book.title}
                                                    className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                        const icon = document.createElement('span');
                                                        icon.innerHTML = '📚';
                                                        icon.className = 'text-4xl';
                                                        e.currentTarget.parentElement?.appendChild(icon);
                                                    }}
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-4xl">
                                                    📚
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>
                                        <div className="mt-3 flex flex-col">
                                            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight" title={book.title}>
                                                {book.title}
                                            </h3>
                                            <p className="mt-1 text-xs text-gray-500">{book.author || 'Unknown'}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    {/* Simple Page Indicator */}
                                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                        {currentPage}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
