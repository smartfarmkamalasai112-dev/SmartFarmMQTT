#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// =========================================
// 1. Config WiFi & MQTT (แก้ไขส่วนนี้)
// =========================================
const char* ssid = "Kamalasai2_EXT";   // แก้ตามรูปภาพ
const char* password = "";             // แก้ตามคำสั่ง (no password)
const char* mqtt_server = "192.168.1.206"; // แก้เป็น Static IP ที่ฟิกไว้ใน Pi
const int mqtt_port = 1883;

// =========================================
// 2. Pin Definitions (Node 2)
// =========================================
#define RELAY_1  18 // ปั๊มน้ำ
#define RELAY_2  19 // พัดลม
#define RELAY_3  21 // ไฟ
#define RELAY_4  22 // พ่นหมอก

WiFiClient espClient;
PubSubClient client(espClient);

// =========================================
// 3. Data Structures & Globals
// =========================================

// โครงสร้างเก็บเงื่อนไขการทำงาน
struct RelayRule {
  float threshold;    // ค่าที่ตั้งไว้
  bool activeOnHigh;  // true = ทำงานเมื่อมากกว่า (>), false = ทำงานเมื่อน้อยกว่า (<)
};

// ค่าเริ่มต้น (Default Rules)
RelayRule rules[4] = {
  {40.0, false}, // Relay 1: < 40
  {32.0, true},  // Relay 2: > 32
  {100.0, false},// Relay 3: < 100
  {60.0, false}  // Relay 4: < 60
};

bool isAutoMode = true;                 // เริ่มต้นเป็น Auto
bool relayState[4] = {false, false, false, false}; // สถานะรีเลย์ปัจจุบัน
float currentValues[4] = {0, 0, 0, 0};  // ค่า Sensor ล่าสุดที่รับมา
const char* relayNames[] = {"Pump", "Fan", "Lamp", "Mist"};

// =========================================
// 4. Helper Functions
// =========================================

// ฟังก์ชันสั่ง Hardware (Low Active)
void applyRelay(int pin, bool turnOn) {
  digitalWrite(pin, turnOn ? LOW : HIGH);
}

// ฟังก์ชันส่งสถานะกลับไปหน้าเว็บ (สำคัญมาก เพื่อให้หน้าเว็บตรงกับบอร์ด)
void publishStatus() {
  StaticJsonDocument<1024> doc;
  doc["mode"] = isAutoMode ? "AUTO" : "MANUAL";
  
  JsonArray rStates = doc.createNestedArray("relays");
  JsonArray rConfig = doc.createNestedArray("config");

  for(int i=0; i<4; i++) {
    rStates.add(relayState[i]); // ส่งสถานะ ON/OFF
    
    // ส่ง Config ปัจจุบันกลับไปด้วย
    JsonObject rule = rConfig.createNestedObject();
    rule["target"] = rules[i].threshold;
    rule["condition"] = rules[i].activeOnHigh ? ">" : "<";
  }
  
  char buffer[1024];
  serializeJson(doc, buffer);
  client.publish("smartfarm/status", buffer);
}

// =========================================
// 5. MQTT Callback (สมองของระบบ)
// =========================================
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, msg);
  if (error) return;

  String topicStr = String(topic);

  // --- กรณีที่ 1: รับค่า Sensor จาก Node 1 ---
  if (topicStr == "smartfarm/sensors") {
    currentValues[0] = doc["soil"]["hum"];
    currentValues[1] = doc["air"]["temp"];
    currentValues[2] = doc["env"]["lux"];
    currentValues[3] = doc["air"]["hum"];

    // ถ้าเป็น Auto ให้คิดเองเออเองเลย
    if (isAutoMode) {
      for(int i=0; i<4; i++) {
        bool conditionMet = false;
        if (rules[i].activeOnHigh) {
           conditionMet = (currentValues[i] > rules[i].threshold); // เงื่อนไข >
        } else {
           conditionMet = (currentValues[i] < rules[i].threshold); // เงื่อนไข <
        }
        relayState[i] = conditionMet;
      }
      
      // สั่งงาน Hardware
      applyRelay(RELAY_1, relayState[0]);
      applyRelay(RELAY_2, relayState[1]);
      applyRelay(RELAY_3, relayState[2]);
      applyRelay(RELAY_4, relayState[3]);
      
      // *** จุดที่แก้ไข: แจ้งหน้าเว็บทันทีเมื่อมีการเปลี่ยนแปลง ***
      publishStatus(); 
    }
  }
  
  // --- กรณีที่ 2: รับคำสั่งตั้งค่าเงื่อนไข (Config) ---
  else if (topicStr == "smartfarm/config") {
    int idx = doc["index"];
    if (idx >= 0 && idx < 4) {
      if (doc.containsKey("target")) rules[idx].threshold = doc["target"];
      if (doc.containsKey("condition")) {
        String cond = doc["condition"];
        rules[idx].activeOnHigh = (cond == ">");
      }
      Serial.printf("[CONFIG] Updated Relay %d\n", idx+1);
      publishStatus(); // ส่งค่าใหม่กลับไปยืนยัน
    }
  }

  // --- กรณีที่ 3: รับคำสั่งควบคุม (Manual/Mode) ---
  else if (topicStr == "smartfarm/control") {
    String type = doc["type"];
    
    if (type == "MODE") {
      isAutoMode = (doc["value"] == "AUTO");
      Serial.println(isAutoMode ? "[MODE] Auto" : "[MODE] Manual");
    } 
    else if (type == "RELAY" && !isAutoMode) {
      int idx = doc["index"];
      bool val = doc["value"];
      if(idx >= 0 && idx < 4) relayState[idx] = val;
    }
    
    // อัปเดต Hardware ตามคำสั่ง
    applyRelay(RELAY_1, relayState[0]);
    applyRelay(RELAY_2, relayState[1]);
    applyRelay(RELAY_3, relayState[2]);
    applyRelay(RELAY_4, relayState[3]);
    
    publishStatus(); // แจ้งสถานะกลับ
  }
}

// =========================================
// 6. Setup & Loop
// =========================================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32_Node2_Relay")) {
      Serial.println("connected");
      client.subscribe("smartfarm/sensors");
      client.subscribe("smartfarm/control");
      client.subscribe("smartfarm/config");
      publishStatus(); // ส่งสถานะเริ่มต้น
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // Setup Pins
  pinMode(RELAY_1, OUTPUT); pinMode(RELAY_2, OUTPUT);
  pinMode(RELAY_3, OUTPUT); pinMode(RELAY_4, OUTPUT);
  
  // Default OFF (High because Low Active)
  digitalWrite(RELAY_1, HIGH); digitalWrite(RELAY_2, HIGH);
  digitalWrite(RELAY_3, HIGH); digitalWrite(RELAY_4, HIGH);

  // Setup WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

unsigned long lastDebug = 0;

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Debug ข้อมูลผ่าน Serial Monitor ทุก 2 วินาที
  if (millis() - lastDebug > 2000) {
    lastDebug = millis();
    Serial.println("\n--- STATUS ---");
    Serial.printf("MODE: %s\n", isAutoMode ? "AUTO" : "MANUAL");
    for(int i=0; i<4; i++) {
       const char* cond = rules[i].activeOnHigh ? ">" : "<";
       const char* state = relayState[i] ? "ON" : "OFF";
       Serial.printf("[%s] Val: %.1f | Rule: %s %.1f | State: %s\n", 
                     relayNames[i], currentValues[i], cond, rules[i].threshold, state);
    }
  }
}