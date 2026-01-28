import React from 'react';

export default function NPK({ npk }) {
  // ??????: ?????????????? ????????? 0
  const { n, p, k } = npk || { n: 0, p: 0, k: 0 };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 h-full flex flex-col justify-center">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-bold text-center">
        Nutrients (NPK)
      </div>
      
      <div className="flex gap-4 justify-between items-center h-full">
        {/* Nitrogen (N) */}
        <div className="text-center w-1/3">
          <div className="text-xl font-black text-blue-500 mb-1">N</div>
          <div className="text-3xl font-extrabold text-slate-700">{n}</div>
          <div className="text-[10px] text-gray-400">mg/kg</div>
        </div>
        
        {/* Phosphorus (P) */}
        <div className="text-center w-1/3 border-l-2 border-r-2 border-gray-100 px-2">
          <div className="text-xl font-black text-orange-500 mb-1">P</div>
          <div className="text-3xl font-extrabold text-slate-700">{p}</div>
          <div className="text-[10px] text-gray-400">mg/kg</div>
        </div>
        
        {/* Potassium (K) */}
        <div className="text-center w-1/3">
          <div className="text-xl font-black text-purple-500 mb-1">K</div>
          <div className="text-3xl font-extrabold text-slate-700">{k}</div>
          <div className="text-[10px] text-gray-400">mg/kg</div>
        </div>
      </div>
    </div>
  );
}