import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, RefreshCcw, Activity, BarChart3, 
  Thermometer, Droplets, Sprout, Sun, CloudFog, FlaskConical 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

export default function GraphPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('day');

  // ✅ ล็อคช่วงกราฟ (Min-Max) สำหรับเกษตรแม่นยำ
  const sensorConfigs = {
    temp: { min: 0, max: 50, color: "#ef4444", unit: "°C", icon: <Thermometer className="text-red-500"/> },
    hum:  { min: 0, max: 100, color: "#3b82f6", unit: "%", icon: <Droplets className="text-blue-500"/> },
    soil: { min: 0, max: 100, color: "#10b981", unit: "%", icon: <Sprout className="text-green-600"/> },
    n:    { min: 0, max: 300, color: "#059669", unit: "mg/kg", icon: <Activity className="text-emerald-500"/> },
    p:    { min: 0, max: 150, color: "#f97316", unit: "mg/kg", icon: <Activity className="text-orange-500"/> },
    k:    { min: 0, max: 300, color: "#8b5cf6", unit: "mg/kg", icon: <Activity className="text-purple-500"/> },
    ph:   { min: 0, max: 14,  color: "#6366f1", unit: "pH", icon: <FlaskConical className="text-indigo-500"/> },
    lux:  { min: 0, max: 10000, color: "#eab308", unit: "Lux", icon: <Sun className="text-yellow-500"/> },
    co2:  { min: 300, max: 2000, color: "#64748b", unit: "ppm", icon: <CloudFog className="text-slate-500"/> }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sheet-history?mode=${viewMode}`, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const jsonData = await res.json();
      if (jsonData && jsonData.data) setLogs(jsonData.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const renderFullWidthChart = (title, config, dataKey) => (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-4 flex flex-col w-full min-h-[450px]">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-2">
        {config.icon} <h3 className="font-bold text-slate-700">{title}</h3>
      </div>
      {/* ✅ ล็อคความสูงที่แน่นอนเพื่อแก้ปัญหา "จอขาว" */}
      <div style={{ width: '100%', height: 350, minHeight: 350 }}>
        {logs.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={logs} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                interval={viewMode === 'month' ? 1 : 0} 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 'bold' }} 
                tickFormatter={(val) => (viewMode === 'month' && val.includes('/')) ? val.split('/')[0] : val}
                angle={viewMode === 'month' ? 0 : -45} 
                textAnchor={viewMode === 'month' ? "middle" : "end"}
                height={60} 
              />
              <YAxis tick={{ fontSize: 11 }} domain={[config.min, config.max]} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(val, payload) => {
                  if (payload && payload[0]) {
                    const dateObj = new Date(payload[0].payload.date);
                    return `📅 ${dateObj.toLocaleDateString('th-TH')} ⏰ ${payload[0].payload.time}`;
                  }
                  return val;
                }}
              />
              <Legend verticalAlign="top" height={40}/>
              <Line type="monotone" dataKey={dataKey} name={`${title} (${config.unit})`} stroke={config.color} strokeWidth={3} dot={viewMode === 'month' ? { r: 1 } : { r: 3 }} connectNulls={true} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">กำลังโหลด...</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col xl:flex-row justify-between items-center gap-4 sticky top-0 z-10">
        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2"><Activity className="text-orange-500" /> วิเคราะห์แนวโน้มข้อมูล</h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'day' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>1 วัน</button>
          <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'week' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>1 สัปดาห์</button>
          <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === 'month' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-200'}`}>1 เดือน</button>
          <button onClick={fetchHistory} className="ml-2 p-1.5 text-slate-400 hover:text-orange-500 transition-colors">
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        {renderFullWidthChart("อุณหภูมิอากาศ", sensorConfigs.temp, "temp")}
        {renderFullWidthChart("ความชื้นอากาศ", sensorConfigs.hum, "hum")}
        {renderFullWidthChart("ความชื้นในดิน", sensorConfigs.soil, "soil")}
        {renderFullWidthChart("ไนโตรเจน (N)", sensorConfigs.n, "n")}
        {renderFullWidthChart("ฟอสฟอรัส (P)", sensorConfigs.p, "p")}
        {renderFullWidthChart("โพแทสเซียม (K)", sensorConfigs.k, "k")}
        {renderFullWidthChart("ค่า pH ในดิน", sensorConfigs.ph, "ph")}
        {renderFullWidthChart("ความเข้มแสง", sensorConfigs.lux, "lux")}
        {renderFullWidthChart("คาร์บอน (CO2)", sensorConfigs.co2, "co2")}
      </div>
    </div>
  );
}