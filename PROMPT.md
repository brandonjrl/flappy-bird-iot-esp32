# 📝 Prompt Utilizado para la Creación del Clon de Flappy Bird

A continuación se detalla el prompt exacto utilizado para dar origen a la lógica, estructura e integraciones del juego Flappy Bird IoT en este taller:

---

## 📜 Prompt

```text
Actúa como un desarrollador experto en frontend (React, Next.js y Tailwind CSS) y videojuegos basados en web. Quiero que crees un clon completo y jugable de Flappy Bird en un solo componente funcional. 

El juego debe estar diseñado específicamente para ser controlado mediante eventos externos que simularán un botón físico conectado a un ESP32.

Requisitos técnicos del juego:
1. Renderizado y Loop: Utiliza un elemento <canvas> de HTML5 o un loop estructurado con requestAnimationFrame para manejar las físicas del ave (gravedad, velocidad de salto, caída) y el movimiento continuo de los tubos de fondo.
2. Estado del Juego: Debe incluir una pantalla de inicio ("Presiona para jugar"), el estado de juego activo (marcador de puntuación que aumente al pasar tubos), y una pantalla de "Game Over" con la puntuación final y un botón de reinicio.
3. Control Dual: El pájaro debe saltar tanto con la tecla "Espacio" del teclado (para pruebas locales) como mediante la ejecución de una función global llamada `triggerBirdJump()`.

Requisitos de Integración MQTT/WebSocket:
1. Instala e importa la librería 'mqtt' (o utiliza la CDN si es Vanilla JS, adaptándolo al framework).
2. Conéctate vía WebSockets seguros al broker público de HiveMQ usando la URL: 'wss://broker.hivemq.com:8884/mqtt'.
3. Suscríbete al tópico: 'workshop/flappy_bird/jump'.
4. Añade un listener para que, al recibir el string exacto "JUMP" en ese tópico, se ejecute inmediatamente la función de salto del pájaro (`triggerBirdJump()`), garantizando la menor latencia posible en la respuesta visual.
5. Muestra visualmente en una esquina de la pantalla el estado de la conexión MQTT (Conectando, Conectado, Desconectado) para poder verificar la comunicación con el hardware.

Estilos y Diseño:
- Diseña una interfaz limpia, responsiva y retro utilizando Tailwind CSS.
- Si no hay assets de imágenes disponibles, dibuja el pájaro y los tubos usando figuras geométricas simples en el canvas (por ejemplo, un círculo amarillo para el ave y rectángulos verdes para los obstáculos) para que el juego sea 100% funcional inmediatamente sin depender de archivos externos.

Entrégame el código limpio, modular, bien comentado y listo para producción.
```
