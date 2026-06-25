# 📊 Flappy Bird IoT - Dashboard de Control

Este subproyecto es un panel de control industrial 4.0 desarrollado en **React + Vite** y estilizado con **Vanilla CSS**. Permite monitorear en tiempo real la telemetría del juego, los KPIs de rendimiento de hardware y la tabla de clasificación (Leaderboard) global.

---

## 🔍 Características Principales

- **Monitoreo en Tiempo Real**: Visualización en vivo de la altitud del ave ($Y$), cantidad de saltos, colisiones, duración de sesión y puntaje actual.
- **KPIs del Hardware (ESP32)**: Monitoreo de señal de radio/WiFi (dBm), nivel de batería de las placas, uso de CPU y porcentaje de memoria.
- **Gráficos Dinámicos**: Gráficos analíticos de latencia histórica y progreso del puntaje utilizando **Recharts**.
- **Consola de Diagnóstico**: Terminal de eventos integrada que detalla logs del sistema, control de hardware y estados del juego.
- **Integración Nativa con Supabase**:
  - **Supabase Realtime (Broadcast)**: Recibe flujos de telemetría de ultra baja latencia emitidos por la instancia de juego.
  - **Leaderboard Reactivo (Postgres Changes)**: Escucha automáticamente cambios en la tabla `scores` de Supabase para actualizar la tabla de clasificación en tiempo real, ordenando a los jugadores de mayor a menor.
- **Simulador Integrado**: Cuenta con un motor de simulación interno. Si la conexión de Supabase está desactivada o desconectada, el Dashboard puede simular telemetría del juego de manera autónoma para propósitos de demostración.

---

## 🚀 Instalación y Ejecución

1. **Navega al directorio del Dashboard**:
   ```bash
   cd Dashboard
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Configura las Variables de Entorno**:
   Crea un archivo `.env.local` en la raíz de esta carpeta (`/Dashboard`) con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
   VITE_SUPABASE_ANON_KEY="tu-anon-key-publica"
   ```

4. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

5. **Accede a la aplicación**: Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 🛠️ Panel de Simulación y Controles

En la esquina inferior izquierda del panel encontrarás herramientas para depurar:
- **Play/Pause (Simulación)**: Detiene o reanuda el bucle del motor de simulación.
- **Estado de Conexión**: Alterna entre recibir telemetría real de Supabase (`Connected`) o utilizar el simulador local (`Disconnected`).
- **Selector de Protocolo**: Cambia la visualización del protocolo activo en el dashboard (ESP-NOW vs MQTT) para comparar tiempos de reacción y latencias teóricas.
- **Simular Anomalía**: Introduce de manera artificial congestión de paquetes e interferencia de radiofrecuencia para observar el comportamiento de las alertas y el decrecimiento de los KPIs en tiempo real.
