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

## 🛠️ Guía de Configuración e IDE y Solución de Problemas (ESP32-C3 Super Mini)

Al programar la placa **ESP32-C3 Super Mini** (que usa una arquitectura RISC-V y un puerto USB integrado con CDC nativo), es muy común toparse con errores de compilación y carga. A continuación se detallan las soluciones a los problemas detectados:

### 1. Error: `'USBSerial' was not declared in this scope`
Si intentas compilar y obtienes este error:
```text
error: 'USBSerial' was not declared in this scope; did you mean 'Serial'?
#define Serial USBSerial
```
**¿Por qué sucede?**
En las versiones modernas del ESP32 Arduino Core, cuando activas la opción **USB CDC On Boot**, el compilador ya mapea de forma automática y nativa el objeto global `Serial` al puerto USB virtual del C3. Si intentas definir `#define Serial USBSerial`, la compilación falla porque `USBSerial` no está declarado en el ámbito global del núcleo actual.

**Solución:**
* **No agregues** la línea `#define Serial USBSerial`. Usa el código tal cual está en [esp32_now_receiver.ino](./esp32_firmware/esp32_now_receiver/esp32_now_receiver.ino), el cual utiliza únicamente el objeto `Serial` estándar.
* Asegúrate de tener los ajustes correctos en el Arduino IDE descritos en el punto 3.

---

### 2. Placa congelada al iniciar (`entry 0x403cbf10` en el Monitor Serie)
Si el receptor imprime los logs del bootloader de la ROM y luego se queda congelado en la línea `entry` sin responder:
* **Causa**: Compilaste el código seleccionando la placa genérica **ESP32 Dev Module** (arquitectura Xtensa) en lugar de una placa compatible con ESP32-C3 (arquitectura RISC-V). Esto hace que el procesador RISC-V intente ejecutar instrucciones Xtensa y se detenga instantáneamente.
* **Solución**: Selecciona la placa **ESP32C3 Dev Module** (o **Lolin C3 Mini**) antes de compilar.

---

### 3. Configuración Ideal en Arduino IDE (Herramientas / Tools)
Para compilar y subir correctamente a la **ESP32-C3 Super Mini**, abre tu Arduino IDE y verifica la siguiente configuración en el menú **Herramientas (Tools)**:

| Opción / Ajuste | Configuración | Razón |
| :--- | :--- | :--- |
| **Placa (Board)** | `ESP32C3 Dev Module` (o `Lolin C3 Mini`) | Selecciona la arquitectura correcta (RISC-V). |
| **USB CDC On Boot** | **`Enabled` (Activado)** | Redirige `Serial.println()` directamente al puerto USB de la placa. |
| **Flash Mode** | **`DIO`** | Previene bucles infinitos de lectura SPI durante el arranque. |
| **Flash Frequency** | **`40MHz`** | Evita errores de sincronización y lectura/escritura de memoria Flash. |
| **Partition Scheme** | `Minimal SPIFFS` o `Default` | Configuración estándar de memoria de programa. |

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

