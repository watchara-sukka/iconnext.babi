import { useState } from 'react';
import { X, BookOpen, Calendar, Tag, Hash, Trash2, Edit, Search } from 'lucide-react';

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
    // const [isGeneratingHash, setIsGeneratingHash] = useState(false);

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
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือเล่มนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return;

        setIsDeleting(true);
        try {
            await window.api.deleteBook(book.id);
            onClose();
            if (onUpdate) onUpdate(book.id);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting book');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async () => {
        if (!book.id) return;

        setIsSaving(true);
        try {
            await window.api.updateBook(book.id, formData);

            // Refresh book data locally
            const updatedBook = {
                ...formData,
                year: formData.year ? Number(formData.year) : undefined
            };
            setBook(prev => ({ ...prev, ...updatedBook }));
            setIsEditing(false);
            if (onUpdate) onUpdate();
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
        if (!query || query.trim() === '') {
            alert('กรุณาระบุชื่อเรื่องหรือ ISBN เพื่อค้นหา');
            return;
        }

        setIsSearchingGoogle(true);
        setGoogleData(null);
        try {
            const data = await window.api.searchGoogle(query);

            if (data.found) {
                setGoogleData(data);
            } else {
                alert('ไม่พบข้อมูลใน Google Books');
            }
        } catch (error) {
            console.error('Google Books search error:', error);
            alert(`เกิดข้อผิดพลาดในการค้นหา Google Books: ${error instanceof Error ? error.message : String(error)}`);
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
            year: googleData.year ? String(googleData.year) : prev.year,
            language: googleData.language || prev.language,
        }));
        setGoogleData(null);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row overflow-hidden relative animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Left Side: Cover Image */}
                <div className="w-full md:w-1/3 bg-slate-800/50 flex flex-col items-center justify-center p-6 md:p-10 relative border-r border-slate-800">
                    <div className="aspect-[2/3] w-full max-w-[220px] shadow-2xl rounded-xl overflow-hidden relative group ring-1 ring-white/10">
                        <img
                            src={`local-resource://${book.folderPath}/cover.jpg`}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('bg-slate-700', 'flex', 'items-center', 'justify-center');
                                e.currentTarget.parentElement!.innerHTML = '<div class="text-7xl">📚</div>';
                            }}
                            alt={book.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                    {/* Hash - Compact */}
                    <div className="mt-8 w-full px-4 text-center">
                        {book.fileHash && (
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Fingerprint</div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700 break-all">
                            {book.fileHash || 'No Hash Data'}
                        </div>
                    </div>
                </div>

                {/* Right Side */}
                <div className="w-full md:w-2/3 p-6 md:p-10 flex flex-col relative bg-slate-900">
                    <div className="absolute top-6 right-16 flex gap-2">
                        {!isEditing && (
                            <>
                                <button onClick={() => setIsEditing(true)} className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-all border border-transparent hover:border-indigo-500/20">
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button onClick={handleDelete} disabled={isDeleting} className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all border border-transparent hover:border-red-500/20">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                                <h3 className="text-xl font-bold text-white">แก้ไขรายละเอียด</h3>
                                <button onClick={handleAskGoogle} disabled={isSearchingGoogle} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-colors text-xs font-semibold border border-indigo-500/20">
                                    {isSearchingGoogle ? <span className="animate-spin text-sm">⌛</span> : <Search className="w-3.5 h-3.5" />} ถาม Google
                                </button>
                            </div>

                            {googleData && (
                                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl animate-in fade-in duration-300">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-indigo-300 flex items-center gap-2 text-sm">✨ ข้อเสนอแนะจาก Google</h4>
                                        <button onClick={handleUseGoogleData} className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20 uppercase tracking-wider">ใช้ข้อมูลนี้</button>
                                    </div>
                                    <div className="text-xs text-slate-400 grid grid-cols-1 gap-1">
                                        {googleData.title && <p><span className="text-indigo-400 font-medium">ชื่อเรื่อง:</span> {googleData.title}</p>}
                                        {googleData.author && <p><span className="text-indigo-400 font-medium">ผู้แต่ง:</span> {googleData.author}</p>}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-5">
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ชื่อเรื่อง</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" /></div>
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ผู้แต่ง</label><input type="text" name="author" value={formData.author} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">หมวดหมู่</label><input type="text" name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" /></div>
                                <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ISBN</label><input type="text" name="isbn" value={formData.isbn} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" /></div>
                            </div>

                            <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">รายละเอียด</label><textarea name="description" rows={4} value={formData.description} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium resize-none text-sm leading-relaxed" /></div>

                            <div className="flex gap-4 pt-4">
                                <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">{isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</button>
                                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3.5 rounded-2xl font-bold transition-all border border-slate-700 flex items-center justify-center gap-2">ยกเลิก</button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500 flex flex-col h-full">
                            <div className="mb-8 pr-16 mt-4">
                                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight leading-tight">{book.title}</h2>
                                <p className="text-lg md:text-xl text-indigo-400 font-semibold tracking-wide">{book.author || 'ไม่ทราบชื่อผู้แต่ง'}</p>
                            </div>

                            <div className="flex flex-wrap gap-2.5 mb-8">
                                {book.category && <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl transition-colors hover:bg-slate-700"><Tag className="w-3.5 h-3.5 text-indigo-400" />{book.category}</div>}
                                {book.year && <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl transition-colors hover:bg-slate-700"><Calendar className="w-3.5 h-3.5 text-indigo-400" />{book.year}</div>}
                                {book.isbn && <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl transition-colors hover:bg-slate-700"><Hash className="w-3.5 h-3.5 text-indigo-400" />{book.isbn}</div>}
                                {book.pageCount ? <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl"><BookOpen className="w-3.5 h-3.5 text-indigo-400" />{book.pageCount} หน้า</div> : null}
                            </div>

                            <div className="mb-10 flex-grow scrollbar-hide overflow-y-auto pr-2">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3">รายละเอียด</h3>
                                <p className="text-slate-300 text-base leading-[1.8] font-medium whitespace-pre-line">
                                    {book.description || 'ไม่มีข้อมูลรายละเอียด'}
                                </p>
                            </div>

                            <div className="mt-auto">
                                <button
                                    onClick={() => window.api.openExternal(`local-resource://${book.folderPath}/${book.fileName}`)}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-indigo-500/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-3"
                                >
                                    <BookOpen className="w-6 h-6" />
                                    <span className="text-lg">อ่านหนังสือ</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
