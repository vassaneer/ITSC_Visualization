#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <stdio.h>
#include <stdlib.h>
#include <PZEM004Tv30.h>
#include <DHT.h>

// Update these with values suitable for your network.
const char* ssid = "@JumboPlusIoT";
const char* password = "ilovecmu";

// Config MQTT Server
#define mqtt_server "128.199.183.124"
#define mqtt_port 1883
#define mqtt_user "ik9"
#define mqtt_password "ik9"


#define LED_PIN 2

//config DHT
#define DHTTYPE DHT22
#define DHTPIN_a D6
#define DHTPIN_b D2
#define DHTPIN_c D5
#define DHTPIN_d D3
DHT dht_a(DHTPIN_a, DHTTYPE);
DHT dht_b(DHTPIN_b, DHTTYPE);
DHT dht_c(DHTPIN_c, DHTTYPE);
DHT dht_d(DHTPIN_d, DHTTYPE);

//config PZEM
PZEM004Tv30 pzem(D1, D0);

// declare device from id
const char* DEVICE_1 = "11";
const char* DEVICE_2 = "12";
const char* DEVICE_3 = "13";
const char* DEVICE_4 = "14";
const char* DEVICE_5 = "15";


// Define NTP Client to get time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  pinMode(LED_PIN, OUTPUT);
  
  Serial.begin(115200);
  delay(10);

  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  timeClient.begin();
  timeClient.setTimeOffset(25200);
  
  client.setServer(mqtt_server, mqtt_port);
  timeClient.begin();
//  client.setCallback(callback);

  //DHT begin
  dht_a.begin();
  dht_b.begin();
  dht_c.begin();
  dht_d.begin();
}
void loop() {
  //DHT input
  float h_a = dht_a.readHumidity();
  float t_a = dht_a.readTemperature();
  float f_a = dht_a.readTemperature(true);

  float h_b = dht_b.readHumidity();
  float t_b = dht_b.readTemperature();
  float f_b = dht_b.readTemperature(true);

  float h_c = dht_c.readHumidity();
  float t_c = dht_c.readTemperature();
  float f_c = dht_c.readTemperature(true);

  float h_d = dht_d.readHumidity();
  float t_d = dht_d.readTemperature();
  float f_d = dht_d.readTemperature(true);

  //PZEM input
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power = pzem.power();
  float energy = pzem.energy();
  float frequency = pzem.frequency();
  float pf = pzem.pf();
  
  
  if (client.connect("ESP8266Client", mqtt_user, mqtt_password)) {
      timeClient.update();
      unsigned long epochTime = timeClient.getEpochTime();
      char epoch [sizeof(unsigned long)*8+1];
      ultoa (epochTime,epoch,10);
      char str[100];
      strcpy (str,"");
      strcat (str,epoch);
      strcat (str,",");
      strcat (str,DEVICE_1);
      strcat (str,",");
      char value[10];
      //DHT_a
      snprintf(value, sizeof(value), "%.2f", h_a);
      strcat (str,value);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", t_a);
      strcat (str,value);
      strcat (str,",");
      //DHT_b
      strcat (str,DEVICE_2);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", h_b);
      strcat (str,value);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", t_b);
      strcat (str,value);
      strcat (str,",");
      //DHT_c
      strcat (str,DEVICE_3);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", h_c);
      strcat (str,value);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", t_c);
      strcat (str,value);
      strcat (str,",");
      //DHT_d
      strcat (str,DEVICE_4);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", h_d);
      strcat (str,value);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", t_d);
      strcat (str,value);
      strcat (str,",");
      //PZEM
      strcat (str,DEVICE_5);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", voltage);
      strcat (str,value);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", current);
      strcat (str,value);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", power);
      strcat (str,value);
      strcat (str,",");
      snprintf(value, sizeof(value), "%.2f", energy);
      strcat (str,value);
      strcat (str,",");
      client.publish("Datacenter",str);
  } 

  Serial.println(t_a);
  Serial.println(t_b);
  Serial.println(t_c);
  Serial.println(t_d);
  Serial.println(voltage);
  Serial.println(current);
  delay(300000);
}
