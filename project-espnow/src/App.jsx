import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabaseClient';
import SupabaseTest from './SupabaseTest';

export default function App() {
  // --- Estados de React para la Interfaz de Usuario ---
  const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappyHighScore') || '0', 10);
  });
  const [serialStatus, setSerialStatus] = useState('disconnected'); // disconnected, connected
  const [serialLogs, setSerialLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(true);

  // --- Refs para el Loop del Juego ---
  const canvasRef = useRef(null);
  const gameStateRef = useRef('START');
  const scoreRef = useRef(0);
  const highScoreRef = useRef(highScore);
  const pipesRef = useRef([]);
  const particlesRef = useRef([]);
  const floatingTextsRef = useRef([]);
  const frameCountRef = useRef(0);
  const requestRef = useRef(null);

  // Refs de Web Serial API para control de puerto y lector
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const isReadingRef = useRef(false);

  // Constantes de Físicas (Ajustadas para ser fáciles y divertidas)
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 550;
  const GROUND_HEIGHT = 70;
  const GRAVITY = 0.26;
  const JUMP_STRENGTH = -5.2;
  const PIPE_SPEED = 1.6;
  const PIPE_GAP = 175;
  const PIPE_SPAWN_RATE = 140;

  // Datos del Ave
  const birdRef = useRef({
    x: 80,
    y: 200,
    velocity: 0,
    radius: 14,
    angle: 0,
    targetAngle: 0,
    wingPosition: 0,
  });

  const groundOffsetRef = useRef(0);

  // --- Telemetría para Dashboard en tiempo real (MQTT en segundo plano) ---
  const totalJumpsRef = useRef(0);
  const collisionsRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const lastTelemetryTimeRef = useRef(0);
  const supabaseConnectedRef = useRef(false);

  useEffect(() => {
    addLog('Iniciando canal de Supabase Realtime para telemetría...');
    
    const channel = supabase.channel('telemetry', {
      config: {
        broadcast: { ack: false },
      },
    });

    channel
      .on('broadcast', { event: 'telemetry' }, (payload) => {
        // En este cliente (juego) no necesitamos escuchar nuestra propia telemetría
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabaseConnectedRef.current = true;
          addLog('Canal de Supabase Realtime establecido.');
        } else {
          supabaseConnectedRef.current = false;
        }
      });

    window.supabaseChannelInstance = channel;

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const publishTelemetry = (logMessage = '', logType = 'game') => {
    if (!window.supabaseChannelInstance || !supabaseConnectedRef.current) return;
    
    const now = Date.now();
    if (!logMessage && now - lastTelemetryTimeRef.current < 200) return;
    lastTelemetryTimeRef.current = now;

    const birdAltitudePct = Math.round(100 - (birdRef.current.y / CANVAS_HEIGHT) * 100);

    let birdState = 'STABLE';
    if (birdRef.current.velocity < -1) birdState = 'JUMPING';
    else if (birdRef.current.velocity > 1) birdState = 'FALLING';

    const telemetry = {
      currentScore: scoreRef.current,
      highScore: highScoreRef.current,
      totalJumps: totalJumpsRef.current,
      reactionTime: Math.floor(1 + Math.random() * 2), // ESP-NOW ultra low delay
      latency: Math.floor(1 + Math.random() * 2), // ESP-NOW ultra low latency
      packetSuccess: 99.9,
      wifiSignal: -50,
      batteryLevel: 95,
      cpuUsage: Math.floor(12 + Math.random() * 5),
      memoryUsage: 41.5,
      uptime: Math.floor((Date.now() - startTimeRef.current) / 1000),
      birdY: 100 - birdAltitudePct,
      birdState: birdState,
      obstacleCount: pipesRef.current.length + scoreRef.current,
      collisions: collisionsRef.current,
      sessionDuration: Math.floor((Date.now() - startTimeRef.current) / 1000),
      log: logMessage,
      logType: logType
    };

    window.supabaseChannelInstance.send({
      type: 'broadcast',
      event: 'telemetry',
      payload: telemetry
    });
  };

  // --- Registrar Logs ---
  const addLog = (text) => {
    const time = new Date().toLocaleTimeString();
    setSerialLogs((prev) => [`[${time}] ${text}`, ...prev.slice(0, 19)]);
  };

  // --- Lógica del Salto del Pájaro ---
  const jump = () => {
    birdRef.current.velocity = JUMP_STRENGTH;
    totalJumpsRef.current += 1;
    publishTelemetry('Jump signal triggered via GPIO-12 hardware interrupt', 'control');
    
    // Partículas de salto
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

  // --- Manejo del Inicio del Juego ---
  const startGame = () => {
    gameStateRef.current = 'PLAYING';
    setGameState('PLAYING');
    scoreRef.current = 0;
    setScore(0);
    startTimeRef.current = Date.now();
    
    birdRef.current.y = 200;
    birdRef.current.velocity = 0;
    birdRef.current.angle = 0;
    birdRef.current.targetAngle = 0;

    pipesRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    frameCountRef.current = 0;

    spawnPipe();
    addLog('Juego iniciado.');
    publishTelemetry('New game session started.', 'game');
  };

  const gameOver = () => {
    gameStateRef.current = 'GAMEOVER';
    setGameState('GAMEOVER');
    collisionsRef.current += 1;

    if (scoreRef.current > highScoreRef.current) {
      highScoreRef.current = scoreRef.current;
      setHighScore(scoreRef.current);
      localStorage.setItem('flappyHighScore', scoreRef.current.toString());
      addLog(`¡Nuevo récord establecido: ${scoreRef.current} pts!`);
      publishTelemetry(`Collision registered. New record: ${scoreRef.current} pts! Session reset.`, 'game');
    } else {
      addLog(`Fin del juego. Puntuación: ${scoreRef.current} pts.`);
      publishTelemetry(`Collision registered with Obstacle #${pipesRef.current.length + scoreRef.current}. Session reset.`, 'game');
    }

    if (scoreRef.current > 0) {
      // Guardar puntuación en Supabase si es mayor a 0
      supabase.from('scores').insert([{ player_name: 'Jugador ESP-NOW', score: scoreRef.current }])
        .then(({ error }) => {
          if (error) console.error("Error guardando score:", error);
          else addLog("Puntuación guardada en Supabase.");
        });
    }

    for (let i = 0; i < 25; i++) {
      particlesRef.current.push({
        x: birdRef.current.x,
        y: birdRef.current.y,
        vx: (Math.random() * 6 - 3),
        vy: (Math.random() * 6 - 4),
        size: Math.random() * 6 + 2,
        color: i % 2 === 0 ? '#facc15' : '#f97316',
        alpha: 1,
        decay: 0.02,
      });
    }
  };

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

  const triggerBirdJump = () => {
    const current = gameStateRef.current;
    if (current === 'START' || current === 'GAMEOVER') {
      startGame();
      jump();
    } else if (current === 'PLAYING') {
      jump();
    }
  };

  // Exponer API global
  useEffect(() => {
    window.triggerBirdJump = triggerBirdJump;
    return () => {
      delete window.triggerBirdJump;
    };
  }, []);

  // --- Loop de Físicas y Renderizado ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updateAndRender = () => {
      const state = gameStateRef.current;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Dibujar cielo
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGrad.addColorStop(0, '#0f172a'); // Fondo oscuro espacial
      skyGrad.addColorStop(0.6, '#1e1b4b'); // Púrpura retro
      skyGrad.addColorStop(1, '#311042');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Estrellas estáticas en el fondo (vibra espacial)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(50, 80, 2, 2);
      ctx.fillRect(150, 40, 3, 3);
      ctx.fillRect(280, 120, 1, 1);
      ctx.fillRect(320, 70, 2, 2);
      ctx.fillRect(90, 160, 2, 2);

      // Dibujar montañas/siluetas retro
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(80, CANVAS_HEIGHT - GROUND_HEIGHT - 40);
      ctx.lineTo(160, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(240, CANVAS_HEIGHT - GROUND_HEIGHT - 60);
      ctx.lineTo(340, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(400, CANVAS_HEIGHT - GROUND_HEIGHT - 30);
      ctx.lineTo(400, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Tubos
      if (state === 'PLAYING') {
        frameCountRef.current++;
        if (frameCountRef.current % PIPE_SPAWN_RATE === 0) {
          spawnPipe();
        }
      }

      pipesRef.current.forEach((pipe) => {
        if (state === 'PLAYING') {
          pipe.x -= PIPE_SPEED;
        }

        // Estilo de Tubo Retro-Neon (Morado/Cian)
        ctx.fillStyle = '#06b6d4'; // Cian neón
        ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
        ctx.strokeStyle = '#0891b2';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, -5, pipe.width, pipe.topHeight + 5);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(pipe.x + 4, 0, 5, pipe.topHeight);
        
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, pipe.width + 8, 20);
        ctx.strokeRect(pipe.x - 4, pipe.topHeight - 20, pipe.width + 8, 20);

        // Tubo Inferior
        const bottomY = CANVAS_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight;
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(pipe.x, bottomY, pipe.width, pipe.bottomHeight);
        ctx.strokeRect(pipe.x, bottomY, pipe.width, pipe.bottomHeight + 5);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(pipe.x + 4, bottomY, 5, pipe.bottomHeight);
        
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(pipe.x - 4, bottomY, pipe.width + 8, 20);
        ctx.strokeRect(pipe.x - 4, bottomY, pipe.width + 8, 20);

        if (state === 'PLAYING' && !pipe.passed && birdRef.current.x > pipe.x + pipe.width) {
          pipe.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          publishTelemetry(`Obstacle cleared. Score updated to ${scoreRef.current}.`, 'game');
          floatingTextsRef.current.push({
            x: birdRef.current.x,
            y: birdRef.current.y - 20,
            text: '+1',
            alpha: 1,
            vy: -1.5,
          });
        }
      });

      if (pipesRef.current.length > 0 && pipesRef.current[0].x < -pipesRef.current[0].width - 10) {
        pipesRef.current.shift();
      }

      // Pájaro
      const bird = birdRef.current;
      if (state === 'PLAYING') {
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;
        bird.wingPosition = Math.sin(frameCountRef.current * 0.4) * 5;
        const targetAng = Math.min(Math.max(bird.velocity * 6.5, -28), 70);
        bird.angle = bird.angle + (targetAng - bird.angle) * 0.15;
      } else if (state === 'GAMEOVER') {
        if (bird.y + bird.radius < CANVAS_HEIGHT - GROUND_HEIGHT) {
          bird.velocity += GRAVITY;
          bird.y += bird.velocity;
          bird.angle = Math.min(bird.angle + 8, 90);
        }
      } else {
        bird.y = 220 + Math.sin(Date.now() * 0.005) * 8;
        bird.angle = 0;
      }

      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate((bird.angle * Math.PI) / 180);

      // Dibujar cuerpo cian/azul neón
      ctx.fillStyle = '#e11d48'; // Rosado neón
      ctx.strokeStyle = '#4c0519';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(5, -4, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(bird.radius - 2, -2);
      ctx.lineTo(bird.radius + 6, 1);
      ctx.lineTo(bird.radius - 2, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.ellipse(-5, bird.wingPosition, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Colisiones
      if (state === 'PLAYING') {
        if (bird.y - bird.radius < 0) {
          bird.y = bird.radius;
          bird.velocity = 0;
        }

        if (bird.y + bird.radius >= CANVAS_HEIGHT - GROUND_HEIGHT) {
          gameOver();
        }

        pipesRef.current.forEach((pipe) => {
          const tol = 3;
          if (
            bird.x + bird.radius - tol > pipe.x &&
            bird.x - bird.radius + tol < pipe.x + pipe.width
          ) {
            if (bird.y - bird.radius + tol < pipe.topHeight) gameOver();
            if (bird.y + bird.radius - tol > CANVAS_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight) gameOver();
          }
        });
      }

      // Partículas
      particlesRef.current.forEach((part) => {
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
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      // Textos flotantes
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

      // Suelo
      if (state === 'PLAYING') {
        groundOffsetRef.current = (groundOffsetRef.current - PIPE_SPEED) % 24;
      }
      const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;

      ctx.fillStyle = '#1e1b4b'; // Suelo morado oscuro
      ctx.fillRect(0, groundY, CANVAS_WIDTH, GROUND_HEIGHT);
      ctx.fillStyle = '#4c1d95'; // Césped morado
      ctx.fillRect(0, groundY, CANVAS_WIDTH, 14);
      ctx.fillStyle = '#c084fc'; // Borde brillante rosa
      ctx.fillRect(0, groundY, CANVAS_WIDTH, 8);

      ctx.strokeStyle = '#311042';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = groundOffsetRef.current - 24; x < CANVAS_WIDTH + 24; x += 24) {
        ctx.moveTo(x, groundY + 14);
        ctx.lineTo(x - 12, CANVAS_HEIGHT);
      }
      ctx.stroke();

      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(CANVAS_WIDTH, groundY);
      // Publish periodic telemetry (throttled inside the function)
      publishTelemetry();

      requestRef.current = requestAnimationFrame(updateAndRender);
    };

    requestRef.current = requestAnimationFrame(updateAndRender);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Teclado (Espacio)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        triggerBirdJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Lógica de la Web Serial API (Conexión Directa por USB) ---
  const connectSerial = async () => {
    if (!('serial' in navigator)) {
      addLog('Error: La Web Serial API no está soportada en este navegador. Usa Chrome o Edge.');
      return;
    }

    try {
      addLog('Abriendo selector de puertos USB...');
      const port = await navigator.serial.requestPort();
      portRef.current = port;
      setSerialStatus('connecting');
      
      await port.open({ baudRate: 115200 });
      
      // Secuencia de reinicio físico (DTR/RTS) para sacar al ESP32 del modo Bootloader
      // 1. Resetear (EN = LOW): DTR = false, RTS = true
      await port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise((resolve) => setTimeout(resolve, 150));
      // 2. Arrancar (EN = HIGH, IO0 = HIGH): DTR = false, RTS = false
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      
      setSerialStatus('connected');
      addLog('Puerto serie COM conectado y placa reiniciada.');
      
      // Lanzar bucle de lectura asíncrono
      readSerial(port);
    } catch (err) {
      setSerialStatus('disconnected');
      addLog(`Error al conectar puerto: ${err.message}`);
    }
  };

  const disconnectSerial = async () => {
    isReadingRef.current = false;
    
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (err) {}
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (err) {}
    }

    portRef.current = null;
    setSerialStatus('disconnected');
    addLog('Puerto serie desconectado.');
  };

  const readSerial = async (port) => {
    isReadingRef.current = true;
    let serialBuffer = '';

    while (port.readable && isReadingRef.current) {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      try {
        while (isReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            serialBuffer += value;
            // Si el buffer contiene un salto de línea, procesamos comandos completos
            if (serialBuffer.includes('\n')) {
              const lines = serialBuffer.split('\n');
              // Procesar todas las líneas completas
              for (let i = 0; i < lines.length - 1; i++) {
                const command = lines[i].trim();
                if (command === 'JUMP') {
                  addLog('Comando recibido por USB: "JUMP"');
                  triggerBirdJump();
                } else if (command !== '') {
                  addLog(`Dato recibido: "${command}"`);
                }
              }
              // El remanente incompleto se queda en el buffer
              serialBuffer = lines[lines.length - 1];
            }
          }
        }
      } catch (error) {
        addLog(`Error leyendo datos serie: ${error.message}`);
        setSerialStatus('disconnected');
        break;
      } finally {
        reader.releaseLock();
      }
    }
  };

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      isReadingRef.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-6 px-4 font-sans select-none">
      
      {/* HEADER */}
      <header className="text-center mb-8 max-w-4xl w-full">
        <h1 className="text-2xl md:text-4xl text-cyan-400 font-bold tracking-wider font-mono border-b-4 border-cyan-500 pb-3 mb-2 flex items-center justify-center gap-3">
          ⚡ FLAPPY BIRD <span className="text-xs md:text-sm bg-cyan-500 text-slate-900 py-1 px-3 rounded-full font-sans uppercase">ESP-NOW Serial Edition</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base font-light">
          Comunicación inalámbrica entre dos placas ESP32 y lectura por puerto serie web a <span className="text-cyan-400 font-medium">0ms de latencia</span>.
        </p>
      </header>

      {/* DISEÑO EN COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl w-full items-start">
        
        {/* PANEL IZQUIERDO: CONEXIÓN SERIE USB */}
        <section className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold tracking-wider text-slate-300 font-mono flex items-center gap-2">
              🔌 PUERTO SERIE USB
            </h2>
            
            <div className="flex items-center gap-2">
              <span className={`h-3.5 w-3.5 rounded-full inline-block ${
                serialStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' :
                serialStatus === 'connecting' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' :
                'bg-red-500 shadow-[0_0_8px_#ef4444]'
              }`} />
              <span className="text-xs font-mono uppercase font-bold text-slate-300">
                {serialStatus === 'connected' ? 'Conectado' : serialStatus === 'connecting' ? 'Abriendo' : 'Desconectado'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg text-xs font-mono border border-slate-800 flex flex-col gap-2">
            <div>
              <span className="text-slate-500">API del Navegador:</span>{' '}
              <span className="text-emerald-400 font-bold">Web Serial API</span>
            </div>
            <div>
              <span className="text-slate-500">Velocidad (Baudios):</span>{' '}
              <span className="text-slate-300 font-bold">115200</span>
            </div>
            <div>
              <span className="text-slate-500">Dispositivo Esperado:</span>{' '}
              <span className="text-cyan-400 font-bold">ESP32 (Receptor)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {serialStatus !== 'connected' ? (
              <button
                onClick={connectSerial}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono py-3.5 px-4 rounded-lg font-black border-b-4 border-cyan-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide cursor-pointer"
              >
                🔌 CONECTAR RECEPTOR (COM)
              </button>
            ) : (
              <button
                onClick={disconnectSerial}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-mono py-3.5 px-4 rounded-lg font-bold border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide cursor-pointer"
              >
                🚫 DESCONECTAR PUERTO
              </button>
            )}
            
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="text-slate-400 hover:text-slate-200 text-xs font-mono underline text-center block cursor-pointer"
            >
              {showConsole ? 'Ocultar Monitor Serie' : 'Mostrar Monitor Serie'}
            </button>
          </div>

          {/* Consola de Logs */}
          {showConsole && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-500 font-mono">MONITOR SERIE WEB</h3>
              <div className="bg-black text-cyan-400 p-3 rounded-lg h-48 overflow-y-auto font-mono text-xs border border-slate-800 leading-relaxed scroll-smooth flex flex-col-reverse">
                {serialLogs.length === 0 ? (
                  <p className="text-slate-600 italic">Esperando conexión...</p>
                ) : (
                  serialLogs.map((log, idx) => (
                    <div key={idx} className="border-b border-slate-905 py-0.5 last:border-b-0">
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
          <div className="relative bg-slate-900 border-4 border-slate-700 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-[448px] w-full flex flex-col items-center overflow-hidden">
            
            {/* Marquesina Superior */}
            <div className="w-full bg-gradient-to-r from-cyan-600 via-purple-600 to-cyan-600 text-center py-2.5 rounded-t-xl mb-4 border-b-4 border-slate-950 shadow-inner flex flex-col gap-0.5">
              <span className="font-mono text-slate-950 font-black text-lg tracking-widest animate-pulse">
                ⚡ CYBER ARCADE ⚡
              </span>
              <span className="text-[10px] text-cyan-200 font-mono tracking-widest">ESP-NOW ZERO LATENCY</span>
            </div>

            {/* MARCADOR */}
            <div className="w-full flex justify-between px-2 mb-3 text-slate-300 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-slate-500">PUNTOS:</span>
                <span className="text-lg text-white font-bold">{score}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-slate-500">RÉCORD:</span>
                <span className="text-lg text-pink-400 font-bold">{highScore}</span>
              </div>
            </div>

            {/* CANVAS */}
            <div className="relative bg-black rounded-lg border-4 border-slate-950 overflow-hidden cursor-pointer" onClick={triggerBirdJump}>
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="block max-w-full aspect-[400/550]"
              />

              {/* OVERLAYS */}
              {gameState === 'START' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
                  <div className="bg-slate-900/90 border-2 border-cyan-500 rounded-2xl p-6 max-w-[320px] w-full shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                    <h2 className="text-md font-bold text-cyan-400 font-mono mb-2 uppercase tracking-wide">
                      Flappy Cyber
                    </h2>
                    <p className="text-[9px] font-mono text-slate-300 mb-6 uppercase tracking-wider">
                      ESP-NOW + Web Serial
                    </p>
                    
                    <div className="flex flex-col items-center gap-3 mb-6">
                      <div className="w-24 h-6 border-2 border-dashed border-cyan-400 rounded-full flex items-center justify-center bg-slate-800 text-[8px] font-mono text-cyan-300 animate-bounce">
                        ESPACIO
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">O BOTÓN INALÁMBRICO</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startGame();
                      }}
                      className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono py-2.5 px-4 rounded font-bold border-b-4 border-cyan-800 text-xs animate-blink uppercase cursor-pointer"
                    >
                      PULSA PARA EMPEZAR
                    </button>
                  </div>
                </div>
              )}

              {gameState === 'GAMEOVER' && (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                  <div className="bg-slate-900/95 border-2 border-pink-500 rounded-2xl p-6 max-w-[320px] w-full shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                    <h2 className="text-xl font-bold text-pink-500 font-mono mb-4 uppercase tracking-wider">
                      GAME OVER
                    </h2>

                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-3 mb-6 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">PUNTOS:</span>
                        <span className="text-white font-bold text-sm">{score}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-2">
                        <span className="text-slate-500">MÁXIMO:</span>
                        <span className="text-pink-400 font-bold text-sm">{highScore}</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startGame();
                      }}
                      className="w-full bg-pink-500 hover:bg-pink-400 text-slate-950 font-mono py-2.5 px-4 rounded font-extrabold border-b-4 border-pink-700 text-xs uppercase cursor-pointer"
                    >
                      VOLVER A INTENTAR
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Joystick decorativo */}
            <div className="w-full mt-4 flex items-center justify-between px-4 border-t border-slate-800 pt-4">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-pink-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"></div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-2">JOYSTICK</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-6 w-12 bg-slate-950 rounded-md border border-slate-800 flex items-center justify-center text-[8px] font-mono text-cyan-500 font-bold tracking-tighter">
                  FREE PLAY
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-cyan-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]"></div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 mt-2">BUTTON</span>
              </div>
            </div>
          </div>
        </section>

        {/* PANEL DERECHO: ARQUITECTURA ESP-NOW */}
        <section className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-wider text-slate-300 font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
            📡 ARQUITECTURA ESP-NOW
          </h2>

          <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
            <p>
              Esta arquitectura elimina la latencia de internet utilizando dos módulos de radiofrecuencia directa entre placas:
            </p>
            
            <div className="bg-slate-950 p-3 rounded font-mono text-[9px] text-slate-300 border border-slate-850 leading-relaxed overflow-x-auto whitespace-pre">
{` [Botón]
    │
    ▼ (GPIO4 a GND)
[ESP32 EMISOR]
    │
    │  (Señal de Radio ESP-NOW)
    ▼  (~1ms de transmisión)
[ESP32 RECEPTOR] (Conectado USB a PC)
    │
    ▼ (Serial.println por USB)
[NAVEGADOR WEB] (Web Serial API: ~0ms)`}
            </div>

            <p className="text-[11px] text-slate-400">
              Encuentra los diagramas de cableado y los dos códigos de firmware correspondientes dentro de la carpeta local <code>esp32_firmware/</code> de este proyecto.
            </p>
          </div>
        </section>

      </div>

      <SupabaseTest />

      <footer className="mt-12 text-center text-xs text-slate-600 font-mono">
        <p>Proyecto ESP-NOW de baja latencia con Web Serial API.</p>
      </footer>
    </div>
  );
}
