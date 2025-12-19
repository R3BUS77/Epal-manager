import React, { useState, useEffect } from 'react';
import { Client, Movement } from '../types';
import { Save, Calendar, Clock, CheckCircle, PackageCheck, Truck, ArrowRightLeft, RotateCcw } from 'lucide-react';

interface DailyMovementsProps {
    clients: Client[];
    onAddMovement: (m: Omit<Movement, 'id'>) => void;
}

export const DailyMovements: React.FC<DailyMovementsProps> = ({ clients, onAddMovement }) => {
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [inputs, setInputs] = useState({
        good: 0,      // Tot. Epal Buono
        shipping: 0,  // Tot. Epal Spedizioni
        exchange: 0,  // Tot. Epal Scambio/Misto
        returned: 0,  // Epal Reso
    });
    const [successMsg, setSuccessMsg] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Clock effect
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClientId) return;

        // Use selectedDate for the movement
        const commonDate = selectedDate;
        const timeString = new Date().toLocaleTimeString('it-IT');

        // Verifica se c'è almeno un valore
        const hasValues = inputs.good > 0 || inputs.shipping > 0 || inputs.exchange > 0 || inputs.returned > 0;

        if (hasValues) {
            onAddMovement({
                clientId: selectedClientId,
                date: commonDate,
                notes: `Reg. Giornaliera (${timeString})`,
                palletsGood: inputs.good,
                palletsShipping: inputs.shipping,
                palletsExchange: inputs.exchange,
                palletsReturned: inputs.returned
            });

            setSuccessMsg('Movimenti registrati con successo!');
            setInputs({ good: 0, shipping: 0, exchange: 0, returned: 0 });
            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMsg(''), 3000);
        } else {
            alert("Inserire almeno un valore maggiore di zero.");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">

            {/* Date/Time Header */}
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-blue-400" />
                        <input
                            type="date"
                            className="bg-transparent text-white font-bold border-none focus:ring-0 cursor-pointer appearance-none p-0 w-auto"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        {/* Fallback display if date input style is limited or to ensure clarity */}
                        <span className="text-sm font-normal text-slate-400 ml-2 hidden md:inline">
                            (Clicca per cambiare data)
                        </span>
                    </h2>
                    <p className="text-slate-400 mt-1">Registrazione andamento giornaliero</p>
                </div>
                <div className="mt-4 md:mt-0 bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2 font-mono text-xl text-blue-300 border border-slate-700">
                    <Clock className="w-5 h-5" />
                    {currentTime.toLocaleTimeString('it-IT')}
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">

                {successMsg && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        {successMsg}
                    </div>
                )}

                <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Seleziona Cliente</label>
                    <select
                        required
                        className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg shadow-sm"
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                    >
                        <option value="" disabled>-- Seleziona un cliente --</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.code ? `Cod.Cli: ${c.code} - ` : ''}{c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">

                    {/* Campo 1: Buono */}
                    <div className="relative group">
                        <div className="flex items-center gap-2 mb-2">
                            <PackageCheck className="w-5 h-5 text-slate-500" />
                            <label className="block text-sm font-bold text-slate-700">TOT. EPAL BUONO</label>
                        </div>
                        <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xl font-semibold shadow-sm transition-all group-hover:border-slate-400"
                            value={inputs.good || ''}
                            onChange={(e) => setInputs({ ...inputs, good: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                        />
                    </div>

                    {/* Campo 2: Spedizioni */}
                    <div className="relative group">
                        <div className="flex items-center gap-2 mb-2">
                            <Truck className="w-5 h-5 text-slate-500" />
                            <label className="block text-sm font-bold text-slate-700">TOT. EPAL SPEDIZIONI</label>
                        </div>
                        <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xl font-semibold shadow-sm transition-all group-hover:border-slate-400"
                            value={inputs.shipping || ''}
                            onChange={(e) => setInputs({ ...inputs, shipping: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                        />
                    </div>

                    {/* Campo 3: Scambio */}
                    <div className="relative group">
                        <div className="flex items-center gap-2 mb-2">
                            <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                            <label className="block text-sm font-bold text-slate-700">TOT. EPAL MISTO</label>
                        </div>
                        <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xl font-semibold shadow-sm transition-all group-hover:border-slate-400"
                            value={inputs.exchange || ''}
                            onChange={(e) => setInputs({ ...inputs, exchange: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                        />
                    </div>

                    {/* Campo 4: Reso */}
                    <div className="relative group">
                        <div className="flex items-center gap-2 mb-2">
                            <RotateCcw className="w-5 h-5 text-slate-500" />
                            <label className="block text-sm font-bold text-slate-700">EPAL RESO</label>
                        </div>
                        <input
                            type="number"
                            min="0"
                            className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xl font-semibold shadow-sm transition-all group-hover:border-slate-400"
                            value={inputs.returned || ''}
                            onChange={(e) => setInputs({ ...inputs, returned: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                        />
                    </div>

                </div>

                <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={!selectedClientId}
                        className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all ${!selectedClientId
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:transform active:scale-95'
                            }`}
                    >
                        <Save className="w-5 h-5" />
                        SALVA REGISTRAZIONE
                    </button>
                </div>
            </form>
        </div>
    );
};