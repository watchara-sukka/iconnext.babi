const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Books API
    getBooks: (options) => ipcRenderer.invoke('books:getAll', options),
    getBooksCount: (searchTerm) => ipcRenderer.invoke('books:count', searchTerm),
    getBook: (id) => ipcRenderer.invoke('books:get', id),
    addBook: (data) => ipcRenderer.invoke('books:add', data),
    updateBook: (id, data) => ipcRenderer.invoke('books:update', id, data),
    deleteBook: (id) => ipcRenderer.invoke('books:delete', id),

    // Uploads API (File Handling)
    uploadBook: (fileBuffer, fileName, fileType) => ipcRenderer.invoke('upload:book', fileBuffer, fileName, fileType),
    uploadCover: (bookId, fileBuffer) => ipcRenderer.invoke('upload:cover', bookId, fileBuffer),

    // External
    searchGoogle: (query) => ipcRenderer.invoke('books:searchGoogle', query),
    checkHash: (hash) => ipcRenderer.invoke('books:checkHash', hash),
    openExternal: (url) => ipcRenderer.send('open-external', url),

    // Auto Update API
    onUpdateChecking: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('update:checking', listener);
        return () => ipcRenderer.removeListener('update:checking', listener);
    },
    onUpdateAvailable: (callback) => {
        const listener = (event, info) => callback(info);
        ipcRenderer.on('update:available', listener);
        return () => ipcRenderer.removeListener('update:available', listener);
    },
    onUpdateNotAvailable: (callback) => {
        const listener = () => callback();
        ipcRenderer.on('update:not-available', listener);
        return () => ipcRenderer.removeListener('update:not-available', listener);
    },
    onUpdateProgress: (callback) => {
        const listener = (event, progress) => callback(progress);
        ipcRenderer.on('update:download-progress', listener);
        return () => ipcRenderer.removeListener('update:download-progress', listener);
    },
    onUpdateDownloaded: (callback) => {
        const listener = (event, info) => callback(info);
        ipcRenderer.on('update:downloaded', listener);
        return () => ipcRenderer.removeListener('update:downloaded', listener);
    },
    onUpdateError: (callback) => {
        const listener = (event, message) => callback(message);
        ipcRenderer.on('update:error', listener);
        return () => ipcRenderer.removeListener('update:error', listener);
    },
    downloadUpdate: () => ipcRenderer.send('update:download'),
    quitAndInstall: () => ipcRenderer.send('update:quit-and-install'),
    openReleasePage: () => ipcRenderer.send('update:open-release')
});
