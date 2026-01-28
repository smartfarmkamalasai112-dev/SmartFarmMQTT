import React from 'react';

export default function Card({ title, value, bgGradient = 'from-blue-50 to-blue-100' }) {
  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-white/50 flex flex-col justify-center items-center h-full`}>
      {/* ✅ Modern label */}
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 opacity-90">
        {title}
      </div>
      
      {/* ✅ Large readable number with modern styling */}
      <div className="text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight text-center leading-tight">
        {value}
      </div>
    </div>
  );
}