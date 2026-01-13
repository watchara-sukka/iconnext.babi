import { useState } from 'react';
import { X, UploadCloud, FileUp, Search } from 'lucide-react';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Define worker globally
// @ts-ignore
// Define worker globally - Use relative path for compatibility with file:// protocol in production
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.min.js';

interface UploadModalProps {
    onClose: () => void;
    onUploadSuccess: () => void;
}

export default function UploadModal({ onClose, onUploadSuccess }: UploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [isbn, setIsbn] = useState('');
    const [publisher, setPublisher] = useState('');
    const [year, setYear] = useState('');
    const [language, setLanguage] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    // pdfjsLib is now imported statically
    const [fileHash, setFileHash] = useState<string>('');

    // Google Books Logic
    const [googleData, setGoogleData] = useState<any>(null);
    const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<{ title: string } | null>(null);

    const handleAskGoogle = async (e: React.MouseEvent) => {
        e.preventDefault();
        const query = isbn || title;
        if (!query) {
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
        if (googleData.title) setTitle(googleData.title);
        if (googleData.author) setAuthor(googleData.author);
        if (googleData.isbn) setIsbn(googleData.isbn);
        if (googleData.publisher) setPublisher(googleData.publisher);
        if (googleData.year) setYear(googleData.year);
        if (googleData.language) setLanguage(googleData.language);
        if (googleData.category) setCategory(googleData.category);
        if (googleData.description) setDescription(googleData.description);
        setGoogleData(null);
    };

    // PDF initialization moved to top-level import

    const processPDF = async (file: File) => {
        // if (!pdfjsLib) return; // Static import is always available
        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

            // Set Page Count
            setPageCount(pdf.numPages);

            // Extract Metadata
            const metadata = await pdf.getMetadata();
            if (metadata.info) {
                // @ts-ignore
                if (metadata.info.Title && !title) setTitle(metadata.info.Title);
                // @ts-ignore
                if (metadata.info.Author && !author) setAuthor(metadata.info.Author);
            }

            // Extract Text for ISBN (Scan first 3 pages)
            let fullText = '';
            const numPagesToScan = Math.min(pdf.numPages, 3);
            for (let i = 1; i <= numPagesToScan; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + ' ';
            }

            // Regex for ISBN
            const isbnRegex = /ISBN(?:-1[03])?:?\s*([0-9- ]{10,17})/i;
            const match = fullText.match(isbnRegex);
            if (match && match[1]) {
                const foundIsbn = match[1].trim();
                setIsbn(foundIsbn);
            }

            // Generate Cover from Page 1
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // @ts-ignore
                await page.render({ canvasContext: context, viewport }).promise;

                // Wrap toBlob in a promise to ensure it finishes before setIsProcessing(false)
                await new Promise<void>((resolve) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const generatedCover = new File([blob], "cover.jpg", { type: "image/jpeg" });
                            setCoverFile(generatedCover);
                        }
                        resolve();
                    }, 'image/jpeg', 0.8);
                });
            }
        } catch (error) {
            console.error("Error processing PDF:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPageCount(null);

            if (!title) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }

            if (selectedFile.type === 'application/pdf') {
                processPDF(selectedFile);
            }

            // checkDuplicate
            checkDuplicate(selectedFile);
        }
    };

    const checkDuplicate = async (file: File) => {
        setDuplicateWarning(null);
        try {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            setFileHash(hashHex);

            const data = await window.api.checkHash(hashHex);

            if (data.exists) {
                setDuplicateWarning({ title: data.book.title });
            }
        } catch (error) {
            console.error('Error checking duplicate:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        // Duplicate Check Confirmation
        if (duplicateWarning) {
            const confirmUpload = window.confirm(`ตรวจพบไฟล์ซ้ำ: "${duplicateWarning.title}"\nคุณยังต้องการอัปโหลดไฟล์นี้อยู่หรือไม่?`);
            if (!confirmUpload) return;
        }

        setIsUploading(true);

        try {
            // 1. Upload File (Send ArrayBuffer via IPC)
            const arrayBuffer = await file.arrayBuffer();
            const uploadRes = await window.api.uploadBook(arrayBuffer, file.name, file.type);

            if (!uploadRes.success) throw new Error('File upload failed');

            // 2. Upload Cover (if any)
            if (coverFile) {
                const coverBuffer = await coverFile.arrayBuffer();
                await window.api.uploadCover(uploadRes.id, coverBuffer);
            }

            // 3. Add to Database
            const bookData = {
                id: uploadRes.id,
                title,
                author,
                description,
                category,
                isbn,
                publisher,
                year: year ? parseInt(year) : null,
                language,
                pageCount: pageCount || 0,
                folderPath: uploadRes.folderPath,
                fileName: uploadRes.fileName,
                fileSize: file.size,
                fileHash: fileHash,
                coverImage: coverFile ? 'cover.jpg' : null,
            };

            const dbRes = await window.api.addBook(bookData);

            if (dbRes.success) {
                onUploadSuccess();
            } else {
                throw new Error('บันทึกลงฐานข้อมูลล้มเหลว');
            }

        } catch (err: any) {
            console.error('Upload error:', err);
            alert('ข้อผิดพลาดในการอัปโหลด: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                    <h2 className="text-xl font-semibold text-white">เพิ่มหนังสือใหม่</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="block w-full border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-all group relative overflow-hidden">
                            <input
                                type="file"
                                accept=".pdf,.epub,.mobi"
                                onChange={handleFileChange}
                                required
                                className="hidden"
                            />
                            <div className="flex flex-col items-center gap-2 relative z-10">
                                <FileUp className="w-10 h-10 text-slate-500 group-hover:text-indigo-500 transition-colors" />
                                <span className="text-slate-400 group-hover:text-indigo-400 font-medium">
                                    {file ? 'เปลี่ยนไฟล์' : 'คลิกหรือลากไฟล์มาที่นี่'}
                                </span>
                            </div>
                            {coverFile && (
                                <div className="absolute inset-0 opacity-20 pointer-events-none">
                                    <img
                                        src={URL.createObjectURL(coverFile)}
                                        alt="Cover Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </label>
                        {file && (
                            <div className="text-sm text-indigo-400 font-medium text-center flex flex-col items-center justify-center gap-1">
                                <span>{file.name}</span>
                                {isProcessing && <span className="text-slate-500 text-xs">(กำลังประมวลผล PDF...)</span>}
                                {pageCount && <span className="text-slate-400 text-xs">{pageCount} หน้า • {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
                            </div>
                        )}
                    </div>

                    {duplicateWarning && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
                            <div className="p-2 rounded-full text-red-600 bg-red-100">⚠️</div>
                            <div>
                                <h4 className="font-bold text-red-800">Duplicate File Detected</h4>
                                <p className="text-sm text-red-700 mt-1">"{duplicateWarning.title}"</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {googleData && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl relative animate-fadeIn">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">✨ ข้อเสนอแนะจาก Google</h4>
                                    <button type="button" onClick={handleUseGoogleData} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">ใช้ข้อมูลนี้</button>
                                </div>
                                <div className="text-sm text-blue-800 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                                    {googleData.title && <p><span className="font-semibold">ชื่อเรื่อง:</span> {googleData.title}</p>}
                                    {googleData.author && <p><span className="font-semibold">ผู้แต่ง:</span> {googleData.author}</p>}
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-400">ชื่อเรื่อง</label>
                                <button onClick={handleAskGoogle} disabled={isSearchingGoogle} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors" type="button">
                                    {isSearchingGoogle ? <span className="animate-spin">⌛</span> : <Search className="w-3.5 h-3.5" />} ถาม Google
                                </button>
                            </div>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="ระบุชื่อหนังสือ" className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">ผู้แต่ง</label>
                            <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="ระบุชื่อผู้แต่ง" className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">หมวดหมู่</label>
                            <input type="text" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">ISBN</label>
                            <input type="text" value={isbn} onChange={e => setIsbn(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">สำนักพิมพ์</label>
                            <input type="text" value={publisher} onChange={e => setPublisher(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">ปีที่พิมพ์</label>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">ภาษา</label>
                        <input type="text" value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">รายละเอียด</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all resize-none" />
                    </div>

                    <button type="submit" disabled={isUploading || isProcessing} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isUploading ? 'กำลังอัปโหลด...' : <><UploadCloud className="w-5 h-5" /> เพิ่มเข้าชั้นหนังสือ</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
