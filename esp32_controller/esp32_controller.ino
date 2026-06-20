/**
 * Flappy Bird IoT - Jump Controller
 * Dispara el salto del ave publicando un mensaje en el broker MQTT de HiveMQ.
 */

#include <WiFi.h>
#include <PubSubClient.h>

// --- Ajustes de Red y Comunicación ---
const char* ssid = "TU_WIFI_SSID";             // Tu red WiFi
const char* password = "TU_WIFI_PASSWORD";     // Tu contraseña WiFi
const char* mqtt_server = "broker.hivemq.com";               // Broker público de HiveMQ
const int mqtt_port = 1883;                                  // Puerto TCP estándar para MQTT
const char* topic = "workshop/flappy_bird/jump";

// --- Configuración de Pines ---
const int BUTTON_PIN = 4; // Pin GPIO4 conectado al pulsador
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 50; // Tiempo de antirebote en milisegundos

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Conectando a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  randomSeed(micros());
  Serial.println("");
  Serial.println("WiFi conectado exitosamente");
  Serial.print("Direccion IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  // Loop hasta reconectar con el broker MQTT
  while (!client.connected()) {
    Serial.print("Intentando conexion MQTT...");
    // Generar un ID de cliente aleatorio único
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("¡Conectado al Broker!");
    } else {
      Serial.print("Fallo de conexion, rc=");
      Serial.print(client.state());
      Serial.println(". Reintentando en 5 segundos...");
      delay(5000);
    }
  }
}

void setup() {
  // Configurar el pin del botón con resistencia de pull-up interna activa
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  Serial.begin(115200);
  setup_wifi();
  
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // Lectura del pin del botón
  int reading = digitalRead(BUTTON_PIN);

  // Comprobación de estado lógico de caída (Físico presionado)
  if (reading == LOW && lastButtonState == HIGH) {
    if ((millis() - lastDebounceTime) > debounceDelay) {
      // Registrar salto
      Serial.println("Boton presionado fisicamente. Publicando JUMP...");
      client.publish(topic, "JUMP");
      lastDebounceTime = millis();
    }
  }
  lastButtonState = reading;
}
