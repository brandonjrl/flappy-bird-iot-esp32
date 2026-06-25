# 📡 Proyecto Flappy Bird - MQTT Edition

Este subproyecto conecta el juego Flappy Bird a un broker público de MQTT (HiveMQ) mediante WebSockets seguros. Permite controlar el salto del ave de forma inalámbrica a través de Internet usando una sola placa ESP32 con conexión WiFi.

---

## 🔌 Diagrama de Conexión del Hardware

El pulsador físico se debe conectar entre el pin **GPIO4** y **GND** (Tierra) del ESP32. Al configurarse con la resistencia interna `INPUT_PULLUP`, el pin permanece en estado `HIGH` y cambia a `LOW` al ser presionado, cerrando el circuito a tierra y desencadenando la acción.

```text
           +-----------------------------+
           |           ESP32             |
           |                             |
           |    [GND]            [GPIO4] |
           +------|-----------------|----+
                  |                 |
                  |             +---+---+
                  |             |       |
                  |          [ BOTÓN ]  |
                  |             |       |
                  |             +---+---+
                  +-----------------+
```

---

## 💾 Código del Firmware (ESP32)

Carga este firmware a tu placa emisora mediante el **Arduino IDE** (requiere instalar la librería **`PubSubClient`** de Nick O'Leary desde el gestor de librerías):

```cpp
#include <WiFi.h>
#include <PubSubClient.h>

// Configuración de red WiFi
const char* ssid = "TU_WIFI_SSID";             
const char* password = "TU_WIFI_PASSWORD";     

// Broker MQTT Público (HiveMQ)
const char* mqtt_server = "broker.hivemq.com"; 
const int mqtt_port = 1883;                    
const char* topic = "workshop/flappy_bird/jump";

const int BUTTON_PIN = 4; 
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 20; // Tiempo de antirebote (ms)

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

  Serial.println("");
  Serial.println("WiFi conectado");
  Serial.println("Direccion IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Intentando conexion MQTT...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("conectado");
    } else {
      Serial.print("fallo, rc=");
      Serial.print(client.state());
      Serial.println(" intentando de nuevo en 5 segundos");
      delay(5000);
    }
  }
}

void setup() {
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

  int reading = digitalRead(BUTTON_PIN);
  if (reading == LOW && lastButtonState == HIGH) {
    if ((millis() - lastDebounceTime) > debounceDelay) {
      Serial.println("Enviando JUMP vía MQTT...");
      client.publish(topic, "JUMP");
      lastDebounceTime = millis();
    }
  }
  lastButtonState = reading;
}
```

---

## 🚀 Instalación y Ejecución del Servidor Web

1. Entra a la carpeta de este proyecto:
   ```bash
   cd project-mqtt
   ```

2. Instala los paquetes:
   ```bash
   npm install
   ```

3. Ejecuta el servidor local:
   ```bash
   npm run dev
   ```

4. **Cómo Jugar**: Abre la aplicación en tu navegador. El cliente web se conectará automáticamente al broker MQTT de HiveMQ usando WebSockets seguros (`wss://broker.hivemq.com:8884/mqtt`). Presiona el botón físico conectado al ESP32 para saltar, o juega localmente usando la **Barra Espaciadora** en el teclado.

---

## 🔧 Solución de Problemas de Carga (ESP32)

Si al subir el código en el Arduino IDE la consola se queda en `Connecting......` y falla con un error de arranque:
1. Vuelve a hacer clic en **Subir** (Upload) en el Arduino IDE.
2. En cuanto aparezcan los puntos suspensivos `Connecting......`, mantén presionado el botón físico **"BOOT"** en tu ESP32.
3. Suéltalo tan pronto como veas que inicia la escritura (`Writing at...`).
