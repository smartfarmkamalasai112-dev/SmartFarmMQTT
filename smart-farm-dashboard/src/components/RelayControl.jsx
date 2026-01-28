import React from 'react';
import { Power, Cpu, Hand, AlertCircle } from 'lucide-react';

const DEVICES = [
  { name: 'ปั๊มน้ำ (Pump)', color: 'blue' },
  { name: 'พัดลม (Fan)', color: 'orange' },
  { name: 'ไฟส่องสว่าง (Lamp)', color: 'yellow' },
  { name: 'พ่นหมอก (Mist)', color: 'indigo' }
];

export default function RelayControl({ relays, mode, onToggleRelay, onToggleMode, connectionStatus }) {
  const isAuto = mode === 'AUTO';
  const isConnected = connectionStatus && connectionStatus.includes('Connected');

  return (
    <div className="space-y-6">
      {/* Card: โหมดการทำงาน */}
      <div className="bg-gradient-to-r from-white to-slate-50 p-6 rounded-3xl shadow-lg border border-slate-100 flex justify-between items-center hover:shadow-xl transition-shadow">
        <div>
          <h3 className="text-xl font-bold text-slate-800">โหมดการทำงาน</h3>
          <p className="text-sm text-slate-500 mt-1">{isConnected ? '✅ เลือกโหมดควบคุมอุปกรณ์' : '❌ ตัวควบคุมออฟไลน์'}</p>
        </div>
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl backdrop-blur-sm gap-1">
          <button
            onClick={() => !isAuto && isConnected && onToggleMode('AUTO')}
            disabled={isAuto || !isConnected}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              isAuto ? 'bg-green-500 text-white shadow-lg scale-105' : (!isConnected ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 cursor-pointer')
            }`}
          >
            <Cpu size={18} /> AUTO
          </button>
          <button
            onClick={() => isAuto && isConnected && onToggleMode('MANUAL')}
            disabled={!isAuto || !isConnected}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              !isAuto ? 'bg-red-500 text-white shadow-lg scale-105' : (!isConnected ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 cursor-pointer')
            }`}
          >
            <Hand size={18} /> MANUAL
          </button>
        </div>
      </div>

      {/* Grid: ปุ่ม Relay with Material Design 3 style */}
      <div className="grid grid-cols-2 gap-5">
        {DEVICES.map((dev, idx) => {
          const isOn = relays[idx];
          const btnColor = !isConnected 
            ? 'bg-slate-100 cursor-not-allowed' 
            : isOn 
              ? (isAuto ? 'bg-gradient-to-br from-green-500 to-green-600 cursor-not-allowed' : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 cursor-pointer') 
              : (isAuto ? 'bg-slate-200 cursor-not-allowed' : 'bg-white hover:bg-slate-50 cursor-pointer border-2 border-slate-200');
          
          const textColor = !isConnected ? 'text-slate-400' : (isOn ? 'text-white' : 'text-slate-700');

          return (
            <div 
              key={idx}
              onClick={() => !isAuto && isConnected && onToggleRelay(idx)}
              className={`${btnColor} p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group ${isOn && !isAuto ? 'scale-105' : ''} ${!isConnected || isAuto ? 'opacity-70' : 'hover:scale-105'}`}
            >
              {/* ✅ Gradient background for visual depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-3xl" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`p-4 rounded-full mb-3 transition-all transform ${!isConnected ? 'bg-slate-200 text-slate-400' : isOn ? 'bg-white/30 text-white scale-110 ring-4 ring-white/20' : 'bg-slate-100/80 text-slate-600'}`}>
                  <Power size={32} strokeWidth={1.5} />
                </div>
                <h4 className={`font-bold text-base transition-colors ${textColor}`}>{dev.name}</h4>
                <span className={`text-xs mt-2 px-3 py-1.5 rounded-full font-bold transition-all ${!isConnected ? 'bg-slate-200 text-slate-500' : isOn ? 'bg-white/30 text-white' : 'bg-slate-200/60 text-slate-600'}`}>
                  {!isConnected ? 'OFFLINE' : (isOn ? '✓ ON' : '○ OFF')}
                </span>
              </div>
              
              {/* ✅ AUTO mode badge */}
              {isConnected && isAuto && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[9px] px-2.5 py-1.5 rounded-full font-bold shadow-md">AUTO</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}