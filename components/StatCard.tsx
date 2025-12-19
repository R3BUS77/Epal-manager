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
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-600',
  };

  const iconClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-rose-100 text-rose-600',
  };

  return (
    <div className={`p-6 rounded-xl shadow-sm border border-slate-200 bg-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className={`mt-2 text-3xl font-bold ${color === 'red' ? 'text-rose-600' : color === 'green' ? 'text-emerald-600' : 'text-slate-900'}`}>
            {value.toLocaleString()}
          </h3>
        </div>
        <div className={`p-3 rounded-lg ${iconClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {description && <p className="mt-4 text-sm text-slate-400">{description}</p>}
    </div>
  );
};