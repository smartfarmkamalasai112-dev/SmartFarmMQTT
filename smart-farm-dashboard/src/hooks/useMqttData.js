import { useState, useEffect, useCallback } from 'react';

export function useMqttData() {
  const [data, setData] = useState({
    air: { temp: 0, hum: 0 },
    soil: { hum: 0, temp: 0, ph: 0, n: 0, p: 0, k: 0 },
    env: { lux: 0, co2: 0 }
  });

  const [controlStatus, setControlStatus] = useState({
    relays: [
      { name: 'ปั๊มน้ำ', state: false, mode: 'MANUAL' },
      { name: 'พัดลม', state: false, mode: 'MANUAL' },
      { name: 'ไฟส่องสว่าง', state: false, mode: 'MANUAL' },
      { name: 'พ่นหมอก', state: false, mode: 'MANUAL' }
    ],
    config: []
  });

  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  // Main fetch function
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-cache' });
      
      if (res.ok) {
        const json = await res.json();
        if (json.sensors) {
          setData(json.sensors);
        }
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

  // Fetch with retry (for aggressive startup and after commands)
  const fetchDataWithRetry = useCallback(async (retryCount = 0, maxRetries = 3) => {
    try {
      const res = await fetch('/api/data', { cache: 'no-cache' });
      
      if (res.ok) {
        const json = await res.json();
        if (json.sensors) {
          setData(json.sensors);
        }
        if (json.status) {
          setControlStatus(json.status);
        }
        setConnectionStatus('Connected');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        console.warn(`Fetch attempt ${retryCount + 1} failed, retrying...`);
        setTimeout(() => fetchDataWithRetry(retryCount + 1, maxRetries), 500);
      } else {
        console.error("Fetch Error after all retries:", error);
        setConnectionStatus('Disconnected');
      }
    }
  }, []);

  // Setup polling on mount
  useEffect(() => {
    let isMounted = true;
    
    // Aggressive startup retries
    fetchDataWithRetry(0, 5);
    
    // Regular polling every 2 seconds
    const interval = setInterval(() => {
      if (isMounted) {
        fetchData();
      }
    }, 2000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchData, fetchDataWithRetry]);

  // Send command to API
  const sendCommand = useCallback(async (cmd) => {
    try {
      const endpoint = cmd.type === 'MODE' ? '/api/mode' : '/api/relay';
      console.log(`Sending command to ${endpoint}:`, cmd);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd)
      });
      
      const result = await response.json();
      console.log(`API Response:`, result);
      
      // Fetch fresh data after command
      setTimeout(() => {
        console.log('Fetching fresh data after command...');
        fetchDataWithRetry(0, 2);
      }, 200);
    } catch (e) {
      console.error('SendCommand Error:', e);
    }
  }, [fetchDataWithRetry]);

  // Send config
  const sendConfig = async (idx, rule) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, index: idx })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return { data, controlStatus, sendCommand, sendConfig, connectionStatus };
}