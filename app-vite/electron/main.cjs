const { app, BrowserWindow, ipcMain, protocol, shell, dialog, net } = require('electron');
const { autoUpdater } = require("electron-updater");
const path = require('path');
const fs = require('fs');
const url = require('url');
const { initDatabase, handleDatabaseIpc, getUploadsDir, forceSaveDb } = require('./database.cjs');

// Register custom protocol as privileged before app is ready
// This is critical for modern Electron security and network service stability
protocol.registerSchemesAsPrivileged([
    { scheme: 'local-resource', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

// Security Bypass for Portable/Unsigned App on macOS to prevent Network Service crash
if (process.platform === 'darwin') {
    // ปิด GPU และระบบที่ซับซ้อนอย่างเข้มงวด มักจะเป็นทางเดียวที่รันแอปบน Mac แบบพกพาได้เสถียร
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('disable-crashpad');
    app.commandLine.appendSwitch('disable-software-rasterizer');
    app.commandLine.appendSwitch('disable-site-isolation-trials');
}

// Logging platform for diagnostics
console.log(`Babi Portal Starting: Platform is ${process.platform}`);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
    try {
        // Use variable to avoid static analysis triggers on other platforms
        const squirrelModule = 'electron-squirrel-startup';
        if (require(squirrelModule)) {
            app.quit();
            process.exit(0);
        }
    } catch (e) {
        // Expected if module not installed or on non-windows (though guarded)
        console.warn('electron-squirrel-startup skip:', e.message);
    }
}

// --- PORTABLE PATH LOGIC ---
const isDev = !app.isPackaged;
const exeDir = path.dirname(process.execPath);
let dataDir;
let uploadsDir;

if (isDev) {
    dataDir = path.join(__dirname, '../data');
    uploadsDir = path.join(__dirname, '../uploads');
} else {
    // Determine if we should be portable
    // On Mac, process.execPath is inside the .app bundle: .../Contents/MacOS/AppName
    // We go up 3 levels to get the folder containing the .app bundle
    const bundleParentDir = process.platform === 'darwin'
        ? path.join(exeDir, '../../..')
        : exeDir;

    const isStandardInstall = process.platform === 'darwin'
        ? exeDir.includes('/Applications')
        : (exeDir.includes('Program Files') || exeDir.includes('AppData'));

    // --- ROBUST PORTABLE DATA DISCOVERY ---
    let localDataPath = path.join(bundleParentDir, 'data');
    let localUploadsPath = path.join(bundleParentDir, 'uploads');

    // Upward Search for Shared Data (ค้นหาฐานข้อมูลไต่ระดับขึ้นไปจนถึง Root ของ USB)
    let searchDir = bundleParentDir;
    let foundShared = false;

    // ค้นหาขึ้นไป 3 ระดับ (เช่น จาก /Volumes/USB/Mac/App ไปจนถึง /Volumes/USB)
    for (let i = 0; i < 3; i++) {
        const potentialRoot = path.join(searchDir, '..');
        const rootDbPath = path.join(potentialRoot, 'data', 'babi.db');

        if (fs.existsSync(rootDbPath)) {
            console.log(`[Path Discovery] Shared Root Database found at: ${rootDbPath}`);
            localDataPath = path.join(potentialRoot, 'data');
            localUploadsPath = path.join(potentialRoot, 'uploads');
            foundShared = true;
            break;
        }
        searchDir = potentialRoot;
        // ป้องกันการวนลูปเกิน Root
        if (searchDir === path.dirname(searchDir)) break;
    }

    if (!foundShared) {
        console.log(`[Path Discovery] Shared Database not found at roots, falling back to local: ${localDataPath}`);
    }

    if (!isStandardInstall || fs.existsSync(localDataPath)) {
        // Portable Mode: Use detected 'data' and 'uploads' directory
        dataDir = localDataPath;
        uploadsDir = localUploadsPath;
        // Set Electron's userData to the portable data dir
        app.setPath('userData', dataDir);
    } else {
        // Normal Mode
        dataDir = app.getPath('userData');
        uploadsDir = path.join(dataDir, 'uploads');
    }
}

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// --- LOGGING SETUP ---
const logFile = path.join(dataDir, 'debug.log');
function logToFile(msg) {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    } catch (e) { /* ignore */ }
}

logToFile('==========================================');
logToFile(`App Starting (Portable Mode: ${!isDev && app.getPath('userData') === dataDir})`);
logToFile(`Exec Path: ${process.execPath}`);
logToFile(`Data Path: ${dataDir}`);
logToFile(`Uploads Path: ${uploadsDir}`);
logToFile(`App Resources Path: ${process.resourcesPath}`);
logToFile(`App userData Path: ${app.getPath('userData')}`);

// Wrap global error handlers
process.on('uncaughtException', (error) => {
    logToFile(`Uncaught Exception: ${error.message}\n${error.stack}`);
});
process.on('unhandledRejection', (reason) => {
    logToFile(`Unhandled Rejection: ${reason}`);
});

let mainWindow;

function createWindow() {
    logToFile('createWindow called');
    const isDev = !app.isPackaged;
    const iconPath = isDev
        ? path.join(__dirname, '../public/logo-full.png')
        : path.join(__dirname, '../dist/logo-full.png');

    logToFile(`Icon path: ${iconPath}`);

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false // Allow loading local resources (optional, better to use protocol)
        },
        icon: iconPath
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html');
        logToFile(`Loading file: ${indexPath}`);
        mainWindow.loadFile(indexPath);
    }

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logToFile(`Failed to load window: ${errorCode} - ${errorDescription}`);
    });
}

