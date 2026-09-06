import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Trophy,
  Gauge,
  Zap,
  Volume2,
  VolumeX,
  Pause,
  Shield,
  Flag,
  Clock,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  Car,
  Compass
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

// -------------------------------------------------------------
// TYPES & DATA STRUCTURES
// -------------------------------------------------------------

export interface CarModel {
  id: string;
  name: string;
  tagline: string;
  topSpeed: number; // max speed in km/h
  accel: number; // acceleration rate
  handling: number; // steering responsiveness
  drift: number; // drift control / bonus
  color: string;
  accentColor: string;
  stripeColor: string;
  stats: {
    speed: number; // 0 - 100 for visual bars
    accel: number;
    handling: number;
    drift: number;
  };
}

export interface RaceTrack {
  id: string;
  name: string;
  subtitle: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT';
  distanceKm: number;
  laps: number;
  checkpointsPerLap: number;
  timeLimitSec: number;
  curveFrequency: number;
  hillFrequency: number;
  aiBaseSpeed: number; // For balance
  bestTimeKey: string;
  bgColor: string;
  skyGradient: [string, string, string];
}

interface Segment {
  index: number;
  p1: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  p2: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  curve: number;
  sprites: {
    type: 'cactus' | 'rock' | 'mesa' | 'barrier' | 'sign' | 'tower' | 'checkpoint' | 'finish';
    offset: number; // -1 to 1 across road, or >1 for roadside
  }[];
  color: {
    road: string;
    grass: string;
    rumble: string;
    lane: string;
  };
}

interface AICar {
  id: number;
  name: string;
  carModel: CarModel;
  x: number; // -0.8 to 0.8 on road
  z: number; // distance along track
  speed: number;
  targetSpeed: number;
  lap: number;
  finished: boolean;
  finishTime: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

// -------------------------------------------------------------
// CARS DEFINITIONS
// -------------------------------------------------------------
const CARS: CarModel[] = [
  {
    id: 'dune-raider',
    name: 'DUNE RAIDER',
    tagline: 'Balanced All-Terrain Champion',
    topSpeed: 215,
    accel: 0.165,
    handling: 0.055,
    drift: 0.85,
    color: '#f59e0b', // Warm Amber Gold
    accentColor: '#fbbf24',
    stripeColor: '#1e293b',
    stats: { speed: 78, accel: 82, handling: 85, drift: 80 }
  },
  {
    id: 'sandstorm-gt',
    name: 'SANDSTORM GT',
    tagline: 'Aerodynamic High-Speed Predator',
    topSpeed: 245,
    accel: 0.18,
    handling: 0.048,
    drift: 0.75,
    color: '#06b6d4', // Cyan Neon Metallic
    accentColor: '#38bdf8',
    stripeColor: '#0f172a',
    stats: { speed: 95, accel: 88, handling: 72, drift: 70 }
  },
  {
    id: 'apex-buggy',
    name: 'APEX BUGGY',
    tagline: 'Lightweight Tubular Drift Beast',
    topSpeed: 205,
    accel: 0.19,
    handling: 0.065,
    drift: 0.98,
    color: '#ef4444', // Crimson Red
    accentColor: '#f87171',
    stripeColor: '#ffffff',
    stats: { speed: 72, accel: 90, handling: 95, drift: 96 }
  },
  {
    id: 'titan-4x4',
    name: 'TITAN 4X4',
    tagline: 'Heavy Armored Desert Dreadnought',
    topSpeed: 220,
    accel: 0.175,
    handling: 0.05,
    drift: 0.8,
    color: '#8b5cf6', // Titanium Purple
    accentColor: '#a78bfa',
    stripeColor: '#f59e0b',
    stats: { speed: 82, accel: 84, handling: 78, drift: 82 }
  }
];

// -------------------------------------------------------------
// RACE TRACKS DEFINITIONS
// -------------------------------------------------------------
const TRACKS: RaceTrack[] = [
  {
    id: 'race-1',
    name: 'RACE 01',
    subtitle: 'DESERT RUN',
    difficulty: 'EASY',
    distanceKm: 3.2,
    laps: 3,
    checkpointsPerLap: 3,
    timeLimitSec: 65,
    curveFrequency: 0.35,
    hillFrequency: 0.3,
    aiBaseSpeed: 140, // Gentle for beginners!
    bestTimeKey: 'desert_racer_best_r1',
    bgColor: '#f97316',
    skyGradient: ['#451a03', '#7c2d12', '#b45309']
  },
  {
    id: 'race-2',
    name: 'RACE 02',
    subtitle: 'CANYON RUSH',
    difficulty: 'NORMAL',
    distanceKm: 4.0,
    laps: 3,
    checkpointsPerLap: 4,
    timeLimitSec: 60,
    curveFrequency: 0.55,
    hillFrequency: 0.5,
    aiBaseSpeed: 175,
    bestTimeKey: 'desert_racer_best_r2',
    bgColor: '#ea580c',
    skyGradient: ['#3b0764', '#6b21a8', '#c2410c']
  },
  {
    id: 'race-3',
    name: 'RACE 03',
    subtitle: 'DUNE STORM',
    difficulty: 'HARD',
    distanceKm: 4.8,
    laps: 3,
    checkpointsPerLap: 4,
    timeLimitSec: 55,
    curveFrequency: 0.75,
    hillFrequency: 0.65,
    aiBaseSpeed: 195,
    bestTimeKey: 'desert_racer_best_r3',
    bgColor: '#d97706',
    skyGradient: ['#1e1b4b', '#431407', '#9a3412']
  },
  {
    id: 'race-4',
    name: 'RACE 04',
    subtitle: 'SUNSET CIRCUIT',
    difficulty: 'EXPERT',
    distanceKm: 5.5,
    laps: 3,
    checkpointsPerLap: 5,
    timeLimitSec: 50,
    curveFrequency: 0.9,
    hillFrequency: 0.8,
    aiBaseSpeed: 215,
    bestTimeKey: 'desert_racer_best_r4',
    bgColor: '#b91c1c',
    skyGradient: ['#0f172a', '#311042', '#831843']
  }
];

const SEGMENT_LENGTH = 160;
const TRACK_SEGMENTS_COUNT = 1000;
const ROAD_WIDTH = 2200;
const CAMERA_HEIGHT = 1050;
const CAMERA_DEPTH = 0.84; // Field of view scaling
const DRAW_DISTANCE = 180; // Segments ahead to draw

export const DesertRacerGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Navigation & High-Level Game State
  const [gameState, setGameState] = useState<
    'MAIN_MENU' | 'RACE_SELECT' | 'GARAGE' | 'COUNTDOWN' | 'RACING' | 'PAUSED' | 'RACE_COMPLETE' | 'GAME_OVER'
  >('MAIN_MENU');
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(!sound.getIsMuted());
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [quality, setQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selection
  const [selectedCar, setSelectedCar] = useState<CarModel>(CARS[0]);
  const [selectedTrack, setSelectedTrack] = useState<RaceTrack>(TRACKS[0]);

  // Race Live HUD Stats
  const [playerSpeedKmh, setPlayerSpeedKmh] = useState(0);
  const [playerLap, setPlayerLap] = useState(1);
  const [playerPosition, setPlayerPosition] = useState(1);
  const [checkpointText, setCheckpointText] = useState('01 / 03');
  const [timeRemaining, setTimeRemaining] = useState(65);
  const [driftScore, setDriftScore] = useState(0);
  const [isDrifting, setIsDrifting] = useState(false);
  const [countdownVal, setCountdownVal] = useState<'3' | '2' | '1' | 'GO!' | ''>('');
  const [checkpointBanner, setCheckpointBanner] = useState<string | null>(null);
  const [raceResult, setRaceResult] = useState<{
    position: number;
    timeStr: string;
    bestTimeStr: string;
    score: number;
    isNewRecord: boolean;
  }>({ position: 1, timeStr: '00:00.00', bestTimeStr: '--:--', score: 0, isNewRecord: false });

  // Mobile virtual touch controls state
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const mobileControlsRef = useRef({
    left: false,
    right: false,
    accel: false,
    brake: false,
    drift: false
  });

  // Synthesizer for continuous engine RPM and tire skid audio
  const engineAudioRef = useRef<{
    ctx: AudioContext | null;
    osc: OscillatorNode | null;
    gain: GainNode | null;
    skidOsc: OscillatorNode | null;
    skidGain: GainNode | null;
  }>({ ctx: null, osc: null, gain: null, skidOsc: null, skidGain: null });

  // Core Simulation Ref for 60FPS lock
  const simRef = useRef({
    time: 0,
    width: 1280,
    height: 720,
    screenShake: 0,
    cameraTilt: 0,
    // Track data
    segments: [] as Segment[],
    trackLength: TRACK_SEGMENTS_COUNT * SEGMENT_LENGTH,
    // Player state
    player: {
      x: 0, // -1 (left shoulder) to +1 (right shoulder)
      y: 0, // world elevation
      z: 0, // track distance position (0 to trackLength)
      speed: 0, // current speed in world units / frame
      maxSpeed: 215, // in km/h
      accel: 0.165,
      decel: 0.08,
      brake: 0.28,
      steer: 0,
      handling: 0.055,
      driftFactor: 0.85,
      isDrifting: false,
      driftAngle: 0,
      driftScore: 0,
      bounce: 0,
      lap: 1,
      checkpointIndex: 0,
      totalCheckpointsPassed: 0,
      timeRemaining: 65,
      raceTime: 0,
      finished: false,
      position: 1
    },
    // Opponents
    aiCars: [] as AICar[],
    // Particles
    particles: [] as Particle[],
    // Input Keys
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      drift: false
    },
    countdownTimer: 0
  });

