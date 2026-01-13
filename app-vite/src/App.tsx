import { useState, useEffect, lazy, Suspense } from 'react';
import { LayoutGrid, List, Search, Layers, Bell, Settings, Plus } from 'lucide-react';
// import BookList from './components/BookList';
const UploadModal = lazy(() => import('./components/UploadModal'));
const BookDetailModal = lazy(() => import('./components/BookDetailModal'));
import { UpdateNotification } from './components/UpdateNotification';

// Type definition for Book is duplicated/shared
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
  updatedAt: string;
  fileHash?: string;
  year?: number;
  publisher?: string;
  fileSize?: number;
  pageCount?: number;
  language?: string;
  [key: string]: any;
}

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const itemsPerPage = 50;

  const fetchBooks = async () => {
    setLoading(true);
    try {
      // 1. Get filtered total count
      const count = await window.api.getBooksCount(searchTerm);
      setTotalBooks(count);

      // 2. Get paginated books
      const data = await window.api.getBooks({
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm
      });
      setBooks(data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [currentPage, searchTerm]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(totalBooks / itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <span className="text-2xl">📚</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Babi Portal
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all relative group">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900 group-hover:border-slate-800"></span>
              </button>
              <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl leading-5 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                placeholder="ค้นหาด้วยชื่อเรื่อง, ผู้แต่ง, หรือ ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  title="มุมมองตาราง"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                  title="มุมมองรายการ"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm">เพิ่มหนังสือ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
            <p>กำลังโหลดชั้นหนังสือ...</p>
          </div>
        ) : (
          <>
            {/* Books Display */}
            {books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-800/50 rounded-3xl border border-slate-800">
                <Layers className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-medium text-slate-300 mb-1">ไม่พบหนังสือ</h3>
                <p className="text-slate-500">
                  {searchTerm ? 'ลองเปลี่ยนคำค้นหาดูนะครับ' : 'คลิก "เพิ่มหนังสือ" เพื่อเริ่มใช้งาน!'}
                </p>
              </div>
            ) : (
              // Render Grid or List
              viewMode === 'list' ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <ul className="divide-y divide-slate-700">
                    {books.map(book => (
                      <li
                        key={book.id}
                        className="p-4 hover:bg-slate-700/50 transition-colors cursor-pointer flex items-center gap-4 group"
                        onClick={() => setSelectedBook(book)}
                      >
                        <div className="w-12 h-16 bg-slate-900 rounded overflow-hidden shadow-sm flex-shrink-0">
                          <img
                            src={`local-resource://${book.folderPath}/cover.jpg`}
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center'); e.currentTarget.parentElement!.innerHTML = '📚'; }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-200 truncate group-hover:text-indigo-400 transition-colors">{book.title}</h4>
                            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded">{book.year || 'N/A'}</span>
                          </div>
                          <p className="text-sm text-slate-400 truncate">{book.author}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {books.map(book => (
                    <div
                      key={book.id}
                      className="group cursor-pointer flex flex-col gap-3"
                      onClick={() => setSelectedBook(book)}
                    >
                      <div className="aspect-[2/3] w-full bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/20 group-hover:-translate-y-1 transition-all relative">
                        <img
                          src={`local-resource://${book.folderPath}/cover.jpg`}
                          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center'); e.currentTarget.parentElement!.innerHTML = '<span class="text-4xl">📚</span>'; }}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                          <span className="text-xs font-semibold text-white bg-indigo-600 px-2 py-1 rounded-md shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">ดูรายละเอียด</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-200 truncate leading-tight group-hover:text-indigo-400 transition-colors" title={book.title}>{book.title}</h3>
                        <p className="text-sm text-slate-500 truncate">{book.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-8">
                <p className="text-sm text-slate-500">
                  แสดงรายการที่ <span className="text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="text-slate-300">{Math.min(currentPage * itemsPerPage, totalBooks)}</span> จากทั้งหมด <span className="text-slate-300">{totalBooks}</span> รายการ
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ก่อนหน้า
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // Logic to show only some page numbers if there are too many
                      if (totalPages > 7) {
                        if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - currentPage) > 1) {
                          if (pageNum === 2 || pageNum === totalPages - 1) return <span key={pageNum} className="text-slate-600 px-1">...</span>;
                          return null;
                        }
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <Suspense fallback={null}>
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onUploadSuccess={() => {
              setShowUploadModal(false);
              fetchBooks();
            }}
          />
        )}

        {selectedBook && (
          <BookDetailModal
            book={selectedBook}
            onClose={() => setSelectedBook(null)}
            onUpdate={() => {
              // Refresh to get latest data (e.g. if edited) or remove if deleted (logic inside modal usually handling this? No, we refresh list)
              fetchBooks();
              // If deleted, modal closes itself inside handle delete? No, passed onClose.
              // Actually BookDetailModal calls onClose then onUpdate.
            }}
          />
        )}
      </Suspense>

      {/* Logic-based UI Elements */}
      <UpdateNotification />
    </div>
  );
}

export default App;
