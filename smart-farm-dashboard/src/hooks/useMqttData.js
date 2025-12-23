import { useState, useEffect } from 'react';

export function useMqttData() {
  // State เก็บข้อมูล Sensor
  const [data, setData] = useState({
    air: { temp: 0, hum: 0 },
    soil: { temp: 0, hum: 0, ph: 0, n: 0, p: 0, k: 0 },
    env: { lux: 0, co2: 0 }
  });

  // State เก็บสถานะ Relay & Config
  const [controlStatus, setControlStatus] = useState({
    mode: 'UNKNOWN',
    relays: [false, false, false, false],
    config: []
  });

  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  // --- 1. ระบบดึงข้อมูลอัตโนมัติ (Polling API) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error('Network response was not ok');
        
        const json = await res.json();
        
        // อัปเดต State
        if (json.sensors) setData(json.sensors);
        if (json.status) setControlStatus(json.status);
        
        setConnectionStatus('Connected (API)');
      } catch (err) {
        console.error("API Fetch Error:", err);
        setConnectionStatus('Error / Offline');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000); // อัปเดตทุก 1 วินาที

    return () => clearInterval(interval);
  }, []);

  // --- 2. ฟังก์ชันส่งคำสั่ง ---
  const sendCommand = async (payload) => {
    try {
      if (payload.type === 'MODE') {
        await fetch('/api/mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: payload.value })
        });
      } else if (payload.type === 'RELAY') {
        await fetch('/api/relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: payload.index, value: payload.value })
        });
      }
    } catch (err) {
      console.error("Send Command Error:", err);
    }
  };

  const sendConfig = async (index, rule) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          index: index, 
          target: rule.target, 
          condition: rule.condition 
        })
      });
      // เอา Alert ออกแล้ว เปลี่ยนเป็น log แทน
      console.log(`Saved config for Relay ${index + 1}`);
    } catch (err) {
      console.error("Send Config Error:", err);
    }
  };

  return { 
    data, 
    controlStatus, 
    sendCommand, 
    sendConfig, 
    connectionStatus 
  };
}