# ⚡ Proyecto Flappy Bird - ESP-NOW & Web Serial Edition

Este subproyecto implementa una arquitectura inalámbrica de ultra baja latencia utilizando dos placas ESP32 y la **Web Serial API** para conectarse al computador sin internet.

---

## 📡 Arquitectura de Red y Conexiones

Dado que los navegadores web no pueden captar señales de radiofrecuencia directa, el sistema se divide en tres partes:

```text
 [Botón]
    │
    ▼ (GPIO4 a GND)
[ESP32 EMISOR]
    │
    │  (Señal de Radio Directa ESP-NOW)
    ▼  (Latencia: ~1ms / Sin Router WiFi)
[ESP32 RECEPTOR] (Conectado USB a PC)
    │
    ▼ (Serial.println("JUMP") por cable USB)
[NAVEGADOR WEB] (Web Serial API en Chrome/Edge: ~0ms)
```

### Conexión del Emisor:
El pulsador físico se conecta entre **GPIO4** y **GND** en la placa emisora:
```text
           +-----------------------------+
           |       ESP32 EMISOR          |
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

### Conexión del Receptor:
El receptor solo requiere estar conectado mediante su cable USB directamente a un puerto físico de tu computadora.

---

## 💾 Firmwares (ESP32)

Carga cada código en su respectiva placa mediante el **Arduino IDE**:

### 1. Firmware Emisor (`esp32_now_sender.ino`)
Se carga en la placa con el botón físico. Configura la antena en modo de emisión directa (broadcast):
* **Ruta:** [esp32_now_sender.ino](./esp32_firmware/esp32_now_sender/esp32_now_sender.ino)

### 2. Firmware Receptor (`esp32_now_receiver.ino`)
Se carga en la placa que va por USB a la PC. Recibe las ondas de radio y escribe en el puerto serie por USB:
* **Ruta:** [esp32_now_receiver.ino](./esp32_firmware/esp32_now_receiver/esp32_now_receiver.ino)

---

## 🚀 Instalación y Ejecución de la Web

1. Entra a la carpeta de este proyecto:
   ```bash
   cd project-espnow
   ```
2. Instala los paquetes:
   ```bash
   npm install
   ```
3. Ejecuta el servidor local:
   ```bash
   npm run dev
   ```
4. **Cómo Jugar**: Abre el juego en tu navegador Chrome o Edge, haz clic en el botón **🔌 CONECTAR RECEPTOR (COM)**, selecciona tu puerto serie (por ejemplo, `COM8`) y presiona el botón físico inalámbrico para saltar al instante.
