import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'red';
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, description }) => {
  const gradients = {
    blue: 'from-blue-500 to-indigo-600 shadow-blue-200',
    green: 'from-emerald-400 to-teal-500 shadow-emerald-200',
    red: 'from-rose-500 to-pink-600 shadow-rose-200',
  };

  const textColors = {
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    red: 'text-rose-600',
  };

  return (
    <div className="group relative bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100 overflow-hidden">
      {/* Background Decor */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradients[color]} opacity-[0.03] rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110`} />

      <div className="relative flex items-center justify-between z-10">
        <div>
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className={`mt-3 text-4xl font-bold tracking-tight ${textColors[color]}`}>
            {value.toLocaleString()}
          </h3>
        </div>
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradients[color]} text-white shadow-lg transform group-hover:rotate-6 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {description && (
        <div className="mt-4 pt-4 border-t border-slate-50 relative">
          <p className="text-sm text-slate-400 font-medium">{description}</p>
        </div>
      )}
    </div>
  );
};