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

  // 3. ตั้งเวลาดึงข้อมูลทุก 2 วินาที + aggressive startup retries
  useEffect(() => {
    let isMounted = true;
    
    // ฟังก์ชัน fetch พร้อม retry logic
    const fetchWithRetry = async (retryCount = 0, maxRetries = 5) => {
      if (!isMounted) return;
      
      try {
        const res = await fetch('/api/data', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-cache'
        });
        
        if (res.ok) {
          const json = await res.json();
          if (isMounted) {
            if (json.sensors) setData(json.sensors);
            if (json.status) setControlStatus(json.status);
            setConnectionStatus('Connected');
          }
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (error) {
        if (isMounted) {
          // ถ้า retry count ยังน้อยให้ retry ทันที
          if (retryCount < maxRetries) {
            console.warn(`Fetch attempt ${retryCount + 1} failed: ${error.message}, retrying...`);
            setTimeout(() => fetchWithRetry(retryCount + 1, maxRetries), 500);
          } else {
            console.error("Fetch Error after all retries:", error);
            setConnectionStatus('Disconnected');
          }
        }
      }
    };
    
    // ดึงข้อมูลทันทีเมื่อ mount (พร้อม aggressive retry)
    fetchWithRetry(0, 5);
    
    // ตั้ง interval สำหรับ polling
    const interval = setInterval(() => {
      fetchWithRetry(0, 2);  // ถ้า polling fail ให้ retry 2 ครั้ง
    }, 2000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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