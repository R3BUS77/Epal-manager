import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetails } from './pages/ClientDetails';
import { DailyMovements } from './pages/DailyMovements';
import { Settings } from './pages/Settings';
import { CalendarPage } from './pages/CalendarPage';
import { Client, Movement, AppData } from './types';
import { getClientsAsync, getMovementsAsync, saveClientsAsync, saveMovementsAsync, getDbPath } from './services/storageService';
import { acquireLockAsync, releaseLockAsync, LockInfo } from './services/lockService';
import { OperatorModal } from './components/OperatorModal';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { LockScreen } from './components/LockScreen';
import { RefreshCw, Database } from 'lucide-react'; // Added icons for Error Screen

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

// ipcRenderer for directory selection
const { ipcRenderer } = window.require('electron');

function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [operatorName, setOperatorName] = useState<string>('');

  // Loading State for Async Ops
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false); // New Error State

  // New state for DB configuration
  const [isDbConfigured, setIsDbConfigured] = useState<boolean>(!!getDbPath());

  // Lock State
  const [isLocked, setIsLocked] = useState(false); // Do we have the lock?
  const [lockConflict, setLockConflict] = useState<LockInfo | null>(null); // Who has it if not us?

  // Load initial data (Async)
  useEffect(() => {
    const loadData = async () => {
      if (isDbConfigured) {
        setIsLoading(true);
        setLoadError(false);

        // Timeout Promise
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        );

        try {
          const [c, m] = await Promise.race([
            Promise.all([getClientsAsync(), getMovementsAsync()]),
            timeout
          ]) as [Client[], Movement[]];

          setClients(c);
          setMovements(m);
          setIsLoaded(true);
          setIsLoading(false);
        } catch (e) {
          console.error("Data load failed or timed out", e);
          setLoadError(true);
          setIsLoading(false);
        }
      }
    };
    loadData();
  }, [isDbConfigured]);

  // Attempt to acquire lock when operator is set (Async)
  useEffect(() => {
    const tryLock = async () => {
      if (isDbConfigured && operatorName && !isLocked) {
        setIsLoading(true);
        const result = await acquireLockAsync(operatorName);
        setIsLoading(false);

        if (result.success) {
          setIsLocked(true);
          setLockConflict(null);
        } else {
          setLockConflict(result.info || null);
        }
      }
    };
    tryLock();
  }, [isDbConfigured, operatorName, isLocked]);

  // Release lock on unmount/close
  useEffect(() => {
    const handleUnload = () => {
      if (isLocked) releaseLockAsync();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      if (isLocked) releaseLockAsync();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [isLocked]);

  // Save changes (Async - fire and forget, effectively, or we could show saving state)
  useEffect(() => {
    if (isLoaded && isDbConfigured && isLocked) {
      saveClientsAsync(clients);
    }
  }, [clients, isLoaded, isDbConfigured, isLocked]);

  useEffect(() => {
    if (isLoaded && isDbConfigured && isLocked) {
      saveMovementsAsync(movements);
    }
  }, [movements, isLoaded, isDbConfigured, isLocked]);

  const handleDbConfigured = () => {
    setIsDbConfigured(true);
    // Data load will trigger via existing useEffect
  };

  const handleNewDbSelection = async () => {
    try {
      const path = await ipcRenderer.invoke('select-directory');
      if (path) {
        // Set new path (this triggers init logic in storageService which creates files)
        const { setDbPath } = await import('./services/storageService');
        setDbPath(path);

        // Reset state to trigger reload
        setLoadError(false);
        // setIsDbConfigured(true) is already true but the effect depends on it. 
        // We can force a reload by toggling or just let the setDbPath's side effect (reload) happen? 
        // Actually setDbPath in storageService relies on App reloading or us re-firing.
        // Let's just reload the page to be clean and safe ensuring fresh state
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLockSuccess = () => {
    setIsLocked(true);
    setLockConflict(null);
  }

  // --- CRUD Handlers (Pass through to UI) ---
  const addClient = (client: Omit<Client, 'id'>) => {
    setClients([...clients, { ...client, id: generateId() }]);
  };

  const updateClient = (id: string, updated: Partial<Client>) => {
    setClients(clients.map(c => c.id === id ? { ...c, ...updated } : c));
  };

  const deleteClient = (id: string) => {
    const pending = movements.filter(m => m.clientId === id).length;
    if (pending > 0) {
      // Alert handled by UI generally, but here we just block if needed or force. 
      // For now, let's just delete. The UI usually confirms.
    }
    setClients(clients.filter(c => c.id !== id));
  };

  const addMovement = (movement: Omit<Movement, 'id'>) => {
    setMovements([...movements, { ...movement, id: generateId() }]);
  };

  const updateMovement = (id: string, updated: Partial<Movement>) => {
    setMovements(movements.map(m => m.id === id ? { ...m, ...updated } : m));
  };

  const deleteMovement = (id: string) => {
    setMovements(movements.filter(m => m.id !== id));
  };

  const handleImport = (data: AppData) => {
    setClients(data.clients);
    setMovements(data.movements);
    // It will auto-save via useEffect
  };


  // Determine what to render

  // 0. Loading Overlay
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-slate-700">Caricamento in corso...</h2>
        <p className="text-slate-500">Accesso al database aziendale</p>
      </div>
    );
  }

  // 0.5. Load Error / Recovery Screen
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Database non trovato</h2>
          <p className="text-slate-600 mb-8">
            Impossibile trovare i file di archivio nel percorso specificato.
            <br /><span className="text-sm opacity-75">Potrebbero essere stati spostati o non ancora creati.</span>
          </p>

          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Cosa vuoi fare?</p>

            <button
              onClick={handleNewDbSelection}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
            >
              <Database className="w-5 h-5" />
              Seleziona / Crea Nuovo Database
            </button>
            <p className="text-xs text-slate-400 px-4">
              Seleziona una cartella vuota per creare un nuovo archivio, oppure una cartella esistente per collegarti.
            </p>

            <div className="h-4"></div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Riprova Connessione
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. DB Setup
  if (!isDbConfigured) {
    return <DatabaseSetupModal onConfigured={handleDbConfigured} />;
  }

  // 2. Operator Setup
  if (!operatorName) {
    return <OperatorModal onSubmit={setOperatorName} />;
  }

  // 3. Lock Check (Blocking)
  if (lockConflict) {
    return <LockScreen
      currentLockInfo={lockConflict}
      operatorName={operatorName}
      onSuccess={handleLockSuccess}
    />;
  }

  return (
    <HashRouter>
      <Layout operatorName={operatorName}>
        <Routes>
          <Route path="/" element={<Dashboard clients={clients} movements={movements} operatorName={operatorName} />} />
          <Route path="/daily" element={
            <DailyMovements
              clients={clients}
              onAddMovement={addMovement}
            />
          } />
          <Route path="/clients" element={
            <Clients
              clients={clients}
              movements={movements}
              onAddClient={addClient}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
            />
          } />
          <Route path="/client-movements" element={
            <Clients
              clients={clients}
              movements={movements}
              onAddClient={addClient}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
            />
          } />
          <Route path="/clients/:id" element={
            <ClientDetails
              clients={clients}
              movements={movements}
              onAddMovement={addMovement}
              onUpdateMovement={updateMovement}
              onDeleteMovement={deleteMovement}
            />
          } />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<Settings onImport={handleImport} />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;