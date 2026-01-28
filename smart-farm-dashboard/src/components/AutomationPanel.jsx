import React, { useState, useEffect } from 'react';
import { Save, Settings, Info } from 'lucide-react';

const DEVICE_NAMES = ["ปั๊มน้ำ", "พัดลม", "ไฟส่องสว่าง", "พ่นหมอก"];
const UNIT_LABELS = ["% (Moisture)", "°C (Temp)", "Lux (Light)", "% (Hum)"];
const CURRENT_LABELS = ["ค่าความชื้นในดิน", "ค่าอุณหภูมิอากาศ", "ค่าความสว่าง", "ค่าความชื้นอากาศ"];

export default function AutomationPanel({ config, onSaveConfig, currentValues }) {
  // ค่าเริ่มต้นสำหรับแต่ละ relay (ตรงกับ ESP32)
  const DEFAULT_CONFIGS = [
    { target: 40, condition: '<' },  // Relay 0: ปั๊มน้ำ - < 40% (ดินแห้ง)
    { target: 32, condition: '>' },  // Relay 1: พัดลม - > 32°C
    { target: 100, condition: '<' }, // Relay 2: ไฟ - < 100 lux
    { target: 60, condition: '<' }   // Relay 3: หมอก - < 60%
  ];

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-transparent">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
          <Settings className="text-blue-600" size={24} />
          ตั้งค่าเงื่อนไขอัตโนมัติ
        </h3>
        <p className="text-sm text-slate-600 mt-2 ml-9">
          กำหนดค่าเพื่อให้ระบบทำงานเองเมื่ออยู่ในโหมด AUTO
        </p>
      </div>

      <div className="p-6 space-y-4">
        {config.map((rule, idx) => (
          <ConfigRow 
            key={idx}
            index={idx}
            initialConfig={rule || DEFAULT_CONFIGS[idx]}
            currentVal={currentValues[idx]}
            onSave={onSaveConfig}
            label={DEVICE_NAMES[idx]}
            unit={UNIT_LABELS[idx]}
          />
        ))}
      </div>
    </div>
  );
}

// --- Component ย่อย: ตัวแก้ปัญหา Data Race ---
function ConfigRow({ index, initialConfig, currentVal, onSave, label, unit }) {
  // 1. สร้างตัวแปรเก็บค่าชั่วคราว (Local State)
  const [target, setTarget] = useState(initialConfig.target);
  const [condition, setCondition] = useState(initialConfig.condition);
  const [isEditing, setIsEditing] = useState(false);

  // 2. Sync ค่าจาก Server เฉพาะตอนที่ "ไม่ได้พิมพ์อยู่ (!isEditing)"
  useEffect(() => {
    if (!isEditing) {
      setTarget(initialConfig.target);
      setCondition(initialConfig.condition);
    }
  }, [initialConfig, isEditing]);

  const handleSave = () => {
    onSave(index, { target: parseFloat(target), condition });
    setIsEditing(false); // บันทึกเสร็จ ปลดล็อคให้รับค่าจาก Server ต่อ
    alert(`บันทึกค่า ${label} เรียบร้อย!`);
  };

  return (
    <div className="p-4 rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:border-blue-300 hover:shadow-md transition-all shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-bold text-slate-800 text-base">{index + 1}. {label}</span>
          <div className="text-xs mt-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-semibold inline-block">
            {CURRENT_LABELS[index]}: {currentVal} {unit.split(' ')[0]}
          </div>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        {/* Dropdown เงื่อนไข */}
        <select
          value={condition}
          onChange={(e) => {
            setCondition(e.target.value);
            setIsEditing(true);
          }}
          className="bg-white border-2 border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 block p-2.5 outline-none w-24 font-semibold hover:border-blue-300 transition-colors"
        >
          <option value="<">&lt; น้อยกว่า</option>
          <option value=">">&gt; มากกว่า</option>
        </select>

        {/* ช่องกรอกตัวเลข */}
        <div className="relative flex-1">
          <input
            type="number"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setIsEditing(true);
            }}
            onFocus={() => setIsEditing(true)}
            className="bg-white border-2 border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-500 block w-full p-3 outline-none font-bold hover:border-blue-300 transition-colors"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-xs font-bold text-slate-400">
             {unit.split(' ')[0]}
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl text-sm p-3 transition-all active:scale-95 shadow-lg shadow-blue-300 hover:shadow-blue-400 flex items-center gap-2"
        >
          <Save size={20} />
        </button>
      </div>
    </div>
  );
}