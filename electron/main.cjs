const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = !app.isPackaged; // Controllo semplice per modalità sviluppo

let win;
let splash;

// Handler IPC per Selezione Directory
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled) {
    return null;
  } else {
    return result.filePaths[0];
  }
});

function createWindow() {
  // Crea Finestra Principale (Nascosta inizialmente)
  win = new BrowserWindow({
    show: false,
    kiosk: true,
    alwaysOnTop: true, // Forza la finestra in primo piano per coprire la barra delle applicazioni
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // Crea Finestra Splash
  splash = new BrowserWindow({
    fullscreen: true, // Splash a Schermo Intero
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#0f172a', // Sfondo scuro per feedback immediato
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, 'icon.png')
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));

  // Non serve centrare se è fullscreen

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Determina quando mostrare la finestra principale
  if (isDev) {
    // In Dev, mostra subito dopo il caricamento per debug
    win.once('ready-to-show', () => {
      splash.destroy();
      win.show();
    });
  } else {
    // In Prod, simula tempo minimo di caricamento per effetto + caricamento reale
    // Attendi 15 secondi come richiesto (corrisponde all'animazione CSS/JS)
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) {
        splash.destroy();
      }
      if (win && !win.isDestroyed()) {
        win.show();
        win.focus(); // Forza il focus per prevenire stato "in background"
      }
    }, 15500); // 15.5s per assicurare che la barra di progresso finisca
  }
}

// Disabilita Accelerazione Hardware per correggere schermo bianco/freeze su alcuni PC Windows
app.disableHardwareAcceleration();

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
