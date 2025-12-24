import React, { useState } from 'react';
import { FolderOpen, Database, AlertCircle, MonitorOff } from 'lucide-react';
import { setDbPath } from '../services/storageService';
import { FileBrowser } from './FileBrowser';

interface DatabaseSetupModalProps {
    onConfigured: () => void;
    onSkip: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onConfigured, onSkip }) => {
    const [error, setError] = useState<string | null>(null);
    const [showBrowser, setShowBrowser] = useState(false);

    const handleSelectFolder = async (path: string) => {
        try {
            if (path) {
                await setDbPath(path);
                setShowBrowser(false);
                onConfigured();
                // Awaited setDbPath already does some storage work, but App.tsx reloading logic needs to trigger
                window.location.reload();
            }
        } catch (err) {
            console.error(err);
            setError("Impossibile selezionare la cartella. Riprova.");
        }
    };

    return (
        <>
            {showBrowser && (
                <FileBrowser
                    mode="directory"
                    title="Seleziona Cartella Database"
                    onSelect={handleSelectFolder}
                    onCancel={() => setShowBrowser(false)}
                />
            )}

            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[40] p-4 animate-fadeIn">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-200 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform rotate-3">
                        <Database className="w-10 h-10" />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Configurazione Database</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                        Seleziona la cartella dove verranno salvati i dati.<br />
                        Puoi scegliere una cartella locale o di rete.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-left border border-red-100">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={() => setShowBrowser(true)}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 mb-4"
                    >
                        <FolderOpen className="w-6 h-6" />
                        Seleziona Cartella
                    </button>

                    <button
                        onClick={onSkip}
                        className="w-full py-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl font-semibold text-sm transition-colors border border-transparent hover:border-slate-200 flex items-center justify-center gap-2"
                    >
                        <MonitorOff className="w-4 h-4" />
                        Configura più tardi (Solo Lettura)
                    </button>

                    <p className="mt-6 text-xs text-slate-400 font-medium">
                        Potrai cambiare questa impostazione successivamente.
                    </p>
                </div>
            </div>
        </>
    );
};
