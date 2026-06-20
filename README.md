# 🎮 Taller Flappy Bird IoT - Guía de Proyectos

Este espacio de trabajo contiene tres variaciones independientes y autocontenidas del clásico juego **Flappy Bird** integrado con microcontroladores **ESP32** para control por hardware, organizadas según el protocolo de red y latencia deseados.

---

## 📂 Directorios de Proyectos

Navega a la carpeta correspondiente según el modo en el que desees trabajar:

### 1. [📡 project-mqtt](./project-mqtt/README.md)
* **Descripción**: Control inalámbrico de Flappy Bird utilizando un broker público de MQTT (HiveMQ) sobre WebSockets seguros.
* **Latencia**: Media (~150 - 500 ms) dependiente de la conexión a Internet.
* **Hardware necesario**: 1x ESP32 + 1x Pulsador físico.
* **Ideal para**: Demostraciones a larga distancia (por ejemplo, si el ESP32 está en un sitio geográfico distinto de la computadora).

### 2. [⚡ project-espnow](./project-espnow/README.md)
* **Descripción**: Control inalámbrico local de ultra baja latencia utilizando dos placas ESP32 comunicándose por radiofrecuencia (ESP-NOW) y conectándose al navegador mediante la **Web Serial API**.
* **Latencia**: Virtualmente cero (~0.1 - 2 ms). ¡Respuesta visual inmediata!
* **Hardware necesario**: 2x ESP32 + 1x Pulsador físico.
* **Ideal para**: Un juego inalámbrico altamente competitivo donde la velocidad y los reflejos son críticos.

### 3. [📁 project-final](./project-final/)
* **Descripción**: Carpeta de proyecto vacía reservada para tus propios desarrollos, integraciones personalizadas o futuros experimentos.
* **Hardware necesario**: Libre.

---

## 🏎️ Tabla Comparativa de Latencia

| Proyecto | Conectividad | Latencia Promedio | Hardware Requerido | Depende de Internet |
|---|---|---|---|---|
| **ESP-NOW + Web Serial** | Radio Directa + Cable USB | **~1-2 ms** | 2x ESP32 + Botón | ❌ No |
| **Teclado / Mouse Local** | USB / HID | **~4-8 ms** | Ninguno (Teclado) | ❌ No |
| **MQTT WebSockets** | WiFi Local + Broker Nube | **~150-400 ms** | 1x ESP32 + Botón |  Sí |

---

## 🛠️ Instrucciones Generales

Cada una de las carpetas es un proyecto web independiente. Para arrancar `project-mqtt` o `project-espnow`:
1. Abre tu terminal e ingresa a la carpeta deseada:
   ```bash
   cd project-mqtt     # O project-espnow
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor local de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre la dirección `http://localhost:5173` en tu navegador.
