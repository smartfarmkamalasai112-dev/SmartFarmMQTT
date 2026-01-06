from flask import Flask, jsonify, request, render_template
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
# ⚙️ CONFIG FLASK ให้ชี้ไปที่โฟลเดอร์ React (dist)
# ==========================================
current_dir = os.path.dirname(os.path.abspath(__file__))
# ชี้ไปที่โฟลเดอร์ dist ที่ได้จากการ build react
react_dist_dir = os.path.join(current_dir, '../smart-farm-dashboard/dist')

app = Flask(__name__, 
            static_folder=os.path.join(react_dist_dir, 'assets'), 
            template_folder=react_dist_dir,
            static_url_path='/assets')

CORS(app, resources={r"/*": {"origins": "*"}})

# ==========================================
# 1. SETUP GOOGLE SHEETS & MQTT
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
    else:
        print(f"⚠️ Warning: Credentials file not found at {CREDENTIALS_PATH}")
except Exception as e:
    print(f"❌ Google Sheet Error: {e}")

# ==========================================
# 2. LOGIC & MQTT
# ==========================================
sensor_data = {"air":{"temp":0,"hum":0},"soil":{"hum":0,"ph":0,"n":0,"p":0,"k":0},"env":{"lux":0,"co2":0}}
relay_status = {"mode":"MANUAL","relays":[False]*4, "config": []}
last_save_time = 0

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

def on_message(client, userdata, msg):
    global sensor_data, relay_status
    try:
        data = json.loads(msg.payload.decode())
        if msg.topic == "smartfarm/sensors":
            sensor_data = data
            save_to_sheet(data)
        elif msg.topic == "smartfarm/status":
            relay_status = data
    except: pass

def save_to_sheet(data):
    global last_save_time
    if time.time() - last_save_time < 5: return
    now = datetime.now()
    if sheet:
        try:
            r = relay_status.get('relays', [False]*4)
            row = [now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S"), 
                   data.get('air',{}).get('temp',0), data.get('air',{}).get('hum',0), 
                   data.get('soil',{}).get('hum',0), data.get('env',{}).get('lux',0), 
                   data.get('env',{}).get('co2',0), data.get('soil',{}).get('n',0), 
                   data.get('soil',{}).get('p',0), data.get('soil',{}).get('k',0), 
                   data.get('soil',{}).get('ph',0),
                   "ON" if r[0] else "OFF", "ON" if r[1] else "OFF", "ON" if r[2] else "OFF", "ON" if r[3] else "OFF"]
            sheet.append_row(row)
        except: pass
    last_save_time = time.time()

def start_mqtt():
    global mqtt_client
    mqtt_client = mqtt.Client()
    mqtt_client.on_message = on_message
    try:
        mqtt_client.connect("localhost", 1883, 60)
        mqtt_client.subscribe([("smartfarm/sensors",0), ("smartfarm/status",0)])
        mqtt_client.loop_forever()
    except: print("❌ MQTT Failed")

threading.Thread(target=start_mqtt, daemon=True).start()

# ==========================================
# 3. API ROUTES
# ==========================================

@app.route('/api/data')
def get_data():
    return jsonify({"sensors": sensor_data, "status": relay_status})

@app.route('/api/mode', methods=['POST'])
def set_mode():
    mode = request.json.get('mode')
    if mqtt_client:
        mqtt_client.publish("smartfarm/control", json.dumps({"type": "MODE", "value": mode}))
        return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 500

@app.route('/api/relay', methods=['POST'])
def set_relay():
    idx = request.json.get('index')
    val = request.json.get('value')
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

# >>> แก้ไขตรงนี้: ใส่ Logic ดึงกราฟกลับมาให้ครบ <<<
@app.route('/api/sheet-history', methods=['GET'])
def get_sheet_history():
    mode = request.args.get('mode', 'day')
    if not sheet: return jsonify({"data": []})
    try:
        rows = sheet.get_all_values()
        if len(rows) < 2: return jsonify({"data": []})
        data_rows = rows[1:]; grouped = {}; now = datetime.now()
        
        # เตรียม Template ข้อมูลตามช่วงเวลา
        if mode == 'day':
            for h in range(24):
                key = f"{h:02}:00"; grouped[key] = {"t_s":0,"h_s":0,"s_s":0,"l_s":0,"co":0,"n":0,"p":0,"k":0,"ph":0,"c":0,"time":key,"date":now.strftime('%Y-%m-%d'), "sort": h}
        elif mode == 'week':
            for i in range(6, -1, -1):
                dt_day = now - timedelta(days=i)
                for h_idx, h_block in enumerate(["00:00", "12:00"]):
                    key = f"{dt_day.strftime('%d/%m')} {h_block}"; grouped[key] = {"t_s":0,"h_s":0,"s_s":0,"l_s":0,"co":0,"n":0,"p":0,"k":0,"ph":0,"c":0,"time":key,"date":dt_day.strftime('%Y-%m-%d'), "sort": dt_day.strftime('%Y%m%d')+str(h_idx)}
        elif mode == 'month':
            last_day = calendar.monthrange(now.year, now.month)[1]
            for d in range(1, last_day + 1):
                dt_day = datetime(now.year, now.month, d)
                key = dt_day.strftime('%d/%m'); grouped[key] = {"t_s":0,"h_s":0,"s_s":0,"l_s":0,"co":0,"n":0,"p":0,"k":0,"ph":0,"c":0,"time":key,"date":dt_day.strftime('%Y-%m-%d'), "sort": d}

        # วนลูปข้อมูลจาก Sheet มาใส่ใน Template
        for row in data_rows:
            if len(row) < 11: continue
            dt = parse_dt(row[0], row[1])
            if not dt: continue
            mk = ""
            if mode == 'day' and dt.date() == now.date(): mk = f"{dt.hour:02}:00"
            elif mode == 'week' and (now-dt).days <= 7: mk = f"{dt.strftime('%d/%m')} {'00:00' if dt.hour < 12 else '12:00'}"
            elif mode == 'month' and dt.month == now.month: mk = dt.strftime('%d/%m')

            if mk in grouped:
                g = grouped[mk]
                g["t_s"]+=safe_float(row[2]); g["h_s"]+=safe_float(row[3]); g["s_s"]+=safe_float(row[4]); g["l_s"]+=safe_float(row[5])
                g["co"]+=safe_float(row[6]); g["n"]+=safe_float(row[7]); g["p"]+=safe_float(row[8]); g["k"]+=safe_float(row[9]); g["ph"]+=safe_float(row[10]); g["c"]+=1

        # คำนวณค่าเฉลี่ย
        res = []
        for k in sorted(grouped.keys(), key=lambda x: grouped[x]['sort']):
            v = grouped[k]
            if v["c"] > 0:
                res.append({"time": v["time"], "date": v["date"], "temp": round(v["t_s"]/v["c"], 1), "hum": round(v["h_s"]/v["c"], 1), "soil": round(v["s_s"]/v["c"], 1), "lux": round(v["l_s"]/v["c"], 0), "co2": round(v["co"]/v["c"], 0), "n": round(v["n"]/v["c"], 1), "p": round(v["p"]/v["c"], 1), "k": round(v["k"]/v["c"], 1), "ph": round(v["ph"]/v["c"], 1)})
            else: res.append({"time": v["time"], "date": v["date"], "temp": None})
        return jsonify({"data": res})
    except Exception as e: return jsonify({"data": [], "error": str(e)})

# ==========================================
# 4. REACT ROUTING
# ==========================================
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)