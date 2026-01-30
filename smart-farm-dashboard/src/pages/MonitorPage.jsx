import React from 'react';
import Card from '../components/Card';
import NPK from '../components/NPK';

export default function MonitorPage({ displayData }) {
  
  // ฟังก์ชันช่วยแสดงผล: ถ้าค่าเป็น undefined/null ให้โชว์ -- แต่ถ้าเป็น 0 ก็โชว์ 0
  const showVal = (val, unit) => {
    if (val === undefined || val === null) return <span className="text-gray-300">--</span>;
    return `${Number(val).toFixed(1)} ${unit}`;
  };

  return (
    <div className="w-full h-full pb-2 animate-fade-in">
      
      {/* Grid 4 คอลัมน์ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* --- แถวที่ 1: ค่าหลัก 4 ตัว --- */}
        <div className="h-28">
          <Card title="Air Temp" value={showVal(displayData.airTemp, "°C")} />
        </div>
        <div className="h-28">
          <Card title="Humidity" value={showVal(displayData.hum, "%")} />
        </div>
        <div className="h-28">
          <Card title="Soil Moist" value={showVal(displayData.soil, "%")} />
        </div>
        <div className="h-28">
          <Card title="Light" value={`${Number(displayData.light || 0).toFixed(0)} lx`} />
        </div>

        {/* --- แถวที่ 2: NPK --- */}
        <div className="h-40 col-span-2 lg:col-span-4">
          {/* ส่ง displayData.npk ไปตรงๆ (เพราะเราแก้ที่ App.jsx แล้วว่าห้ามเป็น null) */}
          <NPK npk={displayData.npk} />
        </div>

        {/* --- แถวที่ 3: pH และ CO2 --- */}
        <div className="h-28 col-span-2 lg:col-span-2">
          <Card title="pH Level" value={showVal(displayData.ph, "")} />
        </div>
        
        <div className="h-28 col-span-2 lg:col-span-2">
          <Card title="CO2 Level" value={`${displayData.co2 || 0} ppm`} />
        </div>

      </div>
    </div>
  );
}