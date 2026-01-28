import React from 'react';
import { Thermometer, Droplets, Sprout, Sun, CloudFog, FlaskConical, Wind } from 'lucide-react';
import Card from '../components/Card';
import NPK from '../components/NPK';

export default function MonitorPage({ displayData }) {
  
  const showVal = (val, unit) => {
    if (val === undefined || val === null) return <span className="text-gray-300">--</span>;
    return `${Number(val).toFixed(1)}${unit ? ' ' + unit : ''}`;
  };

  const MetricCard = ({ icon: Icon, label, value, unit, color }) => (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 shadow-sm border border-white/50`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-600">{unit}</p>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/60">
          <Icon size={24} className="text-slate-700" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full pb-6">
      {/* Header - Clean & Sharp */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900">ภาพรวมระบบ</h1>
      </div>

      {/* Main 4 Metrics - Premium Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={Thermometer}
          label="อุณหภูมิ"
          value={showVal(displayData.airTemp, '')}
          unit="°C"
          color="from-red-50 to-orange-50"
        />
        <MetricCard
          icon={Droplets}
          label="ความชื้น"
          value={showVal(displayData.hum, '')}
          unit="%"
          color="from-blue-50 to-cyan-50"
        />
        <MetricCard
          icon={Sprout}
          label="ความชื้นดิน"
          value={showVal(displayData.soil, '')}
          unit="%"
          color="from-green-50 to-emerald-50"
        />
        <MetricCard
          icon={Sun}
          label="แสง"
          value={`${Number(displayData.light || 0).toFixed(0)}`}
          unit="Lux"
          color="from-yellow-50 to-amber-50"
        />
      </div>

      {/* NPK Section */}
      <div className="mb-8">
        <NPK npk={displayData.npk} />
      </div>

      {/* Secondary Metrics - Sharp & Modern */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-100">
              <FlaskConical size={24} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">pH Level</p>
              <p className="text-3xl font-bold text-slate-900">{showVal(displayData.ph, '')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100">
              <CloudFog size={24} className="text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CO₂ Level</p>
              <p className="text-3xl font-bold text-slate-900">{displayData.co2 || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <Wind size={24} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-semibold text-emerald-600">Online</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}