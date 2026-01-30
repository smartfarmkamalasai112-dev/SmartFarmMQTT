#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESPmDNS.h>

// =========================================
// 1. Config WiFi & MQTT
// =========================================
const char* ssid = "Kamalasai2";
const char* password = "";
const char* target_hostname = "Admin"; 
// Hostname ที่จะส่งให้ PubSubClient (ใช้ DNS/mDNS เมื่อเป็นไปได้)
const char* mqtt_server = "raspberrypi.local";
// ✅ แก้ไข: ใช้ IP ปัจจุบันของคุณเป็นตัวสำรอง
const char* fallback_ip = "10.64.114.116"; 
const int mqtt_port = 1883;

#define RELAY_1 18
#define RELAY_2 19
#define RELAY_3 21
#define RELAY_4 22

WiFiClient espClient;
PubSubClient client(espClient);

struct RelayRule { float threshold; bool activeOnHigh; };
RelayRule rules[4] = {{40.0, false}, {32.0, true}, {100.0, false}, {60.0, false}};

bool isAutoMode = true;
bool relayState[4] = {false, false, false, false};

// ✅ เพิ่มตัวแปรสำหรับระบบรดน้ำพิเศษ
bool pumpActive = false;
unsigned long pumpStartTime = 0;
const unsigned long PUMP_ON_TIME = 30000; // 30 วินาที
const unsigned long PUMP_CHECK_TIME = 10000; // 10 วินาที
bool pumpWaiting = false;
unsigned long pumpWaitStart = 0;
float currentValues[4] = {0, 0, 0, 0};
const char* relayNames[] = {"Pump", "Fan", "Lamp", "Mist"};

// ✅ แก้ไข: High Active (HIGH = ON, LOW = OFF)
void applyRelay(int pin, bool turnOn) {
  digitalWrite(pin, turnOn ? HIGH : LOW);
}

void controlPump(float currentHum, float threshold, bool activeOnHigh) {
  bool shouldPump = false;
  if (activeOnHigh) {
    shouldPump = (currentHum > threshold);
  } else {
    shouldPump = (currentHum < threshold);
  }
  if (!shouldPump) {
    // ไม่ตรงเงื่อนไข -> ปิดปั๊มทันที
    pumpActive = false;
    pumpWaiting = false;
    relayState[0] = false;
    applyRelay(RELAY_1, false);
  } else {
    // ตรงเงื่อนไข -> ต้องการรด
    if (!pumpActive && !pumpWaiting) {
      // เริ่มเปิดปั๊ม
      pumpActive = true;
      pumpStartTime = millis();
      relayState[0] = true;
      applyRelay(RELAY_1, true);
    }
  }
}

void publishStatus() {
  JsonDocument doc;
  doc["mode"] = isAutoMode ? "AUTO" : "MANUAL";
  JsonArray rStates = doc["relays"].to<JsonArray>();
  JsonArray rConfig = doc["config"].to<JsonArray>();

  for(int i=0; i<4; i++) {
    rStates.add(relayState[i]);
    JsonObject rule = rConfig.add<JsonObject>();
    rule["target"] = rules[i].threshold;
    rule["condition"] = rules[i].activeOnHigh ? ">" : "<";
  }
  char buffer[1024];
  serializeJson(doc, buffer);
  client.publish("smartfarm/status", buffer);
}

