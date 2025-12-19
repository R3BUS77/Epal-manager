import React, { useState } from 'react';
import { User, LogIn } from 'lucide-react';

interface OperatorModalProps {
    onSubmit: (name: string) => void;
}

export const OperatorModal: React.FC<OperatorModalProps> = ({ onSubmit }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            const validName = name.trim();
            localStorage.setItem('epal_operator', validName); // Force save
            onSubmit(validName);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 border border-slate-200">
                <div className="text-center mb-8">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <User className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Chi sta utilizzando Epal Manager?</h2>
                    <p className="text-slate-500 mt-2">Inserisci il tuo nome per iniziare il turno.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Nome Operatore
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                            placeholder="Es. Mario Rossi"
                            autoFocus
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                    >
                        <LogIn className="w-5 h-5" />
                        Inizia Sessione
                    </button>
                </form>
            </div>
        </div>
    );
};
