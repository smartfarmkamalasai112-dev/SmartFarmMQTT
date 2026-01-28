import React from 'react';

export default function StatCard({ icon: Icon, title, value, unit, color }) {
  const colorClasses = {
    blue: { icon: 'text-blue-500', gradient: 'from-blue-50 to-cyan-50', accent: '#3b82f6' },
    green: { icon: 'text-green-500', gradient: 'from-green-50 to-emerald-50', accent: '#10b981' },
    orange: { icon: 'text-orange-500', gradient: 'from-orange-50 to-amber-50', accent: '#f97316' },
    purple: { icon: 'text-purple-500', gradient: 'from-purple-50 to-pink-50', accent: '#a855f7' },
    yellow: { icon: 'text-yellow-500', gradient: 'from-yellow-50 to-orange-50', accent: '#eab308' },
    red: { icon: 'text-red-500', gradient: 'from-red-50 to-rose-50', accent: '#ef4444' },
    teal: { icon: 'text-teal-500', gradient: 'from-teal-50 to-cyan-50', accent: '#14b8a6' }
  };

  const colorSet = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`bg-gradient-to-br ${colorSet.gradient} backdrop-blur-sm rounded-2xl p-5 shadow-sm hover:shadow-md border border-white/60 transition-all duration-300 hover:-translate-y-1`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900">{value || '-'}</span>
            <span className="text-sm text-slate-500 font-medium">{unit}</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl bg-white/70 ${colorSet.icon}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}