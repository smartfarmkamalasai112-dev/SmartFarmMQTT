import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useMqttData } from './hooks/useMqttData';

// ✅ 1. เพิ่ม Activity icon (รูปชีพจร) สำหรับหน้ากราฟ
import { LayoutDashboard, Settings, Menu, X, Sprout, Wifi, WifiOff, FileText, Activity } from 'lucide-react';

// Import Pages
import MonitorPage from './pages/MonitorPage';
import ControlPage from './pages/ControlPage';
import HistoryPage from './pages/HistoryPage';
// ✅ 2. นำเข้าหน้า GraphPage ที่คุณเพิ่งทำเสร็จ
import GraphPage from './pages/GraphPage'; 

export default function App() {
  const { data: mqttData, controlStatus, sendCommand, sendConfig, connectionStatus } = useMqttData(); 
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // ข้อมูลสำหรับส่งไปหน้าต่างๆ (เหมือนเดิม)
  const displayData = {
    airTemp: mqttData?.air?.temp || 0,
    hum: mqttData?.air?.hum || 0,
    soil: mqttData?.soil?.hum || 0,
    ph: mqttData?.soil?.ph ?? null,
    co2: mqttData?.env?.co2 || 0,
    light: mqttData?.env?.lux || 0,
    npk: { n: mqttData?.soil?.n || 0, p: mqttData?.soil?.p || 0, k: mqttData?.soil?.k || 0 },
    th: { t: mqttData?.air?.temp || 0, h: mqttData?.air?.hum || 0 },
    relay: controlStatus.relays || [false, false, false, false], 
    mode: controlStatus.mode || 'UNKNOWN',
    config: controlStatus.config || []
  };

  const handleToggleMode = () => sendCommand({ type: 'MODE', value: displayData.mode === 'AUTO' ? 'MANUAL' : 'AUTO' });
  const handleToggleRelay = (index) => sendCommand({ type: 'RELAY', index: index, value: !displayData.relay[index] });
  const handleSaveConfig = (index, newRule) => sendConfig(index, newRule);
  const closeMenu = () => setSidebarOpen(false);
  const isConnected = connectionStatus && connectionStatus.includes('Connected');

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
        
        {/* Header */}
        <header className="bg-white shadow-sm p-3 sticky top-0 z-20">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                <Menu size={28} />
              </button>
              <h1 className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-500 hidden sm:block">
                Smart Farm
              </h1>
            </div>
            <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border ${isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
              {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />} {connectionStatus}
            </div>
          </div>
        </header>

        {/* Sidebar Overlay */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40" onClick={closeMenu} />}

        {/* Sidebar Menu */}
        <div className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex justify-between items-center border-b border-gray-100">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sprout className="text-green-600" size={28} /> เมนูหลัก
             </h2>
             <button onClick={closeMenu}><X size={24} /></button>
          </div>
          
          <nav className="p-4 space-y-3 mt-2">
            <SidebarLink to="/" icon={<LayoutDashboard size={22} />} label="ภาพรวม (Monitor)" onClick={closeMenu} />
            <SidebarLink to="/control" icon={<Settings size={22} />} label="ควบคุม (Control)" onClick={closeMenu} />
            
            {/* ✅ 3. นี่คือปุ่มเมนู "กราฟ" ที่เพิ่มเข้ามาครับ */}
            <SidebarLink to="/graph" icon={<Activity size={22} />} label="กราฟ (Trends)" onClick={closeMenu} />
            
            <SidebarLink to="/history" icon={<FileText size={22} />} label="ประวัติ (Table)" onClick={closeMenu} />
          </nav>

          <div className="absolute bottom-6 left-0 w-full text-center text-xs text-slate-400">
            Smart Farm V3.0
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto p-4 pt-6 pb-20">
          <Routes>
            <Route path="/" element={<MonitorPage displayData={displayData} />} />
            <Route path="/control" element={<ControlPage displayData={displayData} onToggleRelay={handleToggleRelay} onToggleMode={handleToggleMode} onSaveConfig={handleSaveConfig} connectionStatus={connectionStatus} />} />
            
            {/* ✅ 4. เชื่อมโยง URL /graph ให้ไปเปิดหน้า GraphPage */}
            <Route path="/graph" element={<GraphPage />} />
            
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>

      </div>
    </BrowserRouter>
  );
}

// Component ย่อยสำหรับลิงก์ใน Sidebar (เหมือนเดิม)
function SidebarLink({ to, icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      onClick={onClick} 
      className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all font-medium text-lg 
        ${isActive 
          ? 'bg-green-50 text-green-700 border border-green-100 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <div className={isActive ? 'text-green-600' : 'text-slate-400'}>
        {icon}
      </div>
      <span>{label}</span>
      {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-green-200 shadow-lg" />}
    </Link>
  );
}