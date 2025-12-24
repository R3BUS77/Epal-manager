import React, { useRef, useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, FolderOpen, Users, ClipboardPen } from 'lucide-react';
import { exportDataAsync, getDbPath, setDbPath } from '../services/storageService';
import { AppData } from '../types';
import { FileBrowser } from '../components/FileBrowser';

const { ipcRenderer } = window.require('electron');

interface SettingsProps {
  onImport: (data: AppData) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onImport }) => {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });
  const [browserMode, setBrowserMode] = useState<{
    isOpen: boolean;
    mode: 'file' | 'directory' | 'save';
    action?: 'IMPORT_CLIENTS' | 'IMPORT_MOVEMENTS' | 'CHANGE_PATH' | 'EXPORT_BACKUP';
  }>({ isOpen: false, mode: 'file' });

  const currentPath = getDbPath();

  const handleBrowserSelect = async (path: string) => {
    setBrowserMode(prev => ({ ...prev, isOpen: false }));

    if (browserMode.action === 'CHANGE_PATH') {
      if (path === currentPath) return;
      if (window.confirm(`Hai selezionato: ${path}\n\nL'applicazione verrà riavviata per caricare il database da questa posizione. Confermi?`)) {
        await setDbPath(path); // Assuming this is async
        window.location.reload();
      }
    } else if (browserMode.action === 'EXPORT_BACKUP') {
      try {
        // Dynamic import
        const { exportDataToPath } = await import('../services/storageService');

        // Ensure it ends with json
        const finalPath = path.toLowerCase().endsWith('.json') ? path : path + '.json';

        await exportDataToPath(finalPath);
        setStatus({ type: 'success', msg: `Backup salvato: ${finalPath}` });
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', msg: 'Errore durante il salvataggio del backup.' });
      }
    } else if (browserMode.action === 'IMPORT_CLIENTS' || browserMode.action === 'IMPORT_MOVEMENTS') {
      // Read file content manually since we have the path
      const fs = window.require('fs');
      try {
        const content = await fs.promises.readFile(path, 'utf-8');
        const json = JSON.parse(content);

        let dataToImport: Partial<AppData> = {};
        const importType = browserMode.action === 'IMPORT_CLIENTS' ? 'CLIENTI' : 'MOVIMENTI';
        const isArray = Array.isArray(json);

        if (browserMode.action === 'IMPORT_CLIENTS') {
          if (isArray) dataToImport = { clients: json };
          else if (json.clients && Array.isArray(json.clients)) dataToImport = { clients: json.clients };
          else throw new Error("Formato client non valido");
        } else {
          if (isArray) dataToImport = { movements: json };
          else if (json.movements && Array.isArray(json.movements)) dataToImport = { movements: json.movements };
          else throw new Error("Formato movimenti non valido");
        }

        if (window.confirm(`Stai per ripristinare i ${importType}. \nQuesta operazione sovrascriverà i dati esistenti di questa categoria. Continuare?`)) {
          onImport(dataToImport);
          setStatus({ type: 'success', msg: `Ripristino ${importType} completato.` });
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', msg: 'File non valido o corrotto.' });
      }
    }
  };

  const openImportBrowser = (action: 'IMPORT_CLIENTS' | 'IMPORT_MOVEMENTS') => {
    setBrowserMode({ isOpen: true, mode: 'file', action });
  };

  const openPathBrowser = () => {
    setBrowserMode({ isOpen: true, mode: 'directory', action: 'CHANGE_PATH' });
  };

  const handleExport = async () => {
    setBrowserMode({ isOpen: true, mode: 'save', action: 'EXPORT_BACKUP' });
  };

  const closeBrowser = () => {
    setBrowserMode(prev => ({ ...prev, isOpen: false }));
  }

  return (
    <>
      {browserMode.isOpen && (
        <FileBrowser
          mode={browserMode.mode}
          title={
            browserMode.action === 'CHANGE_PATH' ? 'Seleziona Nuova Posizione Database' :
              browserMode.action === 'EXPORT_BACKUP' ? 'Salva File Backup' :
                'Seleziona File da Ripristinare'
          }
          allowedExtensions={['.json']}
          defaultSaveName={browserMode.action === 'EXPORT_BACKUP' ? `backup_${new Date().toISOString().split('T')[0]}.json` : ''}
          onSelect={handleBrowserSelect}
          onCancel={closeBrowser}
        />
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Gestione Database</h2>
              <p className="text-slate-500">Esporta o ripristina i tuoi dati per backup o trasferimento.</p>
            </div>
          </div>

          {status.type && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {status.msg}
            </div>
          )}

          {/* Database Path Configuration */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl mb-8">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-slate-500" />
              Percorso Database Attuale
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <code className="bg-white px-3 py-2 rounded border border-slate-200 text-sm text-slate-600 font-mono break-all w-full sm:w-auto">
                {currentPath || 'Non configurato'}
              </code>
              <button
                onClick={openPathBrowser}
                className="shrink-0 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors shadow-sm"
              >
                Cambia Percorso...
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Seleziona una cartella condivisa per sincronizzare i dati con altri PC.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Export */}
            <div className="border border-slate-200 rounded-lg p-6 hover:border-blue-300 transition-colors flex flex-col">
              <h3 className="font-semibold text-lg text-slate-800 mb-2 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                Backup (Esporta)
              </h3>
              <p className="text-sm text-slate-500 mb-6 flex-1">
                Scarica una copia completa del database (Clienti e Movimenti) in formato JSON.
              </p>
              <button
                onClick={handleExport}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-auto"
              >
                Scarica Backup Completo
              </button>
            </div>

            {/* Import */}
            <div className="border border-slate-200 rounded-lg p-6 hover:border-amber-300 transition-colors flex flex-col">
              <h3 className="font-semibold text-lg text-slate-800 mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-600" />
                Ripristina (Importa)
              </h3>
              <p className="text-sm text-slate-500 mb-4 flex-1">
                Carica i file <code>.json</code> specifici per ripristinare i dati.
                <span className="text-amber-600 font-medium flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> Attenzione: Sovrascrive i dati.
                </span>
              </p>

              <div className="space-y-3 mt-auto">
                <button
                  onClick={() => openImportBrowser('IMPORT_CLIENTS')}
                  className="w-full py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Ripristina Anagrafica Clienti
                </button>
                <button
                  onClick={() => openImportBrowser('IMPORT_MOVEMENTS')}
                  className="w-full py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ClipboardPen className="w-4 h-4" />
                  Ripristina Movimenti
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};