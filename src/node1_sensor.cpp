#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <BH1750.h>
#include <MHZ19.h>
#include <ModbusMaster.h>
#include <SoftwareSerial.h>
#include <ESPmDNS.h>

// =========================================
// 1. WiFi & MQTT Config
// =========================================
const char* ssid = "Kamalasai2";
const char* password = "";
// ใช้ชื่อ Hostname ในการค้นหา (แนะนำ)
const char* target_hostname = "Admin"; 
// Hostname ที่จะส่งให้ PubSubClient (ใช้ DNS/mDNS เมื่อเป็นไปได้)
const char* mqtt_server = "raspberrypi.local";
// ✅ แก้ไข: ใช้ IP ปัจจุบันของคุณเป็นตัวสำรอง (กันเหนียว)
const char* fallback_ip = "10.64.114.116"; 
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

// Sensor Definitions
#define RX_AIR 16
#define TX_AIR 17
#define DE_AIR 4  
#define ID_AIR 1
#define BAUD_AIR 9600

#define RX_SOIL 26 
#define TX_SOIL 27 
#define DE_SOIL 14 
#define ID_SOIL 1
#define BAUD_SOIL 4800

#define RX_CO2 32
#define TX_CO2 33

#define REG_SOIL_HUM  0x0000
#define REG_SOIL_TEMP 0x0001
#define REG_SOIL_EC   0x0002
#define REG_SOIL_PH   0x0003
#define REG_SOIL_N    0x0004
#define REG_SOIL_P    0x0005
#define REG_SOIL_K    0x0006

ModbusMaster nodeAir;
ModbusMaster nodeSoil;
BH1750 lightMeter;
MHZ19 myMHZ19;
SoftwareSerial co2Serial(RX_CO2, TX_CO2); 

struct SensorData {
  float air_temp; float air_hum;
  float soil_temp; float soil_hum;
  uint16_t soil_ec; float soil_ph;
  uint16_t soil_n; uint16_t soil_p; uint16_t soil_k;
  int co2; float lux;
} data;
unsigned long lastMsg = 0;

void preTxAir() { digitalWrite(DE_AIR, HIGH); }
void postTxAir() { digitalWrite(DE_AIR, LOW); }
void preTxSoil() { digitalWrite(DE_SOIL, HIGH); }
void postTxSoil() { digitalWrite(DE_SOIL, LOW); }

// ฟังก์ชันค้นหา IP จากชื่อเครื่อง (mDNS)
IPAddress resolveMQTT() {
  Serial.print("Looking for "); Serial.print(target_hostname); Serial.println(".local ...");
  
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

void setup_wifi() {
  delay(10);
  Serial.print("Connecting to "); Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi connected");
  
  if (!MDNS.begin("esp32-node1")) {
      Serial.println("Error setting up MDNS responder!");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32_SmartFarm_Node1")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5s");
      
      // ถ้าเชื่อมไม่ได้ ให้ลองหา IP ใหม่อีกรอบ (เผื่อ IP เปลี่ยน)
      IPAddress newIP = resolveMQTT();
      client.setServer(newIP, mqtt_port);
      
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(DE_AIR, OUTPUT); pinMode(DE_SOIL, OUTPUT);
  digitalWrite(DE_AIR, LOW); digitalWrite(DE_SOIL, LOW);

  Serial2.begin(BAUD_AIR, SERIAL_8N1, RX_AIR, TX_AIR);
  nodeAir.begin(ID_AIR, Serial2);
  nodeAir.preTransmission(preTxAir);
  nodeAir.postTransmission(postTxAir);

  Serial1.begin(BAUD_SOIL, SERIAL_8N1, RX_SOIL, TX_SOIL);
  nodeSoil.begin(ID_SOIL, Serial1);
  nodeSoil.preTransmission(preTxSoil);
  nodeSoil.postTransmission(postTxSoil);

  co2Serial.begin(9600);
  myMHZ19.begin(co2Serial);
  myMHZ19.autoCalibration(false);

  Wire.begin();
  lightMeter.begin();

  setup_wifi();

  // เรียกใช้ server เป็น hostname ก่อน (ให้ PubSubClient ทำ DNS ถ้าเป็นไปได้)
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 2000) { 
    lastMsg = now;

    // Reset all sensor values to 0
    data.air_temp = 0; data.air_hum = 0;
    data.soil_temp = 0; data.soil_hum = 0; data.soil_ec = 0;
    data.soil_ph = 0; data.soil_n = 0; data.soil_p = 0; data.soil_k = 0;
    data.lux = 0; data.co2 = 0;

    // Read Air Sensor
    uint8_t resultAir = nodeAir.readInputRegisters(0x0001, 2);
    if (resultAir == nodeAir.ku8MBSuccess) {
      data.air_temp = nodeAir.getResponseBuffer(0) / 10.0f;
      data.air_hum = nodeAir.getResponseBuffer(1) / 10.0f;
    } else {
      Serial.printf("[Air] Read failed (rc=%d) → 0\n", resultAir);
    }

    delay(100);

    // Read Soil Sensor
    uint8_t resultSoil = nodeSoil.readHoldingRegisters(REG_SOIL_HUM, 7);
    if (resultSoil == nodeSoil.ku8MBSuccess) {
      data.soil_hum  = nodeSoil.getResponseBuffer(0) / 10.0f;
      data.soil_temp = nodeSoil.getResponseBuffer(1) / 10.0f;
      data.soil_ph   = nodeSoil.getResponseBuffer(3) / 10.0f;
      data.soil_n    = nodeSoil.getResponseBuffer(4);
      data.soil_p    = nodeSoil.getResponseBuffer(5);
      data.soil_k    = nodeSoil.getResponseBuffer(6);
    } else {
      Serial.printf("[Soil] Read failed (rc=%d) → 0\n", resultSoil);
    }

    // Read Lux Sensor
    float lux = lightMeter.readLightLevel();
    if (lux >= 0) {
      data.lux = lux;
    } else {
      Serial.println("[Lux] Read failed → 0");
    }

    // Read CO2 Sensor
    int co2 = myMHZ19.getCO2();
    if (co2 > 0 && co2 < 5000) {  // Valid CO2 range
      data.co2 = co2;
    } else {
      Serial.printf("[CO2] Read failed (value=%d) → 0\n", co2);
    }

    char msg[512];
    snprintf(msg, 512, 
      "{\"air\":{\"temp\":%.2f,\"hum\":%.2f},\"soil\":{\"temp\":%.2f,\"hum\":%.2f,\"ph\":%.2f,\"n\":%d,\"p\":%d,\"k\":%d},\"env\":{\"lux\":%.2f,\"co2\":%d}}",
      data.air_temp, data.air_hum,
      data.soil_temp, data.soil_hum, data.soil_ph, data.soil_ec, data.soil_n, data.soil_p, data.soil_k,
      data.lux, data.co2
    );
    
    Serial.println(msg);
    client.publish("smartfarm/sensors", msg);
  }
}