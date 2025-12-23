import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Database, PackageOpen, ClipboardPen, CalendarDays, Power, ScrollText } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  operatorName?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, operatorName }) => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Registra Movimenti', path: '/daily', icon: ClipboardPen },
    { label: 'Movimenti Clienti', path: '/client-movements', icon: ScrollText }, // Punteggio alla stessa rotta per ora
    { label: 'Anagrafica Clienti', path: '/clients', icon: Users },
    { label: 'Calendario', path: '/calendar', icon: CalendarDays },
    { label: 'Impostazioni & Backup', path: '/settings', icon: Database },
  ];

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-700">
          <PackageOpen className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Epal Manager</h1>
            <p className="text-xs text-slate-400">Pro Logistics</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => window.close()}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors mb-2"
          >
            <Power className="w-5 h-5" />
            <span className="font-medium">Esci</span>
          </button>
          <p className="text-xs text-slate-500 text-center">
            &copy; {new Date().getFullYear()} Nicolini Loris<br />
            <span className="opacity-50">v1.5</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-800">
            {location.pathname === '/' && 'Panoramica'}
            {location.pathname === '/daily' && 'Inserimento Giornaliero'}
            {location.pathname.startsWith('/clients') && 'Gestione Clienti'}
            {location.pathname === '/calendar' && 'Calendario & Festività'}
            {location.pathname === '/settings' && 'Database & Backup'}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">
              {operatorName ? `Benvenuto, ${operatorName}` : ''}
            </span>
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              {operatorName ? operatorName.charAt(0).toUpperCase() : '?'}
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};