IPAddress resolveMQTT() {
  Serial.print("Resolving host: "); Serial.println(target_hostname);
  IPAddress ip = MDNS.queryHost(target_hostname);
  
  if (ip == IPAddress(0, 0, 0, 0)) {
    Serial.print("❌ mDNS Failed! Using Fallback IP: ");
    ip.fromString(fallback_ip);
    Serial.println(ip);
  } else {
    Serial.print("✅ Found IP via mDNS: ");
    Serial.println(ip);
  }
  return ip;
}

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, msg);
  if (error) return;

  String topicStr = String(topic);

  if (topicStr == "smartfarm/sensors") {
    currentValues[0] = doc["soil"]["hum"].as<float>();
    currentValues[1] = doc["air"]["temp"].as<float>();
    currentValues[2] = doc["env"]["lux"].as<float>();
    currentValues[3] = doc["air"]["hum"].as<float>();

    if (isAutoMode) {
      // ✅ ระบบรดน้ำพิเศษสำหรับปั๊ม (relay 0)
      controlPump(currentValues[0], rules[0].threshold, rules[0].activeOnHigh);
      
      // อุปกรณ์อื่นตาม rules ปกติ
      for(int i=1; i<4; i++) {
        bool conditionMet = false;
        if (rules[i].activeOnHigh) conditionMet = (currentValues[i] > rules[i].threshold);
        else conditionMet = (currentValues[i] < rules[i].threshold);
        relayState[i] = conditionMet;
      }
      applyRelay(RELAY_2, relayState[1]); applyRelay(RELAY_3, relayState[2]);
      applyRelay(RELAY_4, relayState[3]);
      publishStatus();
    }
  }
  else if (topicStr == "smartfarm/config") {
    int idx = doc["index"];
    if (idx >= 0 && idx < 4) {
      if (doc["target"].is<float>()) rules[idx].threshold = doc["target"];
      if (doc["condition"].is<String>()) {
          // Explicitly cast to String to resolve ambiguity
          String cond = doc["condition"].as<String>();
          rules[idx].activeOnHigh = (cond == ">");
      }
      publishStatus();
    }
  }
  else if (topicStr == "smartfarm/control") {
    String type = doc["type"].as<String>();
    if (type == "MODE") isAutoMode = (doc["value"].as<String>() == "AUTO");
    else if (type == "RELAY" && !isAutoMode) {
      int idx = doc["index"];
      bool val = doc["value"];
      if(idx >= 0 && idx < 4) relayState[idx] = val;
    }
    applyRelay(RELAY_1, relayState[0]); applyRelay(RELAY_2, relayState[1]);
    applyRelay(RELAY_3, relayState[2]); applyRelay(RELAY_4, relayState[3]);
    publishStatus();
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32_Node2_Relay")) {
      Serial.println("connected");
      client.subscribe("smartfarm/sensors");
      client.subscribe("smartfarm/control");
      client.subscribe("smartfarm/config");
      publishStatus();
    } else {
      Serial.print("failed, rc="); Serial.print(client.state());
      Serial.println(" try again in 5s");
      
      IPAddress newIP = resolveMQTT();
      client.setServer(newIP, mqtt_port);
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_1, OUTPUT); pinMode(RELAY_2, OUTPUT);
  pinMode(RELAY_3, OUTPUT); pinMode(RELAY_4, OUTPUT);
  
  // ✅ แก้ไข: Active HIGH (เริ่มที่ LOW/OFF)
  digitalWrite(RELAY_1, LOW); digitalWrite(RELAY_2, LOW);
  digitalWrite(RELAY_3, LOW); digitalWrite(RELAY_4, LOW);

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" Connected!");
  } else {
    Serial.println(" Failed to connect!");
    // Scan WiFi
    Serial.println("Scanning WiFi networks...");
    int n = WiFi.scanNetworks();
    Serial.println("Scan done");
    if (n == 0) {
      Serial.println("No networks found");
    } else {
      Serial.print(n);
      Serial.println(" networks found");
      for (int i = 0; i < n; ++i) {
        Serial.print(i + 1);
        Serial.print(": ");
        Serial.print(WiFi.SSID(i));
        Serial.print(" (");
        Serial.print(WiFi.RSSI(i));
        Serial.print(")");
        Serial.println((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? " " : "*");
        delay(10);
      }
    }
    while (true) delay(1000); // Stop here
  }
  
  if (!MDNS.begin("esp32-node2")) Serial.println("Error setting up MDNS responder!");

  // ใช้ hostname ก่อน ให้ไลบรารีทำ DNS/mDNS ถ้าเป็นไปได้
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

unsigned long lastDebug = 0;
void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  
  // ✅ จัดการ timer สำหรับระบบรดน้ำ
  unsigned long now = millis();
  if (pumpActive && (now - pumpStartTime >= PUMP_ON_TIME)) {
    // เปิดครบ 30 วินาที -> ปิดและรอ 8 วินาที
    pumpActive = false;
    pumpWaiting = true;
    pumpWaitStart = now;
    relayState[0] = false;
    applyRelay(RELAY_1, false);
  } else if (pumpWaiting && (now - pumpWaitStart >= PUMP_CHECK_TIME)) {
    // รอครบ 8 วินาที -> ตรวจสอบใหม่ (จะเรียก controlPump ใน callback ถ้ามี sensors ใหม่)
    pumpWaiting = false;
  }
  
  if (millis() - lastDebug > 2000) {
    lastDebug = millis();
    Serial.printf("MODE: %s\n", isAutoMode ? "AUTO" : "MANUAL");
  }
}