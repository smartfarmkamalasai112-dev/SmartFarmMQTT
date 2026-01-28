import React from 'react';
import RelayControl from '../components/RelayControl';
import AutomationPanel from '../components/AutomationPanel';

export default function ControlPage({ displayData, onToggleRelay, onToggleMode, onSaveConfig, connectionStatus }) {
  // Mapping ค่าปัจจุบันเพื่อส่งไปโชว์เทียบกับค่าที่ตั้งไว้
  // ลำดับต้องตรงกับ Relay: [0=ปั๊ม(ดิน), 1=พัดลม(temp), 2=ไฟ(light), 3=หมอก(hum)]
  const currentSensorValues = [
    displayData.soil,    // Relay 1 (Pump) คุมด้วยความชื้นดิน
    displayData.th.t,    // Relay 2 (Fan) คุมด้วยอุณหภูมิ
    displayData.light,   // Relay 3 (Lamp) คุมด้วยแสง
    displayData.hum      // Relay 4 (Mist) คุมด้วยความชื้นอากาศ (สมมติ)
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in pb-20">
      {/* ฝั่งซ้าย: ปุ่มกดเปิดปิด */}
      <RelayControl 
        relays={displayData.relay} 
        onToggleRelay={onToggleRelay}
        onToggleMode={onToggleMode}
        connectionStatus={connectionStatus}
      />
      
      {/* ฝั่งขวา: ตั้งค่า (แก้บั๊กค่าเด้งที่ไฟล์นี้) */}
      <AutomationPanel 
        config={displayData.config}
        onSaveConfig={onSaveConfig}
        currentValues={currentSensorValues}
      />
    </div>
  );
}