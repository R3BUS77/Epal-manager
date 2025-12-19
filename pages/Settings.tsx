import React, { useRef, useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { exportData, validateAndParseImport } from '../services/storageService';
import { AppData } from '../types';

interface SettingsProps {
  onImport: (data: AppData) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsedData = validateAndParseImport(content);

      if (parsedData) {
        if(window.confirm('Attenzione: Questa azione sovrascriverà tutti i dati attuali con quelli del backup. Sei sicuro?')) {
            onImport(parsedData);
            setStatus({ type: 'success', msg: 'Database ripristinato con successo.' });
        }
      } else {
        setStatus({ type: 'error', msg: 'File di backup non valido o corrotto.' });
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
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
                {status.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                {status.msg}
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Export */}
          <div className="border border-slate-200 rounded-lg p-6 hover:border-blue-300 transition-colors flex flex-col">
            <h3 className="font-semibold text-lg text-slate-800 mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Backup (Esporta)
            </h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Scarica una copia completa del database (Clienti e Movimenti) in formato JSON. Utile per sicurezza o per spostare i dati su un altro computer.
            </p>
            <button
              onClick={exportData}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-auto"
            >
              Scarica Backup
            </button>
          </div>

          {/* Import */}
          <div className="border border-slate-200 rounded-lg p-6 hover:border-amber-300 transition-colors flex flex-col">
            <h3 className="font-semibold text-lg text-slate-800 mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600" />
              Ripristina (Importa)
            </h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">
              Carica un file di backup precedente. <br/>
              <span className="text-amber-600 font-medium flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3"/> Attenzione: I dati attuali verranno sostituiti.
              </span>
            </p>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors mt-auto"
            >
              Seleziona File Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};