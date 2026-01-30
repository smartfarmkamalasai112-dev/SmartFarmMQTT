import { useState, useEffect, useCallback } from 'react';

export function useMqttData() {
  // 1. กำหนดค่าเริ่มต้นให้เป็น 0 (กัน Error)
  const [data, setData] = useState({
    air: { temp: 0, hum: 0 },
    soil: { hum: 0, temp: 0, ph: 0, n: 0, p: 0, k: 0 },
    env: { lux: 0, co2: 0 }
  });

  const [controlStatus, setControlStatus] = useState({
    mode: 'MANUAL',
    relays: [false, false, false, false],
    config: []
  });

  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  // 2. ฟังก์ชันดึงข้อมูลจาก Python (API)
  const fetchData = useCallback(async () => {
    try {
      // ใช้ Relative Path (ไม่ต้องใส่ http://localhost)
      const res = await fetch('/api/data'); 
      
      if (res.ok) {
        const json = await res.json();
        
        // ถ้ามีข้อมูล sensors ส่งมา ให้อัปเดต
        if (json.sensors) {
          setData(json.sensors);
        }
        
        // ถ้ามีสถานะ Relays ส่งมา ให้อัปเดต
        if (json.status) {
          setControlStatus(json.status);
        }

        setConnectionStatus('Connected');
      } else {
        setConnectionStatus('Server Error');
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setConnectionStatus('Disconnected');
    }
  }, []);

  // 3. ตั้งเวลาดึงข้อมูลทุก 2 วินาที (ลดจาก 1 วินาทีเพื่อให้เร็วขึ้น)
  useEffect(() => {
    fetchData(); // เรียกครั้งแรกทันที
    const interval = setInterval(fetchData, 2000); 
    return () => clearInterval(interval);
  }, [fetchData]);

  // 4. ฟังก์ชันส่งคำสั่ง (เปิดปิดไฟ/ปั๊ม)
  const sendCommand = async (cmd) => {
    try {
        let endpoint = cmd.type === 'MODE' ? '/api/mode' : '/api/relay';
        await fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(cmd)
        });
        // ส่งเสร็จให้ดึงค่าใหม่ทันที เพื่อความไว
        setTimeout(fetchData, 200); 
    } catch (e) { console.error(e); }
  };

  // 5. ฟังก์ชันตั้งค่า Config
  const sendConfig = async (idx, rule) => {
      try {
        await fetch('/api/config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({...rule, index: idx})
        });
      } catch (e) { console.error(e); }
  };

  return { data, controlStatus, sendCommand, sendConfig, connectionStatus };
}