  // Detect Touch Device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Listen to Fullscreen API
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    sound.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Web Audio Dynamic Engine Sound Synthesizer
  const initEngineAudio = useCallback(() => {
    if (!soundEnabled || sound.getIsMuted()) return;
    try {
      if (!engineAudioRef.current.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          engineAudioRef.current.ctx = new AudioCtx();
        }
      }
      const ctx = engineAudioRef.current.ctx;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop previous if any
      if (engineAudioRef.current.osc) {
        try {
          engineAudioRef.current.osc.stop();
          engineAudioRef.current.skidOsc?.stop();
        } catch {}
      }

      // 1. Engine rev oscillator (warm sawtooth low-pass)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      // 2. Skid noise oscillator (white noise / high-frequency fm)
      const skidOsc = ctx.createOscillator();
      const skidGain = ctx.createGain();
      skidOsc.type = 'triangle';
      skidOsc.frequency.setValueAtTime(280, ctx.currentTime);
      skidGain.gain.setValueAtTime(0, ctx.currentTime);
      skidOsc.connect(skidGain);
      skidGain.connect(ctx.destination);
      skidOsc.start();

      engineAudioRef.current = { ctx, osc, gain, skidOsc, skidGain };
    } catch {}
  }, [soundEnabled]);

  const stopEngineAudio = useCallback(() => {
    try {
      if (engineAudioRef.current.osc) {
        engineAudioRef.current.osc.stop();
        engineAudioRef.current.skidOsc?.stop();
        engineAudioRef.current.osc = null;
        engineAudioRef.current.skidOsc = null;
      }
    } catch {}
  }, []);

  const updateEngineAudio = useCallback((speedRatio: number, isDriftingNow: boolean) => {
    const { ctx, osc, skidOsc, skidGain } = engineAudioRef.current;
    if (!ctx || !osc || !soundEnabled || sound.getIsMuted()) return;

    try {
      // Modulate engine pitch from 60Hz idle to 380Hz redline
      const freq = 60 + speedRatio * 320;
      osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.08);

      // Skid noise on drift
      if (skidGain && skidOsc) {
        if (isDriftingNow && speedRatio > 0.35) {
          skidGain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.05);
          skidOsc.frequency.setTargetAtTime(320 + Math.random() * 80, ctx.currentTime, 0.05);
        } else {
          skidGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        }
      }
    } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    if (gameState === 'RACING') {
      initEngineAudio();
    } else {
      stopEngineAudio();
    }
    return () => {
      stopEngineAudio();
    };
  }, [gameState, initEngineAudio, stopEngineAudio]);

  // Track Road Segment Builder with Curves, Elevation Hills, and Props
  const buildTrackSegments = useCallback((track: RaceTrack): Segment[] => {
    const segments: Segment[] = [];
    const total = TRACK_SEGMENTS_COUNT;
    const cpInterval = Math.floor(total / (track.checkpointsPerLap || 3));

    let curY = 0;

    for (let i = 0; i < total; i++) {
      const z1 = i * SEGMENT_LENGTH;
      const z2 = (i + 1) * SEGMENT_LENGTH;

      // Calculate horizontal curve delta
      let curve = 0;
      const progress = i / total;
      // Procedural curves based on track frequency
      if (progress > 0.1 && progress < 0.22) {
        curve = Math.sin((progress - 0.1) * 8.33 * Math.PI) * 2.8 * track.curveFrequency;
      } else if (progress > 0.28 && progress < 0.42) {
        curve = -Math.sin((progress - 0.28) * 7.14 * Math.PI) * 3.4 * track.curveFrequency;
      } else if (progress > 0.5 && progress < 0.65) {
        curve = Math.sin((progress - 0.5) * 6.66 * Math.PI) * 3.8 * track.curveFrequency;
      } else if (progress > 0.72 && progress < 0.88) {
        curve = -Math.sin((progress - 0.72) * 6.25 * Math.PI) * 4.2 * track.curveFrequency;
      }

      // Calculate elevation hills and dips
      let hill = 0;
      if (progress > 0.15 && progress < 0.3) {
        hill = Math.sin((progress - 0.15) * 6.66 * Math.PI) * 450 * track.hillFrequency;
      } else if (progress > 0.45 && progress < 0.6) {
        hill = -Math.sin((progress - 0.45) * 6.66 * Math.PI) * 380 * track.hillFrequency;
      } else if (progress > 0.75 && progress < 0.9) {
        hill = Math.sin((progress - 0.75) * 6.66 * Math.PI) * 550 * track.hillFrequency;
      }
      curY += hill * 0.05;

      // Alternating color stripes
      const isAlt = Math.floor(i / 3) % 2 === 0;
      const roadColor = isAlt ? '#262626' : '#222222';
      const grassColor = isAlt ? '#c27838' : '#ba6e2c'; // Desert golden sand shades
      const rumbleColor = isAlt ? '#ef4444' : '#f8fafc'; // Red & White hazard kerbs
      const laneColor = isAlt ? '#f59e0b' : 'transparent'; // Desert amber lane dashes

      // Roadside decorations
      const sprites: Segment['sprites'] = [];

      // Checkpoint Arches
      if (i > 0 && i % cpInterval === 0 && i < total - 20) {
        sprites.push({ type: 'checkpoint', offset: 0 });
      }

      // Finish Line Gantry on segment 0
      if (i === 0) {
        sprites.push({ type: 'finish', offset: 0 });
      }

      // Cacti, Desert rocks, Mesas & Warning signs
      if (i > 15 && i % 8 === 0) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const offset = side * (1.6 + Math.random() * 2.2);
        const r = Math.random();
        if (r < 0.4) {
          sprites.push({ type: 'cactus', offset });
        } else if (r < 0.7) {
          sprites.push({ type: 'rock', offset });
        } else if (r < 0.85) {
          sprites.push({ type: 'barrier', offset: side * 1.25 });
        } else {
          sprites.push({ type: 'mesa', offset: side * 3.5 });
        }
      }

      segments.push({
        index: i,
        p1: { world: { x: 0, y: curY, z: z1 }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        p2: { world: { x: 0, y: curY + hill * 0.05, z: z2 }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        curve,
        sprites,
        color: {
          road: roadColor,
          grass: grassColor,
          rumble: rumbleColor,
          lane: laneColor
        }
      });
    }

    return segments;
  }, []);

  // Initialize AI Opponents based on track difficulty
  const initAIOpponents = useCallback((track: RaceTrack): AICar[] => {
    const names = ['SCORPION', 'BLAZE', 'VIPER', 'DUST DEVIL', 'APEX GT'];
    const aiCars: AICar[] = [];

    for (let i = 0; i < 5; i++) {
      const model = CARS[(i + 1) % CARS.length];
      // Starting positions behind or slightly in front of the grid
      const startZ = 200 + i * 220;
      const targetSpeedKmh = track.aiBaseSpeed + (Math.random() - 0.5) * 15;
      aiCars.push({
        id: i + 1,
        name: names[i],
        carModel: model,
        x: ((i % 2 === 0 ? -1 : 1) * (0.25 + (i * 0.1))) % 0.75,
        z: startZ,
        speed: (targetSpeedKmh / 215) * 18,
        targetSpeed: (targetSpeedKmh / 215) * 18,
        lap: 1,
        finished: false,
        finishTime: 0
      });
    }

    return aiCars;
  }, []);

  // Format Milliseconds to MM:SS.CC
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hundredths = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
  };

  // Start Race Sequence
  const startRace = useCallback(() => {
    sound.playClick();
    const segments = buildTrackSegments(selectedTrack);
    const aiCars = initAIOpponents(selectedTrack);

    simRef.current = {
      time: 0,
      width: canvasRef.current ? canvasRef.current.width : 1280,
      height: canvasRef.current ? canvasRef.current.height : 720,
      screenShake: 0,
      cameraTilt: 0,
      segments,
      trackLength: segments.length * SEGMENT_LENGTH,
      player: {
        x: 0,
        y: 0,
        z: 0,
        speed: 0,
        maxSpeed: selectedCar.topSpeed,
        accel: selectedCar.accel,
        decel: 0.08,
        brake: 0.28,
        steer: 0,
        handling: selectedCar.handling,
        driftFactor: selectedCar.drift,
        isDrifting: false,
        driftAngle: 0,
        driftScore: 0,
        bounce: 0,
        lap: 1,
        checkpointIndex: 0,
        totalCheckpointsPassed: 0,
        timeRemaining: selectedTrack.timeLimitSec,
        raceTime: 0,
        finished: false,
        position: 6 // Starts at position 6 (chasing the pack)
      },
      aiCars,
      particles: [],
      keys: {
        left: false,
        right: false,
        up: false,
        down: false,
        drift: false
      },
      countdownTimer: 180 // 3 seconds at 60fps
    };

    setPlayerSpeedKmh(0);
    setPlayerLap(1);
    setPlayerPosition(6);
    setCheckpointText(`00 / 0${selectedTrack.checkpointsPerLap}`);
    setTimeRemaining(selectedTrack.timeLimitSec);
    setDriftScore(0);
    setIsDrifting(false);
    setCheckpointBanner(null);

    setGameState('COUNTDOWN');
  }, [buildTrackSegments, initAIOpponents, selectedCar, selectedTrack]);

  // Handle Race Complete
  const finishRace = useCallback(
    (won: boolean) => {
      const s = simRef.current;
      const p = s.player;
      p.finished = true;

      if (won) {
        if (soundEnabled) sound.playVictory();
        confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });

        const timeStr = formatTime(p.raceTime);
        const bestKey = selectedTrack.bestTimeKey;
        const savedBest = localStorage.getItem(bestKey);
        let isNewRecord = false;

        if (!savedBest || p.raceTime < parseFloat(savedBest)) {
          localStorage.setItem(bestKey, p.raceTime.toString());
          isNewRecord = true;
        }

        const bestTimeStr = savedBest ? formatTime(Math.min(p.raceTime, parseFloat(savedBest))) : timeStr;
        const finalScore = Math.floor(10000 / (p.raceTime + 1) + p.driftScore + (7 - p.position) * 1500);

        setRaceResult({
          position: p.position,
          timeStr,
          bestTimeStr,
          score: finalScore,
          isNewRecord
        });

        setGameState('RACE_COMPLETE');
        if (onGameOver) onGameOver(finalScore);
      } else {
        if (soundEnabled) sound.playGameOver();
        const distKm = ((p.lap - 1) * selectedTrack.distanceKm + (p.z / s.trackLength) * selectedTrack.distanceKm).toFixed(1);
        setRaceResult({
          position: p.position,
          timeStr: `${distKm} KM`,
          bestTimeStr: '--:--',
          score: Math.floor(p.driftScore + parseFloat(distKm) * 800),
          isNewRecord: false
        });
        setGameState('GAME_OVER');
      }
    },
    [onGameOver, selectedTrack, soundEnabled]
  );

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = simRef.current.keys;
      if (['KeyW', 'ArrowUp'].includes(e.code)) k.up = true;
      if (['KeyS', 'ArrowDown'].includes(e.code)) k.down = true;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) k.left = true;
      if (['KeyD', 'ArrowRight'].includes(e.code)) k.right = true;
      if (['Space'].includes(e.code)) {
        e.preventDefault();
        k.drift = true;
      }
      if (['Escape', 'KeyP'].includes(e.code)) {
        if (gameState === 'RACING') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('RACING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = simRef.current.keys;
      if (['KeyW', 'ArrowUp'].includes(e.code)) k.up = false;
      if (['KeyS', 'ArrowDown'].includes(e.code)) k.down = false;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) k.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) k.right = false;
      if (['Space'].includes(e.code)) k.drift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Main 60FPS Game Loop & 3D Pseudo-3D Renderer
  useEffect(() => {
    if (gameState !== 'RACING' && gameState !== 'COUNTDOWN') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI scaling
    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        simRef.current.width = rect.width;
        simRef.current.height = rect.height;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gameLoop = () => {
      const s = simRef.current;
      const p = s.player;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = s.width;
      const height = s.height;

      s.time += 0.016;

      // -------------------------------------------------------------
      // 1. COUNTDOWN LOGIC
      // -------------------------------------------------------------
      if (gameState === 'COUNTDOWN') {
        if (s.countdownTimer === 180) {
          setCountdownVal('3');
          if (soundEnabled) sound.playCountdownBeep(false);
        } else if (s.countdownTimer === 120) {
          setCountdownVal('2');
          if (soundEnabled) sound.playCountdownBeep(false);
        } else if (s.countdownTimer === 60) {
          setCountdownVal('1');
          if (soundEnabled) sound.playCountdownBeep(false);
        } else if (s.countdownTimer === 0) {
          setCountdownVal('GO!');
          if (soundEnabled) sound.playCountdownBeep(true);
          setTimeout(() => {
            setCountdownVal('');
            setGameState('RACING');
          }, 600);
        }
        s.countdownTimer--;
      }

      // -------------------------------------------------------------
      // 2. RACING PHYSICS & INPUT HANDLING
      // -------------------------------------------------------------
      if (gameState === 'RACING') {
        p.raceTime += 0.016;
        p.timeRemaining -= 0.016;
        setTimeRemaining(Math.max(0, Math.ceil(p.timeRemaining)));

        if (p.timeRemaining <= 0) {
          finishRace(false);
          return;
        }

        // Merge Desktop keys + Mobile virtual controls
        const m = mobileControlsRef.current;
        const accelInput = s.keys.up || m.accel;
        const brakeInput = s.keys.down || m.brake;
        const leftInput = s.keys.left || m.left;
        const rightInput = s.keys.right || m.right;
        const driftInput = s.keys.drift || m.drift;

        // Steering sensitivity factor
        const steerFactor = sensitivity === 'HIGH' ? 1.25 : sensitivity === 'LOW' ? 0.8 : 1.0;
        const effectiveHandling = p.handling * steerFactor;

        // Acceleration & Braking
        const maxSpeedUnits = (p.maxSpeed / 215) * 24;

        if (accelInput) {
          p.speed += p.accel * (p.speed < maxSpeedUnits ? 1 : 0.2);
        } else if (brakeInput) {
          p.speed -= p.brake;
        } else {
          p.speed -= p.decel;
        }

        // Off-road shoulder friction penalty (if outside [-1, 1])
        const offRoad = Math.abs(p.x) > 1.0;
        if (offRoad && p.speed > maxSpeedUnits * 0.35) {
          p.speed -= p.decel * 3.5;
          s.screenShake = Math.min(4, s.screenShake + 0.3);

          // Sand spray particles
          if (Math.random() < 0.6) {
            s.particles.push({
              x: (width / 2) + (p.x * 120),
              y: height - 60,
              vx: (Math.random() - 0.5) * 4,
              vy: -2 - Math.random() * 4,
              size: 3 + Math.random() * 4,
              color: '#d97706',
              alpha: 0.8,
              life: 14,
              maxLife: 14
            });
          }
        }

        // Clamp speed
        p.speed = Math.max(0, Math.min(maxSpeedUnits, p.speed));
        const speedKmh = Math.floor((p.speed / 24) * p.maxSpeed);
        setPlayerSpeedKmh(speedKmh);

        // Update Web Audio Sound
        updateEngineAudio(p.speed / maxSpeedUnits, p.isDrifting);

        // Lateral Steering & Drifting
        const speedRatio = p.speed / maxSpeedUnits;
        let steerDelta = 0;

        if (leftInput) steerDelta -= effectiveHandling;
        if (rightInput) steerDelta += effectiveHandling;

        // Controlled Drifting Mechanism
        if (driftInput && speedRatio > 0.4 && (leftInput || rightInput)) {
          p.isDrifting = true;
          setIsDrifting(true);
          p.driftAngle += (Math.sign(steerDelta) * 0.35 - p.driftAngle) * 0.2;
          steerDelta *= 1.45 * p.driftFactor; // Sharper cornering in drift

          // Accumulate drift score
          p.driftScore += Math.floor(speedRatio * 15);
          setDriftScore(p.driftScore);

          // Drift camera tilt
          s.cameraTilt += (p.driftAngle * 0.15 - s.cameraTilt) * 0.15;

          // Tire dust & smoke particles
          for (let d = 0; d < 2; d++) {
            s.particles.push({
              x: (width / 2) + (p.driftAngle > 0 ? -40 : 40) + (Math.random() - 0.5) * 20,
              y: height - 65,
              vx: -p.driftAngle * 6 + (Math.random() - 0.5) * 2,
              vy: -1 - Math.random() * 2,
              size: 4 + Math.random() * 5,
              color: Math.random() < 0.6 ? '#f59e0b' : '#fbbf24',
              alpha: 0.9,
              life: 16,
              maxLife: 16
            });
          }
        } else {
          p.isDrifting = false;
          setIsDrifting(false);
          p.driftAngle *= 0.8;
          s.cameraTilt *= 0.85;
        }

        // Apply steering scaled by speed ratio
        p.x += steerDelta * speedRatio * 1.25;

        // Road curvature centrifugal force
        const currentSegmentIndex = Math.floor((p.z / SEGMENT_LENGTH) % s.segments.length);
        const currentSegment = s.segments[currentSegmentIndex];
        if (currentSegment) {
          p.x -= currentSegment.curve * speedRatio * 0.04;
        }

        // Clamp player X so they don't wander off infinity
        p.x = Math.max(-2.4, Math.min(2.4, p.x));

        // Advance along track
        p.z += p.speed * 20;

        // Suspension bounce
        p.bounce = Math.sin(s.time * 28) * Math.min(3, speedRatio * 2.5);

        // Checkpoint & Lap Detection
        const cpInterval = Math.floor(s.segments.length / (selectedTrack.checkpointsPerLap || 3));
        const currentCp = Math.floor((p.z % s.trackLength) / (cpInterval * SEGMENT_LENGTH));

        if (currentCp !== p.checkpointIndex && currentCp > 0) {
          p.checkpointIndex = currentCp;
          p.totalCheckpointsPassed++;
          // Add bonus time!
          p.timeRemaining = Math.min(99, p.timeRemaining + 15);
          if (soundEnabled) sound.playPowerUp();
          setCheckpointBanner(`CHECKPOINT PASSED! +15 SEC`);
          setTimeout(() => setCheckpointBanner(null), 2500);
          setCheckpointText(`0${currentCp} / 0${selectedTrack.checkpointsPerLap}`);
        }

        // Lap Complete Detection
        if (p.z >= s.trackLength) {
          p.z -= s.trackLength;
          p.checkpointIndex = 0;
          p.lap++;
          setPlayerLap(p.lap);

          if (p.lap > selectedTrack.laps) {
            finishRace(true);
            return;
          } else {
            if (soundEnabled) sound.playLaser(1300);
            setCheckpointBanner(`LAP ${p.lap} / ${selectedTrack.laps}`);
            setTimeout(() => setCheckpointBanner(null), 2500);
          }
        }

        // -------------------------------------------------------------
        // 3. UPDATE AI OPPONENTS
        // -------------------------------------------------------------
        let currentPos = 1;
        s.aiCars.forEach(ai => {
          // AI speed fluctuates slightly for realism
          ai.z += ai.speed * 20;
          if (ai.z >= s.trackLength) {
            ai.z -= s.trackLength;
            ai.lap++;
          }

          // AI steers gently towards track center or gentle lane offset
          ai.x += (Math.sin(s.time * 1.5 + ai.id) * 0.4 - ai.x) * 0.05;

          // Compute race standing relative to player
          const playerTotalDist = (p.lap - 1) * s.trackLength + p.z;
          const aiTotalDist = (ai.lap - 1) * s.trackLength + ai.z;
          if (aiTotalDist > playerTotalDist) {
            currentPos++;
          }
        });

        p.position = currentPos;
        setPlayerPosition(currentPos);
      }

      // -------------------------------------------------------------
      // 4. UPDATE PARTICLES
      // -------------------------------------------------------------
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        pt.alpha = pt.life / pt.maxLife;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // -------------------------------------------------------------
      // 5. 3D PSEUDO-3D PROJECTION & RENDERING PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);

      // Camera shake translation
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.3);
      }

      // Camera tilt on drift
      if (Math.abs(s.cameraTilt) > 0.005) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate(s.cameraTilt);
        ctx.translate(-width / 2, -height / 2);
      }

      // 5A. Sky Gradient & Desert Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
      const colors = selectedTrack.skyGradient;
      skyGrad.addColorStop(0, colors[0]);
      skyGrad.addColorStop(0.5, colors[1]);
      skyGrad.addColorStop(1, colors[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.55);

      // Distant Desert Sun / Golden Light
      const sunGrad = ctx.createRadialGradient(width * 0.65, height * 0.28, 10, width * 0.65, height * 0.28, 160);
      sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
      sunGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.45)');
      sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(width * 0.65, height * 0.28, 160, 0, Math.PI * 2);
      ctx.fill();

      // Distant Rocky Mountains / Mesa Silhouettes
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.55);
      ctx.lineTo(width * 0.15, height * 0.46);
      ctx.lineTo(width * 0.28, height * 0.52);
      ctx.lineTo(width * 0.45, height * 0.42);
      ctx.lineTo(width * 0.62, height * 0.5);
      ctx.lineTo(width * 0.78, height * 0.44);
      ctx.lineTo(width * 0.92, height * 0.51);
      ctx.lineTo(width, height * 0.48);
      ctx.lineTo(width, height * 0.55);
      ctx.closePath();
      ctx.fill();

      // Desert Sand Ground
      ctx.fillStyle = '#ba6e2c';
      ctx.fillRect(0, height * 0.55, width, height * 0.45);

      // 5B. 3D Road Segments Projection
      const baseSegmentIndex = Math.floor(p.z / SEGMENT_LENGTH);
      const cameraX = p.x * ROAD_WIDTH;
      const cameraY = CAMERA_HEIGHT + p.y;
      const cameraZ = p.z;

      let maxY = height; // Occlusion horizon clipper

      const projectedSegments: Segment[] = [];

      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const segIdx = (baseSegmentIndex + n) % s.segments.length;
        const segment = s.segments[segIdx];
        if (!segment) continue;

        const loopOffset = (baseSegmentIndex + n >= s.segments.length) ? s.trackLength : 0;

        // Project p1
        const p1WorldZ = segment.p1.world.z + loopOffset - cameraZ;
        if (p1WorldZ <= 0) continue;
        const p1Scale = (CAMERA_DEPTH / p1WorldZ) * (height / 2);
        segment.p1.screen = {
          x: Math.round((width / 2) + (p1Scale * (segment.p1.world.x - cameraX))),
          y: Math.round((height * 0.55) - (p1Scale * (segment.p1.world.y - cameraY))),
          w: Math.round(p1Scale * ROAD_WIDTH),
          scale: p1Scale
        };

        // Project p2
        const p2WorldZ = segment.p2.world.z + loopOffset - cameraZ;
        if (p2WorldZ <= 0) continue;
        const p2Scale = (CAMERA_DEPTH / p2WorldZ) * (height / 2);
        segment.p2.screen = {
          x: Math.round((width / 2) + (p2Scale * (segment.p2.world.x - cameraX))),
          y: Math.round((height * 0.55) - (p2Scale * (segment.p2.world.y - cameraY))),
          w: Math.round(p2Scale * ROAD_WIDTH),
          scale: p2Scale
        };

        projectedSegments.push(segment);
      }

      // Draw Segments from back to front
      for (let n = projectedSegments.length - 1; n >= 0; n--) {
        const seg = projectedSegments[n];
        const p1 = seg.p1.screen;
        const p2 = seg.p2.screen;

        if (p1.y >= maxY || p1.y >= height || p2.y >= height) continue;

        // 1. Desert Terrain polygon
        ctx.fillStyle = seg.color.grass;
        ctx.fillRect(0, p2.y, width, p1.y - p2.y);

        // 2. Rumble Strips (Hazard Kerbs)
        const r1 = p1.w * 1.15;
        const r2 = p2.w * 1.15;
        ctx.fillStyle = seg.color.rumble;
        ctx.beginPath();
        ctx.moveTo(p1.x - r1, p1.y);
        ctx.lineTo(p1.x + r1, p1.y);
        ctx.lineTo(p2.x + r2, p2.y);
        ctx.lineTo(p2.x - r2, p2.y);
        ctx.closePath();
        ctx.fill();

        // 3. Main Asphalt Road
        ctx.fillStyle = seg.color.road;
        ctx.beginPath();
        ctx.moveTo(p1.x - p1.w, p1.y);
        ctx.lineTo(p1.x + p1.w, p1.y);
        ctx.lineTo(p2.x + p2.w, p2.y);
        ctx.lineTo(p2.x - p2.w, p2.y);
        ctx.closePath();
        ctx.fill();

        // 4. Center Lane Dashed Strip
        if (seg.color.lane !== 'transparent') {
          const lw1 = p1.w * 0.04;
          const lw2 = p2.w * 0.04;
          ctx.fillStyle = seg.color.lane;
          ctx.beginPath();
          ctx.moveTo(p1.x - lw1, p1.y);
          ctx.lineTo(p1.x + lw1, p1.y);
          ctx.lineTo(p2.x + lw2, p2.y);
          ctx.lineTo(p2.x - lw2, p2.y);
          ctx.closePath();
          ctx.fill();
        }

        // 5. Draw Roadside Props on this segment
        seg.sprites.forEach(spr => {
          const sprX = p1.x + (p1.w * spr.offset);
          const sprY = p1.y;
          const sprScale = p1.scale * 140;

          if (spr.type === 'cactus') {
            ctx.save();
            ctx.translate(sprX, sprY);
            ctx.fillStyle = '#15803d'; // Desert Saguaro Green
            ctx.strokeStyle = '#14532d';
            ctx.lineWidth = Math.max(1, sprScale * 0.05);

            // Trunk
            const cw = sprScale * 0.16;
            const ch = sprScale * 0.85;
            ctx.fillRect(-cw / 2, -ch, cw, ch);
            ctx.strokeRect(-cw / 2, -ch, cw, ch);

            // Left Arm
            ctx.fillRect(-cw * 1.4, -ch * 0.65, cw * 1.4, cw * 0.8);
            ctx.fillRect(-cw * 1.4, -ch * 0.85, cw * 0.8, ch * 0.35);

            // Right Arm
            ctx.fillRect(cw * 0.5, -ch * 0.5, cw * 1.4, cw * 0.8);
            ctx.fillRect(cw * 1.1, -ch * 0.75, cw * 0.8, ch * 0.35);
            ctx.restore();
          } else if (spr.type === 'rock') {
            ctx.save();
            ctx.translate(sprX, sprY);
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            const rw = sprScale * 0.4;
            const rh = sprScale * 0.3;
            ctx.moveTo(-rw, 0);
            ctx.lineTo(-rw * 0.6, -rh);
            ctx.lineTo(rw * 0.5, -rh * 0.8);
            ctx.lineTo(rw, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else if (spr.type === 'barrier') {
            ctx.save();
            ctx.translate(sprX, sprY);
            ctx.fillStyle = '#ef4444';
            const bw = sprScale * 0.45;
            const bh = sprScale * 0.3;
            ctx.fillRect(-bw / 2, -bh, bw, bh);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-bw / 2, -bh * 0.7, bw, bh * 0.4);
            ctx.restore();
          } else if (spr.type === 'checkpoint' || spr.type === 'finish') {
            // Massive 3D Archway crossing the entire road!
            ctx.save();
            ctx.translate(p1.x, sprY);

            const archW = p1.w * 1.35;
            const archH = p1.scale * 160;
            const pillarW = Math.max(4, p1.scale * 14);

            // Left & Right Pillars
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-archW, -archH, pillarW, archH);
            ctx.fillRect(archW - pillarW, -archH, pillarW, archH);

            // Top Header Gantry
            ctx.fillStyle = spr.type === 'finish' ? '#0f172a' : '#0369a1';
            ctx.fillRect(-archW, -archH, archW * 2, archH * 0.35);

            // Glowing Neon Sign
            ctx.fillStyle = spr.type === 'finish' ? '#f59e0b' : '#00f0ff';
            ctx.font = `bold ${Math.max(10, Math.floor(archH * 0.2))}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(spr.type === 'finish' ? 'FINISH LINE' : 'CHECKPOINT', 0, -archH * 0.75);
            ctx.restore();
          }
        });

        // 6. Draw AI Opponents sitting on this segment
        s.aiCars.forEach(ai => {
          const aiSeg = Math.floor((ai.z / SEGMENT_LENGTH) % s.segments.length);
          if (aiSeg === seg.index) {
            const aiX = p1.x + (p1.w * ai.x);
            const aiY = p1.y;
            const aiScale = p1.scale * 115;

            ctx.save();
            ctx.translate(aiX, aiY);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 0, aiScale * 0.45, aiScale * 0.15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Opponent Car Body
            ctx.fillStyle = ai.carModel.color;
            ctx.fillRect(-aiScale * 0.35, -aiScale * 0.4, aiScale * 0.7, aiScale * 0.35);

            // Roof / Canopy
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-aiScale * 0.22, -aiScale * 0.55, aiScale * 0.44, aiScale * 0.2);

            // Tail-lights
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-aiScale * 0.32, -aiScale * 0.25, aiScale * 0.14, aiScale * 0.08);
            ctx.fillRect(aiScale * 0.18, -aiScale * 0.25, aiScale * 0.14, aiScale * 0.08);

            // Driver Name Label
            ctx.fillStyle = '#f8fafc';
            ctx.font = `bold ${Math.max(9, Math.floor(aiScale * 0.18))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(ai.name, 0, -aiScale * 0.65);

            ctx.restore();
          }
        });

        maxY = p1.y;
      }

      // -------------------------------------------------------------
      // 5C. DRAW PLAYER CAR IN FOREGROUND
      // -------------------------------------------------------------
      const carScreenX = width / 2;
      const carScreenY = height - 70 + p.bounce;
      const carW = 160;
      const carH = 88;

      ctx.save();
      ctx.translate(carScreenX, carScreenY);
      ctx.rotate(p.driftAngle * 0.8);

      // Car Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 14, carW * 0.52, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Large Desert Off-Road Tires
      ctx.fillStyle = '#0a0a0a';
      // Left Rear Tire
      ctx.fillRect(-carW * 0.54, -20, 32, 48);
      // Right Rear Tire
      ctx.fillRect(carW * 0.54 - 32, -20, 32, 48);
      // Front Tires (Angle during turns)
      const steerAngle = (s.keys.left || mobileControlsRef.current.left) ? -0.25 : (s.keys.right || mobileControlsRef.current.right) ? 0.25 : 0;
      ctx.save();
      ctx.translate(-carW * 0.45, -carH * 0.6);
      ctx.rotate(steerAngle);
      ctx.fillRect(-10, -18, 20, 38);
      ctx.restore();

      ctx.save();
      ctx.translate(carW * 0.45, -carH * 0.6);
      ctx.rotate(steerAngle);
      ctx.fillRect(-10, -18, 20, 38);
      ctx.restore();

      // Main Off-road Chassis (Sporty futuristic body)
      ctx.fillStyle = selectedCar.color;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-carW * 0.44, -carH * 0.5, carW * 0.88, carH * 0.65, 8);
      ctx.fill();
      ctx.stroke();

      // Center Racing Stripe
      ctx.fillStyle = selectedCar.stripeColor;
      ctx.fillRect(-14, -carH * 0.5, 28, carH * 0.65);

      // Rollcage / Cabin Roof
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-carW * 0.26, -carH * 0.82, carW * 0.52, carH * 0.42, 6);
      ctx.fill();

      // Tinted Rear Window Visor
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(-carW * 0.2, -carH * 0.74, carW * 0.4, carH * 0.18);
      ctx.shadowBlur = 0;

      // Illuminated Dual LED Tail-lights
      ctx.fillStyle = (s.keys.down || mobileControlsRef.current.brake) ? '#ef4444' : '#dc2626';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillRect(-carW * 0.38, -carH * 0.12, 34, 12);
      ctx.fillRect(carW * 0.38 - 34, -carH * 0.12, 34, 12);
      ctx.shadowBlur = 0;

      // Exhaust Boost Flames on throttle
      if (s.keys.up || mobileControlsRef.current.accel) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.ellipse(-24, 14, 6, 12 + Math.random() * 8, 0, 0, Math.PI * 2);
        ctx.ellipse(24, 14, 6, 12 + Math.random() * 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // 5D. Render Dust / Smoke / Sparks Particles
      s.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [
    gameState,
    finishRace,
    selectedCar,
    selectedTrack,
    sensitivity,
    soundEnabled,
    updateEngineAudio
  ]);

  // -------------------------------------------------------------
  // RENDER INTERFACES: MENUS, GARAGE, HUD, RESULTS
  // -------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] bg-[#05070d] text-white font-sans overflow-hidden select-none touch-none"
    >
      {/* 3D Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-default"
      />

      {/* TOP HEADER CONTROLS (Only in interactive menus or in-game) */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <button
          onClick={() => {
            sound.playClick();
            if (gameState === 'MAIN_MENU') {
              if (onBack) onBack();
            } else {
              setGameState('MAIN_MENU');
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 text-xs font-semibold transition-colors cursor-pointer"
          title="Back to Menu"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {gameState === 'RACING' && (
          <button
            onClick={() => {
              sound.playClick();
              setGameState('PAUSED');
            }}
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 transition-colors cursor-pointer"
            title="Pause Game (Esc)"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            sound.toggleMute();
          }}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 transition-colors cursor-pointer"
          title="Toggle Audio"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/90 transition-colors cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 1. START / MAIN MENU */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'MAIN_MENU' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between p-6 sm:p-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
          {/* Top Title Area */}
          <div className="mt-8 sm:mt-12 text-center animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono tracking-widest uppercase mb-3">
              <Compass className="w-3.5 h-3.5" /> High-Speed Off-Road Racing
            </div>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500 drop-shadow-lg">
              DESERT RACER
            </h1>
            <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-amber-300/80 mt-1">
              CONQUER THE DUNES
            </p>
          </div>

          {/* Selected Loadout Preview Banner */}
          <div className="flex items-center gap-4 px-5 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-amber-500/30">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCar.color }} />
            <div className="text-left">
              <div className="text-xs text-white/50 uppercase font-mono">Current Vehicle</div>
              <div className="text-sm font-bold text-white tracking-wide">{selectedCar.name}</div>
            </div>
            <div className="h-6 w-px bg-white/15 mx-1" />
            <div className="text-left">
              <div className="text-xs text-white/50 uppercase font-mono">Track</div>
              <div className="text-sm font-bold text-amber-400 tracking-wide">{selectedTrack.subtitle}</div>
            </div>
          </div>

          {/* Menu Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md sm:max-w-lg mb-6">
            <button
              onClick={startRace}
              className="w-full sm:flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black tracking-wider uppercase text-base flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              PLAY
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setGameState('RACE_SELECT');
              }}
              className="w-full sm:w-auto py-4 px-6 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white font-bold tracking-wider uppercase text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Flag className="w-4 h-4 text-amber-400" />
              RACES
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setGameState('GARAGE');
              }}
              className="w-full sm:w-auto py-4 px-6 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white font-bold tracking-wider uppercase text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Car className="w-4 h-4 text-cyan-400" />
              GARAGE
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setShowSettings(true);
              }}
              className="w-full sm:w-auto py-4 px-4 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white transition-all cursor-pointer"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-white/80" />
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 2. RACE SELECT MENU */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'RACE_SELECT' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 bg-black/85 backdrop-blur-lg overflow-y-auto">
          <div className="max-w-5xl w-full mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight text-amber-400">
                  SELECT RACE
                </h2>
                <p className="text-xs sm:text-sm text-white/60">Choose your desert racing challenge</p>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-wider"
              >
                Back
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TRACKS.map(track => {
                const isSelected = selectedTrack.id === track.id;
                const best = localStorage.getItem(track.bestTimeKey);
                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedTrack(track);
                    }}
                    className={`relative p-5 rounded-2xl cursor-pointer transition-all border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-white/50">{track.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            track.difficulty === 'EASY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : track.difficulty === 'NORMAL'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {track.difficulty}
                        </span>
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-white mb-3">{track.subtitle}</h3>

                      <div className="space-y-1.5 text-xs text-white/70 font-mono mb-4">
                        <div className="flex justify-between">
                          <span>DISTANCE</span>
                          <span className="text-white font-bold">{track.distanceKm} KM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>LAPS</span>
                          <span className="text-white font-bold">{track.laps} LAPS</span>
                        </div>
                        <div className="flex justify-between">
                          <span>BEST TIME</span>
                          <span className="text-amber-400 font-bold">{best ? formatTime(parseFloat(best)) : '--:--'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedTrack(track);
                        startRace();
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      RACE NOW
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 3. GARAGE SCREEN */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'GARAGE' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 bg-black/85 backdrop-blur-lg overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight text-cyan-400">
                  VEHICLE GARAGE
                </h2>
                <p className="text-xs sm:text-sm text-white/60">Select your racing vehicle</p>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold uppercase tracking-wider"
              >
                Back
              </button>
            </div>

            {/* Selected Car Display */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/15 mb-6 flex flex-col sm:flex-row items-center gap-6">
              {/* Car Visual Indicator Badge */}
              <div className="w-32 h-32 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-inner relative" style={{ backgroundColor: selectedCar.color }}>
                <Car className="w-16 h-16 text-black/80" />
                <div className="absolute bottom-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono font-bold text-white">
                  {selectedCar.topSpeed} KM/H
                </div>
              </div>

              {/* Stats Bars */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">{selectedCar.name}</h3>
                  <p className="text-xs text-amber-400 font-medium">{selectedCar.tagline}</p>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="flex justify-between mb-1 text-white/70">
                      <span>TOP SPEED</span>
                      <span className="text-white font-bold">{selectedCar.stats.speed}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${selectedCar.stats.speed}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-white/70">
                      <span>ACCELERATION</span>
                      <span className="text-white font-bold">{selectedCar.stats.accel}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${selectedCar.stats.accel}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-white/70">
                      <span>HANDLING</span>
                      <span className="text-white font-bold">{selectedCar.stats.handling}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${selectedCar.stats.handling}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1 text-white/70">
                      <span>DRIFT</span>
                      <span className="text-white font-bold">{selectedCar.stats.drift}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-rose-400 rounded-full" style={{ width: `${selectedCar.stats.drift}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Car Selection Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {CARS.map(c => {
                const isSelected = selectedCar.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedCar(c);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md mb-2" style={{ backgroundColor: c.color }} />
                    <div className="text-xs font-bold text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-white/50 font-mono">{c.topSpeed} KM/H</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 4. COUNTDOWN OVERLAY */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'COUNTDOWN' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-7xl sm:text-9xl font-black italic tracking-tighter text-amber-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.8)]">
              {countdownVal}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 5. IN-GAME RACING HUD */}
      {/* ----------------------------------------------------------- */}
      {(gameState === 'RACING' || gameState === 'COUNTDOWN') && (
        <div className="absolute inset-0 z-10 pointer-events-none p-4 sm:p-6 flex flex-col justify-between">
          {/* TOP HUD BAR */}
          <div className="flex items-start justify-between">
            {/* Top Left: POSITION & LAP */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                <div className="text-[10px] text-white/50 font-mono uppercase">POSITION</div>
                <div className="text-2xl sm:text-3xl font-black italic text-amber-400">
                  {playerPosition} <span className="text-sm font-normal text-white/50">/ 6</span>
                </div>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/15">
                <div className="text-[10px] text-white/50 font-mono uppercase">LAP</div>
                <div className="text-2xl sm:text-3xl font-black italic text-white">
                  {playerLap} <span className="text-sm font-normal text-white/50">/ {selectedTrack.laps}</span>
                </div>
              </div>
            </div>

            {/* Top Center: CHECKPOINT BANNER */}
            <div className="text-center">
              <div className="px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 inline-block">
                <div className="text-[10px] text-white/50 font-mono uppercase">CHECKPOINT</div>
                <div className="text-sm font-bold text-cyan-400 font-mono">{checkpointText}</div>
              </div>

              {checkpointBanner && (
                <div className="mt-2 px-4 py-1 rounded-full bg-amber-500 text-black font-black text-xs uppercase tracking-wider animate-bounce shadow-lg">
                  {checkpointBanner}
                </div>
              )}
            </div>

            {/* Top Right: TIME REMAINING */}
            <div className="text-right">
              <div className="px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 inline-block">
                <div className="text-[10px] text-white/50 font-mono uppercase flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3 text-rose-400" /> TIME REMAINING
                </div>
                <div className={`text-2xl sm:text-3xl font-black font-mono italic ${timeRemaining <= 10 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>
                  {timeRemaining}s
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM HUD BAR */}
          <div className="flex items-end justify-between">
            {/* Bottom Left: DRIFT SCORE */}
            <div>
              {driftScore > 0 && (
                <div className="px-3.5 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-amber-500/30 inline-block">
                  <div className="text-[10px] text-amber-400/80 font-mono uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> DRIFT SCORE
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono">
                    +{driftScore}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Right: PREMIUM SPEEDOMETER */}
            <div className="px-4 py-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 text-right flex items-center gap-3">
              <Gauge className="w-7 h-7 text-amber-400 animate-pulse" />
              <div>
                <div className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white font-mono leading-none">
                  {playerSpeedKmh}
                </div>
                <div className="text-[10px] font-bold text-amber-400/80 font-mono tracking-widest uppercase">
                  KM/H
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 6. MOBILE VIRTUAL CONTROLS */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'RACING' && isTouchDevice && (
        <div className="absolute inset-x-0 bottom-3 z-30 flex items-center justify-between px-4 pointer-events-auto">
          {/* Left Side: STEERING CONTROLS */}
          <div className="flex items-center gap-3">
            <button
              onTouchStart={e => {
                e.preventDefault();
                mobileControlsRef.current.left = true;
              }}
              onTouchEnd={e => {
                e.preventDefault();
                mobileControlsRef.current.left = false;
              }}
              className="w-16 h-16 rounded-2xl bg-black/60 active:bg-amber-500/30 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>

            <button
              onTouchStart={e => {
                e.preventDefault();
                mobileControlsRef.current.right = true;
              }}
              onTouchEnd={e => {
                e.preventDefault();
                mobileControlsRef.current.right = false;
              }}
              className="w-16 h-16 rounded-2xl bg-black/60 active:bg-amber-500/30 backdrop-blur-md border border-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>

          {/* Right Side: THROTTLE, BRAKE, DRIFT */}
          <div className="flex items-center gap-3">
            <button
              onTouchStart={e => {
                e.preventDefault();
                mobileControlsRef.current.drift = true;
              }}
              onTouchEnd={e => {
                e.preventDefault();
                mobileControlsRef.current.drift = false;
              }}
              className="w-14 h-14 rounded-2xl bg-rose-500/20 active:bg-rose-500/40 backdrop-blur-md border border-rose-500/30 text-rose-300 font-bold text-xs uppercase flex items-center justify-center active:scale-95 transition-transform"
            >
              DRIFT
            </button>

            <button
              onTouchStart={e => {
                e.preventDefault();
                mobileControlsRef.current.brake = true;
              }}
              onTouchEnd={e => {
                e.preventDefault();
                mobileControlsRef.current.brake = false;
              }}
              className="w-16 h-16 rounded-2xl bg-red-600/30 active:bg-red-600/50 backdrop-blur-md border border-red-500/40 text-red-300 flex items-center justify-center active:scale-95 transition-transform"
            >
              <ArrowDown className="w-7 h-7" />
            </button>

            <button
              onTouchStart={e => {
                e.preventDefault();
                mobileControlsRef.current.accel = true;
              }}
              onTouchEnd={e => {
                e.preventDefault();
                mobileControlsRef.current.accel = false;
              }}
              className="w-18 h-18 rounded-2xl bg-gradient-to-t from-amber-600 to-orange-500 active:from-amber-500 active:to-orange-400 text-black flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-amber-500/30 font-black"
            >
              <ArrowUp className="w-8 h-8 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 7. PAUSE OVERLAY */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-neutral-900 border border-white/15 text-center">
            <h3 className="text-2xl font-black italic tracking-tight text-amber-400 mb-1">
              DESERT RACER
            </h3>
            <p className="text-xs text-white/50 uppercase font-mono mb-6">GAME PAUSED</p>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('RACING');
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold uppercase tracking-wider text-sm transition-colors"
              >
                RESUME
              </button>

              <button
                onClick={startRace}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-sm transition-colors"
              >
                RESTART
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-sm transition-colors"
              >
                SETTINGS
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold uppercase tracking-wider text-xs transition-colors"
              >
                EXIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 8. RACE FINISH / RESULTS OVERLAY */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'RACE_COMPLETE' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-neutral-900 border border-amber-500/30 text-center animate-fadeIn">
            <Trophy className="w-14 h-14 text-amber-400 mx-auto mb-2 animate-bounce" />
            <h3 className="text-3xl font-black italic tracking-tight text-white mb-1">
              RACE COMPLETE
            </h3>
            <p className="text-xs text-amber-400 uppercase font-mono tracking-widest mb-6">
              PODIUM FINISH
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 text-left font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/50">POSITION</div>
                <div className="text-xl font-bold text-amber-400">
                  {raceResult.position === 1 ? '1ST' : raceResult.position === 2 ? '2ND' : `${raceResult.position}TH`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/50">RACE TIME</div>
                <div className="text-xl font-bold text-white">{raceResult.timeStr}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/50">BEST TIME</div>
                <div className="text-xl font-bold text-cyan-400">{raceResult.bestTimeStr}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/50">SCORE</div>
                <div className="text-xl font-bold text-emerald-400">{raceResult.score}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={startRace}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black uppercase tracking-wider text-sm shadow-lg shadow-orange-500/20 hover:opacity-90 transition-opacity"
              >
                RACE AGAIN
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  const nextTrackIdx = (TRACKS.findIndex(t => t.id === selectedTrack.id) + 1) % TRACKS.length;
                  setSelectedTrack(TRACKS[nextTrackIdx]);
                  setGameState('RACE_SELECT');
                }}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold uppercase tracking-wider text-sm transition-colors"
              >
                NEXT RACE
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold uppercase tracking-wider text-xs transition-colors"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 9. RACE FAILED OVERLAY */}
      {/* ----------------------------------------------------------- */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-neutral-900 border border-rose-500/30 text-center animate-fadeIn">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
            <h3 className="text-3xl font-black italic tracking-tight text-white mb-1">
              RACE FAILED
            </h3>
            <p className="text-xs text-rose-400 uppercase font-mono tracking-widest mb-6">
              TIME EXPIRED
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6 text-left font-mono">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/50">DISTANCE</div>
                <div className="text-lg font-bold text-white">{raceResult.timeStr}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-white/50">SCORE</div>
                <div className="text-lg font-bold text-amber-400">{raceResult.score}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={startRace}
                className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider text-sm transition-colors"
              >
                RETRY
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold uppercase tracking-wider text-xs transition-colors"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 10. SETTINGS MODAL */}
      {/* ----------------------------------------------------------- */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-neutral-900 border border-white/15">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white uppercase tracking-wider">SETTINGS</h3>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSettings(false);
                }}
                className="text-white/60 hover:text-white text-xs font-mono font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/80">SOUND FX</span>
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    sound.toggleMute();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                    soundEnabled ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Music Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/80">ENGINE AUDIO</span>
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                    musicEnabled ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Sensitivity */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/80">STEERING</span>
                <div className="flex gap-1">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setSensitivity(lvl)}
                      className={`px-2 py-1 rounded text-[10px] font-bold font-mono ${
                        sensitivity === lvl ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-white/80">QUALITY</span>
                <div className="flex gap-1">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setQuality(lvl)}
                      className={`px-2 py-1 rounded text-[10px] font-bold font-mono ${
                        quality === lvl ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setShowSettings(false);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase tracking-wider"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
