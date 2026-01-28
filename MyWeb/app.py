from flask import Flask, jsonify, request, render_template, send_from_directory, send_file, redirect
from flask_cors import CORS
import paho.mqtt.client as mqtt
import json
import threading
from datetime import datetime, timedelta
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import os
import time
import calendar

# ==========================================
# ⚙️ CONFIG PATHS
# ==========================================
current_dir = os.path.dirname(os.path.abspath(__file__))
react_dist_dir = os.path.join(current_dir, '../smart-farm-dashboard/dist')

# Create Flask app with proper configuration
# Set static_url_path to something specific to avoid conflicts with SPA routing
app = Flask(__name__, 
            static_folder=react_dist_dir, 
            template_folder=react_dist_dir,
            static_url_path='/static')
CORS(app, resources={r"/*": {"origins": "*"}})

# ==========================================
# 1. SETUP GOOGLE SHEETS
# ==========================================
SHEET_NAME = "SmartFarm_Data"
CREDENTIALS_PATH = os.path.join(current_dir, 'credentials.json')
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"]

sheet = None
mqtt_client = None

try:
    if os.path.exists(CREDENTIALS_PATH):
        creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_PATH, scope)
        client_gs = gspread.authorize(creds)
        sheet = client_gs.open(SHEET_NAME).sheet1
        print(f"✅ Google Sheet Connected!")
except Exception as e:
    print(f"❌ Google Sheet Error: {e}")

# ==========================================
# 2. GLOBAL VARIABLES
# ==========================================
sensor_data = {"air":{"temp":0,"hum":0},"soil":{"hum":0,"ph":0,"n":0,"p":0,"k":0},"env":{"lux":0,"co2":0}}
# แต่ละ relay มี mode (AUTO/MANUAL) แยกกัน
relay_status = {
    "relays": [
        {"name": "ปั๊มน้ำ", "state": False, "mode": "MANUAL"},
        {"name": "พัดลม", "state": False, "mode": "MANUAL"},
        {"name": "ไฟส่องสว่าง", "state": False, "mode": "MANUAL"},
        {"name": "พ่นหมอก", "state": False, "mode": "MANUAL"}
    ],
    "config": []
}
last_save_time = 0
last_mqtt_update = time.time()

def safe_float(val, default=0):
    try: 
        if val is None or str(val).strip() == "": return 0
        return float(str(val).replace(',','').strip())
    except: return default

def parse_dt(d, t):
    full_str = f"{d} {t}".strip()
    formats = ["%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%d/%m/%Y %H:%M"]
    for fmt in formats:
        try: return datetime.strptime(full_str, fmt)
        except: continue
    return None

# 📊 Mock data สำหรับ History/Graph เมื่อ Google Sheet ยังไม่เชื่อมต่อ
def generate_mock_history(mode):
    import random
    now = datetime.now()
    res = []
    
    if mode == 'day':
        for h in range(24):
            res.append({
                "time": f"{h:02}:00",
                "date": now.strftime('%Y-%m-%d'),
                "temp": round(20 + random.uniform(-3, 3), 1),
                "hum": round(60 + random.uniform(-10, 10), 1),
                "soil": round(70 + random.uniform(-15, 5), 1),
                "lux": round(5000 + random.uniform(-1000, 2000), 0),
                "co2": round(950 + random.uniform(-50, 100), 0),
                "n": round(120 + random.uniform(-20, 20), 1),
                "p": round(80 + random.uniform(-15, 15), 1),
                "k": round(180 + random.uniform(-30, 30), 1),
                "ph": round(7.0 + random.uniform(-0.3, 0.3), 1)
            })
    elif mode == 'month':
        last_day = calendar.monthrange(now.year, now.month)[1]
        for d in range(1, last_day + 1):
            dt_day = datetime(now.year, now.month, d)
            res.append({
                "time": dt_day.strftime('%d/%m'),
                "date": dt_day.strftime('%Y-%m-%d'),
                "temp": round(18 + random.uniform(-2, 2), 1),
                "hum": round(65 + random.uniform(-5, 5), 1),
                "soil": round(70 + random.uniform(-10, 10), 1),
                "lux": round(4500 + random.uniform(-500, 1000), 0),
                "co2": round(950 + random.uniform(-50, 50), 0),
                "n": round(100 + random.uniform(-10, 10), 1),
                "p": round(75 + random.uniform(-10, 10), 1),
                "k": round(170 + random.uniform(-15, 15), 1),
                "ph": round(6.9 + random.uniform(-0.2, 0.2), 1)
            })
    
    return jsonify({"data": res, "notice": "Using mock data - Google Sheet not connected"})

