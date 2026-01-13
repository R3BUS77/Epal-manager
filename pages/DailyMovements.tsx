import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Client, Movement } from '../types';
import { Save, Calendar, CheckCircle, PackageCheck, Truck, ArrowRightLeft, RotateCcw, Search, AlertTriangle, X } from 'lucide-react';

interface DailyMovementsProps {
    clients: Client[];
    onAddMovement: (m: Omit<Movement, 'id'>) => void;
    movements?: Movement[]; // Pass existing movements for duplicate check
}

export const DailyMovements: React.FC<DailyMovementsProps> = ({ clients, onAddMovement, movements = [] }) => {
    // State per la data
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // State per la ricerca cliente
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Inputs
    const [inputs, setInputs] = useState({
        good: '',      // String per permettere input vuoti o formule temporanee
        shipping: '',
        exchange: '',
        returned: '',
    });

    const [successMsg, setSuccessMsg] = useState('');
    const [duplicateWarning, setDuplicateWarning] = useState(false);

    // Generic Modal State for errors/warnings replcing native alert()
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'error' | 'warning' } | null>(null);

    // Refs per focus management
    const searchRef = useRef<HTMLInputElement>(null);
    const goodRef = useRef<HTMLInputElement>(null);
    const shippingRef = useRef<HTMLInputElement>(null);
    const exchangeRef = useRef<HTMLInputElement>(null);
    const returnedRef = useRef<HTMLInputElement>(null);
    const saveButtonRef = useRef<HTMLButtonElement>(null);

    // Handle Enter key for Alert Modal
    useEffect(() => {
        if (!alertModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                setAlertModal(null);
                if (alertModal.title.includes('Cliente')) searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [alertModal]);

    // Reset dopo salvataggio
    const resetForm = (keepDate = true) => {
        setInputs({ good: '', shipping: '', exchange: '', returned: '' });
        setClientSearch('');
        setSelectedClient(null);
        setDuplicateWarning(false);
        if (!keepDate) setSelectedDate(new Date().toISOString().split('T')[0]);

        // Focus torna al cliente
        setTimeout(() => searchRef.current?.focus(), 100);
    };

    // Gestione Ricerca Cliente
    useEffect(() => {
        const term = clientSearch.trim().toLowerCase();
        if (!term) {
            setSelectedClient(null);
            return;
        }

        // 1. Cerca per Codice Esatto prima
        let found = clients.find(c => (c.code || '').toLowerCase() === term);

        // 2. Se non trova e il termine è numerico, prova a cercare per codice "ignora zeri iniziali"
        //    (es. utente scrive "5", trova cliente "005")
        if (!found && /^\d+$/.test(term)) {
            const termNumber = parseInt(term, 10);
            found = clients.find(c => {
                if (!c.code) return false;
                // Controlla se il codice cliente è numerico (o stringa numerica)
                // e se il valore numerico corrisponde
                const codeNumber = parseInt(c.code, 10);
                return !isNaN(codeNumber) && codeNumber === termNumber;
            });
        }

        // 3. Se non trova per codice, prova per nome (se il termine è abbastanza lungo)
        if (!found && term.length > 2) {
            found = clients.find(c => c.name.toLowerCase().includes(term));
        }

        setSelectedClient(found || null);
    }, [clientSearch, clients]);

    // FOCUS MANAGEMENT FIX: Ensure focus on mount (navigation return)
    useEffect(() => {
        // Small timeout to ensure DOM is ready and any animations are done
        const timer = setTimeout(() => {
            searchRef.current?.focus();
        }, 150);
        return () => clearTimeout(timer);
    }, []);


    // Helper per valutare espressioni matematiche semplici (es. "10+5") o numeri
    const parseValue = (val: string): number => {
        if (!val) return 0;
        try {
            // Sostituisce virgola con punto per sicurezza
            const safeVal = val.replace(',', '.');
            // Valutazione sicura (accetta solo numeri, +, -, *, /)
            if (/^[0-9+\-*/. ]+$/.test(safeVal)) {
                // eslint-disable-next-line no-new-func
                return Function(`"use strict"; return (${safeVal})`)() || 0;
            }
            return parseFloat(safeVal) || 0;
        } catch {
            return 0;
        }
    };

    const handleSave = () => {
        if (!selectedClient) return;

        const valGood = parseValue(inputs.good);
        const valShipping = parseValue(inputs.shipping);
        const valExchange = parseValue(inputs.exchange);
        const valReturned = parseValue(inputs.returned);

        // 1. Check Vuoto
        if (valGood === 0 && valShipping === 0 && valExchange === 0 && valReturned === 0) {
            // REPLACED NATIVE ALERT
            setAlertModal({
                isOpen: true,
                title: 'Nessun Valore Inserito',
                message: 'Inserisci almeno un valore in Buono, Spedizioni, Misto o Reso per salvare.',
                type: 'warning'
            });
            return;
        }

        // 2. Check Duplicati
        // Cerca se esiste già un movimento per questo cliente, in questa data, con ESATTAMENTE gli stessi valori
        const isDuplicate = movements.some(m =>
            m.clientId === selectedClient.id &&
            m.date === selectedDate &&
            m.palletsGood === valGood &&
            m.palletsShipping === valShipping &&
            m.palletsExchange === valExchange &&
            m.palletsReturned === valReturned
        );

        if (isDuplicate && !duplicateWarning) {
            setDuplicateWarning(true);
            return; // Ferma il salvataggio per chiedere conferma
        }

        // Procedi al salvataggio
        const timeString = new Date().toLocaleTimeString('it-IT');
        onAddMovement({
            clientId: selectedClient.id,
            date: selectedDate,
            notes: `Reg. Rapida (${timeString})`,
            palletsGood: valGood,
            palletsShipping: valShipping,
            palletsExchange: valExchange,
            palletsReturned: valReturned
        });

        setSuccessMsg('Salvato!');
        setTimeout(() => setSuccessMsg(''), 2000);
        resetForm();
    };

    // Gestione Tasti (Navigation)
    const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
        // Gestione Shift+Tab per tornare indietro
        if (e.shiftKey && e.key === 'Tab') {
            e.preventDefault();
            switch (fieldName) {
                case 'good':
                    searchRef.current?.focus();
                    break;
                case 'shipping':
                    goodRef.current?.focus();
                    break;
                case 'exchange':
                    shippingRef.current?.focus();
                    break;
                case 'returned':
                    exchangeRef.current?.focus();
                    break;
            }
            return;
        }

        // Gestione Enter o Tab (Avanti)
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();

            // Logica specifica per campo
            switch (fieldName) {
                case 'search':
                    if (selectedClient) {
                        goodRef.current?.focus();
                    } else {
                        // REPLACED NATIVE ALERT
                        setAlertModal({
                            isOpen: true,
                            title: 'Cliente non trovato',
                            message: 'Nessun cliente corrisponde ai criteri di ricerca. Controlla il codice o il nome.',
                            type: 'error'
                        });
                    }
                    break;
                case 'good':
                    shippingRef.current?.focus();
                    break;
                case 'shipping':
                    exchangeRef.current?.focus();
                    break;
                case 'exchange':
                    returnedRef.current?.focus();
                    break;
                case 'returned':
                    // Ultimo campo: tenta il salvataggio
                    handleSave();
                    break;
            }
        }
    };

    // Helper per Input
    const handleInputChange = (field: keyof typeof inputs, val: string) => {
        setInputs(prev => ({ ...prev, [field]: val }));
    };

    // Helper onBlur per calcolare subito il risultato visivo (opzionale)
    const handleBlur = (field: keyof typeof inputs) => {
        const val = inputs[field];
        if (val && /[\+\-\*\/]/.test(val)) {
            const result = parseValue(val);
            setInputs(prev => ({ ...prev, [field]: result.toString() }));
        }
    };

    return (
        <div className="max-w-3xl mx-auto">

            {/* ERROR / INFO MODAL (PREMIUM STYLE - CENTERED LIKE SETTINGS) - PORTAL */}
            {alertModal && createPortal(
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200 border border-slate-100">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${alertModal.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                {alertModal.type === 'error' ? <X className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">{alertModal.title}</h3>
                            <p className="text-slate-600 text-lg leading-relaxed">
                                {alertModal.message}
                            </p>
                        </div>

                        <div className="flex justify-center w-full">
                            <button
                                onClick={() => {
                                    setAlertModal(null);
                                    // Refocus search if check failed there
                                    if (alertModal.title.includes('Cliente')) searchRef.current?.focus();
                                }}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* DUPLICATE WARNING MODAL - PORTAL */}
            {duplicateWarning && createPortal(
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-xl font-bold">Rilevato Duplicato</h3>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Esiste già una registrazione identica per <strong>{selectedClient?.name}</strong> in questa data.
                            <br />Vuoi salvarla comunque?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDuplicateWarning(false)}
                                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSave} // Calls save again, logic will skip check because duplicateWarning is true
                                className="px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700"
                            >
                                Conferma Salvataggio
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Header Data */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg mb-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-blue-400" />
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Data Registrazione</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-xl font-bold border-none p-0 focus:ring-0 w-40 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer"
                        />
                    </div>
                </div>
                {successMsg && (
                    <div className="px-4 py-1 bg-emerald-500 text-white rounded-full text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-right">
                        <CheckCircle className="w-4 h-4" /> {successMsg}
                    </div>
                )}
            </div>

            {/* Main Entry Card */}
            <div className={`bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transition-all ${selectedClient ? 'ring-2 ring-blue-500 shadow-blue-200/50' : ''}`}>

                {/* 1. SELEZIONE CLIENTE */}
                <div className="p-6 bg-slate-50 border-b border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 tracking-wide mb-2">
                        1. Identificazione Cliente
                    </label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Digita Codice (esatto) o Nome..."
                            className="w-full pl-12 pr-4 py-4 text-xl font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 placeholder:normal-case placeholder:font-sans"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, 'search')}
                            autoFocus
                        />
                        {/* Indicatore Cliente Trovato */}
                        {selectedClient && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 animate-in fade-in zoom-in">
                                <CheckCircle className="w-5 h-5 fill-emerald-600 text-white" />
                                <span className="font-bold text-sm max-w-[200px] truncate">{selectedClient.name}</span>
                            </div>
                        )}
                        {!selectedClient && clientSearch.length > 0 && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium italic">
                                ...
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. DATI MOVIMENTO - Vertical Layout */}
                <div className={`p-5 space-y-4 transition-opacity duration-300 ${selectedClient ? 'opacity-100' : 'opacity-40 pointer-events-none filter grayscale'}`}>

                    {/* Buono */}
                    <div className="flex items-center gap-6">
                        <div className="w-1/3 flex items-center gap-3 text-slate-600">
                            <div className="p-2 bg-slate-100 rounded-lg"><PackageCheck className="w-6 h-6" /></div>
                            <span className="font-bold text-lg">EPAL BUONO</span>
                        </div>
                        <div className="flex-1">
                            <input
                                ref={goodRef}
                                type="text"
                                className="w-full text-right px-4 py-1.5 text-base font-bold font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-blue-50 focus:scale-[1.02] focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 transform"
                                placeholder="0"
                                value={inputs.good}
                                onChange={e => handleInputChange('good', e.target.value)}
                                onBlur={() => handleBlur('good')}
                                onKeyDown={e => handleKeyDown(e, 'good')}
                            />
                        </div>
                    </div>

                    {/* Spedizioni */}
                    <div className="flex items-center gap-6">
                        <div className="w-1/3 flex items-center gap-3 text-slate-600">
                            <div className="p-2 bg-slate-100 rounded-lg"><Truck className="w-6 h-6" /></div>
                            <span className="font-bold text-lg">SPEDIZIONI</span>
                        </div>
                        <div className="flex-1">
                            <input
                                ref={shippingRef}
                                type="text"
                                className="w-full text-right px-4 py-1.5 text-base font-bold font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-blue-50 focus:scale-[1.02] focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 transform"
                                placeholder="0"
                                value={inputs.shipping}
                                onChange={e => handleInputChange('shipping', e.target.value)}
                                onBlur={() => handleBlur('shipping')}
                                onKeyDown={e => handleKeyDown(e, 'shipping')}
                            />
                        </div>
                    </div>

                    {/* Misto */}
                    <div className="flex items-center gap-6">
                        <div className="w-1/3 flex items-center gap-3 text-slate-600">
                            <div className="p-2 bg-slate-100 rounded-lg"><ArrowRightLeft className="w-6 h-6" /></div>
                            <span className="font-bold text-lg">MISTO</span>
                        </div>
                        <div className="flex-1">
                            <input
                                ref={exchangeRef}
                                type="text"
                                className="w-full text-right px-4 py-1.5 text-base font-bold font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-blue-50 focus:scale-[1.02] focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 transform"
                                placeholder="0"
                                value={inputs.exchange}
                                onChange={e => handleInputChange('exchange', e.target.value)}
                                onBlur={() => handleBlur('exchange')}
                                onKeyDown={e => handleKeyDown(e, 'exchange')}
                            />
                        </div>
                    </div>

                    {/* Reso */}
                    <div className="flex items-center gap-6 pt-6 border-t border-slate-100 border-dashed">
                        <div className="w-1/3 flex items-center gap-3 text-rose-600">
                            <div className="p-2 bg-rose-50 rounded-lg"><RotateCcw className="w-6 h-6" /></div>
                            <span className="font-bold text-lg">RESO</span>
                        </div>
                        <div className="flex-1">
                            <input
                                ref={returnedRef}
                                type="text"
                                className="w-full text-right px-4 py-1.5 text-base font-bold font-mono text-rose-600 bg-rose-50/30 border border-rose-200 rounded-xl focus:bg-rose-50 focus:scale-[1.02] focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-rose-500/30 focus:border-rose-500 transition-all duration-200 transform placeholder:text-rose-200"
                                placeholder="0"
                                value={inputs.returned}
                                onChange={e => handleInputChange('returned', e.target.value)}
                                onBlur={() => handleBlur('returned')}
                                onKeyDown={e => handleKeyDown(e, 'returned')}
                            />
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <button
                        onClick={() => resetForm()}
                        className="px-6 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                        tabIndex={-1} // Skip tab order
                    >
                        Pulisci
                    </button>
                    <button
                        ref={saveButtonRef}
                        onClick={handleSave}
                        disabled={!selectedClient}
                        className={`flex items-center gap-3 px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 ${selectedClient
                            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                            }`}
                    >
                        <Save className="w-6 h-6" />
                        SALVA REGISTRAZIONE
                    </button>
                </div>
            </div>

            <p className="text-center text-slate-400 mt-6 text-sm">
                Suggerimento: Premi <strong>INVIO</strong> per passare al campo successivo. All'ultimo campo SALVA automaticamente.
            </p>
        </div>
    );
};