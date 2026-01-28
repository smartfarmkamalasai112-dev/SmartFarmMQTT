import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, RefreshCcw, ChevronLeft, ChevronRight,
  Thermometer, Droplets, Sprout, Sun, CloudFog, FlaskConical
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';

export default function GraphPage() {
  const [dataCache, setDataCache] = useState({ day: [], month: [], year: {} });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('day');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const sensorConfigs = {
    temp: { min: 15, max: 40, color: "#ef4444", unit: "°C", icon: <Thermometer size={24} className="text-red-500"/>, label: "Temperature" },
    hum: { min: 20, max: 100, color: "#3b82f6", unit: "%", icon: <Droplets size={24} className="text-blue-500"/>, label: "Humidity" },
    soil: { min: 20, max: 100, color: "#10b981", unit: "%", icon: <Sprout size={24} className="text-green-600"/>, label: "Soil Moisture" },
    lux: { min: 0, max: 10000, color: "#eab308", unit: "Lux", icon: <Sun size={24} className="text-yellow-500"/>, label: "Light" },
    co2: { min: 300, max: 2000, color: "#64748b", unit: "ppm", icon: <CloudFog size={24} className="text-slate-500"/>, label: "CO₂" },
    ph: { min: 5, max: 9, color: "#6366f1", unit: "pH", icon: <FlaskConical size={24} className="text-indigo-500"/>, label: "pH Level" },
  };

  // Fetch single mode data
  const fetchSingleMode = async (mode, year = new Date().getFullYear()) => {
    try {
      const url = mode === 'year' 
        ? `/api/sheet-history?mode=${mode}&year=${year}`
        : `/api/sheet-history?mode=${mode}`;
      
      const res = await fetch(url, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const jsonData = await res.json();
      return jsonData?.data || [];
    } catch (err) { 
      console.error(`Error fetching ${mode} data:`, err);
      return [];
    }
  };

  // Pre-load all modes in parallel on mount
  useEffect(() => {
    const loadAllModes = async () => {
      setLoading(true);
      try {
        // Fetch all modes in parallel
        const [dayData, monthData, yearData] = await Promise.all([
          fetchSingleMode('day'),
          fetchSingleMode('month'),
          fetchSingleMode('year', selectedYear)
        ]);

        // Cache all data
        setDataCache({
          day: dayData,
          month: monthData,
          year: { [selectedYear]: yearData }
        });

        // Display the current mode's data
        setLogs(dayData);
      } catch (err) {
        console.error("Error loading all modes:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllModes();
  }, []);

  // Switch mode instantly (use cached data)
  const handleModeChange = (newMode) => {
    setViewMode(newMode);
    setLogs(dataCache[newMode] || []);
  };

  // Handle year change (fetch only if not cached)
  const handleYearChange = async (newYear) => {
    setSelectedYear(newYear);
    
    // Check if year data is cached
    if (dataCache.year[newYear]) {
      setLogs(dataCache.year[newYear]);
    } else {
      // Fetch and cache year data
      setLoading(true);
      const yearData = await fetchSingleMode('year', newYear);
      setDataCache(prev => ({
        ...prev,
        year: { ...prev.year, [newYear]: yearData }
      }));
      setLogs(yearData);
      setLoading(false);
    }
  };

  // Refresh all cached data
  const refreshAllData = async () => {
    setLoading(true);
    try {
      const [dayData, monthData, yearData] = await Promise.all([
        fetchSingleMode('day'),
        fetchSingleMode('month'),
        fetchSingleMode('year', selectedYear)
      ]);

      const newCache = {
        day: dayData,
        month: monthData,
        year: { ...dataCache.year, [selectedYear]: yearData }
      };

      setDataCache(newCache);
      setLogs(newCache[viewMode] || []);
    } catch (err) {
      console.error("Error refreshing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const ChartCard = ({ title, config, dataKey }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: config.color + '20' }}>
          {config.icon}
        </div>
        <div>
          <h3 className="font-bold text-slate-900">{config.label}</h3>
          <p className="text-xs text-slate-500">{config.unit}</p>
        </div>
      </div>

      <div style={{ width: '100%', height: 280, minWidth: 0 }}>
        {logs.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={logs} margin={{ top: 5, right: 10, left: -20, bottom: 35 }} isAnimationActive={false}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                domain={[config.min, config.max]}
                width={35}
              />
              <Tooltip 
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  backgroundColor: '#1e293b',
                  color: '#f1f5f9',
                  padding: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={config.color} 
                strokeWidth={2.5}
                dot={{ fill: config.color, r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                connectNulls={true}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            {loading ? "Loading..." : "No data available"}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full pb-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900">Trends</h1>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center gap-3 mb-6 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex-wrap">
        <div className="flex gap-2">
          <button 
            onClick={() => handleModeChange('day')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              viewMode === 'day' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={16} /> 1 Day
          </button>
          <button 
            onClick={() => handleModeChange('month')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              viewMode === 'month' 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={16} /> 1 Month
          </button>
          <button 
            onClick={() => handleModeChange('year')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              viewMode === 'year' 
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={16} /> 1 Year
          </button>
        </div>

        {/* Year Selector (visible only in year mode) */}
        {viewMode === 'year' && (
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={() => handleYearChange(selectedYear - 1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-all"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <span className="px-4 py-2 rounded-lg bg-slate-50 font-semibold text-slate-900 min-w-[80px] text-center">
              {selectedYear}
            </span>
            <button 
              onClick={() => handleYearChange(selectedYear + 1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-all"
            >
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>
        )}

        {/* Refresh Button */}
        <button 
          onClick={refreshAllData}
          disabled={loading}
          className="ml-auto p-2 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50"
        >
          <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-600"} />
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Temperature" config={sensorConfigs.temp} dataKey="temp" />
        <ChartCard title="Humidity" config={sensorConfigs.hum} dataKey="hum" />
        <ChartCard title="Soil Moisture" config={sensorConfigs.soil} dataKey="soil" />
        <ChartCard title="Light" config={sensorConfigs.lux} dataKey="lux" />
        <ChartCard title="CO₂" config={sensorConfigs.co2} dataKey="co2" />
        <ChartCard title="pH" config={sensorConfigs.ph} dataKey="ph" />
      </div>

      {/* Info Text */}
      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
        <p>📊 <strong>Resolution:</strong> {
          viewMode === 'day' ? 'Hourly averages' :
          viewMode === 'month' ? 'Daily averages' :
          viewMode === 'year' ? 'Monthly averages' :
          'Data'
        }</p>
        <p>📅 <strong>Range:</strong> {
          viewMode === 'day' ? 'Last 24 hours' :
          viewMode === 'month' ? 'Last 30 days' :
          viewMode === 'year' ? `Full year ${selectedYear}` :
          'N/A'
        }</p>
      </div>
    </div>
  );
}
