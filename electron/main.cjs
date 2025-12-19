const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = !app.isPackaged; // Simple check for development mode

let win;
let splash;

function createWindow() {
  // Create Main Window (Hidden)
  win = new BrowserWindow({
    show: false,
    fullscreen: true,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Create Splash Window
  splash = new BrowserWindow({
    fullscreen: true, // Fullscreen Splash
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#0f172a', // Dark background for immediate feedback
    webPreferences: {
      nodeIntegration: true
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));

  // No need to center if fullscreen

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Determine when to show main window
  if (isDev) {
    // In Dev, show immediately after load to allow debug
    win.once('ready-to-show', () => {
      splash.destroy();
      win.show();
    });
  } else {
    // In Prod, simulate minimum load time for effect + real load
    // Wait 15 seconds as requested (matches CSS/JS animation)
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.destroy();
      }
      if (win && !win.isDestroyed()) {
        win.show();
      }
    }, 15500); // 15.5s to ensure progress bar finishes
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
