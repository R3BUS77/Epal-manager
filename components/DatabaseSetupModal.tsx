import React, { useState } from 'react';
import { FolderOpen, Database, AlertCircle } from 'lucide-react';
import { setDbPath } from '../services/storageService';

const { ipcRenderer } = window.require('electron');

interface DatabaseSetupModalProps {
    onConfigured: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onConfigured }) => {
    const [error, setError] = useState<string | null>(null);

    const handleSelectFolder = async () => {
        try {
            const path = await ipcRenderer.invoke('select-directory');
            if (path) {
                setDbPath(path);
                onConfigured();
            }
        } catch (err) {
            console.error(err);
            setError("Impossibile selezionare la cartella. Riprova.");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database className="w-10 h-10" />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-3">Configurazione Database</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Per iniziare, seleziona la cartella dove verranno salvati i dati.<br />
                    Puoi scegliere una cartella locale o una <b>cartella condivisa in rete</b> per sincronizzare più postazioni.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 text-left">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <button
                    onClick={handleSelectFolder}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                    <FolderOpen className="w-6 h-6" />
                    Seleziona Cartella
                </button>

                <p className="mt-6 text-xs text-slate-400">
                    Potrai cambiare questa impostazione successivamente dal menu Backup.
                </p>
            </div>
        </div>
    );
};