// Custom protocol for serving uploads
function setupProtocol() {
    // Modern protocol API (Electron 25+)
    protocol.handle('local-resource', (request) => {
        const filePath = request.url.replace('local-resource://', '');
        const decodedPath = decodeURIComponent(filePath);

        let finalPath = '';
        if (path.isAbsolute(decodedPath)) {
            finalPath = decodedPath;
        } else {
            const currentUploadsDir = getUploadsDir();
            if (currentUploadsDir) {
                // ROBUST PATH RESOLUTION:
                // If decodedPath already starts with 'uploads/', resolve it from the parent
                // to avoid ending up with 'uploads/uploads/ID'
                const uploadsBaseName = path.basename(currentUploadsDir);
                if (decodedPath.startsWith(uploadsBaseName + '/') || decodedPath.startsWith(uploadsBaseName + '\\')) {
                    finalPath = path.join(path.dirname(currentUploadsDir), decodedPath);
                } else {
                    finalPath = path.join(currentUploadsDir, decodedPath);
                }
            }
        }

        if (finalPath && fs.existsSync(finalPath)) {
            try {
                // pathToFileURL handles encoding properly for all OS
                const fileUrl = url.pathToFileURL(finalPath).href;
                return net.fetch(fileUrl);
            } catch (e) {
                console.error(`Protocol error for ${finalPath}:`, e);
                return new Response('Error loading resource', { status: 500 });
            }
        }

        console.warn(`Resource not found: ${finalPath} (Original: ${request.url})`);
        return new Response('Not Found', { status: 404 });
    });
}

app.whenReady().then(async () => {
    logToFile('app.whenReady');
    setupProtocol();

    // Initialize Database in background
    initDatabase(uploadsDir).catch(err => {
        console.error('Failed to init database:', err);
        logToFile(`Failed to init database: ${err.message}\n${err.stack}`);
        dialog.showErrorBox('Database Error', `Failed to initialize database: ${err.message}`);
    });
    handleDatabaseIpc(ipcMain);

    // App Control IPC
    ipcMain.handle('app:getInfo', () => {
        return {
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch
        };
    });

    ipcMain.on('app:quit', () => {
        app.quit();
    });

    createWindow();

    // Auto Update Setup
    autoUpdater.autoDownload = false; // Disable auto-download to handle manual choice

    autoUpdater.on('checking-for-update', () => {
        logToFile('Checking for update...');
        if (mainWindow) mainWindow.webContents.send('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
        logToFile(`Update available: ${info.version}`);
        if (mainWindow) {
            mainWindow.webContents.send('update:available', info);
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        logToFile('Update not available.');
        console.log('Update not available.');
        if (mainWindow) mainWindow.webContents.send('update:not-available');
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        logToFile(log_message);
        if (mainWindow) {
            mainWindow.webContents.send('update:download-progress', progressObj);
        }
    });

    autoUpdater.on('update-downloaded', (info) => {
        logToFile('Update downloaded');
        if (mainWindow) {
            mainWindow.webContents.send('update:downloaded', info);
        }
    });

    autoUpdater.on('error', (err) => {
        const errorMsg = err.message || String(err);
        logToFile(`Update error: ${errorMsg}`);

        // Silently ignore missing config file (common in local builds)
        if (errorMsg.includes('app-update.yml') && errorMsg.includes('ENOENT')) {
            logToFile('Update check skipped: app-update.yml not found (Local build or non-released version)');
            return;
        }

        if (mainWindow) {
            mainWindow.webContents.send('update:error', errorMsg);
        }
    });

    // Handle IPC from Renderer
    ipcMain.on('update:open-release', () => {
        const repoUrl = "https://github.com/watchara-sukka/iconnext.babi/releases/latest";
        shell.openExternal(repoUrl);
    });

    ipcMain.on('update:download', () => {
        logToFile('Update download requested via IPC');
        autoUpdater.downloadUpdate();
    });

    ipcMain.on('update:quit-and-install', () => {
        logToFile('Quit and install requested via IPC');
        autoUpdater.quitAndInstall();
    });

    ipcMain.on('update:check', () => {
        logToFile('Manual update check requested via IPC');
        autoUpdater.checkForUpdates().catch(err => {
            logToFile(`Manual check failed: ${err.message}`);
        });
    });

    // Check for updates (Safe Check)
    // We add a check for app-update.yml to avoid ENOENT errors in local non-released builds
    if (!isDev) {
        setTimeout(() => {
            const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
            if (fs.existsSync(updateConfigPath)) {
                logToFile('Starting automatic update check...');
                autoUpdater.checkForUpdates().catch(err => {
                    logToFile(`Auto check failed: ${err.message}`);
                });
            } else {
                logToFile('AutoUpdate skipped: app-update.yml missing (Normal for local builds)');
            }
        }, 8000); // 8 second delay to ensure UI is ready
    } else {
        logToFile('AutoUpdate skipped: Development mode');
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Final cleanup and save before quit
app.on('will-quit', () => {
    console.log('[App Life] Saving data before exit...');
    forceSaveDb();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
