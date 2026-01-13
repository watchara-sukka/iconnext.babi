/// <reference types="vite/client" />

interface Window {
    api: {
        getBooks: (options?: { page?: number; limit?: number; searchTerm?: string }) => Promise<any[]>;
        getBooksCount: (searchTerm?: string) => Promise<number>;
        getBook: (id: string) => Promise<any>;
        addBook: (data: any) => Promise<{ success: boolean; id: string }>;
        updateBook: (id: string, data: any) => Promise<{ success: boolean }>;
        deleteBook: (id: string) => Promise<{ success: boolean }>;
        checkHash: (hash: string) => Promise<{ exists: boolean; book?: any }>;
        searchGoogle: (query: string) => Promise<{ found: boolean; title?: string; author?: string;[key: string]: any }>;
        uploadBook: (fileBuffer: ArrayBuffer, fileName: string, fileType: string) => Promise<{ success: boolean; id: string; folderPath: string; fileName: string }>;
        uploadCover: (bookId: string, fileBuffer: ArrayBuffer) => Promise<{ success: boolean }>;
        openExternal: (url: string) => void;
        onUpdateChecking: (callback: () => void) => () => void;
        onUpdateAvailable: (callback: (info: any) => void) => () => void;
        onUpdateNotAvailable: (callback: () => void) => () => void;
        onUpdateProgress: (callback: (progress: any) => void) => () => void;
        onUpdateDownloaded: (callback: (info: any) => void) => () => void;
        onUpdateError: (callback: (message: string) => void) => () => void;
        checkForUpdates: () => void;
        downloadUpdate: () => void;
        quitAndInstall: () => void;
        openReleasePage: () => void;
        getInfo: () => Promise<{ version: string; platform: string; arch: string }>;
        quitApp: () => void;
    }
}
