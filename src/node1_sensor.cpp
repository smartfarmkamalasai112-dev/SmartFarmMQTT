#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <BH1750.h>
#include <MHZ19.h>
#include <ModbusMaster.h>
#include <SoftwareSerial.h> // ต้องใช้สำหรับ CO2 เพราะ HW Serial เต็ม

// =========================================
// 1. WiFi & MQTT Config
// =========================================
const char* ssid = "1";
const char* password = "11111111";
const char* mqtt_server = "10.214.234.116";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

// =========================================
// 2. Sensor Definitions (ตามที่คุณระบุ)
// =========================================

// --- Module 1: Air Sensor (XY-MD02) ---
#define RX_AIR        16
#define TX_AIR        17
#define DE_AIR        4  
#define ID_AIR        1
#define BAUD_AIR      9600

// --- Module 2: Soil Sensor (SN-3002) ---
#define RX_SOIL       26 
#define TX_SOIL       27 
#define DE_SOIL       14 
#define ID_SOIL       1      // ID ที่เราเปลี่ยนมา
#define BAUD_SOIL     4800   // ความเร็วที่สแกนเจอ

// --- Module 3: CO2 (MH-Z19b) ---
// *เพิ่ม: เนื่องจาก 16/17 ใช้ไปแล้ว ต้องใช้ขาอื่นเป็น SoftwareSerial
#define RX_CO2        32
#define TX_CO2        33

// --- Module 4: Lux (BH1750) ---
// I2C Default: SDA=21, SCL=22

// Register Map ดิน (SN-3002)
#define REG_SOIL_HUM  0x0000
#define REG_SOIL_TEMP 0x0001
#define REG_SOIL_EC   0x0002
#define REG_SOIL_PH   0x0003
#define REG_SOIL_N    0x0004
#define REG_SOIL_P    0x0005
#define REG_SOIL_K    0x0006

// =========================================
// 3. Object Initialization
// =========================================
ModbusMaster nodeAir;   // สำหรับ Air Sensor
ModbusMaster nodeSoil;  // สำหรับ Soil Sensor
BH1750 lightMeter;
MHZ19 myMHZ19;
SoftwareSerial co2Serial(RX_CO2, TX_CO2); 

// ตัวแปรเก็บค่าเพื่อส่ง
struct SensorData {
  float air_temp;
  float air_hum;
  float soil_temp;
  float soil_hum;
  uint16_t soil_ec;
  float soil_ph;
  uint16_t soil_n;
  uint16_t soil_p;
  uint16_t soil_k;
  int co2;
  float lux;
} data;

unsigned long lastMsg = 0;

// =========================================
// 4. Callbacks for RS485 Flow Control
// =========================================
void preTxAir() {
  digitalWrite(DE_AIR, HIGH);
}
void postTxAir() {
  digitalWrite(DE_AIR, LOW);
}

void preTxSoil() {
  digitalWrite(DE_SOIL, HIGH);
}
void postTxSoil() {
  digitalWrite(DE_SOIL, LOW);
}

// =========================================
// 5. Setup & Loop
// =========================================

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32_SmartFarm_Client")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200); // Debug Serial
  
  // -- Setup Pins --
  pinMode(DE_AIR, OUTPUT);
  pinMode(DE_SOIL, OUTPUT);
  digitalWrite(DE_AIR, LOW);
  digitalWrite(DE_SOIL, LOW);

  // -- 1. Setup Air Sensor (Serial2) --
  Serial2.begin(BAUD_AIR, SERIAL_8N1, RX_AIR, TX_AIR);
  nodeAir.begin(ID_AIR, Serial2);
  nodeAir.preTransmission(preTxAir);
  nodeAir.postTransmission(postTxAir);

  // -- 2. Setup Soil Sensor (Serial1) --
  Serial1.begin(BAUD_SOIL, SERIAL_8N1, RX_SOIL, TX_SOIL);
  nodeSoil.begin(ID_SOIL, Serial1);
  nodeSoil.preTransmission(preTxSoil);
  nodeSoil.postTransmission(postTxSoil);

  // -- 3. Setup CO2 (SoftwareSerial) --
  co2Serial.begin(9600);
  myMHZ19.begin(co2Serial);
  myMHZ19.autoCalibration(false);

  // -- 4. Setup Lux (I2C) --
  Wire.begin();
  lightMeter.begin();

  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 5000) { // อ่านและส่งทุก 5 วินาที
    lastMsg = now;

    // --- READ: Air Sensor (XY-MD02) ---
    uint8_t resultAir = nodeAir.readInputRegisters(0x0001, 2);
    if (resultAir == nodeAir.ku8MBSuccess) {
      data.air_temp = nodeAir.getResponseBuffer(0) / 10.0f;
      data.air_hum = nodeAir.getResponseBuffer(1) / 10.0f;
    } else {
      Serial.println("Error reading Air Sensor");
    }

    // --- READ: Soil Sensor (NPK) ---
    // อ่านรวดเดียว 7 Register (Hum, Temp, EC, pH, N, P, K)
    delay(100); // เว้นระยะนิดนึง
    uint8_t resultSoil = nodeSoil.readHoldingRegisters(REG_SOIL_HUM, 7);
    if (resultSoil == nodeSoil.ku8MBSuccess) {
      data.soil_hum  = nodeSoil.getResponseBuffer(0) / 10.0f; // เช็ค datasheet บางรุ่นไม่ต้องหาร
      data.soil_temp = nodeSoil.getResponseBuffer(1) / 10.0f;
     // data.soil_ec   = nodeSoil.getResponseBuffer(2);
      data.soil_ph   = nodeSoil.getResponseBuffer(3) / 10.0f;
      data.soil_n    = nodeSoil.getResponseBuffer(4);
      data.soil_p    = nodeSoil.getResponseBuffer(5);
      data.soil_k    = nodeSoil.getResponseBuffer(6);
    } else {
      Serial.println("Error reading Soil Sensor");
    }

    // --- READ: Lux & CO2 ---
    data.lux = lightMeter.readLightLevel();
    data.co2 = myMHZ19.getCO2();

    // --- PUBLISH to MQTT ---
    // สร้าง JSON String
    char msg[512];
    snprintf(msg, 512, 
      "{\"air\":{\"temp\":%.2f,\"hum\":%.2f},\"soil\":{\"temp\":%.2f,\"hum\":%.2f,\"ph\":%.2f,\"n\":%d,\"p\":%d,\"k\":%d},\"env\":{\"lux\":%.2f,\"co2\":%d}}",
      data.air_temp, data.air_hum,
      data.soil_temp, data.soil_hum, data.soil_ph, data.soil_ec, data.soil_n, data.soil_p, data.soil_k,
      data.lux, data.co2
    );
    
    Serial.println(msg); // แสดงใน Serial Monitor
    client.publish("smartfarm/sensors", msg);
  }
}