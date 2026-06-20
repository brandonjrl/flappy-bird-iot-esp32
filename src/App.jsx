import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

export default function App() {
  // --- Estados de React para la Interfaz de Usuario ---
  const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappyHighScore') || '0', 10);
  });
  const [mqttStatus, setMqttStatus] = useState('connecting'); // connecting, connected, disconnected
  const [mqttLogs, setMqttLogs] = useState([]);
  const [showSimulator, setShowSimulator] = useState(true);

  // --- Refs para el Loop del Juego (Evitar re-renders a 60 FPS) ---
  const canvasRef = useRef(null);
  const gameStateRef = useRef('START');
  const scoreRef = useRef(0);
  const highScoreRef = useRef(highScore);
  const pipesRef = useRef([]);
  const particlesRef = useRef([]);
  const floatingTextsRef = useRef([]);
  const frameCountRef = useRef(0);
  const requestRef = useRef(null);

  // Constantes de Físicas
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 550;
  const GROUND_HEIGHT = 70;
  const GRAVITY = 0.38;
  const JUMP_STRENGTH = -6.8;
  const PIPE_SPEED = 2.4;
  const PIPE_GAP = 145; // Espacio entre tubos
  const PIPE_SPAWN_RATE = 100; // En cuadros (frames)

  // Datos del Ave (Ref para mutación directa en físicas)
  const birdRef = useRef({
    x: 80,
    y: 200,
    velocity: 0,
    radius: 14,
    angle: 0,
    targetAngle: 0,
    wingPosition: 0, // Para animación de aleteo
  });

  // Offset del suelo en movimiento
  const groundOffsetRef = useRef(0);

  // --- Registrar Logs de MQTT de manera limpia ---
  const addLog = (text) => {
    const time = new Date().toLocaleTimeString();
    setMqttLogs((prev) => [`[${time}] ${text}`, ...prev.slice(0, 19)]);
  };

  // --- Lógica del Salto del Pájaro (Core) ---
  const jump = () => {
    birdRef.current.velocity = JUMP_STRENGTH;
    
    // Crear partículas de viento/salto
    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        x: birdRef.current.x - birdRef.current.radius,
        y: birdRef.current.y + (Math.random() * 10 - 5),
        vx: -2 - Math.random() * 2,
        vy: (Math.random() * 2 - 1),
        size: Math.random() * 4 + 2,
        color: 'rgba(255, 255, 255, 0.7)',
        alpha: 1,
        decay: 0.05,
      });
    }
  };

  // --- Manejo del Inicio y Reinicio del Juego ---
  const startGame = () => {
    gameStateRef.current = 'PLAYING';
    setGameState('PLAYING');
    scoreRef.current = 0;
    setScore(0);
    
    // Reiniciar Pájaro
    birdRef.current.y = 200;
    birdRef.current.velocity = 0;
    birdRef.current.angle = 0;
    birdRef.current.targetAngle = 0;

    // Limpiar arrays
    pipesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    frameCountRef.current = 0;

    // Generar primer tubo rápido
    spawnPipe();
    addLog('Juego iniciado.');
  };

  const gameOver = () => {
    gameStateRef.current = 'GAMEOVER';
    setGameState('GAMEOVER');

    // Actualizar récord
    if (scoreRef.current > highScoreRef.current) {
      highScoreRef.current = scoreRef.current;
      setHighScore(scoreRef.current);
      localStorage.setItem('flappyHighScore', scoreRef.current.toString());
      addLog(`¡Nuevo récord establecido: ${scoreRef.current} pts!`);
    } else {
      addLog(`Fin del juego. Puntuación final: ${scoreRef.current} pts.`);
    }

    // Crear partículas de explosión de plumas
    for (let i = 0; i < 25; i++) {
      particlesRef.current.push({
        x: birdRef.current.x,
        y: birdRef.current.y,
        vx: (Math.random() * 6 - 3),
        vy: (Math.random() * 6 - 4),
        size: Math.random() * 6 + 2,
        color: i % 2 === 0 ? '#facc15' : '#f97316', // Plumas amarillas y naranjas
        alpha: 1,
        decay: 0.02,
      });
    }
  };

  // --- Generar Tubos con Alturas Aleatorias ---
  const spawnPipe = () => {
    const minHeight = 40;
    const maxHeight = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
    const bottomHeight = CANVAS_HEIGHT - GROUND_HEIGHT - topHeight - PIPE_GAP;

    pipesRef.current.push({
      x: CANVAS_WIDTH,
      topHeight,
      bottomHeight,
      width: 60,
      passed: false,
    });
  };

  // --- Función Global triggerBirdJump expuesta al exterior (ESP32 / Consola) ---
  const triggerBirdJump = () => {
    const current = gameStateRef.current;
    if (current === 'START') {
      startGame();
      jump();
    } else if (current === 'PLAYING') {
      jump();
    } else if (current === 'GAMEOVER') {
      startGame();
      jump();
    }
  };

  // Asignar al objeto global window para control externo
  useEffect(() => {
    window.triggerBirdJump = triggerBirdJump;
    return () => {
      delete window.triggerBirdJump;
    };
  }, []);

  // --- Loop de Físicas y Renderizado (requestAnimationFrame) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updateAndRender = () => {
      const state = gameStateRef.current;

      // 1. LIMPIAR PANTALLA
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. DIBUJAR FONDO (Cielo con gradiente)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#2563eb'); // Azul profundo retro
      skyGrad.addColorStop(0.6, '#60a5fa'); // Celeste
      skyGrad.addColorStop(1, '#93c5fd'); // Azul suave
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Dibujar montañas estáticas al fondo
      ctx.fillStyle = '#4b5563'; // Silueta oscura
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(80, CANVAS_HEIGHT - GROUND_HEIGHT - 60);
      ctx.lineTo(160, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(240, CANVAS_HEIGHT - GROUND_HEIGHT - 80);
      ctx.lineTo(340, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(400, CANVAS_HEIGHT - GROUND_HEIGHT - 40);
      ctx.lineTo(400, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1f2937'; // Montañas más oscuras al frente
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(120, CANVAS_HEIGHT - GROUND_HEIGHT - 40);
      ctx.lineTo(260, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(320, CANVAS_HEIGHT - GROUND_HEIGHT - 50);
      ctx.lineTo(400, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // 3. ACTUALIZAR Y DIBUJAR TUBOS (Solo si está jugando o game over)
      if (state === 'PLAYING') {
        frameCountRef.current++;
        if (frameCountRef.current % PIPE_SPAWN_RATE === 0) {
          spawnPipe();
        }
      }

      pipesRef.current.forEach((pipe, index) => {
        if (state === 'PLAYING') {
          pipe.x -= PIPE_SPEED;
        }

        // --- Dibujo Premium de los Tubos (Estilo Retro con Brillo) ---
        // Tubo Superior
        ctx.fillStyle = '#16a34a'; // Verde oscuro retro
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
        // Borde e iluminación
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, -5, pipe.width, pipe.topHeight + 5);
        
        ctx.fillStyle = '#4ade80'; // Resplandor lateral izquierdo
        ctx.fillRect(pipe.x + 4, 0, 6, pipe.topHeight);
        
        // Pestaña (sombrero) del Tubo Superior
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, pipe.width + 8, 20);
        ctx.strokeRect(pipe.x - 4, pipe.topHeight - 20, pipe.width + 8, 20);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(pipe.x, pipe.topHeight - 20, 6, 20);

        // Tubo Inferior
        const bottomY = CANVAS_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight;
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(pipe.x, bottomY, pipe.width, pipe.bottomHeight);
        ctx.strokeRect(pipe.x, bottomY, pipe.width, pipe.bottomHeight + 5);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(pipe.x + 4, bottomY, 6, pipe.bottomHeight);

        // Pestaña del Tubo Inferior
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(pipe.x - 4, bottomY, pipe.width + 8, 20);
        ctx.strokeRect(pipe.x - 4, bottomY, pipe.width + 8, 20);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(pipe.x, bottomY, 6, 20);

        // Detección de puntuación exitosa
        if (state === 'PLAYING' && !pipe.passed && birdRef.current.x > pipe.x + pipe.width) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          
          // Crear texto flotante de puntuación
          floatingTextsRef.current.push({
            x: birdRef.current.x,
            y: birdRef.current.y - 20,
            text: '+1',
            alpha: 1,
            vy: -1.5,
          });
        }
      });

      // Eliminar tubos fuera de la pantalla
      if (pipesRef.current.length > 0 && pipesRef.current[0].x < -pipesRef.current[0].width - 10) {
        pipesRef.current.shift();
      }

      // 4. ACTUALIZAR Y DIBUJAR PÁJARO
      const bird = birdRef.current;
      if (state === 'PLAYING') {
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;
        
        // Simular aleteo de alas
        bird.wingPosition = Math.sin(frameCountRef.current * 0.4) * 5;

        // Calcular ángulo de inclinación basado en la velocidad de caída
        const targetAng = Math.min(Math.max(bird.velocity * 6.5, -28), 70);
        bird.angle = bird.angle + (targetAng - bird.angle) * 0.15;
      } else if (state === 'GAMEOVER') {
        // En game over el pájaro sigue cayendo al suelo por gravedad
        if (bird.y + bird.radius < CANVAS_HEIGHT - GROUND_HEIGHT) {
          bird.velocity += GRAVITY;
          bird.y += bird.velocity;
          bird.angle = Math.min(bird.angle + 8, 90); // Rota en picada total
        }
      } else {
        // Estado START: Pájaro flotando suavemente
        bird.y = 220 + Math.sin(Date.now() * 0.005) * 8;
        bird.angle = 0;
      }

      // Dibujar Ave
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate((bird.angle * Math.PI) / 180);

      // Cuerpo amarillo
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Ojo (Blanco)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pupila (Negro)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(5, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Pico (Naranja)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(bird.radius - 2, -2);
      ctx.lineTo(bird.radius + 6, 1);
      ctx.lineTo(bird.radius - 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ala (Aleteando)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(-5, bird.wingPosition, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // 5. DETECCIÓN DE COLISIONES
      if (state === 'PLAYING') {
        // Colisión con el Techo (evitar salirse del límite superior)
        if (bird.y - bird.radius < 0) {
          bird.y = bird.radius;
          bird.velocity = 0;
        }

        // Colisión con el Suelo
        if (bird.y + bird.radius >= CANVAS_HEIGHT - GROUND_HEIGHT) {
          gameOver();
        }

        // Colisiones con Tubos
        pipesRef.current.forEach((pipe) => {
          // Ajustes menores de tolerancia para colisión más justa
          const tolerance = 3;
          if (
            bird.x + bird.radius - tolerance > pipe.x &&
            bird.x - bird.radius + tolerance < pipe.x + pipe.width
          ) {
            // Colisiona arriba
            if (bird.y - bird.radius + tolerance < pipe.topHeight) {
              gameOver();
            }
            // Colisiona abajo
            if (bird.y + bird.radius - tolerance > CANVAS_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight) {
              gameOver();
            }
          }
        });
      }

      // 6. ACTUALIZAR Y DIBUJAR PARTÍCULAS
      particlesRef.current.forEach((part, index) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= part.decay;

        ctx.save();
        ctx.globalAlpha = part.alpha;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // Filtrar partículas muertas
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // 7. ACTUALIZAR Y DIBUJAR TEXTOS FLOTANTES (+1)
      floatingTextsRef.current.forEach((txt) => {
        txt.y += txt.vy;
        txt.alpha -= 0.02;

        ctx.save();
        ctx.globalAlpha = txt.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Press Start 2P"';
        ctx.fillText(txt.text, txt.x - 10, txt.y);
        ctx.restore();
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((t) => t.alpha > 0);

      // 8. DIBUJAR SUELO (Animado si está jugando)
      if (state === 'PLAYING') {
        groundOffsetRef.current = (groundOffsetRef.current - PIPE_SPEED) % 24;
      }
      const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;

      // Base del Suelo
      ctx.fillStyle = '#d97706'; // Tierra café/naranja
      ctx.fillRect(0, groundY, CANVAS_WIDTH, GROUND_HEIGHT);

      // Línea de Césped superior
      ctx.fillStyle = '#15803d'; // Verde oscuro del césped
      ctx.fillRect(0, groundY, CANVAS_WIDTH, 14);
      ctx.fillStyle = '#22c55e'; // Césped brillante
      ctx.fillRect(0, groundY, CANVAS_WIDTH, 8);

      // Rayas decorativas del suelo en movimiento
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = groundOffsetRef.current - 24; x < CANVAS_WIDTH + 24; x += 24) {
        ctx.moveTo(x, groundY + 14);
        ctx.lineTo(x - 12, CANVAS_HEIGHT);
      }
      ctx.stroke();

      // Borde divisorio superior
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(CANVAS_WIDTH, groundY);
      ctx.stroke();

      // Solicitar el siguiente frame
      requestRef.current = requestAnimationFrame(updateAndRender);
    };

    // Iniciar loop de animación
    requestRef.current = requestAnimationFrame(updateAndRender);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- Manejo del Teclado (Tecla Espacio) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevenir scroll de la ventana
        triggerBirdJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Integración Cliente MQTT (WebSockets seguros) ---
  useEffect(() => {
    addLog('Iniciando conexión MQTT...');
    setMqttStatus('connecting');

    // Conectando al broker público mediante WebSockets seguros
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
      clientId: 'flappy_esp32_web_' + Math.random().toString(16).substring(2, 10),
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 3000,
    });

    client.on('connect', () => {
      setMqttStatus('connected');
      addLog('Conectado a HiveMQ (WSS).');
      client.subscribe('workshop/flappy_bird/jump', (err) => {
        if (!err) {
          addLog('Suscrito a tópico "workshop/flappy_bird/jump".');
        } else {
          addLog('Error al suscribir al tópico.');
        }
      });
    });

    client.on('message', (topic, message) => {
      const msgStr = message.toString();
      if (topic === 'workshop/flappy_bird/jump') {
        if (msgStr === 'JUMP') {
          addLog('Mensaje MQTT "JUMP" recibido. Saltando.');
          triggerBirdJump();
        } else {
          addLog(`Mensaje ignorado en tópico: "${msgStr}"`);
        }
      }
    });

    client.on('offline', () => {
      setMqttStatus('disconnected');
      addLog('Cliente fuera de línea (reconectando...).');
    });

    client.on('error', (err) => {
      setMqttStatus('disconnected');
      addLog(`Error MQTT: ${err.message}`);
    });

    client.on('close', () => {
      setMqttStatus('disconnected');
      addLog('Conexión cerrada por el Broker.');
    });

    // Guardar referencia del cliente
    window.mqttClientInstance = client;

    return () => {
      if (client) {
        addLog('Cerrando cliente MQTT...');
        client.end();
      }
    };
  }, []);

  // --- Simulación de Hardware (Publicación MQTT) ---
  const simulateMqttJump = () => {
    if (window.mqttClientInstance && window.mqttClientInstance.connected) {
      addLog('Simulando botón físico -> Publicando "JUMP"');
      window.mqttClientInstance.publish('workshop/flappy_bird/jump', 'JUMP');
    } else {
      addLog('Error: El cliente MQTT no está conectado. Saltando localmente.');
      triggerBirdJump();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-6 px-4 font-sans select-none">
      
      {/* HEADER PRINCIPAL */}
      <header className="text-center mb-8 max-w-4xl w-full">
        <h1 className="text-2xl md:text-4xl text-amber-400 font-bold tracking-wider font-mono border-b-4 border-amber-500 pb-3 mb-2 flex items-center justify-center gap-3">
          🎮 FLAPPY BIRD <span className="text-xs md:text-sm bg-amber-500 text-slate-900 py-1 px-3 rounded-full font-sans uppercase">Hardware IoT Edition</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-light">
          Controla el juego localmente con la <span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono text-xs">Barra Espaciadora</span> o mediante un botón físico conectado por <span className="text-sky-400 font-medium">MQTT (WiFi)</span>.
        </p>
      </header>

      {/* DISEÑO EN COLUMNAS / RESPONSIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl w-full items-start">
        
        {/* PANEL IZQUIERDO: TELEMETRÍA MQTT */}
        <section className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold tracking-wider text-slate-300 font-mono flex items-center gap-2">
              📡 TELEMETRÍA MQTT
            </h2>
            
            {/* Indicador de Estado de Conexión */}
            <div className="flex items-center gap-2">
              <span className={`h-3.5 w-3.5 rounded-full inline-block animate-pulse ${
                mqttStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' :
                mqttStatus === 'connecting' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' :
                'bg-red-500 shadow-[0_0_8px_#ef4444]'
              }`} />
              <span className="text-xs font-mono uppercase font-bold text-slate-300">
                {mqttStatus === 'connected' ? 'Conectado' : mqttStatus === 'connecting' ? 'Conectando' : 'Desconectado'}
              </span>
            </div>
          </div>

          {/* Información de Conexión */}
          <div className="bg-slate-950 p-3 rounded-lg text-xs font-mono border border-slate-800 flex flex-col gap-2">
            <div>
              <span className="text-slate-500">Broker:</span>{' '}
              <span className="text-slate-300 select-all">wss://broker.hivemq.com:8884/mqtt</span>
            </div>
            <div>
              <span className="text-slate-500">Tópico:</span>{' '}
              <span className="text-sky-400 select-all font-bold">workshop/flappy_bird/jump</span>
            </div>
            <div>
              <span className="text-slate-500">Payload Requerido:</span>{' '}
              <span className="text-amber-400 font-bold">"JUMP"</span>
            </div>
          </div>

          {/* Botones de Prueba y Simulación */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={simulateMqttJump}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-mono py-3 px-4 rounded-lg font-bold border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide cursor-pointer"
            >
              🔴 SIMULAR BOTÓN FÍSICO (JUMP)
            </button>
            
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="text-slate-400 hover:text-slate-200 text-xs font-mono underline text-center block cursor-pointer"
            >
              {showSimulator ? 'Ocultar Terminal de Eventos' : 'Mostrar Terminal de Eventos'}
            </button>
          </div>

          {/* Consola de Logs Recibidos */}
          {showSimulator && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-500 font-mono">CONSOLA RETRO (ÚLTIMOS EVENTOS)</h3>
              <div className="bg-black text-green-400 p-3 rounded-lg h-48 overflow-y-auto font-mono text-xs border border-slate-800 leading-relaxed scroll-smooth flex flex-col-reverse">
                {mqttLogs.length === 0 ? (
                  <p className="text-slate-600 italic">Esperando eventos...</p>
                ) : (
                  mqttLogs.map((log, idx) => (
                    <div key={idx} className="border-b border-slate-900 py-0.5 last:border-b-0">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* PANEL CENTRAL: GABINETE ARCADE & CANVAS */}
        <section className="lg:col-span-4 flex flex-col items-center">
          
          {/* Cabina Arcade */}
          <div className="relative bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-[448px] w-full flex flex-col items-center overflow-hidden">
            
            {/* Marquesina Superior */}
            <div className="w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-center py-2.5 rounded-t-xl mb-4 border-b-4 border-slate-950 shadow-inner flex flex-col gap-0.5">
              <span className="font-mono text-slate-950 font-black text-lg tracking-widest animate-pulse">
                ★ ARCADE CABINET ★
              </span>
              <span className="text-[10px] text-yellow-200 font-mono tracking-widest">INSERT COIN OR PRESS JUMP</span>
            </div>

            {/* MARCADOR DE PUNTAJE */}
            <div className="w-full flex justify-between px-2 mb-3 text-slate-300 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500">PUNTOS:</span>
                <span className="text-lg text-white font-bold">{score}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-slate-500">RÉCORD:</span>
                <span className="text-lg text-amber-400 font-bold">{highScore}</span>
              </div>
            </div>

            {/* CONTENEDOR DEL CANVAS */}
            <div className="relative bg-black rounded-lg border-4 border-slate-950 overflow-hidden cursor-pointer" onClick={triggerBirdJump}>
              
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block max-w-full aspect-[400/550]"
              />

              {/* OVERLAY DE ESTADOS DE JUEGO */}
              {gameState === 'START' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
                  <div className="bg-slate-900/90 border-2 border-amber-500 rounded-2xl p-6 max-w-[320px] w-full shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    <h2 className="text-lg font-bold text-amber-400 font-mono mb-2 uppercase tracking-wide">
                      Flappy Bird
                    </h2>
                    <p className="text-[10px] font-mono text-slate-300 mb-6 uppercase tracking-wider">
                      IoT Hardware Edition
                    </p>
                    
                    {/* Icono animado de Espacio */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                      <div className="w-24 h-6 border-2 border-dashed border-slate-400 rounded-full flex items-center justify-center bg-slate-800 text-[8px] font-mono text-slate-300 animate-bounce">
                        ESPACIO
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">O PULSA EL BOTÓN FÍSICO</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Evitar doble disparo por el click del Canvas
                        startGame();
                      }}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-mono py-2.5 px-4 rounded font-bold border-b-4 border-green-800 text-xs animate-blink uppercase cursor-pointer"
                    >
                      PULSA PARA JUGAR
                    </button>
                  </div>
                </div>
              )}

              {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                  <div className="bg-slate-900/95 border-2 border-red-500 rounded-2xl p-6 max-w-[320px] w-full shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                    <h2 className="text-xl font-bold text-red-500 font-mono mb-4 uppercase tracking-wider">
                      GAME OVER
                    </h2>

                    {/* Tarjeta de Puntajes */}
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-3 mb-6 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">PUNTAJE:</span>
                        <span className="text-white font-bold text-sm">{score}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-2">
                        <span className="text-slate-500">MÁXIMO:</span>
                        <span className="text-amber-400 font-bold text-sm">{highScore}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Evitar doble disparo
                        startGame();
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono py-2.5 px-4 rounded font-extrabold border-b-4 border-amber-700 text-xs uppercase cursor-pointer"
                    >
                      JUGAR DE NUEVO
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Detalles del Joystick de Cabina Decorativa */}
            <div className="w-full mt-4 flex items-center justify-between px-4 border-t border-slate-800 pt-4">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"></div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-2">JOYSTICK</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-6 w-12 bg-slate-950 rounded-md border border-slate-800 flex items-center justify-center text-[8px] font-mono text-amber-500 font-bold tracking-tighter">
                  1 COIN
                </div>
                <span className="text-[7px] text-slate-600 font-mono mt-1 uppercase">CREDIT 1/1</span>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"></div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-2">BUTTON</span>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL DERECHO: GUÍA DE CONFIGURACIÓN DEL HARDWARE */}
        <section className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-wider text-slate-300 font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
            🔌 GUÍA DEL HARDWARE (ESP32)
          </h2>

          <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
            <p>
              Puedes conectar un botón físico a un microcontrolador <strong>ESP32</strong> (o ESP8266) para controlar el juego de forma inalámbrica.
            </p>
            
            <h3 className="font-mono text-slate-200 font-bold mt-2">1. DIAGRAMA DE CONEXIONES</h3>
            <div className="bg-slate-950 p-2.5 rounded font-mono text-[10px] text-slate-300 border border-slate-850 overflow-x-auto whitespace-pre">
{`   [ ESP32 ]             [ BOTÓN FÍSICO ]
   +-------+                 +-------+
   |  3V3  |-----------------| Terminal 1
   |       |                 |       |
   | GPIO4 |-----------------| Terminal 2
   +-------+                 +-------+
   * Nota: Se configura INPUT_PULLUP en código`}
            </div>

            <h3 className="font-mono text-slate-200 font-bold mt-4">2. CÓDIGO DE ARDUINO</h3>
            <p className="text-[11px]">
              Instala la librería <code>PubSubClient</code> de Nick O'Leary en tu IDE de Arduino, configura tu WiFi y carga este sketch:
            </p>
            
            <div className="relative">
              <pre className="bg-slate-950 p-3 rounded-lg text-[10px] text-emerald-400 font-mono border border-slate-850 max-h-60 overflow-y-auto scrollbar-thin">
{`#include <WiFi.h>
#include <PubSubClient.h>

const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* topic = "workshop/flappy_bird/jump";

WiFiClient espClient;
PubSubClient client(espClient);
const int BUTTON_PIN = 4; // GPIO4
int lastButtonState = HIGH;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  client.setServer(mqtt_server, mqtt_port);
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("Conectado a MQTT!");
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  int state = digitalRead(BUTTON_PIN);
  if (state == LOW && lastButtonState == HIGH) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      client.publish(topic, "JUMP");
      Serial.println("¡Salto enviado!");
    }
  }
  lastButtonState = state;
}`}
              </pre>
            </div>
          </div>
        </section>

      </div>

      {/* FOOTER */}
      <footer className="mt-12 text-center text-xs text-slate-600 font-mono">
        <p>Diseñado con ❤️ para la comunidad de desarrollo IoT en Web.</p>
        <p className="mt-1 text-[10px] text-slate-700">Flappy Bird es una marca registrada de Dong Nguyen. Clon con fines exclusivamente pedagógicos.</p>
      </footer>
    </div>
  );
}
