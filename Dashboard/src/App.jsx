import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import {
  Activity,
  Wifi,
  Cpu,
  Database,
  Battery,
  Clock,
  Zap,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Play,
  Pause,
  AlertOctagon,
  HelpCircle,
  ShieldCheck,
  Terminal,
  Brain,
  Wrench
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

// CSS variables / color helper constants
const COLORS = {
  cyan: '#00f2fe',
  blue: '#0070f3',
  green: '#05f2c7',
  warning: '#f5a623',
  error: '#ff0055',
  purple: '#7928ca',
  grid: 'rgba(255, 255, 255, 0.05)',
  tooltipBg: 'rgba(16, 24, 39, 0.95)',
  tooltipBorder: 'rgba(255, 255, 255, 0.1)'
};

export default function App() {
  // Global States
  const [isPlaying, setIsPlaying] = useState(true);
  const [protocol, setProtocol] = useState('ESP-NOW'); // 'ESP-NOW' or 'MQTT'
  const [connectionStatus, setConnectionStatus] = useState('Connected'); // 'Connected' or 'Disconnected'
  const [anomalyActive, setAnomalyActive] = useState(false);

  // Supabase Database States
  const [playerName, setPlayerName] = useState('Player 1');
  const playerNameRef = useRef('Player 1');
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  // Game KPIs
  const [currentScore, setCurrentScore] = useState(0);
  const [highScore, setHighScore] = useState(24);
  const [totalJumps, setTotalJumps] = useState(148);
  const [reactionTime, setReactionTime] = useState(195); // ms
  const [latency, setLatency] = useState(2.1); // ms
  const [packetSuccess, setPacketSuccess] = useState(99.9); // %

  // Device Monitor
  const [wifiSignal, setWifiSignal] = useState(-52); // dBm
  const [batteryLevel, setBatteryLevel] = useState(88); // %
  const [cpuUsage, setCpuUsage] = useState(14); // %
  const [memoryUsage, setMemoryUsage] = useState(42.5); // %
  const [uptime, setUptime] = useState(3845); // seconds

  // Game Telemetry
  const [birdY, setBirdY] = useState(50); // % of screen height
  const [birdState, setBirdState] = useState('STABLE'); // 'STABLE', 'JUMPING', 'FALLING'
  const [obstacleCount, setObstacleCount] = useState(12);
  const [collisions, setCollisions] = useState(1);
  const [sessionDuration, setSessionDuration] = useState(125); // seconds

  // Charts Data
  const [scoreHistory, setScoreHistory] = useState([
    { time: '13:05', score: 2 },
    { time: '13:06', score: 5 },
    { time: '13:07', score: 8 },
    { time: '13:08', score: 14 },
    { time: '13:09', score: 11 },
    { time: '13:10', score: 18 },
    { time: '13:11', score: 24 },
    { time: '13:12', score: 4 },
  ]);

  const [latencyHistory, setLatencyHistory] = useState(
    Array.from({ length: 15 }, (_, i) => ({
      index: i,
      val: 1.8 + Math.random() * 0.5
    }))
  );

  const [jumpHistory, setJumpHistory] = useState([
    { interval: '0-5s', jumps: 4 },
    { interval: '5-10s', jumps: 6 },
    { interval: '10-15s', jumps: 3 },
    { interval: '15-20s', jumps: 8 },
    { interval: '20-25s', jumps: 5 },
    { interval: '25-30s', jumps: 7 },
  ]);

  const [packetRateHistory, setPacketRateHistory] = useState([
    { name: 'CH 1', rate: 99.8 },
    { name: 'CH 2', rate: 99.9 },
    { name: 'CH 3', rate: 99.7 },
    { name: 'CH 4', rate: 99.9 },
    { name: 'CH 5', rate: 99.6 },
  ]);

  // Logs
  const [logs, setLogs] = useState([
    { id: 1, time: '13:12:01', type: 'system', message: 'ESP32 IoT Core initialized successfully.' },
    { id: 2, time: '13:12:02', type: 'network', message: 'RF Channel handshake complete (ESP-NOW mode).' },
    { id: 3, time: '13:12:15', type: 'game', message: 'New game session started.' },
    { id: 4, time: '13:12:45', type: 'control', message: 'Physical microswitch button interrupt calibration complete.' },
  ]);

  // Refs for loop controls
  const stepRef = useRef(0);
  const logContainerRef = useRef(null);

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Main simulation engine loop
  useEffect(() => {
    if (!isPlaying || connectionStatus === 'Connected') return;

    const interval = setInterval(() => {
      stepRef.current += 1;

      // 1. Time / Uptime increment
      setUptime(prev => prev + 1);
      setSessionDuration(prev => prev + 1);

      // 2. Latency & Packet simulation based on protocol & anomaly
      let targetLatency = protocol === 'ESP-NOW' ? 1.8 : 220;
      let latencyVariance = protocol === 'ESP-NOW' ? 0.4 : 45;
      let packetBase = protocol === 'ESP-NOW' ? 99.9 : 98.4;

      if (anomalyActive) {
        targetLatency = protocol === 'ESP-NOW' ? 45.2 : 780;
        latencyVariance = protocol === 'ESP-NOW' ? 15 : 180;
        packetBase = 85.4;
      }

      const nextLatency = Math.max(0.5, +(targetLatency + (Math.random() - 0.5) * latencyVariance).toFixed(1));
      setLatency(nextLatency);

      const nextPacket = Math.max(70, +(packetBase - Math.random() * 2).toFixed(1));
      setPacketSuccess(nextPacket);

      // Wifi signal / battery fluctuations
      setWifiSignal(prev => {
        const change = Math.floor(Math.random() * 3) - 1;
        return Math.min(-45, Math.max(-85, prev + change));
      });
      setBatteryLevel(prev => {
        // very slow drain
        if (stepRef.current % 60 === 0) {
          return Math.max(5, prev - 1);
        }
        return prev;
      });

      // CPU and Memory fluctuations
      setCpuUsage(Math.floor(10 + Math.random() * 15 + (anomalyActive ? 30 : 0)));
      setMemoryUsage(+(41.2 + Math.random() * 2 + (anomalyActive ? 12 : 0)).toFixed(1));

      // 3. Game State Simulation (Bird physics, Score, Jumps)
      const didJump = Math.random() > 0.85;
      if (didJump) {
        setBirdState('JUMPING');
        setBirdY(y => Math.max(10, y - 20));
        setTotalJumps(j => j + 1);

        // Add jump log
        addLog('control', 'Jump signal triggered via GPIO-12 hardware interrupt');

        // Increment jump history interval
        setJumpHistory(history => {
          return history.map((item, index) =>
            index === history.length - 1
              ? { ...item, jumps: item.jumps + 1 }
              : item
          );
        });

        // Simulating game reaction time
        setReactionTime(Math.floor(protocol === 'ESP-NOW' ? 175 + Math.random() * 25 : 280 + Math.random() * 80));
      } else {
        setBirdState(prev => {
          if (prev === 'JUMPING') return 'FALLING';
          return prev;
        });
        setBirdY(y => Math.min(90, y + 5));
      }

      // Periodically score points or crash
      if (stepRef.current % 12 === 0) {
        // Probability of collision
        const crashed = Math.random() > 0.92;
        if (crashed) {
          setCollisions(c => c + 1);
          setCurrentScore(0);
          addLog('game', `Collision registered with Obstacle #${obstacleCount + 1}. Session reset.`);
          setObstacleCount(c => c + 1);
        } else {
          setCurrentScore(s => {
            const nextScore = s + 1;
            if (nextScore > highScore) {
              setHighScore(nextScore);
            }
            // Update score history
            if (nextScore % 2 === 0) {
              setScoreHistory(hist => {
                const now = new Date();
                const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                const newHist = [...hist.slice(1), { time: timeStr, score: nextScore }];
                return newHist;
              });
            }
            return nextScore;
          });
          setObstacleCount(c => c + 1);
          addLog('game', `Obstacle cleared. Score updated to ${currentScore + 1}.`);
        }
      }

      // Add latency history point
      setLatencyHistory(hist => {
        const newHist = [...hist.slice(1), { index: stepRef.current, val: nextLatency }];
        return newHist;
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, protocol, anomalyActive, currentScore, obstacleCount, highScore, connectionStatus]);

  // Real-time Supabase connection
  useEffect(() => {
    if (connectionStatus !== 'Connected' || !supabase) return;

    addLog('system', 'Connecting to Supabase Realtime for telemetry...');
    
    const channel = supabase.channel('telemetry', {
      config: {
        broadcast: { ack: false },
      },
    });

    channel.on('broadcast', { event: 'telemetry' }, ({ payload: data }) => {
        try {
          if (data.currentScore !== undefined) setCurrentScore(data.currentScore);
          if (data.highScore !== undefined) setHighScore(data.highScore);
          if (data.totalJumps !== undefined) setTotalJumps(data.totalJumps);
          if (data.reactionTime !== undefined) setReactionTime(data.reactionTime);
          if (data.latency !== undefined) setLatency(data.latency);
          if (data.packetSuccess !== undefined) setPacketSuccess(data.packetSuccess);
          if (data.wifiSignal !== undefined) setWifiSignal(data.wifiSignal);
          if (data.batteryLevel !== undefined) setBatteryLevel(data.batteryLevel);
          if (data.cpuUsage !== undefined) setCpuUsage(data.cpuUsage);
          if (data.memoryUsage !== undefined) setMemoryUsage(data.memoryUsage);
          if (data.uptime !== undefined) setUptime(data.uptime);
          if (data.birdY !== undefined) setBirdY(data.birdY);
          if (data.birdState !== undefined) setBirdState(data.birdState);
          if (data.obstacleCount !== undefined) setObstacleCount(data.obstacleCount);
          if (data.collisions !== undefined) setCollisions(data.collisions);
          if (data.sessionDuration !== undefined) setSessionDuration(data.sessionDuration);
          
          if (data.log) {
            addLog(data.logType || 'game', data.log);
            // Ya no guardamos el score desde aquí, project-espnow lo hace directamente a la BD
          }

          // Update histories just like the simulation did
          if (data.currentScore !== undefined && data.currentScore % 2 === 0) {
            setScoreHistory(hist => {
              const now = new Date();
              const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
              // Avoid duplicate entries for the same score at the same second
              if (hist[hist.length - 1]?.score === data.currentScore) return hist;
              return [...hist.slice(1), { time: timeStr, score: data.currentScore }];
            });
          }

          if (data.latency !== undefined) {
            setLatencyHistory(hist => {
              const newIndex = hist.length > 0 ? hist[hist.length - 1].index + 1 : 0;
              return [...hist.slice(1), { index: newIndex, val: data.latency }];
            });
          }

          if (data.totalJumps !== undefined) {
            setJumpHistory(history => {
              return history.map((item, index) =>
                index === history.length - 1
                  ? { ...item, jumps: item.jumps + 1 }
                  : item
              );
            });
          }
        } catch (e) {
          console.error("Failed to parse telemetry:", e);
        }
    }).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            addLog('system', 'Connected to Supabase Realtime channel.');
        } else {
            addLog('system', `Supabase channel status: ${status}`);
        }
    });

    return () => {
      addLog('system', 'Disconnecting Supabase Realtime channel...');
      supabase.removeChannel(channel);
    };
  }, [connectionStatus]);

  const addLog = (type, message) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs(prev => [
      ...prev,
      {
        id: Date.now(),
        time: timeStr,
        type,
        message
      }
    ].slice(-50)); // keep last 50 logs
  };

  const fetchLeaderboard = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);
      if (!error && data) {
        setLeaderboard(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveScore = async (scoreToSave) => {
    if (!supabase) return;
    try {
      const currentName = playerNameRef.current || 'Player 1';
      const { error } = await supabase
        .from('scores')
        .insert([{ player_name: currentName, score: scoreToSave }]);
      if (error) {
        addLog('system', `Error saving score to Supabase: ${error.message}`);
      } else {
        addLog('system', `Saved score of ${scoreToSave} for ${currentName} to Supabase.`);
        fetchLeaderboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Subscribe to new scores
    if (supabase) {
        const scoresChannel = supabase.channel('scores-db-changes')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'scores' },
            (payload) => {
              addLog('system', `Nuevo récord detectado en BD: ${payload.new.score} pts por ${payload.new.player_name}`);
              fetchLeaderboard(); // Refetch to get correct order
            }
          )
          .subscribe();

        return () => {
            supabase.removeChannel(scoresChannel);
        };
    }
  }, []);

  const toggleConnection = () => {
    const nextStatus = connectionStatus === 'Connected' ? 'Disconnected' : 'Connected';
    setConnectionStatus(nextStatus);
    addLog('system', `ESP32 connection manually set to ${nextStatus}.`);
  };

  const triggerAnomaly = () => {
    setAnomalyActive(prev => {
      const next = !prev;
      addLog('system', next
        ? 'ALERT: High packet congestion & RF interference simulated.'
        : 'NOTICE: Simulation environment returned to optimal telemetry state.'
      );
      return next;
    });
  };

  // Helper to format time
  const formatUptime = (sec) => {
    const hours = Math.floor(sec / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const seconds = (sec % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Top Header */}
      <header className="glass-panel" style={{ margin: '16px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={24} color="#0a0e17" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.5px' }}>Flappy Bird IoT Control Center</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Industrial Monitoring Portal</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Connection Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={toggleConnection}>
            <span className={`led led-${connectionStatus === 'Connected' ? 'green' : 'red'}`} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: connectionStatus === 'Connected' ? 'var(--accent-green)' : 'var(--accent-error)' }}>
              ESP32: {connectionStatus}
            </span>
          </div>

          {/* Protocol Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
            <button
              onClick={() => { setProtocol('ESP-NOW'); addLog('system', 'Switched protocol to ESP-NOW (Local Radio)'); }}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: protocol === 'ESP-NOW' ? 'var(--accent-cyan)' : 'transparent', color: protocol === 'ESP-NOW' ? '#0a0e17' : 'var(--color-text-secondary)', transition: 'all 0.2s' }}
            >
              ESP-NOW
            </button>
            <button
              onClick={() => { setProtocol('MQTT'); addLog('system', 'Switched protocol to MQTT (HiveMQ WebSockets)'); }}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: protocol === 'MQTT' ? 'var(--accent-cyan)' : 'transparent', color: protocol === 'MQTT' ? '#0a0e17' : 'var(--color-text-secondary)', transition: 'all 0.2s' }}
            >
              MQTT
            </button>
          </div>

          {/* Latency Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: latency > 100 ? 'rgba(255,0,85,0.1)' : 'rgba(0,242,254,0.1)', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${latency > 100 ? 'var(--accent-error)' : 'var(--accent-cyan)'}` }}>
            <Zap size={14} color={latency > 100 ? 'var(--accent-error)' : 'var(--accent-cyan)'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: latency > 100 ? 'var(--accent-error)' : 'var(--accent-cyan)' }}>
              {latency} ms
            </span>
          </div>

          {/* Controls */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            title={isPlaying ? "Pause telemetry simulation" : "Start telemetry simulation"}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={triggerAnomaly}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: anomalyActive ? 'rgba(255, 0, 85, 0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${anomalyActive ? 'var(--accent-error)' : 'var(--card-border)'}`, color: anomalyActive ? 'var(--accent-error)' : 'var(--color-text-secondary)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            title="Inject RF Congestion/Interference"
          >
            <AlertTriangle size={14} />
            <span>Simulate Jam</span>
          </button>
        </div>
      </header>

      {/* Main KPI Cards Grid */}
      <section className="dashboard-grid" style={{ paddingTop: '0' }}>
        {[
          { title: 'Current Score', value: currentScore, icon: <Activity size={20} color="var(--accent-cyan)" />, desc: 'Cleared obstacles' },
          { title: 'Highest Score', value: highScore, icon: <Award size={20} color="var(--accent-warning)" />, desc: 'Current session peak' },
          { title: 'Total Jumps', value: totalJumps, icon: <TrendingUp size={20} color="var(--accent-blue)" />, desc: 'Interrupt trigger count' },
          { title: 'Average Reaction Time', value: `${reactionTime} ms`, icon: <Clock size={20} color="var(--accent-purple)" />, desc: 'Hardware delay' },
          { title: 'Current Latency', value: `${latency} ms`, icon: <Zap size={20} color={latency > 100 ? 'var(--accent-error)' : 'var(--accent-cyan)'} />, desc: 'RTT ping status', alert: latency > 100 },
          { title: 'Packet Success Rate', value: `${packetSuccess}%`, icon: <ShieldCheck size={20} color="var(--accent-green)" />, desc: 'Zero-drop target', alert: packetSuccess < 95 }
        ].map((kpi, idx) => (
          <div key={idx} className="glass-panel" style={{ gridColumn: 'span 2', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: kpi.alert ? '3px solid var(--accent-error)' : '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.title}</span>
              {kpi.icon}
            </div>
            <div className="text-mono" style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0', color: kpi.alert ? 'var(--accent-error)' : 'var(--color-text-primary)' }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{kpi.desc}</div>
          </div>
        ))}
      </section>

      {/* Real-time Charts Section */}
      <section className="dashboard-grid" style={{ paddingTop: '0' }}>
        {/* Score Over Time */}
        <div className="glass-panel" style={{ gridColumn: 'span 6', padding: '20px', minHeight: '300px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="var(--accent-cyan)" /> Score over time line chart
          </h3>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreHistory}>
                <defs>
                  <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: COLORS.tooltipBg, borderColor: COLORS.tooltipBorder, borderRadius: '8px' }}
                  labelClassName="text-mono"
                  itemStyle={{ color: 'var(--accent-cyan)' }}
                />
                <Area type="monotone" dataKey="score" stroke="var(--accent-cyan)" strokeWidth={2} fillOpacity={1} fill="url(#scoreGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Over Time */}
        <div className="glass-panel" style={{ gridColumn: 'span 6', padding: '20px', minHeight: '300px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--accent-warning)" /> Latency over time line chart
          </h3>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis dataKey="index" stroke="var(--color-text-muted)" fontSize={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: COLORS.tooltipBg, borderColor: COLORS.tooltipBorder, borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--accent-warning)' }}
                />
                <Line type="monotone" dataKey="val" name="RTT (ms)" stroke="var(--accent-warning)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Jump Frequency */}
        <div className="glass-panel" style={{ gridColumn: 'span 6', padding: '20px', minHeight: '300px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--accent-blue)" /> Jump frequency chart (per interval)
          </h3>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jumpHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis dataKey="interval" stroke="var(--color-text-muted)" fontSize={10} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: COLORS.tooltipBg, borderColor: COLORS.tooltipBorder, borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--accent-blue)' }}
                />
                <Bar dataKey="jumps" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Communication Performance */}
        <div className="glass-panel" style={{ gridColumn: 'span 6', padding: '20px', minHeight: '300px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} color="var(--accent-green)" /> Communication Performance (RF Success Rate)
          </h3>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packetRateHistory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis type="number" domain={[95, 100]} stroke="var(--color-text-muted)" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: COLORS.tooltipBg, borderColor: COLORS.tooltipBorder, borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--accent-green)' }}
                />
                <Bar dataKey="rate" name="Success %" fill="var(--accent-green)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

       {/* Panels: Device Monitoring & Game Telemetry */}
      <section className="dashboard-grid" style={{ paddingTop: '0' }}>
        {/* Device Monitoring Panel */}
        <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="var(--accent-cyan)" /> Device Monitoring Panel
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status indicator row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>ESP32 Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className={`led led-${connectionStatus === 'Connected' ? 'green' : 'red'}`} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{connectionStatus === 'Connected' ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            </div>

            {/* Battery */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}><Battery size={14} /> Battery Level</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>{batteryLevel}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${batteryLevel}%`, height: '100%', background: batteryLevel < 20 ? 'var(--accent-error)' : 'var(--accent-green)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Wifi Signal */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}><Wifi size={14} /> WiFi Signal Strength</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>{wifiSignal} dBm</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(10, 100 + wifiSignal)}%`, height: '100%', background: 'var(--accent-cyan)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* CPU usage */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}><Cpu size={14} /> CPU Usage</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>{cpuUsage}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${cpuUsage}%`, height: '100%', background: cpuUsage > 75 ? 'var(--accent-error)' : 'var(--accent-cyan)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Memory usage */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}><Database size={14} /> Memory Usage</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>{memoryUsage}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${memoryUsage}%`, height: '100%', background: 'var(--accent-purple)', borderRadius: '3px' }} />
              </div>
            </div>

            {/* Uptime */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}><Clock size={14} /> Uptime</span>
              <span className="text-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatUptime(uptime)}</span>
            </div>
          </div>
        </div>

        {/* Game Telemetry Panel */}
        <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--accent-purple)" /> Game Telemetry Panel
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Live bird position representation */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Bird Position (Altitude Y)</span>
                <span className="text-mono" style={{ fontWeight: 600 }}>{Math.round(100 - birdY)}%</span>
              </div>
              <div style={{ height: '36px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', position: 'relative', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                {/* Horizontal reference lines */}
                <div style={{ position: 'absolute', top: '25%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.03)' }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.05)' }} />
                <div style={{ position: 'absolute', top: '75%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.03)' }} />

                {/* Simulated Bird Dot */}
                <div style={{
                  position: 'absolute',
                  left: '20%',
                  top: `${birdY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-cyan)',
                  boxShadow: '0 0 10px var(--accent-cyan)',
                  transition: 'top 0.15s ease-out'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Bird State</span>
              <span className="text-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: birdState === 'JUMPING' ? 'var(--accent-cyan)' : 'var(--color-text-secondary)' }}>
                {birdState}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Active Jump Events</span>
              <span className="text-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{totalJumps}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Obstacles Encountered</span>
              <span className="text-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{obstacleCount}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Collision Failures</span>
              <span className="text-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: collisions > 0 ? 'var(--accent-error)' : 'var(--color-text-primary)' }}>{collisions}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Session Duration</span>
              <span className="text-mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sessionDuration} s</span>
            </div>
          </div>
        </div>

        {/* Live Event Log */}
        <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} color="var(--accent-cyan)" /> Live Event Log
          </h3>
          <div
            ref={logContainerRef}
            style={{
              flex: 1,
              minHeight: '200px',
              maxHeight: '220px',
              overflowY: 'auto',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '6px',
              padding: '10px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              lineHeight: '1.4',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {logs.map((log) => {
              let color = 'var(--color-text-secondary)';
              if (log.type === 'system') color = 'var(--accent-cyan)';
              if (log.type === 'control') color = 'var(--accent-blue)';
              if (log.type === 'game') color = 'var(--accent-warning)';
              if (log.message.includes('ALERT') || log.message.includes('reset')) color = 'var(--accent-error)';

              return (
                <div key={log.id} style={{ marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px' }}>
                  <span style={{ color: 'var(--color-text-muted)', marginRight: '6px' }}>[{log.time}]</span>
                  <span style={{ color }}>{log.message}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Supabase Leaderboard Panel */}
        <div className="glass-panel" style={{ gridColumn: 'span 3', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} color="var(--accent-warning)" /> Supabase Leaderboard
          </h3>
          
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>Player Name</label>
            <input 
              type="text" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ 
                width: '100%', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '6px', 
                padding: '6px 10px', 
                color: 'white', 
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                outline: 'none'
              }} 
            />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {!supabase ? (
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-error)', textAlign: 'center', marginTop: '10px' }}>
                Supabase not configured. Check .env file.
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '10px' }}>
                No scores submitted yet.
              </div>
            ) : (
              leaderboard.map((entry, idx) => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: idx === 0 ? 'var(--accent-warning)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>#{idx + 1}</span>
                    {entry.player_name}
                  </span>
                  <span className="text-mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {entry.score} pts
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* AI Insights Section */}
      <section className="dashboard-grid" style={{ paddingTop: '0' }}>
        <div className="glass-panel" style={{ gridColumn: 'span 12', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <Brain size={22} color="var(--accent-green)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Telemetry Insights & Recommended Optimizations</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Automated real-time analytics & latency mitigation advisor</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {/* Status Analytics Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={14} color="var(--accent-green)" /> RTT Analytics
              </h4>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                {anomalyActive
                  ? 'Abnormal network latency detected! RTT variance has exceeded 150%. Jumps might register out of order.'
                  : `Average network latency is at ${latency} ms. Comm channel jitter is nominal (<0.5ms). Connection quality is optimal.`}
              </p>
            </div>

            {/* Anomaly Detection */}
            <div style={{ background: anomalyActive ? 'rgba(255,0,85,0.05)' : 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: `1px solid ${anomalyActive ? 'var(--accent-error)' : 'rgba(255,255,255,0.05)'}` }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: anomalyActive ? 'var(--accent-error)' : 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertOctagon size={14} color={anomalyActive ? 'var(--accent-error)' : 'var(--accent-warning)'} /> Anomaly status
              </h4>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: anomalyActive ? '#ffb3c6' : 'inherit' }}>
                {anomalyActive
                  ? 'CRITICAL ALERT: Detected packet loss spikes and high signal degradation. RF path interference suspected.'
                  : 'No active anomalies detected. All IoT telemetry systems are operating within designated limits.'}
              </p>
            </div>

            {/* Suggestions */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={14} color="var(--accent-cyan)" /> Suggested Optimization
              </h4>
              <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                {anomalyActive
                  ? 'Switch protocol to ESP-NOW immediately. If using MQTT, change to local broker setup or reduce transmission rate to 10Hz.'
                  : protocol === 'MQTT'
                    ? 'ESP-NOW mode is recommended to minimize latency. Switching from MQTT could improve reaction time by ~200ms.'
                    : 'System is fully optimized. Current configuration matches peak performance criteria.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>
        Building with AI: ESP32 + React + Real-Time Analytics
      </footer>
    </div>
  );
}
