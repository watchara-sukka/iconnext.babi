
export const setupMockApi = () => {
    if (window.api) return; // Don't mock if running in Electron

    console.log('🚧 Running in Browser Mode - Using Mock API 🚧');

    // Simple in-memory storage
    const mockBooks: any[] = [];

    window.api = {
        getBooks: async (options?: { page?: number; limit?: number; searchTerm?: string }) => {
            console.log('[Mock] getBooks', options);
            const { page = 1, limit = 50, searchTerm = '' } = options || {};
            const term = searchTerm.toLowerCase();
            const filtered = mockBooks.filter(b =>
                b.title.toLowerCase().includes(term) ||
                b.author?.toLowerCase().includes(term) ||
                b.isbn?.includes(term)
            );
            const start = (page - 1) * limit;
            return filtered.slice(start, start + limit);
        },
        getBooksCount: async (searchTerm?: string) => {
            console.log('[Mock] getBooksCount', searchTerm);
            const term = (searchTerm || '').toLowerCase();
            const filtered = mockBooks.filter(b =>
                b.title.toLowerCase().includes(term) ||
                b.author?.toLowerCase().includes(term) ||
                b.isbn?.includes(term)
            );
            return filtered.length;
        },
        getBook: async (id: string) => {
            console.log('[Mock] getBook', id);
            return mockBooks.find(b => b.id === id) || null;
        },
        addBook: async (data: any) => {
            console.log('[Mock] addBook', data);
            const newBook = {
                ...data,
                id: data.id || 'mock-id-' + Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                // Ensure number fields are numbers
                year: data.year ? parseInt(data.year) : new Date().getFullYear(),
                pageCount: data.pageCount ? parseInt(data.pageCount) : 0,
                // Ensure hash is stored
                fileHash: data.fileHash || null
            };
            mockBooks.push(newBook);
            return { success: true, id: newBook.id };
        },
        updateBook: async (id: string, data: any) => {
            console.log('[Mock] updateBook', id, data);
            const index = mockBooks.findIndex(b => b.id === id);
            if (index !== -1) {
                mockBooks[index] = { ...mockBooks[index], ...data, updatedAt: new Date().toISOString() };
                return { success: true };
            }
            return { success: false };
        },
        deleteBook: async (id: string) => {
            console.log('[Mock] deleteBook', id);
            const index = mockBooks.findIndex(b => b.id === id);
            if (index !== -1) {
                mockBooks.splice(index, 1);
                return { success: true };
            }
            return { success: true }; // Treat not found as success
        },
        checkHash: async (hash: string) => {
            console.log('[Mock] checkHash', hash);
            const existingBook = mockBooks.find(b => b.fileHash === hash);
            if (existingBook) {
                return { exists: true, book: existingBook };
            }
            return { exists: false };
        },
        searchGoogle: async (queryInput: string | { isbn?: string; title?: string; author?: string; }) => {
            console.log('[Mock] searchGoogle', queryInput);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

            // Determine query string for mock logic
            let queryStr = '';
            if (typeof queryInput === 'string') {
                queryStr = queryInput;
            } else {
                queryStr = queryInput.isbn || queryInput.title || '';
            }

            if (queryStr.toLowerCase().includes('error')) {
                throw new Error('Simulated Google API Error');
            }

            if (queryStr.toLowerCase().includes('notfound')) {
                return { found: false };
            }

            return {
                found: true,
                title: 'Mock Book: ' + (typeof queryInput === 'string' ? queryInput : (queryInput.title || queryInput.isbn)),
                author: 'John Doe',
                description: 'This is a mocked book description from the browser environment.',
                isbn: '978-0123456789',
                pageCount: 123,
                publisher: 'Mock Publisher',
                year: '2024',
                language: 'EN',
                category: 'Fiction',
                cover: 'https://via.placeholder.com/150'
            };
        },
        uploadBook: async (_fileBuffer: ArrayBuffer, fileName: string, fileType: string) => {
            console.log('[Mock] uploadBook', fileName, fileType);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return {
                success: true,
                id: 'temp-id-' + Date.now(),
                folderPath: '/mock/path',
                fileName: fileName
            };
        },
        uploadCover: async (id: string, fileBuffer: ArrayBuffer) => {
            console.log('[Mock] uploadCover', id, fileBuffer.byteLength);
            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: true };
        },
        onUpdateChecking: (_callback: () => void) => {
            console.log('[Mock] onUpdateChecking registered');
            return () => { };
        },
        onUpdateAvailable: (callback: (info: any) => void) => {
            console.log('[Mock] onUpdateAvailable registered');
            // Simulate an update after 30 seconds
            const timer = setTimeout(() => {
                callback({ version: '1.0.0', releaseNotes: 'New features available!' });
            }, 30000);
            return () => clearTimeout(timer);
        },
        onUpdateNotAvailable: (_callback: () => void) => {
            console.log('[Mock] onUpdateNotAvailable registered');
            return () => { };
        },
        onUpdateProgress: (_callback: (progress: any) => void) => {
            console.log('[Mock] onUpdateProgress registered');
            return () => { };
        },
        onUpdateDownloaded: (_callback: (info: any) => void) => {
            console.log('[Mock] onUpdateDownloaded registered');
            return () => { };
        },
        onUpdateError: (_callback: (message: string) => void) => {
            console.log('[Mock] onUpdateError registered');
            return () => { };
        },
        checkForUpdates: () => {
            console.log('[Mock] checkForUpdates');
        },
        downloadUpdate: () => {
            console.log('[Mock] downloadUpdate');
        },
        quitAndInstall: () => {
            console.log('[Mock] quitAndInstall');
        },
        openReleasePage: () => {
            console.log('[Mock] openReleasePage');
            window.open('https://github.com/watchara-sukka/iconnext.babi/releases', '_blank');
        },
        openExternal: (url: string) => {
            console.log('[Mock] openExternal', url);
            window.open(url, '_blank');
        },
        getInfo: async () => {
            return { version: '0.6.0-mock', platform: 'browser', arch: 'x64' };
        },
        quitApp: () => {
            console.log('[Mock] quitApp');
            window.close();
        }
    };
};
