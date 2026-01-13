import React, { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, FolderOpen, Users, ClipboardPen, RefreshCw } from 'lucide-react';
import { getDbPath, setDbPath } from '../services/storageService';
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

  // Restart Modal Confirmation State
  const [pendingRestartPath, setPendingRestartPath] = useState<string | null>(null);

  // Import Confirmation State
  const [pendingImport, setPendingImport] = useState<{
    type: 'CLIENTI' | 'MOVIMENTI';
    data: Partial<AppData>;
    analysis: {
      fileFormat: 'V4_BACKUP' | 'LEGACY_LIST' | 'LEGACY_OBJECT' | 'UNKNOWN';
      count: number;
      isValid: boolean;
      hexSignature?: string;
      isHexVerified: boolean;
      validationError?: string;
    };
  } | null>(null);

  const currentPath = getDbPath();

  const handleBrowserSelect = async (path: string) => {
    // Restore focus to main window immediately
    window.focus();
    setBrowserMode(prev => ({ ...prev, isOpen: false }));

    if (browserMode.action === 'CHANGE_PATH') {
      if (path === currentPath) return;
      // Trigger Custom Modal instead of window.confirm
      setPendingRestartPath(path);

    } else if (browserMode.action === 'EXPORT_BACKUP') {
      try {
        // Dynamic import
        const { exportZipToPath } = await import('../services/storageService');

        // Ensure it ends with zip
        const finalPath = path.toLowerCase().endsWith('.zip') ? path : path + '.zip';

        await exportZipToPath(finalPath);
        setStatus({ type: 'success', msg: `Backup archiviato salvato: ${finalPath}` });
        window.focus(); // Restore focus after operation
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', msg: 'Errore durante il salvataggio del backup.' });
      }
    } else if (browserMode.action === 'IMPORT_CLIENTS' || browserMode.action === 'IMPORT_MOVEMENTS') {
      // Read file content manually since we have the path
      const fs = window.require('fs');
      try {
        const content = await fs.promises.readFile(path, 'utf-8');
        let json;
        try {
          json = JSON.parse(content);
        } catch (e) {
          throw new Error("Il file selezionato non è un JSON valido.");
        }

        const importType = browserMode.action === 'IMPORT_CLIENTS' ? 'CLIENTI' : 'MOVIMENTI';
        let dataToImport: Partial<AppData> = {};
        let analysis = {
          fileFormat: 'UNKNOWN' as any,
          count: 0,
          isValid: false,
          hexSignature: json.hexSignature || null,
          isHexVerified: false,
          validationError: ''
        };

        // HEX SIGNATURES
        const SIG_FULL = '4550414C5F46554C4C'; // EPAL_FULL
        const SIG_CLIENTS = '434C49454E5453';   // CLIENTS
        const SIG_MOVEMENTS = '4D4F56454D454E5453'; // MOVEMENTS

        // 1. Identify Format
        if (json.fileType === 'EPAL_BACKUP') analysis.fileFormat = 'V4_BACKUP';
        else if (Array.isArray(json)) analysis.fileFormat = 'LEGACY_LIST';
        else if (json.clients && Array.isArray(json.clients)) analysis.fileFormat = 'LEGACY_OBJECT';
        else if (json.movements && Array.isArray(json.movements)) analysis.fileFormat = 'LEGACY_OBJECT';
        else if (json.hexSignature && json.data && Array.isArray(json.data)) analysis.fileFormat = 'V4_BACKUP'; // Treat Signed Single as V4 Backup style (verified)

        // 2. Verify Hex ID
        if (analysis.hexSignature) {
          if (importType === 'CLIENTI') {
            if (analysis.hexSignature === SIG_FULL || analysis.hexSignature === SIG_CLIENTS) {
              analysis.isHexVerified = true;
            } else {
              analysis.isHexVerified = false;
              analysis.validationError = "Firma Hex del file non valida per importazione Clienti.";
            }
          } else {
            if (analysis.hexSignature === SIG_FULL || analysis.hexSignature === SIG_MOVEMENTS) {
              analysis.isHexVerified = true;
            } else {
              analysis.isHexVerified = false;
              analysis.validationError = "Firma Hex del file non valida per importazione Movimenti.";
            }
          }
        }

        // 3. Extract Candidates
        let candidates: any[] = [];
        if (analysis.fileFormat === 'V4_BACKUP') {
          // It could be a FULL backup (json.clients/movements) OR a Signed Single (json.data)
          if (json.clients || json.movements) {
            candidates = importType === 'CLIENTI' ? (json.clients || []) : (json.movements || []);
          } else if (json.data) {
            candidates = json.data;
          }
        } else if (analysis.fileFormat === 'LEGACY_LIST') {
          candidates = json;
        } else if (analysis.fileFormat === 'LEGACY_OBJECT') {
          candidates = importType === 'CLIENTI' ? (json.clients || []) : (json.movements || []);
        }

        analysis.count = candidates.length;

        // 4. Paranoid Validation (Structure Sniffing)
        const sample = candidates.length > 0 ? candidates[0] : null;

        if (!sample) {
          analysis.isValid = false;
          analysis.validationError = "Il file sembra vuoto o non contiene dati riconoscibili.";
        } else {
          // Discriminator Fields
          const hasMovementFields = 'palletsGood' in sample || 'palletsExchange' in sample || 'clientId' in sample;
          const hasClientFields = 'vatNumber' in sample || 'address' in sample || ('name' in sample && 'city' in sample); // Stronger client check

          if (importType === 'CLIENTI') {
            // Logic for Clients
            if (hasMovementFields) {
              analysis.isValid = false;
              analysis.validationError = "ERRORE CRITICO: Stai provando a importare un file di MOVIMENTI in 'Anagrafica Clienti'. Operazione bloccata.";
            } else if (hasClientFields || ('name' in sample)) {
              // It looks like a client
              analysis.isValid = true;
            } else {
              analysis.isValid = false;
              analysis.validationError = "Il file non sembra contenere dati Clienti validi.";
            }
          } else {
            // Logic for Movements
            if (hasClientFields) {
              analysis.isValid = false;
              analysis.validationError = "ERRORE CRITICO: Stai provando a importare un file di CLIENTI in 'Storico Movimenti'. Operazione bloccata.";
            } else if (hasMovementFields) {
              // It looks like a movement
              analysis.isValid = true;
            } else {
              analysis.isValid = false;
              analysis.validationError = "Il file non sembra contenere Movimenti validi.";
            }
          }
        }

        // Final Decision: Must be Valid AND (if Hex present, must be verified)
        // If Hex is NOT present (legacy), we rely solely on structure sniffing (isValid).
        // If strict mode requested by user ("If name in hex is correct then proceed, otherwise popup"), we implement this:
        const isHexCheckPassed = analysis.hexSignature ? analysis.isHexVerified : true;

        if (analysis.isValid && isHexCheckPassed) {
          if (importType === 'CLIENTI') dataToImport = { clients: candidates };
          else dataToImport = { movements: candidates };
          setPendingImport({ type: importType, data: dataToImport, analysis });
        } else {
          // Show error immediately if invalid
          setStatus({ type: 'error', msg: analysis.validationError || 'File non valido o firma digitale errata.' });
        }

      } catch (err: any) {
        console.error(err);
        setStatus({ type: 'error', msg: err.message || 'File non valido o corrotto.' });
      }
    }
  };

  const confirmRestart = async () => {
    if (!pendingRestartPath) return;

    await setDbPath(pendingRestartPath);

    // Request aggressive focus from main process
    ipcRenderer.send('app-focus');

    // Immediate reload
    window.location.reload();
  };

  const cancelRestart = () => {
    setPendingRestartPath(null);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    try {
      onImport(pendingImport.data);
      setStatus({ type: 'success', msg: `Ripristino ${pendingImport.type} completato.` });
      // Restore focus after logic execution
      window.focus();
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', msg: 'Errore durante il ripristino.' });
    } finally {
      setPendingImport(null);
    }
  };

  const cancelImport = () => {
    setPendingImport(null);
    window.focus();
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
      {/* Restart Confirmation Modal */}
      {pendingRestartPath && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-zoomIn border border-slate-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                <RefreshCw className="w-8 h-8 animate-spin-slow" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Riavvio Richiesto</h3>
              <p className="text-slate-600">
                Hai selezionato un nuovo percorso database:<br />
                <code className="text-xs bg-slate-100 px-2 py-1 rounded mt-2 inline-block max-w-xs truncate">{pendingRestartPath}</code>
              </p>
              <p className="text-slate-500 text-sm mt-4">
                È necessario riavviare l'applicazione per caricare i nuovi dati. Confermi il riavvio ora?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={cancelRestart}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={confirmRestart}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform active:scale-95"
              >
                Conferma e Riavvia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Modal */}
      {pendingImport && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-zoomIn border border-slate-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Attenzione: Sovrascrittura Dati</h3>
              <p className="text-slate-600">
                Stai per ripristinare i dati di: <strong>{pendingImport.type}</strong>.
              </p>

              <div className="w-full mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Formato</span>
                  <span className="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-700">{pendingImport.analysis.fileFormat}</span>
                </div>

                {/* Hex Verification UI */}
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Firma Digitale</span>
                  {pendingImport.analysis.isHexVerified ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                      <CheckCircle className="w-3 h-3" />
                      VERIFICATO
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                      NON PRESENTE (LEGACY)
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Elementi Trovati</span>
                  <span className="font-bold text-blue-600">{pendingImport.analysis.count}</span>
                </div>
              </div>

              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm font-medium">
                Questa operazione eliminerà i dati attuali di questa categoria e li sostituirà con quelli del file selezionato.
              </div>
              <p className="text-slate-500 text-sm mt-4">
                Vuoi procedere con il ripristino?
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={cancelImport}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                autoFocus // Focus on cancel for safety
              >
                Annulla
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg hover:shadow-amber-500/30 transition-all transform active:scale-95"
              >
                Conferma Ripristino
              </button>
            </div>
          </div>
        </div>
      )}

      {browserMode.isOpen && (
        <FileBrowser
          mode={browserMode.mode}
          title={
            browserMode.action === 'CHANGE_PATH' ? 'Seleziona Nuova Posizione Database' :
              browserMode.action === 'EXPORT_BACKUP' ? 'Salva File Backup' :
                'Seleziona File da Ripristinare'
          }
          allowedExtensions={browserMode.action === 'EXPORT_BACKUP' ? ['.zip'] : ['.json']}
          defaultSaveName={browserMode.action === 'EXPORT_BACKUP' ? `backup_${new Date().toISOString().split('T')[0]}.zip` : ''}
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
                Scarica una copia completa del database (Clienti e Movimenti) in formato ZIP (contenente due file separati).
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