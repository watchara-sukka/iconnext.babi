'use client';

import React, { useState, useEffect } from 'react';
import { X, UploadCloud, FileUp, Search, HelpCircle } from 'lucide-react';

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
    const [pageCount, setPageCount] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pdfjsLib, setPdfjsLib] = useState<any>(null);

    // Google Books Logic
    const [googleData, setGoogleData] = useState<any>(null);
    const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<{ title: string } | null>(null);

    const handleAskGoogle = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent form submission
        const query = isbn || title;
        if (!query) {
            alert('Please enter a Title or ISBN to search.');
            return;
        }

        setIsSearchingGoogle(true);
        setGoogleData(null);
        console.log('[UploadModal] Asking Google for:', query);
        try {
            const res = await fetch(`/api/external/google-books?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            console.log('[UploadModal] Google Data:', data);

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
        if (googleData.title) setTitle(googleData.title);
        if (googleData.author) setAuthor(googleData.author);
        if (googleData.isbn) setIsbn(googleData.isbn);
        if (googleData.publisher) setPublisher(googleData.publisher);
        if (googleData.year) setYear(googleData.year);
        if (googleData.language) setLanguage(googleData.language);
        if (googleData.category) {
            // Get form element for category as it doesn't have state
            const categoryInput = document.querySelector('input[name="category"]') as HTMLInputElement;
            if (categoryInput) categoryInput.value = googleData.category;
        }
        if (googleData.description) {
            // Get form element for description as it doesn't have state
            const descInput = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
            if (descInput) descInput.value = googleData.description;
        }
        setGoogleData(null);
    };

    useEffect(() => {
        // @ts-ignore
        import('pdfjs-dist/legacy/build/pdf').then((module) => {
            module.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
            setPdfjsLib(module);
        });
    }, []);

    const processPDF = async (file: File) => {
        if (!pdfjsLib) return;
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
                if (metadata.info.Title) setTitle(metadata.info.Title);
                // @ts-ignore
                if (metadata.info.Author) setAuthor(metadata.info.Author);
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
            // Looks for "ISBN" followed by numbers, dashes, or spaces
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

                canvas.toBlob((blob) => {
                    if (blob) {
                        const generatedCover = new File([blob], "cover.jpg", { type: "image/jpeg" });
                        setCoverFile(generatedCover);
                    }
                }, 'image/jpeg', 0.8);
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
            setCoverFile(null); // Reset cover
            setPageCount(null); // Reset page count

            // Default title from filename
            if (!title) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }

            if (selectedFile.type === 'application/pdf') {
                processPDF(selectedFile);
            }

            // Check for duplicate
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

            const res = await fetch(`/api/books/check-hash?hash=${hashHex}`);
            const data = await res.json();

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

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (coverFile) {
            formData.append('cover', coverFile);
        }
        formData.append('title', title);
        formData.append('author', author);

        // Get values from form elements directly since we didn't create state for them to keep it simple
        const form = e.target as HTMLFormElement;
        formData.append('description', (form.elements.namedItem('description') as HTMLTextAreaElement).value);
        formData.append('category', (form.elements.namedItem('category') as HTMLInputElement).value);
        formData.append('isbn', isbn);
        formData.append('publisher', publisher);
        formData.append('year', year);
        formData.append('language', language);
        if (pageCount) formData.append('pageCount', pageCount.toString());
        formData.append('isbn_source_format', 'Paperback'); // Default for now

        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                onUploadSuccess();
            } else {
                const data = await res.json();
                alert(data.error || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Upload error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                    <h2 className="text-xl font-semibold text-white">Add New Book</h2>
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
                                    {file ? 'Change file' : 'Click or Drag file here'}
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
                                {isProcessing && <span className="text-slate-500 text-xs">(Processing PDF...)</span>}
                                {pageCount && <span className="text-slate-400 text-xs">{pageCount} Pages • {(file.size / 1024 / 1024).toFixed(2)} MB</span>}
                            </div>
                        )}
                    </div>

                    {duplicateWarning && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
                            <div className="br-red-100 p-2 rounded-full text-red-600 bg-red-100">
                                ⚠️
                            </div>
                            <div>
                                <h4 className="font-bold text-red-800">Duplicate File Detected</h4>
                                <p className="text-sm text-red-700 mt-1">
                                    This file is identical to an existing book in your library:
                                </p>
                                <div className="mt-2 bg-white/50 p-2 rounded border border-red-100 text-sm text-red-900 font-medium">
                                    "{duplicateWarning.title}"
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {googleData && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl relative animate-fadeIn">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                                        <span>✨</span> Google Suggestion
                                    </h4>
                                    <button
                                        type="button"
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
                                </div>
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-400">Title</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleAskGoogle}
                                        disabled={isSearchingGoogle}
                                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                        type="button"
                                    >
                                        {isSearchingGoogle ? <span className="animate-spin">⌛</span> : <Search className="w-3.5 h-3.5" />}
                                        Ask Google
                                    </button>
                                    <div className="group relative">
                                        <HelpCircle className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help transition-colors" />
                                        <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                            <p className="font-semibold mb-1 text-white">ลำดับการค้นหา:</p>
                                            <ol className="list-decimal list-inside space-y-0.5 mb-2">
                                                <li><span className="text-indigo-400">ISBN</span> (ถ้ามี)</li>
                                                <li><span className="text-indigo-400">ชื่อหนังสือ</span> (ถ้าไม่มี ISBN)</li>
                                            </ol>
                                            <p className="text-slate-400 border-t border-slate-700 pt-1 mt-1">
                                                💡 <span className="italic">แนะนำ: ลบ ISBN ออกเพื่อค้นหาด้วยชื่อหนังสืออย่างเดียว</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Enter book title"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Author</label>
                            <input
                                type="text"
                                name="author"
                                value={author}
                                onChange={e => setAuthor(e.target.value)}
                                placeholder="Enter author name"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                            <input
                                type="text"
                                name="category"
                                placeholder="Fiction, Tech..."
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">ISBN</label>
                            <input
                                type="text"
                                name="isbn"
                                value={isbn}
                                onChange={e => setIsbn(e.target.value)}
                                placeholder="978-..."
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Publisher</label>
                            <input
                                type="text"
                                name="publisher"
                                value={publisher}
                                onChange={e => setPublisher(e.target.value)}
                                placeholder="Publisher Name"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Year</label>
                            <input
                                type="number"
                                name="year"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                placeholder="YYYY"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Language</label>
                        <input
                            type="text"
                            name="language"
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                            placeholder="e.g. TH, EN"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                        <textarea
                            name="description"
                            rows={3}
                            placeholder="Book summary..."
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isUploading || isProcessing}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            'Uploading...'
                        ) : (
                            <>
                                <UploadCloud className="w-5 h-5" /> Add to Library
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
