/**
 * ESP-NOW Receiver (Receptor en USB) - Flappy Bird Controller
 * Escucha comandos inalámbricos vía ESP-NOW y los escribe al Puerto Serie (USB)
 * a 115200 baudios.
 * 
 * ⚠️ IMPORTANTE PARA EL RECEPTOR ESP32-C3 SUPER MINI:
 * En tu Arduino IDE, antes de subir el código, debes ir a:
 * Herramientas > USB CDC On Boot y configurarlo en "Enabled" (Activado).
 * Esto permite que el puerto USB integrado del C3 reciba los comandos de Serial.println().
 */

#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>

// Estructura idéntica a la del emisor
typedef struct struct_message {
  char cmd[32];
} struct_message;

const int LED_PIN = 8; // LED azul integrado en la ESP32-C3 Super Mini
struct_message myData;

// Callback ejecutado al recibir un paquete (Compatible con Core ESP32 v2.x y v3.x)
#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
void OnDataRecv(const esp_now_recv_info_t * recvInfo, const uint8_t *incomingData, int len) {
  const uint8_t *mac = recvInfo->src_addr;
#else
void OnDataRecv(const uint8_t * mac, const uint8_t *incomingData, int len) {
#endif
  memcpy(&myData, incomingData, sizeof(myData));
  
  // Si el mensaje es JUMP, enviarlo al navegador por Puerto Serie (USB)
  if (strcmp(myData.cmd, "JUMP") == 0) {
    Serial.println("JUMP"); // Imprimir en el puerto serie
    
    // Cambiar estado del LED de diagnóstico
    static bool ledState = false;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState ? LOW : HIGH); // LOW suele encender el LED en la C3 Super Mini
  }
}

void setup() {
  // Configurar LED integrado de diagnóstico
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // Apagado por defecto

  // Iniciar Puerto Serie (USB) a 115200 baudios
  Serial.begin(115200);
  delay(1500); // Esperar a que el puerto USB CDC del C3 se establezca en la PC
  Serial.println("Receptor ESP32-C3: Iniciando...");

  // Parpadear 3 veces al iniciar para indicar arranque exitoso del firmware
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, LOW); // Enciende
    delay(100);
    digitalWrite(LED_PIN, HIGH); // Apaga
    delay(100);
  }

  // Configurar WiFi en modo Estación (Por defecto inicia en Canal 1)
  WiFi.mode(WIFI_STA);

  // Inicializar ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error inicializando ESP-NOW");
    return;
  }
  
  // Registrar callback de recepción
  esp_now_register_recv_cb(OnDataRecv);
  
  Serial.println("Receptor ESP-NOW listo y escuchando...");
}

void loop() {
  // No se requiere lógica en el loop, todo ocurre por callbacks asíncronos
  delay(100);
}