# ==========================================
# 3. MQTT & SAVE LOGIC
# ==========================================
def save_to_sheet(data):
    global last_save_time
    if time.time() - last_save_time < 5: return
    now = datetime.now()
    if sheet:
        try:
            relays = relay_status.get('relays', [])
            relay_states = [r.get('state', False) if isinstance(r, dict) else r for r in relays]
            row = [
                now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"),
                data.get('air', {}).get('temp', 0), data.get('air', {}).get('hum', 0),
                data.get('soil', {}).get('hum', 0), data.get('env', {}).get('lux', 0),
                data.get('env', {}).get('co2', 0), data.get('soil', {}).get('n', 0),
                data.get('soil', {}).get('p', 0), data.get('soil', {}).get('k', 0),
                data.get('soil', {}).get('ph', 0),
                "ON" if relay_states[0] else "OFF", "ON" if relay_states[1] else "OFF", 
                "ON" if relay_states[2] else "OFF", "ON" if relay_states[3] else "OFF"
            ]
            sheet.append_row(row)
        except: pass
    last_save_time = time.time()

def on_message(client, userdata, msg):
    global sensor_data, relay_status, last_mqtt_update
    try:
        data = json.loads(msg.payload.decode())
        print(f"✅ MQTT received: {msg.topic} -> {data}")
        if msg.topic == "smartfarm/sensors":
            sensor_data = data
            last_mqtt_update = time.time()
            save_to_sheet(data)
        elif msg.topic == "smartfarm/status":
            # Format 1: New format with relays as objects
            if isinstance(data, dict) and "relays" in data and isinstance(data.get("relays"), list) and len(data["relays"]) > 0:
                if isinstance(data["relays"][0], dict):
                    # Already in new format
                    relay_status = data
                    return
            
            # Format 2: Legacy format from ESP32 {mode, relays: [bool...]}
            if isinstance(data, dict) and "relays" in data and isinstance(data.get("relays"), list):
                relays_list = data.get("relays", [])
                # Update only state, preserve mode settings
                for i in range(min(len(relays_list), 4)):
                    if i < len(relay_status['relays']):
                        relay_status['relays'][i]['state'] = relays_list[i]
                # Also update config if present
                if "config" in data:
                    relay_status["config"] = data["config"]
                return
    except Exception as e:
        print(f"❌ MQTT Message Error: {e}")

def start_mqtt():
    global mqtt_client
    max_retries = 10
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            mqtt_client = mqtt.Client(client_id="smartfarm-dashboard", clean_session=True)
            mqtt_client.on_message = on_message
            mqtt_client.on_connect = on_connect
            mqtt_client.on_disconnect = on_disconnect
            mqtt_client.on_subscribe = on_subscribe
            
            # ตั้งค่า reconnect อัตโนมัติ
            mqtt_client.will_set("smartfarm/status/online", "0", qos=1, retain=True)
            
            print("🔌 Connecting to MQTT broker at localhost:1883...")
            mqtt_client.connect("localhost", 1883, keepalive=60)
            
            # ใช้ loop_start() แทน loop_forever() เพื่อให้ reconnect อัตโนมัติ
            mqtt_client.loop_start()
            print("✅ MQTT Loop Started!")
            return  # ✅ ออกจากฟังก์ชันเมื่อเชื่อมต่อสำเร็จ
            
        except Exception as e:
            retry_count += 1
            backoff = min(2 ** retry_count, 60)  # Max 60 seconds
            print(f"❌ MQTT Connection Failed (attempt {retry_count}/{max_retries}): {e}")
            print(f"⏳ Retrying in {backoff} seconds...")
            time.sleep(backoff)
    
    print(f"❌ MQTT Failed after {max_retries} attempts - Dashboard will use mock data")

