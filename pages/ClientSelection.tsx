import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ArrowRight, Truck, PackageCheck, ArrowRightLeft } from 'lucide-react';
import { Client, Movement } from '../types';

interface ClientSelectionProps {
    clients: Client[];
    movements: Movement[];
}

export const ClientSelection: React.FC<ClientSelectionProps> = ({ clients, movements }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.vatNumber.includes(searchTerm) ||
        (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getClientBalance = (clientId: string) => {
        let balance = 0;
        movements.forEach(m => {
            if (m.clientId === clientId) {
                const gave = (m.palletsShipping || 0) + (m.palletsExchange || 0) + (m.palletsReturned || 0);
                const received = (m.palletsGood || 0);
                balance += (gave - received);
            }
        });
        return balance;
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Movimenti Clienti</h1>
                    <p className="text-slate-500">Seleziona un cliente per visualizzare o gestire i suoi movimenti.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cerca per nome, P.IVA o codice..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 text-slate-900 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="text-sm text-slate-500 font-medium px-2 whitespace-nowrap">
                    {filteredClients.length} Clienti
                </div>
            </div>

            {/* Grid / List of Clients */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32 hidden sm:table-cell">Codice</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Saldo Pallets</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Azione</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredClients.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <User className="w-12 h-12 text-slate-200" />
                                        <p>Nessun cliente trovato.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredClients.map(client => {
                                const balance = getClientBalance(client.id);
                                return (
                                    <tr
                                        key={client.id}
                                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/clients/${client.id}`)}
                                    >
                                        <td className="px-6 py-4 font-mono text-sm text-slate-500 hidden sm:table-cell">
                                            {client.code || <span className="opacity-30">-</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{client.name}</div>
                                            <div className="text-xs text-slate-400">{client.vatNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-full text-sm font-bold ${balance > 0 ? 'bg-emerald-100 text-emerald-700' :
                                                    balance < 0 ? 'bg-rose-100 text-rose-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                {balance > 0 ? '+' : ''}{balance}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm"
                                            >
                                                <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
