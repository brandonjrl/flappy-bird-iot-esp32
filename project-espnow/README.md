# ⚡ Proyecto Flappy Bird - ESP-NOW & Web Serial Edition

Este subproyecto implementa una arquitectura inalámbrica local de ultra baja latencia utilizando dos placas **ESP32** comunicándose directamente por radiofrecuencia (ESP-NOW) y conectándose al navegador mediante la **Web Serial API** sin requerir conexión a Internet.

---

## 📡 Arquitectura de Red y Conexiones

Dado que los navegadores web no pueden captar señales de radiofrecuencia directa, el sistema se divide en tres componentes:

```text
 [Botón]
    │
    ▼ (GPIO4 a GND)
[ESP32 EMISOR]
    │
    │  (Señal de Radio Directa ESP-NOW - Banda 2.4GHz)
    ▼  (Latencia: ~1ms / Sin Router WiFi)
[ESP32 RECEPTOR] (Conectado por USB a PC)
    │
    ▼ (Serial.println("JUMP") a 115200 baudios por cable USB)
[NAVEGADOR WEB] (Web Serial API en Chrome/Edge: ~0ms)
```

### Conexión del Emisor:
El pulsador físico se conecta entre el pin **GPIO4** y **GND** en la placa emisora:
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
El receptor solo requiere estar conectado mediante su cable USB directamente a un puerto físico de la computadora.

---

## 💾 Firmwares (ESP32)

Carga cada código en su respectiva placa mediante el **Arduino IDE**:

### 1. Firmware Emisor (`esp32_now_sender.ino`)
Configura la antena en modo estación y envía el mensaje de salto por broadcast a todos los dispositivos del canal:
* **Código:** [esp32_now_sender.ino](./esp32_firmware/esp32_now_sender/esp32_now_sender.ino)

### 2. Firmware Receptor (`esp32_now_receiver.ino`)
Recibe los comandos inalámbricos y los imprime al puerto serie a 115200 baudios:
* **Código:** [esp32_now_receiver.ino](./esp32_firmware/esp32_now_receiver/esp32_now_receiver.ino)

---

## 🛠️ Guía de Configuración en Arduino IDE (ESP32-C3 Super Mini)

Para compilar y subir correctamente los códigos a la placa **ESP32-C3 Super Mini** (que cuenta con un puerto USB CDC integrado), asegúrate de realizar la siguiente configuración en el menú **Herramientas (Tools)** del Arduino IDE:

| Opción / Ajuste | Configuración | Razón |
| :--- | :--- | :--- |
| **Placa (Board)** | `ESP32C3 Dev Module` (o `Lolin C3 Mini`) | Selecciona la arquitectura correcta (RISC-V). |
| **USB CDC On Boot** | **`Enabled` (Activado)** | Redirige `Serial.println()` directamente al puerto USB de la placa. |
| **Flash Mode** | **`DIO`** | Previene bucles infinitos de lectura SPI durante el arranque. |
| **Flash Frequency** | **`40MHz`** | Evita errores de sincronización y lectura de la memoria Flash. |
| **Partition Scheme** | `Minimal SPIFFS` o `Default` | Configuración estándar de memoria de programa. |

### Resolución de Problemas Comunes:
- **Error: `'USBSerial' was not declared in this scope`**: No es necesario definir `#define Serial USBSerial`. El núcleo moderno de ESP32 mapea automáticamente el objeto `Serial` al activar **USB CDC On Boot**.
- **Placa congelada al iniciar (`entry 0x403cbf10` en Monitor Serie)**: Compilaste usando la arquitectura Xtensa (ESP32 Dev Module) en vez de RISC-V (ESP32-C3 Dev Module). Vuelve a compilar seleccionando la placa correcta.

---

## 🗄️ Integración con Supabase

El juego interactúa de forma nativa con Supabase para dos funciones principales:
1. **Leaderboard**: Guarda la puntuación del jugador al perder (en la tabla `scores`).
2. **Telemetría en Tiempo Real**: Envía datos de telemetría (altura del ave, colisiones, latencia real, etc.) mediante **Supabase Realtime (Broadcast)** al canal `telemetry`.

### Configuración de Supabase:
1. Asegúrate de tener creadas las tablas `scores` y `test_table` en Supabase (ver esquemas SQL en el README raíz).
2. Crea un archivo `.env.local` en la raíz de esta carpeta (`/project-espnow`):
   ```env
   VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
   VITE_SUPABASE_ANON_KEY="tu-anon-key-publica"
   ```

---

## 🚀 Instalación y Ejecución del Servidor Web

1. Entra a la carpeta de este proyecto:
   ```bash
   cd project-espnow
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Ejecuta el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
4. **Cómo Jugar**:
   - Abre la web en tu navegador Chrome o Edge.
   - Haz clic en **🔌 CONECTAR RECEPTOR (COM)**.
   - Selecciona el puerto serie asignado al receptor ESP32.
   - ¡Presiona el botón físico inalámbrico para saltar! También puedes jugar localmente presionando la **Barra Espaciadora** en el teclado.