def on_connect(client, userdata, flags, rc):
    """Callback when MQTT connects"""
    global last_mqtt_update
    if rc == 0:
        print(f"✅ MQTT Connected Successfully (rc={rc})")
        client.subscribe([("smartfarm/sensors", 0), ("smartfarm/status", 0)])
        print("✅ Subscribed to: smartfarm/sensors, smartfarm/status")
        last_mqtt_update = time.time()
    else:
        print(f"❌ MQTT Connection Failed with code {rc}")

def on_disconnect(client, userdata, rc):
    """Callback when MQTT disconnects"""
    if rc != 0:
        print(f"⚠️ Unexpected MQTT Disconnection (rc={rc}), will auto-reconnect...")
    else:
        print(f"ℹ️ MQTT Cleanly Disconnected (rc={rc})")

def on_subscribe(client, userdata, mid, granted_qos):
    """Callback when subscription confirmed"""
    print(f"✅ Subscription confirmed with QoS: {granted_qos}")

# Start MQTT in background thread with daemon=True
mqtt_thread = threading.Thread(target=start_mqtt, daemon=True)
mqtt_thread.start()
print("🔄 MQTT Thread Started (Background)")

def monitor_mqtt_status():
    """Monitor MQTT connection status every 30 seconds"""
    while True:
        try:
            time.sleep(30)
            if mqtt_client:
                is_connected = mqtt_client.is_connected()
                time_since_update = time.time() - last_mqtt_update
                
                status = "✅ MQTT Connected" if is_connected else "❌ MQTT Disconnected"
                data_status = "📊 Data flowing" if time_since_update < 10 else f"⏱️ No data for {int(time_since_update)}s"
                
                print(f"[MQTT Monitor] {status} | {data_status}")
            else:
                print("[MQTT Monitor] ⏳ Initializing MQTT client...")
        except Exception as e:
            print(f"[MQTT Monitor] Error: {e}")

# Start monitoring thread
monitor_thread = threading.Thread(target=monitor_mqtt_status, daemon=True)
monitor_thread.start()
print("📡 MQTT Monitoring Started (checks every 30s)")

# ==========================================
# 4. API ROUTES
# ==========================================

@app.route('/favicon.ico')
def favicon():
    return "", 204

# ✅ Serve Vite assets (CSS, JS, SVG, etc)
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(app.static_folder, 'assets'), filename)

# ✅ Serve vite.svg
@app.route('/vite.svg')
def serve_vite_svg():
    return send_from_directory(app.static_folder, 'vite.svg')

@app.route('/api/data')
def get_data():
    global sensor_data
    # If no data received from MQTT for more than 10 seconds, reset to zeros
    if time.time() - last_mqtt_update > 10:
        sensor_data = {"air":{"temp":0,"hum":0},"soil":{"hum":0,"ph":0,"n":0,"p":0,"k":0},"env":{"lux":0,"co2":0}}
    return jsonify({"sensors": sensor_data, "status": relay_status, "mqtt_active": time.time() - last_mqtt_update < 10})

@app.route('/api/health')
def health_check():
    """Health check endpoint - returns system status"""
    mqtt_is_connected = mqtt_client and mqtt_client.is_connected() if mqtt_client else False
    mqtt_active = time.time() - last_mqtt_update < 10
    time_since_update = time.time() - last_mqtt_update
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mqtt": {
            "is_connected": mqtt_is_connected,
            "has_data": mqtt_active,
            "seconds_since_last_update": round(time_since_update, 2)
        },
        "sensor_data": sensor_data,
        "relay_status": relay_status,
        "version": "2.0 - Permanent MQTT Fix"
    })

