import React from 'react';
import { Thermometer, Droplets, Sprout, Sun, CloudFog, FlaskConical, Wind } from 'lucide-react';
import Card from '../components/Card';
import NPK from '../components/NPK';

export default function MonitorPage({ displayData }) {
  
  const showVal = (val, unit) => {
    if (val === undefined || val === null) return <span className="text-gray-300">--</span>;
    return `${Number(val).toFixed(1)}${unit ? ' ' + unit : ''}`;
  };

  // ฟังก์ชันหาสีตาม sensor type และค่า
  const getSensorColor = (type, value) => {
    if (value === undefined || value === null || value === 0) {
      return 'from-gray-50 to-slate-50'; // ค่าว่าง
    }

    const val = Number(value);

    switch (type) {
      case 'temp': // อุณหภูมิ 15-35°C (ปกติ 20-28)
        if (val < 15) return 'from-blue-100 to-cyan-100'; // เย็นเกินไป
        if (val < 20) return 'from-cyan-50 to-blue-50'; // ค่อนข้างเย็น
        if (val <= 28) return 'from-green-50 to-emerald-50'; // ปกติ
        if (val <= 32) return 'from-orange-50 to-amber-50'; // ค่อนข้างร้อน
        return 'from-red-100 to-orange-100'; // ร้อนเกินไป

      case 'humidity': // ความชื้น 30-90% (ปกติ 50-70)
        if (val < 30) return 'from-orange-100 to-red-100'; // แห้งเกินไป
        if (val < 50) return 'from-amber-50 to-orange-50'; // ค่อนข้างแห้ง
        if (val <= 70) return 'from-blue-50 to-cyan-50'; // ปกติ
        if (val <= 85) return 'from-indigo-50 to-blue-50'; // ค่อนข้างชื้น
        return 'from-purple-100 to-indigo-100'; // ชื้นเกินไป

      case 'soil': // ความชื้นดิน 20-80% (ปกติ 50-70)
        if (val < 20) return 'from-red-100 to-orange-100'; // แห้งเกินไป
        if (val < 45) return 'from-orange-50 to-amber-50'; // ค่อนข้างแห้ง
        if (val <= 75) return 'from-green-50 to-emerald-50'; // ปกติ
        if (val <= 85) return 'from-cyan-50 to-blue-50'; // ค่อนข้างชื้น
        return 'from-blue-100 to-indigo-100'; // ชื้นเกินไป

      case 'light': // แสง 0-50000 Lux (ปกติ 2000-10000)
        if (val < 500) return 'from-slate-100 to-gray-100'; // มืดเกินไป
        if (val < 2000) return 'from-indigo-50 to-blue-50'; // ค่อนข้างมืด
        if (val <= 10000) return 'from-yellow-50 to-amber-50'; // ปกติ
        if (val <= 20000) return 'from-orange-50 to-amber-50'; // ค่อนข้างสว่าง
        return 'from-orange-100 to-red-100'; // สว่างเกินไป

      case 'co2': // CO2 300-2000 ppm (ปกติ 400-800)
        if (val < 300) return 'from-cyan-50 to-blue-50'; // น้อยเกินไป
        if (val < 400) return 'from-blue-50 to-cyan-50'; // ค่อนข้างน้อย
        if (val <= 800) return 'from-green-50 to-emerald-50'; // ปกติ
        if (val <= 1200) return 'from-amber-50 to-orange-50'; // ค่อนข้างสูง
        return 'from-red-100 to-orange-100'; // สูงเกินไป

      case 'ph': // pH 0-14 (ปกติ 6-7)
        if (val < 5.5) return 'from-red-100 to-orange-100'; // เป็นกรดมาก
        if (val < 6.5) return 'from-orange-50 to-amber-50'; // เป็นกรดค่อนข้าง
        if (val <= 7.5) return 'from-green-50 to-emerald-50'; // ปกติ
        if (val <= 8.5) return 'from-blue-50 to-cyan-50'; // เป็นด่างค่อนข้าง
        return 'from-indigo-100 to-blue-100'; // เป็นด่างมาก

      default:
        return 'from-gray-50 to-slate-50';
    }
  };

  const MetricCard = ({ icon: Icon, label, value, unit, type }) => {
    const color = getSensorColor(type, value);
    return (
      <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 shadow-sm border border-white/50 transition-all duration-300`}>
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
  };

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
          type="temp"
        />
        <MetricCard
          icon={Droplets}
          label="ความชื้น"
          value={showVal(displayData.hum, '')}
          unit="%"
          type="humidity"
        />
        <MetricCard
          icon={Sprout}
          label="ความชื้นดิน"
          value={showVal(displayData.soil, '')}
          unit="%"
          type="soil"
        />
        <MetricCard
          icon={Sun}
          label="แสง"
          value={`${Number(displayData.light || 0).toFixed(0)}`}
          unit="Lux"
          type="light"
        />
      </div>

      {/* NPK Section */}
      <div className="mb-8">
        <NPK npk={displayData.npk} />
      </div>

      {/* Secondary Metrics - Sharp & Modern */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`bg-gradient-to-br ${getSensorColor('ph', displayData.ph)} rounded-2xl shadow-sm border border-white/50 p-6 transition-all duration-300`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/60">
              <FlaskConical size={24} className="text-slate-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">pH Level</p>
              <p className="text-3xl font-bold text-slate-900">{showVal(displayData.ph, '')}</p>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${getSensorColor('co2', displayData.co2)} rounded-2xl shadow-sm border border-white/50 p-6 transition-all duration-300`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/60">
              <CloudFog size={24} className="text-slate-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">CO₂ Level</p>
              <p className="text-3xl font-bold text-slate-900">{displayData.co2 || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl shadow-sm border border-white/50 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/60">
              <Wind size={24} className="text-slate-700" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-semibold text-emerald-600">Online</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}