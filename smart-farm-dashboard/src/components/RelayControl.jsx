import React from 'react';
import { Power, Cpu, Hand, AlertCircle } from 'lucide-react';

const DEVICE_NAMES = ['ปั๊มน้ำ (Pump)', 'พัดลม (Fan)', 'ไฟส่องสว่าง (Lamp)', 'พ่นหมอก (Mist)'];

export default function RelayControl({ relays, onToggleRelay, onToggleMode, connectionStatus }) {
  const isConnected = connectionStatus && connectionStatus.includes('Connected');
  
  // Handle both old and new relay formats
  const getRelayData = (idx) => {
    if (Array.isArray(relays)) {
      // Legacy format: simple array of booleans
      return {
        name: DEVICE_NAMES[idx],
        state: relays[idx] || false,
        mode: 'MANUAL'
      };
    } else if (relays && typeof relays === 'object' && relays.relays) {
      // New format: array of objects with {name, state, mode}
      return relays.relays[idx] || { name: DEVICE_NAMES[idx], state: false, mode: 'MANUAL' };
    }
    return { name: DEVICE_NAMES[idx], state: false, mode: 'MANUAL' };
  };

  return (
    <div className="space-y-6">
      {/* Grid: ปุ่ม Relay with independent mode toggles */}
      <div className="grid grid-cols-2 gap-5">
        {[0, 1, 2, 3].map((idx) => {
          const relay = getRelayData(idx);
          const isOn = relay.state;
          const isAuto = relay.mode === 'AUTO';
          
          const btnColor = !isConnected 
            ? 'bg-slate-100 cursor-not-allowed' 
            : isOn 
              ? 'bg-gradient-to-br from-green-500 to-green-600' 
              : 'bg-white border-2 border-slate-200';
          
          const textColor = !isConnected ? 'text-slate-400' : (isOn ? 'text-white' : 'text-slate-700');

          return (
            <div key={idx} className="space-y-3">
              {/* Relay Status Card */}
              <div 
                onClick={() => !isAuto && isConnected && onToggleRelay(idx)}
                className={`${btnColor} p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group ${isOn && !isAuto ? 'scale-105' : ''} ${!isConnected || isAuto ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-3xl" />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`p-4 rounded-full mb-3 transition-all transform ${!isConnected ? 'bg-slate-200 text-slate-400' : isOn ? 'bg-white/30 text-white scale-110 ring-4 ring-white/20' : 'bg-slate-100/80 text-slate-600'}`}>
                    <Power size={32} strokeWidth={1.5} />
                  </div>
                  <h4 className={`font-bold text-base transition-colors ${textColor}`}>{relay.name}</h4>
                  <span className={`text-xs mt-2 px-3 py-1.5 rounded-full font-bold transition-all ${!isConnected ? 'bg-slate-200 text-slate-500' : isOn ? 'bg-white/30 text-white' : 'bg-slate-200/60 text-slate-600'}`}>
                    {!isConnected ? 'OFFLINE' : (isOn ? '✓ ON' : '○ OFF')}
                  </span>
                </div>
              </div>

              {/* Mode Toggle for this relay */}
              <div className="flex bg-slate-100/80 p-1.5 rounded-2xl backdrop-blur-sm gap-1.5">
                <button
                  onClick={() => onToggleMode(idx, 'MANUAL')}
                  disabled={!isConnected}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    !isAuto 
                      ? 'bg-red-500 text-white shadow-lg' 
                      : (!isConnected ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')
                  }`}
                  title={`Set ${relay.name} to Manual Control`}
                >
                  <Hand size={14} /> MANUAL
                </button>
                <button
                  onClick={() => onToggleMode(idx, 'AUTO')}
                  disabled={!isConnected}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                    isAuto 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : (!isConnected ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/50')
                  }`}
                  title={`Set ${relay.name} to Auto Control`}
                >
                  <Cpu size={14} /> AUTO
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}