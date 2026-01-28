import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function NPK({ npk }) {
  // 🛡️ กันตาย: ถ้า npk เป็น null/undefined ให้ใช้ค่า 0
  const { n = 0, p = 0, k = 0 } = npk || {};
  const formatNum = (val) => Number(val || 0).toFixed(1);

  // ข้อมูลสำหรับกราฟแนวนอน
  const data = [
    { name: 'Nitrogen (N)', value: Number(formatNum(n)), color: '#3b82f6' }, // Blue
    { name: 'Phosphorus (P)', value: Number(formatNum(p)), color: '#f97316' }, // Orange
    { name: 'Potassium (K)', value: Number(formatNum(k)), color: '#a855f7' } // Purple
  ];

  // หาค่าสูงสุดสำหรับ scale
  const maxValue = Math.max(n, p, k, 200) * 1.1; // ใช้ค่าสูงสุดหรืออย่างน้อย 200

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white px-3 py-2 rounded-lg text-xs font-semibold">
          {payload[0].payload.name}: <span className="font-bold">{payload[0].value.toFixed(1)} mg/kg</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-4 rounded-2xl shadow-lg border border-white/60 h-full flex flex-col">
      <div className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 text-center">
        Nutrients (NPK) - mg/kg
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 25, left: 110, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, maxValue]} stroke="#475569" tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={105}
              tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 'bold' }}
              stroke="#64748b"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              radius={[0, 6, 6, 0]}
              animationDuration={600}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-3 pt-3 border-t border-gray-300 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-blue-600"></div>
          <span className="font-bold text-slate-800">N: {formatNum(n)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-600"></div>
          <span className="font-bold text-slate-800">P: {formatNum(p)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-600"></div>
          <span className="font-bold text-slate-800">K: {formatNum(k)}</span>
        </div>
      </div>
    </div>
  );
}