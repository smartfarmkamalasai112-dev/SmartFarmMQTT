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
      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
        Nutrients (NPK) - mg/kg
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, maxValue]} stroke="#94a3b8" tick={{ fontSize: 10 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={95}
              tick={{ fontSize: 10, fill: '#475569', fontWeight: '600' }}
              stroke="#cbd5e1"
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
      <div className="flex gap-3 justify-center mt-2 pt-2 border-t border-gray-200 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-blue-500"></div>
          <span className="font-semibold text-slate-700">N: {formatNum(n)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-orange-500"></div>
          <span className="font-semibold text-slate-700">P: {formatNum(p)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded bg-purple-500"></div>
          <span className="font-semibold text-slate-700">K: {formatNum(k)}</span>
        </div>
      </div>
    </div>
  );
}