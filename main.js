import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let db;

// Auto Updater Configuration
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

async function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'odakla.db');
    console.log('Database Path:', dbPath);

    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) reject(err);
            console.log('Connected to SQLite database.');

            // Create Tables
            db.serialize(() => {
                db.run(`CREATE TABLE IF NOT EXISTS habits (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    type TEXT NOT NULL,
                    goal INTEGER NOT NULL,
                    unit TEXT,
                    pomodoro_duration INTEGER DEFAULT 25,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS progress_records (
                    id TEXT PRIMARY KEY,
                    habitId TEXT REFERENCES habits(id) ON DELETE CASCADE,
                    date TEXT NOT NULL,
                    value INTEGER NOT NULL,
                    completed BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    priority TEXT DEFAULT 'medium',
                    deadline TEXT,
                    location TEXT,
                    notes TEXT,
                    completed BOOLEAN DEFAULT 0,
                    completed_at TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS monthly_goals (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    status TEXT DEFAULT 'in-progress',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS pomodoro_history (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    duration INTEGER NOT NULL,
                    start_time TEXT NOT NULL,
                    sessions INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`, () => resolve());
            });
        });
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#111814',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        titleBarStyle: 'hiddenInset' // Premium feel for macOS
    });

    mainWindow.loadFile('index.html');

    // Update Events
    autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('update-available', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        mainWindow.webContents.send('update-progress', progressObj.percent);
    });

    autoUpdater.on('update-downloaded', (info) => {
        mainWindow.webContents.send('update-downloaded', info);
    });
}

app.whenReady().then(async () => {
    await initDatabase();
    createWindow();

    // Check for updates
    // Check for updates
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify().catch(err => {
            console.error('Failed to check for updates:', err);
        });
    }

    autoUpdater.on('error', (err) => {
        console.error('Update error:', err);
    });

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        if (db) db.close();
        app.quit();
    }
});

// IPC Database Handlers
ipcMain.handle('db-query', async (event, { sql, params = [] }) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
});

ipcMain.handle('db-run', async (event, { sql, params = [] }) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
});

// Update IPC Handlers
ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
});
