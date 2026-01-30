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
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-700">โหมดการทำงาน</h3>
          <p className="text-xs text-slate-400">{isConnected ? 'เลือกโหมดควบคุมอุปกรณ์' : '❌ ตัวควบคุมออฟไลน์'}</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => onToggleMode()}
            disabled={isAuto || !isConnected}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isAuto ? 'bg-green-500 text-white shadow-md' : (!isConnected ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-slate-800')
            }`}
          >
            <Cpu size={16} /> AUTO
          </button>
          <button
            onClick={() => onToggleMode()}
            disabled={!isAuto || !isConnected}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              !isAuto ? 'bg-red-500 text-white shadow-md' : (!isConnected ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-slate-800')
            }`}
          >
            <Hand size={16} /> MANUAL
          </button>
        </div>
      </div>

      {/* Grid: ปุ่ม Relay */}
      <div className="grid grid-cols-2 gap-4">
        {DEVICES.map((dev, idx) => {
          const isOn = relays[idx];
          // สีปุ่มตามสถานะ
          const btnColor = !isConnected 
            ? 'bg-slate-100 cursor-not-allowed' 
            : isOn 
              ? (isAuto ? 'bg-green-500/80 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 cursor-pointer') 
              : (isAuto ? 'bg-slate-200 cursor-not-allowed' : 'bg-white hover:bg-slate-50 cursor-pointer border border-slate-200');
          
          const textColor = !isConnected ? 'text-slate-400' : (isOn ? 'text-white' : 'text-slate-600');

          return (
            <div 
              key={idx}
              onClick={() => !isAuto && isConnected && onToggleRelay(idx)}
              className={`${btnColor} p-4 rounded-2xl shadow-sm transition-all duration-200 relative overflow-hidden group`}
            >
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className={`p-3 rounded-full mb-2 ${!isConnected ? 'bg-slate-200 text-slate-400' : isOn ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Power size={24} />
                </div>
                <h4 className={`font-bold ${textColor}`}>{dev.name}</h4>
                <span className={`text-xs mt-1 px-2 py-0.5 rounded-full ${!isConnected ? 'bg-slate-200 text-slate-400' : isOn ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {!isConnected ? 'N/A' : (isOn ? 'ON' : 'OFF')}
                </span>
              </div>
              
              {/* แถบแจ้งเตือนถ้า Offline */}
              {!isConnected && (
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center opacity-100 transition-opacity">
                  <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded">Device Offline</span>
                </div>
              )}

              {/* แถบแจ้งเตือนถ้าเป็น Auto */}
              {isConnected && isAuto && (
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded">Locked (Auto)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}