@app.route('/api/mode', methods=['POST'])
def set_mode():
    """Set mode (AUTO/MANUAL) for a specific relay"""
    global relay_status
    payload = request.json or {}
    idx = payload.get('index')  # Relay index
    mode = payload.get('mode')  # "AUTO" or "MANUAL"
    
    if idx is None or mode not in ["AUTO", "MANUAL"]:
        return jsonify({"status": "error", "message": "Invalid parameters"}), 400
    
    # ✅ 1. อัปเดต relay_status ใน Python ทันที
    if 0 <= idx < len(relay_status.get('relays', [])):
        relay_status['relays'][idx]['mode'] = mode
    
    # 2. ส่งคำสั่ง MQTT
    if mqtt_client:
        mqtt_client.publish("smartfarm/control", json.dumps({"type": "MODE", "index": idx, "value": mode}))
        return jsonify({"status": "ok", "relay": idx, "mode": mode})
    return jsonify({"status": "error"}), 500

@app.route('/api/relay', methods=['POST'])
def set_relay():
    """Set relay state (ON/OFF) - only works in MANUAL mode"""
    global relay_status
    idx = request.json.get('index')
    val = request.json.get('value')
    
    # ✅ 1. ตรวจสอบว่า relay นี้เป็น MANUAL mode
    if 0 <= idx < len(relay_status.get('relays', [])):
        relay_data = relay_status['relays'][idx]
        if relay_data.get('mode') != 'MANUAL':
            return jsonify({"status": "error", "message": f"Relay {idx} is in {relay_data.get('mode')} mode"}), 403
        
        # อัปเดตสถานะทันที
        relay_status['relays'][idx]['state'] = val

    # 2. ส่งคำสั่ง MQTT
    if mqtt_client:
        mqtt_client.publish("smartfarm/control", json.dumps({"type": "RELAY", "index": idx, "value": val}))
        return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 500

@app.route('/api/config', methods=['POST'])
def set_config():
    conf = request.json
    if mqtt_client:
        mqtt_client.publish("smartfarm/config", json.dumps(conf))
        return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 500

