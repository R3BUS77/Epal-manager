import React, { useState } from 'react';
import { Lock, RefreshCw, AlertOctagon } from 'lucide-react';
import { LockInfo, acquireLock, releaseLock, forceAcquireLockAsync } from '../services/lockService';

interface LockScreenProps {
    currentLockInfo: LockInfo | null; // Info about who holds the lock (passed from App when failure occurs)
    operatorName: string;
    onSuccess: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ currentLockInfo, operatorName, onSuccess }) => {
    // We keep a local state of lock info in case we re-check and find a different person
    const [lockHolder, setLockHolder] = useState<LockInfo | null>(currentLockInfo);
    const [isChecking, setIsChecking] = useState(false);

    const handleRetry = () => {
        setIsChecking(true);
        setTimeout(() => {
            const result = acquireLock(operatorName);
            if (result.success) {
                onSuccess();
            } else {
                setLockHolder(result.info || null);
            }
            setIsChecking(false);
        }, 500); // Small artificial delay for UX feel
    };

    const handleForceUnlock = async () => {
        if (window.confirm("Sei SICURO di voler forzare lo sblocco?\n\nFallo SOLO se sei certo che l'altro utente non sta lavorando o se il suo PC è spento.\nC'è rischio di perdere dati se entrambi salvate contemporaneamente.")) {
            setIsChecking(true);
            try {
                // Call robust force acquire logic
                const result = await forceAcquireLockAsync(operatorName);
                if (result.success) {
                    onSuccess();
                } else {
                    alert("Impossibile forzare il blocco. Controllare i permessi di rete.");
                    setLockHolder(result.info || null);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsChecking(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[200] flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-amber-400 p-6 flex flex-col items-center justify-center text-amber-900">
                    <Lock className="w-16 h-16 mb-2" />
                    <h1 className="text-2xl font-bold uppercase tracking-wide">Database Bloccato</h1>
                </div>

                <div className="p-8 text-center bg-white">
                    <p className="text-slate-600 text-lg mb-6">
                        Impossibile accedere al database perché è attualmente in uso da un altro utente.
                    </p>

                    {lockHolder && (
                        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-8 text-left">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Bloccato da:</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xl font-bold text-slate-800">{lockHolder.operator}</p>
                                    <p className="text-sm text-slate-500">{lockHolder.machine}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 mb-1">Ultimo segnale:</p>
                                    <p className="text-sm font-mono bg-white px-2 py-1 rounded border border-slate-200">
                                        {new Date(lockHolder.lastHeartbeat).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <button
                            onClick={handleRetry}
                            disabled={isChecking}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
                            {isChecking ? 'Controllo...' : 'Riprova Accesso'}
                        </button>

                        <button
                            onClick={handleForceUnlock}
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-red-600 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <AlertOctagon className="w-4 h-4" />
                            Forza Sblocco (Emergenza)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
