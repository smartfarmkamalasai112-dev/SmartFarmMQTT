import React from 'react';
import { Thermometer, Droplets, Sprout, Sun, CloudFog, FlaskConical, Wind } from 'lucide-react';
import Card from '../components/Card';
import NPK from '../components/NPK';

export default function MonitorPage({ displayData }) {
  
  const showVal = (val, unit) => {
    if (val === undefined || val === null) return <span className="text-gray-300">--</span>;
    return `${Number(val).toFixed(1)}${unit ? ' ' + unit : ''}`;
  };

  // ฟังก์ชันหาสถานะและสี
  const getStatusInfo = (type, value) => {
    if (value === undefined || value === null || value === 0) {
      return { label: 'N/A', color: 'gray' };
    }

    const val = Number(value);

    switch (type) {
      case 'temp': // อุณหภูมิ 15-35°C (ปกติ 20-28)
        if (val < 15) return { label: 'เย็นเกินไป', color: 'blue' };
        if (val < 20) return { label: 'ต่ำ', color: 'cyan' };
        if (val <= 28) return { label: 'ปกติ', color: 'green' };
        if (val <= 32) return { label: 'สูง', color: 'orange' };
        return { label: 'สูงเกินไป', color: 'red' };

      case 'humidity': // ความชื้น 30-90% (ปกติ 50-70)
        if (val < 30) return { label: 'แห้งเกินไป', color: 'red' };
        if (val < 50) return { label: 'ต่ำ', color: 'orange' };
        if (val <= 70) return { label: 'ปกติ', color: 'blue' };
        if (val <= 85) return { label: 'สูง', color: 'indigo' };
        return { label: 'สูงเกินไป', color: 'purple' };

      case 'soil': // ความชื้นดิน 20-80% (ปกติ 50-70)
        if (val < 20) return { label: 'แห้งเกินไป', color: 'red' };
        if (val < 45) return { label: 'ต่ำ', color: 'orange' };
        if (val <= 75) return { label: 'ปกติ', color: 'green' };
        if (val <= 85) return { label: 'สูง', color: 'cyan' };
        return { label: 'สูงเกินไป', color: 'blue' };

      case 'light': // แสง 0-50000 Lux (ปกติ 2000-10000)
        if (val < 500) return { label: 'มืดเกินไป', color: 'gray' };
        if (val < 2000) return { label: 'ต่ำ', color: 'indigo' };
        if (val <= 10000) return { label: 'ปกติ', color: 'yellow' };
        if (val <= 20000) return { label: 'สูง', color: 'orange' };
        return { label: 'สูงเกินไป', color: 'red' };

      case 'co2': // CO2 300-2000 ppm (ปกติ 400-800)
        if (val < 300) return { label: 'ต่ำเกินไป', color: 'cyan' };
        if (val < 400) return { label: 'ต่ำ', color: 'blue' };
        if (val <= 800) return { label: 'ปกติ', color: 'green' };
        if (val <= 1200) return { label: 'สูง', color: 'orange' };
        return { label: 'สูงเกินไป', color: 'red' };

      case 'ph': // pH 0-14 (ปกติ 6-7)
        if (val < 5.5) return { label: 'กรดมาก', color: 'red' };
        if (val < 6.5) return { label: 'กรดค่อนข้าง', color: 'orange' };
        if (val <= 7.5) return { label: 'ปกติ', color: 'green' };
        if (val <= 8.5) return { label: 'ด่างค่อนข้าง', color: 'blue' };
        return { label: 'ด่างมาก', color: 'indigo' };

      default:
        return { label: 'N/A', color: 'gray' };
    }
  };

  // ฟังก์ชันหาสีตาม sensor type และค่า (เข้มขึ้น)
  const getSensorColor = (type, value) => {
    if (value === undefined || value === null || value === 0) {
      return 'from-slate-200 to-gray-300';
    }

    const val = Number(value);

    switch (type) {
      case 'temp': // อุณหภูมิ 15-35°C (ปกติ 20-28)
        if (val < 15) return 'from-blue-300 to-cyan-400'; // เย็นเกินไป
        if (val < 20) return 'from-cyan-200 to-blue-300'; // ค่อนข้างเย็น
        if (val <= 28) return 'from-emerald-200 to-green-300'; // ปกติ
        if (val <= 32) return 'from-amber-200 to-orange-300'; // ค่อนข้างร้อน
        return 'from-red-300 to-orange-400'; // ร้อนเกินไป

      case 'humidity': // ความชื้น 30-90% (ปกติ 50-70)
        if (val < 30) return 'from-orange-300 to-red-400'; // แห้งเกินไป
        if (val < 50) return 'from-amber-200 to-orange-300'; // ค่อนข้างแห้ง
        if (val <= 70) return 'from-blue-200 to-cyan-300'; // ปกติ
        if (val <= 85) return 'from-indigo-200 to-blue-300'; // ค่อนข้างชื้น
        return 'from-purple-300 to-indigo-400'; // ชื้นเกินไป

      case 'soil': // ความชื้นดิน 20-80% (ปกติ 50-70)
        if (val < 20) return 'from-red-300 to-orange-400'; // แห้งเกินไป
        if (val < 45) return 'from-orange-200 to-amber-300'; // ค่อนข้างแห้ง
        if (val <= 75) return 'from-emerald-200 to-green-300'; // ปกติ
        if (val <= 85) return 'from-cyan-200 to-blue-300'; // ค่อนข้างชื้น
        return 'from-blue-300 to-indigo-400'; // ชื้นเกินไป

      case 'light': // แสง 0-50000 Lux (ปกติ 2000-10000)
        if (val < 500) return 'from-slate-300 to-gray-400'; // มืดเกินไป
        if (val < 2000) return 'from-indigo-200 to-blue-300'; // ค่อนข้างมืด
        if (val <= 10000) return 'from-yellow-200 to-amber-300'; // ปกติ
        if (val <= 20000) return 'from-orange-200 to-amber-300'; // ค่อนข้างสว่าง
        return 'from-orange-300 to-red-400'; // สว่างเกินไป

      case 'co2': // CO2 300-2000 ppm (ปกติ 400-800)
        if (val < 300) return 'from-cyan-200 to-blue-300'; // น้อยเกินไป
        if (val < 400) return 'from-blue-200 to-cyan-300'; // ค่อนข้างน้อย
        if (val <= 800) return 'from-emerald-200 to-green-300'; // ปกติ
        if (val <= 1200) return 'from-amber-200 to-orange-300'; // ค่อนข้างสูง
        return 'from-red-300 to-orange-400'; // สูงเกินไป

      case 'ph': // pH 0-14 (ปกติ 6-7)
        if (val < 5.5) return 'from-red-300 to-orange-400'; // เป็นกรดมาก
        if (val < 6.5) return 'from-orange-200 to-amber-300'; // เป็นกรดค่อนข้าง
        if (val <= 7.5) return 'from-emerald-200 to-green-300'; // ปกติ
        if (val <= 8.5) return 'from-blue-200 to-cyan-300'; // เป็นด่างค่อนข้าง
        return 'from-indigo-300 to-blue-400'; // เป็นด่างมาก

      default:
        return 'from-slate-200 to-gray-300';
    }
  };

  const getStatusBadgeColor = (colorType) => {
    const colorMap = {
      green: 'bg-emerald-500 text-white',
      red: 'bg-red-500 text-white',
      orange: 'bg-orange-500 text-white',
      yellow: 'bg-yellow-500 text-slate-900',
      blue: 'bg-blue-500 text-white',
      cyan: 'bg-cyan-500 text-white',
      indigo: 'bg-indigo-500 text-white',
      purple: 'bg-purple-500 text-white',
      gray: 'bg-slate-500 text-white'
    };
    return colorMap[colorType] || colorMap.gray;
  };

  const MetricCard = ({ icon: Icon, label, value, unit, type }) => {
    const color = getSensorColor(type, value);
    const status = getStatusInfo(type, value);
    const badgeColor = getStatusBadgeColor(status.color);
    
    return (
      <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 shadow-lg border border-white/60 transition-all duration-300 hover:shadow-xl hover:scale-105`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{label}</p>
              <span className={`${badgeColor} px-2 py-1 rounded-full text-xs font-bold`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-slate-800">{value}</p>
              <p className="text-sm text-slate-700 font-medium">{unit}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/70 shadow-md">
            <Icon size={28} className="text-slate-700" />
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
        {(() => {
          const phStatus = getStatusInfo('ph', displayData.ph);
          const co2Status = getStatusInfo('co2', displayData.co2);
          const phBadge = getStatusBadgeColor(phStatus.color);
          const co2Badge = getStatusBadgeColor(co2Status.color);
          
          return (
            <>
              <div className={`bg-gradient-to-br ${getSensorColor('ph', displayData.ph)} rounded-2xl shadow-lg border border-white/60 p-6 transition-all duration-300 hover:shadow-xl hover:scale-105`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">pH Level</p>
                      <span className={`${phBadge} px-2 py-1 rounded-full text-xs font-bold`}>
                        {phStatus.label}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{showVal(displayData.ph, '')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/70 shadow-md">
                    <FlaskConical size={28} className="text-slate-700" />
                  </div>
                </div>
              </div>

              <div className={`bg-gradient-to-br ${getSensorColor('co2', displayData.co2)} rounded-2xl shadow-lg border border-white/60 p-6 transition-all duration-300 hover:shadow-xl hover:scale-105`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">CO₂ Level</p>
                      <span className={`${co2Badge} px-2 py-1 rounded-full text-xs font-bold`}>
                        {co2Status.label}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{displayData.co2 || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/70 shadow-md">
                    <CloudFog size={28} className="text-slate-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-200 to-green-300 rounded-2xl shadow-lg border border-white/60 p-6 hover:shadow-xl hover:scale-105 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</p>
                      <span className="bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        ปกติ
                      </span>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">Online</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/70 shadow-md">
                    <Wind size={28} className="text-slate-700" />
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}