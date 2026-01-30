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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
          <Settings className="text-blue-500" size={20} />
          ตั้งค่าเงื่อนไขอัตโนมัติ (Automation Rules)
        </h3>
        <p className="text-xs text-slate-400 mt-1 ml-7">
          กำหนดค่าเพื่อให้ระบบทำงานเองเมื่ออยู่ในโหมด AUTO
        </p>
      </div>

      <div className="p-5 space-y-4">
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
    <div className="p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-100 transition-colors shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-slate-700 text-sm">{index + 1}. {label}</span>
        <div className="text-xs px-2 py-1 bg-slate-100 rounded-lg text-slate-500 font-mono">
          {CURRENT_LABELS[index]} ปัจจุบัน: {currentVal} {unit.split(' ')[0]}
        </div>
      </div>

      <div className="flex gap-2 items-center">
        {/* Dropdown เงื่อนไข */}
        <select
          value={condition}
          onChange={(e) => {
            setCondition(e.target.value);
            setIsEditing(true);
          }}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none w-20"
        >
          <option value="<">&lt; น้อยกว่า</option>
          <option value=">">&gt; มากกว่า</option>
        </select>

        {/* ช่องกรอกตัวเลข (ตัวปัญหาที่แก้แล้ว) */}
        <div className="relative flex-1">
          <input
            type="number"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setIsEditing(true); // พิมพ์อยู่ = ล็อคห้าม Server แทรก
            }}
            onFocus={() => setIsEditing(true)} // คลิกปุ๊บ ล็อคปั๊บ
            // onBlur={() => setIsEditing(false)} // เอา onBlur ออกเพื่อให้กด Save ได้
            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none font-bold"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-slate-400">
             {unit.split(' ')[0]}
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center transition-transform active:scale-95 shadow-md shadow-blue-200"
        >
          <Save size={18} />
        </button>
      </div>
    </div>
  );
}