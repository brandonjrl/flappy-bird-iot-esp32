/**
 * ESP-NOW Sender (Emisor con Botón) - Flappy Bird Controller
 * Lee un botón físico en GPIO4 y envía un mensaje "JUMP" inalámbrico vía ESP-NOW.
 */

#include <esp_now.h>
#include <WiFi.h>

// --- Configuración de Pines ---
const int BUTTON_PIN = 4; // GPIO4 conectado al pulsador (GND)
int lastButtonState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 20; // Tiempo de antirebote (ms)

// Dirección MAC del Receptor (Broadcast: Envía a todos en el mismo canal WiFi)
uint8_t receiverAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

// Estructura para enviar el comando
typedef struct struct_message {
  char cmd[32];
} struct_message;

struct_message myData;
esp_now_peer_info_t peerInfo;

// Callback cuando se envía un mensaje
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("\r\nEstado de envío del último paquete: ");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Éxito" : "Fallo");
}

void setup() {
  Serial.begin(115200);
  
  // Configurar botón
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Configurar WiFi en modo Estación (requerido para ESP-NOW)
  WiFi.mode(WIFI_STA);

  // Inicializar ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error inicializando ESP-NOW");
    return;
  }

  // Registrar callback de envío
  esp_now_register_send_cb(OnDataSent);
  
  // Registrar el peer (Receptor)
  memcpy(peerInfo.peer_addr, receiverAddress, 6);
  peerInfo.channel = 1;  // Canal de transmisión (debe coincidir en ambos dispositivos)
  peerInfo.encrypt = false;
  
  // Agregar peer
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Error agregando el receptor");
    return;
  }
}

void loop() {
  int reading = digitalRead(BUTTON_PIN);

  // Detección de flanco de bajada (Botón presionado a GND)
  if (reading == LOW && lastButtonState == HIGH) {
    if ((millis() - lastDebounceTime) > debounceDelay) {
      Serial.println("Botón presionado. Enviando comando JUMP...");
      
      // Preparar mensaje
      strcpy(myData.cmd, "JUMP");
      
      // Enviar datos
      esp_now_send(receiverAddress, (uint8_t *) &myData, sizeof(myData));
      
      lastDebounceTime = millis();
    }
  }
  lastButtonState = reading;
}