@app.route('/api/sheet-history', methods=['GET'])
def get_sheet_history():
    """
    Historical data endpoint with multiple resolution modes:
    - hour: Last 60 minutes with raw data points (every ~5 sec)
    - day: Last 24 hours grouped by hour (hourly averages)
    - month: Last 30 days grouped by date (daily averages)
    - year: Last 12 months grouped by month (monthly averages)
    """
    mode = request.args.get('mode', 'day')
    year = request.args.get('year', str(datetime.now().year))
    
    if not sheet: 
        return generate_mock_history(mode)
    
    try:
        rows = sheet.get_all_values()
        if len(rows) < 2: 
            return generate_mock_history(mode)
        
        data_rows = rows[1:]
        now = datetime.now()
        result = []
        
        # ===================== MODE: HOUR (Raw Data - Last 60 minutes) =====================
        if mode == 'hour':
            cutoff_time = now - timedelta(minutes=60)
            
            # Filter data points from the last 60 minutes
            valid_rows = []
            for row in data_rows:
                if len(row) < 11: continue
                dt = parse_dt(row[0], row[1])
                if not dt or dt < cutoff_time: continue
                
                valid_rows.append({
                    'time': dt.strftime('%H:%M:%S'),
                    'date': dt.strftime('%Y-%m-%d'),
                    'temp': safe_float(row[2]),
                    'hum': safe_float(row[3]),
                    'soil': safe_float(row[4]),
                    'lux': safe_float(row[5]),
                    'co2': safe_float(row[6]),
                    'n': safe_float(row[7]),
                    'p': safe_float(row[8]),
                    'k': safe_float(row[9]),
                    'ph': safe_float(row[10]),
                    'sort_key': dt
                })
            
            # Sort by datetime
            valid_rows.sort(key=lambda x: x['sort_key'])
            
            # Return raw data points (no averaging)
            for row in valid_rows:
                result.append({
                    'time': row['time'],
                    'date': row['date'],
                    'temp': row['temp'],
                    'hum': row['hum'],
                    'soil': row['soil'],
                    'lux': row['lux'],
                    'co2': row['co2'],
                    'n': row['n'],
                    'p': row['p'],
                    'k': row['k'],
                    'ph': row['ph']
                })
        
        # ===================== MODE: DAY (Hourly Averages - Last 24 hours) =====================
        elif mode == 'day':
            # Initialize hour buckets for today only if we have today's data
            grouped = {}
            
            for row in data_rows:
                if len(row) < 11: continue
                dt = parse_dt(row[0], row[1])
                if not dt or dt.date() != now.date(): continue
                
                hour_key = dt.strftime('%H:00')
                
                if hour_key not in grouped:
                    grouped[hour_key] = {
                        'time': hour_key,
                        'date': now.strftime('%Y-%m-%d'),
                        'temp': [], 'hum': [], 'soil': [], 'lux': [], 'co2': [],
                        'n': [], 'p': [], 'k': [], 'ph': [],
                        'sort_key': int(dt.strftime('%H'))
                    }
                
                grouped[hour_key]['temp'].append(safe_float(row[2]))
                grouped[hour_key]['hum'].append(safe_float(row[3]))
                grouped[hour_key]['soil'].append(safe_float(row[4]))
                grouped[hour_key]['lux'].append(safe_float(row[5]))
                grouped[hour_key]['co2'].append(safe_float(row[6]))
                grouped[hour_key]['n'].append(safe_float(row[7]))
                grouped[hour_key]['p'].append(safe_float(row[8]))
                grouped[hour_key]['k'].append(safe_float(row[9]))
                grouped[hour_key]['ph'].append(safe_float(row[10]))
            
            # Calculate averages and build result
            for hour_key in sorted(grouped.keys(), key=lambda x: grouped[x]['sort_key']):
                g = grouped[hour_key]
                if g['temp']:  # Only if we have data
                    result.append({
                        'time': hour_key,
                        'date': g['date'],
                        'temp': round(sum(g['temp']) / len(g['temp']), 1),
                        'hum': round(sum(g['hum']) / len(g['hum']), 1),
                        'soil': round(sum(g['soil']) / len(g['soil']), 1),
                        'lux': round(sum(g['lux']) / len(g['lux']), 0),
                        'co2': round(sum(g['co2']) / len(g['co2']), 0),
                        'n': round(sum(g['n']) / len(g['n']), 1),
                        'p': round(sum(g['p']) / len(g['p']), 1),
                        'k': round(sum(g['k']) / len(g['k']), 1),
                        'ph': round(sum(g['ph']) / len(g['ph']), 1)
                    })
        
        # ===================== MODE: MONTH (Daily Averages - Last 30 days) =====================
        elif mode == 'month':
            grouped = {}
            
            for row in data_rows:
                if len(row) < 11: continue
                dt = parse_dt(row[0], row[1])
                if not dt: continue
                
                # Only include data from last 30 days
                if (now - dt).days > 30: continue
                
                date_key = dt.strftime('%d/%m')
                
                if date_key not in grouped:
                    grouped[date_key] = {
                        'time': date_key,
                        'date': dt.strftime('%Y-%m-%d'),
                        'temp': [], 'hum': [], 'soil': [], 'lux': [], 'co2': [],
                        'n': [], 'p': [], 'k': [], 'ph': [],
                        'sort_key': dt
                    }
                
                grouped[date_key]['temp'].append(safe_float(row[2]))
                grouped[date_key]['hum'].append(safe_float(row[3]))
                grouped[date_key]['soil'].append(safe_float(row[4]))
                grouped[date_key]['lux'].append(safe_float(row[5]))
                grouped[date_key]['co2'].append(safe_float(row[6]))
                grouped[date_key]['n'].append(safe_float(row[7]))
                grouped[date_key]['p'].append(safe_float(row[8]))
                grouped[date_key]['k'].append(safe_float(row[9]))
                grouped[date_key]['ph'].append(safe_float(row[10]))
            
            # Calculate averages and build result
            for date_key in sorted(grouped.keys(), key=lambda x: grouped[x]['sort_key']):
                g = grouped[date_key]
                if g['temp']:  # Only if we have data
                    result.append({
                        'time': date_key,
                        'date': g['date'],
                        'temp': round(sum(g['temp']) / len(g['temp']), 1),
                        'hum': round(sum(g['hum']) / len(g['hum']), 1),
                        'soil': round(sum(g['soil']) / len(g['soil']), 1),
                        'lux': round(sum(g['lux']) / len(g['lux']), 0),
                        'co2': round(sum(g['co2']) / len(g['co2']), 0),
                        'n': round(sum(g['n']) / len(g['n']), 1),
                        'p': round(sum(g['p']) / len(g['p']), 1),
                        'k': round(sum(g['k']) / len(g['k']), 1),
                        'ph': round(sum(g['ph']) / len(g['ph']), 1)
                    })
        
        # ===================== MODE: YEAR (Monthly Averages - 12 months) =====================
        elif mode == 'year':
            try:
                target_year = int(year)
            except:
                target_year = now.year
            
            grouped = {}
            
            for row in data_rows:
                if len(row) < 11: continue
                dt = parse_dt(row[0], row[1])
                if not dt or dt.year != target_year: continue
                
                month_key = dt.strftime('%b')  # Jan, Feb, etc.
                
                if month_key not in grouped:
                    grouped[month_key] = {
                        'time': month_key,
                        'date': f"{target_year}-{dt.month:02d}",
                        'temp': [], 'hum': [], 'soil': [], 'lux': [], 'co2': [],
                        'n': [], 'p': [], 'k': [], 'ph': [],
                        'sort_key': dt.month
                    }
                
                grouped[month_key]['temp'].append(safe_float(row[2]))
                grouped[month_key]['hum'].append(safe_float(row[3]))
                grouped[month_key]['soil'].append(safe_float(row[4]))
                grouped[month_key]['lux'].append(safe_float(row[5]))
                grouped[month_key]['co2'].append(safe_float(row[6]))
                grouped[month_key]['n'].append(safe_float(row[7]))
                grouped[month_key]['p'].append(safe_float(row[8]))
                grouped[month_key]['k'].append(safe_float(row[9]))
                grouped[month_key]['ph'].append(safe_float(row[10]))
            
            # Calculate averages and build result
            for month_key in sorted(grouped.keys(), key=lambda x: grouped[x]['sort_key']):
                g = grouped[month_key]
                if g['temp']:  # Only if we have data
                    result.append({
                        'time': month_key,
                        'date': g['date'],
                        'temp': round(sum(g['temp']) / len(g['temp']), 1),
                        'hum': round(sum(g['hum']) / len(g['hum']), 1),
                        'soil': round(sum(g['soil']) / len(g['soil']), 1),
                        'lux': round(sum(g['lux']) / len(g['lux']), 0),
                        'co2': round(sum(g['co2']) / len(g['co2']), 0),
                        'n': round(sum(g['n']) / len(g['n']), 1),
                        'p': round(sum(g['p']) / len(g['p']), 1),
                        'k': round(sum(g['k']) / len(g['k']), 1),
                        'ph': round(sum(g['ph']) / len(g['ph']), 1)
                    })
        
        return jsonify({"data": result})
    
    except Exception as e:
        return jsonify({"data": [], "error": str(e)})

# ==========================================
# 5. WEB ROUTING
# ==========================================
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """
    ✅ SPA Handler: ให้ React Router จัดการ routing
    - /assets/* → ไฟล์จริงใน dist/assets
    - /vite.svg → ไฟล์จริง
    - /* → index.html (SPA fallback ให้ React Router จัดการ)
    """
    # Build absolute path
    file_path = os.path.join(app.static_folder, path)
    
    # Serve static files (if they exist)
    if path != "" and os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    
    # SPA fallback: serve index.html for any non-file paths
    index_path = os.path.join(app.static_folder, 'index.html')
    if os.path.isfile(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            return f.read(), 200, {'Content-Type': 'text/html; charset=utf-8'}
    
    return "index.html not found", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)