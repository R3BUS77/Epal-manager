import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const BackupReminder: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkLastDay = () => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            // Se il mese di domani è diverso da oggi, allora oggi è l'ultimo giorno
            if (tomorrow.getMonth() !== today.getMonth()) {
                setIsVisible(true);
            }
        };

        checkLastDay();
    }, []);

    if (!isVisible) return null;

    return (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 shadow-sm animate-slideDown relative">
            <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 pt-1">
                <h4 className="text-sm font-bold text-amber-800 mb-1">
                    Promemoria Backup Fine Mese
                </h4>
                <p className="text-sm text-amber-700 leading-relaxed">
                    Oggi è l'ultimo giorno del mese. Ti consigliamo di effettuare un <strong>backup manuale</strong> del database dalle Impostazioni per evitare perdite di dati.
                </p>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-amber-100 text-amber-500 hover:text-amber-700 rounded transition-colors"
                title="Chiudi avviso"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
