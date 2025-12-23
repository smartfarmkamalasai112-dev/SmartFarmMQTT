import React from 'react';
import Card from '../components/Card';
import NPK from '../components/NPK';
import TH from '../components/TH';

export default function MonitorPage({ displayData }) {
  return (
    <div className="w-full h-full pb-2 animate-fade-in">
      
      {/* Grid 4 คอลัมน์เหมือนเดิม แต่ลดความสูงลงเยอะมาก */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {/* --- แถวที่ 1: ค่าหลัก 4 ตัว --- */}
        {/* ปรับเหลือ h-28 (ประมาณ 110px) */}
        <div className="h-28"><Card title="Air Temp" value={`${displayData.airTemp.toFixed(1)} °C`} /></div>
        <div className="h-28"><Card title="Humidity" value={`${displayData.hum.toFixed(1)} %`} /></div>
        <div className="h-28"><Card title="Soil Moist" value={`${displayData.soil.toFixed(1)} %`} /></div>
        <div className="h-28"><Card title="Light" value={`${displayData.light.toFixed(0)} lx`} /></div>

        {/* --- แถวที่ 2: NPK และ T-H --- */}
        {/* ปรับเหลือ h-40 (ประมาณ 160px) ให้พอดีเนื้อหา */}
        <div className="h-40 col-span-2 lg:col-span-2">
          <NPK npk={displayData.npk} />
        </div>

        <div className="h-40 col-span-2 lg:col-span-2">
           <TH th={displayData.th} />
        </div>

        {/* --- แถวที่ 3: pH และ CO2 --- */}
        {/* ปรับเหลือ h-28 เท่าแถวบน */}
        <div className="h-28 col-span-2 lg:col-span-2">
          <Card title="pH Level" value={displayData.ph.toFixed(1)} />
        </div>
        
        <div className="h-28 col-span-2 lg:col-span-2">
          <Card title="CO2 Level" value={`${displayData.co2} ppm`} />
        </div>

      </div>
    </div>
  );
}