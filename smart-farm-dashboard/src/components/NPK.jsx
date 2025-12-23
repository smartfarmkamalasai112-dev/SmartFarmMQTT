import React from 'react';

export default function NPK({ npk }) {
  const n = npk?.n || 0;
  const p = npk?.p || 0;
  const k = npk?.k || 0;

  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col justify-center">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">
        Nutrients (NPK)
      </div>
      
      <div className="grid grid-cols-3 gap-1 text-center items-end">
        <div>
          <div className="text-[20px] text-blue-500 font-bold">N</div>
          <div className="text-2xl font-black text-slate-700">{n}</div>
        </div>
        <div className="border-l border-r border-gray-100 h-8"></div>
        <div>
          <div className="text-[20px] text-orange-500 font-bold">P</div>
          <div className="text-2xl font-black text-slate-700">{p}</div>
        </div>
        <div></div>
        <div>
          <div className="text-[20px] text-purple-500 font-bold">K</div>
          <div className="text-2xl font-black text-slate-700">{k}</div>
        </div>
      </div>
    </div>
  );
}