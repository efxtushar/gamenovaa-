import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
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
  Compass,
  Coins,
  User,
  Flame,
  Wrench,
  RefreshCw,
  X
} from 'lucide-react';

import {
  heroBg,
  CARS,
  TRACKS,
  CarModel,
  RaceTrack,
  Segment,
  AICar,
  Particle,
  UpgradeLevels
} from './desert-racer/types';
import { MenuDustCanvas } from './desert-racer/MenuDustCanvas';
import { GarageShowcaseCanvas } from './desert-racer/GarageShowcaseCanvas';
import { DesertRacerHUD } from './desert-racer/DesertRacerHUD';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

const SEGMENT_LENGTH = 160;
const TRACK_SEGMENTS_COUNT = 1000;
const ROAD_WIDTH = 2400;
const CAMERA_HEIGHT = 1050;
const CAMERA_DEPTH = 0.84; // Field of view scaling
const DRAW_DISTANCE = 180; // Segments ahead to draw
const CHECKPOINT_SEGMENTS = [100, 200, 300, 400, 480, 580, 660, 740, 820, 920];

export const DesertRacerGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { profile, username, submitScore } = useAuth();

  // Navigation & High-Level Game State
  const [gameState, setGameState] = useState<
    'MAIN_MENU' | 'RACE_SELECT' | 'GARAGE' | 'COUNTDOWN' | 'RACING' | 'PAUSED' | 'RACE_COMPLETE' | 'GAME_OVER'
  >('MAIN_MENU');
  const [showSettings, setShowSettings] = useState(false);
  const [showControlsGuide, setShowControlsGuide] = useState(false);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(!sound.getIsMuted());
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selection
  const [selectedCar, setSelectedCar] = useState<CarModel>(CARS[0]);
  const [selectedTrack, setSelectedTrack] = useState<RaceTrack>(TRACKS[0]);

  // Persistent Free In-Game Currency & Vehicle Upgrades
  const [coins, setCoins] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('desert_racer_coins');
      if (saved !== null) return parseInt(saved, 10);
    } catch {}
    return 1500; // Starting bonus so player can test vehicle tuning immediately
  });

  const [carUpgrades, setCarUpgrades] = useState<UpgradeLevels>(() => {
    try {
      const saved = localStorage.getItem('desert_racer_upgrades');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'dune-raider': 1,
      'sandstorm-gt': 0,
      'apex-buggy': 0,
      'titan-4x4': 0,
      'cyber-phantom': 0
    };
  });

  // Save coins & upgrades
  useEffect(() => {
    try {
      localStorage.setItem('desert_racer_coins', coins.toString());
    } catch {}
  }, [coins]);

  useEffect(() => {
    try {
      localStorage.setItem('desert_racer_upgrades', JSON.stringify(carUpgrades));
    } catch {}
  }, [carUpgrades]);

  // Race Live HUD Stats
  const [playerSpeedKmh, setPlayerSpeedKmh] = useState(0);
  const [playerLap, setPlayerLap] = useState(1);
  const [playerPosition, setPlayerPosition] = useState(4);
  const [checkpointText, setCheckpointText] = useState('01 / 03');
  const [timeRemaining, setTimeRemaining] = useState(65);
  const [driftScore, setDriftScore] = useState(0);
  const [currentDriftCombo, setCurrentDriftCombo] = useState(0);
  const [driftMultiplier, setDriftMultiplier] = useState(1.0);
  const [isDrifting, setIsDrifting] = useState(false);
  const [boostRemaining, setBoostRemaining] = useState(100);
  const [isBoosting, setIsBoosting] = useState(false);
  const [countdownVal, setCountdownVal] = useState<'3' | '2' | '1' | 'GO!' | ''>('');
  const [checkpointBanner, setCheckpointBanner] = useState<string | null>(null);
  const [checkpointDistanceMeters, setCheckpointDistanceMeters] = useState<number | null>(null);
  const [raceTimeFormatted, setRaceTimeFormatted] = useState('00:00.00');
  const [bestTimeFormatted, setBestTimeFormatted] = useState('--:--');
  const [trackProgress, setTrackProgress] = useState(0);
  const [aiProgressList, setAiProgressList] = useState<{ id: number; progress: number; color: string }[]>([]);
  const [objectiveText, setObjectiveText] = useState('REACH CHECKPOINT BEFORE TIME RUNS OUT');

  const [raceResult, setRaceResult] = useState<{
    position: number;
    timeStr: string;
    bestTimeStr: string;
    score: number;
    driftScore: number;
    earnedCoins: number;
    isNewRecord: boolean;
  }>({
    position: 1,
    timeStr: '00:00.00',
    bestTimeStr: '--:--',
    score: 0,
    driftScore: 0,
    earnedCoins: 0,
    isNewRecord: false
  });

  // Mobile virtual touch controls state
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const mobileControlsRef = useRef({
    left: false,
    right: false,
    accel: false,
    brake: false,
    drift: false,
    boost: false
  });

  // Check touch device
  useEffect(() => {
    const checkTouch = () => {
      const isTouch = 'ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0);
      const isMobileWidth = window.innerWidth < 1024;
      setIsTouchDevice(isTouch || isMobileWidth);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Synthesizer for continuous engine RPM and tire skid audio
  const engineAudioRef = useRef<{
    ctx: AudioContext | null;
    osc: OscillatorNode | null;
    gain: GainNode | null;
    skidOsc: OscillatorNode | null;
    skidGain: GainNode | null;
  }>({ ctx: null, osc: null, gain: null, skidOsc: null, skidGain: null });

  // Compute effective stats for any car based on upgrade tier
  const getEffectiveCarStats = useCallback((car: CarModel, tier: number) => {
    const boost = tier * 0.035; // +3.5% per tier
    const durabilityBoost = tier * 4; // +4 durability per tier
    return {
      topSpeed: Math.round(car.topSpeed * (1 + boost)),
      accel: car.accel * (1 + boost),
      handling: car.handling * (1 + boost),
      drift: car.drift * (1 + boost),
      durability: Math.min(100, car.durability + durabilityBoost),
      stats: {
        speed: Math.min(100, Math.round(car.stats.speed + tier * 4)),
        accel: Math.min(100, Math.round(car.stats.accel + tier * 4)),
        handling: Math.min(100, Math.round(car.stats.handling + tier * 4)),
        drift: Math.min(100, Math.round(car.stats.drift + tier * 4)),
        braking: Math.min(100, Math.round((car.stats.braking ?? 85) + tier * 4)),
        durability: Math.min(100, Math.round(car.durability + durabilityBoost))
      }
    };
  }, []);

  // Core Simulation Ref for 60FPS lock
  const simRef = useRef({
    time: 0,
    width: 1280,
    height: 720,
    screenShake: 0,
    cameraTilt: 0,
    segments: [] as Segment[],
    trackLength: TRACK_SEGMENTS_COUNT * SEGMENT_LENGTH,
    totalRacers: 5,
    player: {
      x: 0.35, // Starts on Grid 4
      y: 0,
      vy: 0,
      inAir: false,
      z: 120,
      speed: 0,
      maxSpeed: 215,
      accel: 0.165,
      decel: 0.08,
      brake: 0.28,
      steer: 0,
      handling: 0.055,
      driftFactor: 0.85,
      durability: 82,
      isDrifting: false,
      isBraking: false,
      isBoosting: false,
      boostRemaining: 100,
      boostPower: 45,
      driftAngle: 0,
      driftScore: 0,
      currentDriftCombo: 0,
      driftMultiplier: 1.0,
      bounce: 0,
      bumpCooldown: 0,
      lap: 1,
      checkpointIndex: 0,
      totalCheckpointsPassed: 0,
      timeRemaining: 65,
      raceTime: 0,
      finished: false,
      position: 4
    },
    aiCars: [] as AICar[],
    ambientDust: [] as { x: number; y: number; vx: number; vy: number; length: number; alpha: number }[],
    particles: [] as Particle[],
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      drift: false,
      boost: false
    },
    countdownTimer: 0
  });

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    sound.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Web Audio Synthesizer Controls
  const initEngineAudio = useCallback(() => {
    if (!soundEnabled || sound.getIsMuted()) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, ctx.currentTime);
      gain.gain.setValueAtTime(0.045, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      const skidOsc = ctx.createOscillator();
      const skidGain = ctx.createGain();
      skidOsc.type = 'triangle';
      skidOsc.frequency.setValueAtTime(360, ctx.currentTime);
      skidGain.gain.setValueAtTime(0, ctx.currentTime);

      skidOsc.connect(skidGain);
      skidGain.connect(ctx.destination);
      skidOsc.start();

      engineAudioRef.current = { ctx, osc, gain, skidOsc, skidGain };
    } catch {}
  }, [soundEnabled]);

  const stopEngineAudio = useCallback(() => {
    try {
      const { ctx, osc, skidOsc } = engineAudioRef.current;
      if (osc) osc.stop();
      if (skidOsc) skidOsc.stop();
      if (ctx && ctx.state !== 'closed') ctx.close();
      engineAudioRef.current = { ctx: null, osc: null, gain: null, skidOsc: null, skidGain: null };
    } catch {}
  }, []);

  const updateEngineAudio = useCallback(
    (speedRatio: number, isDriftingNow: boolean) => {
      const { ctx, osc, skidOsc, skidGain } = engineAudioRef.current;
      if (!ctx || !osc || !soundEnabled || sound.getIsMuted()) return;

      try {
        const freq = 60 + speedRatio * 320;
        osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.08);

        if (skidGain && skidOsc) {
          if (isDriftingNow && speedRatio > 0.35) {
            skidGain.gain.setTargetAtTime(0.12, ctx.currentTime, 0.05);
            skidOsc.frequency.setTargetAtTime(320 + Math.random() * 80, ctx.currentTime, 0.05);
          } else {
            skidGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
          }
        }
      } catch {}
    },
    [soundEnabled]
  );

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
    const total = TRACK_SEGMENTS_COUNT; // 1000 segments

    let curY = 0;

    for (let i = 0; i < total; i++) {
      const z1 = i * SEGMENT_LENGTH;
      const z2 = (i + 1) * SEGMENT_LENGTH;

      let curve = 0;
      let hill = 0;

      // ─────────────────────────────────────────────────────────────
      // CLOSED-LOOP DESERT RACING CIRCUIT GEOMETRY
      // 0 - 55: Start Grid / Straight
      // 55 - 180: Sweeping Left Turn → CHECKPOINT 1 (seg 180)
      // 180 - 320: Canyon Sweep & Crest → CHECKPOINT 2 (seg 320)
      // 320 - 460: Technical Bends → CHECKPOINT 3 (seg 460)
      // 460 - 620: Braking Zone & 180° Technical HAIRPIN
      // 620 - 760: Approach & Rapid Left-Right S-CURVE (CHICANE)
      // 760 - 860: Elevation DUNE JUMP RAMP
      // 860 - 999: FINAL STRAIGHT → FINISH LINE (seg 0)
      // ─────────────────────────────────────────────────────────────

      // Curvature Profile
      if (i >= 65 && i <= 145) {
        // Sector 1: Sweeping Left Turn leading towards Checkpoint 1
        curve = -Math.sin(((i - 65) / 80) * Math.PI) * 3.2 * track.curveFrequency;
      } else if (i >= 220 && i <= 290) {
        // Sector 2: Sweeping Right Bend leading towards Checkpoint 2
        curve = Math.sin(((i - 220) / 70) * Math.PI) * 3.4 * track.curveFrequency;
      } else if (i >= 335 && i <= 415) {
        // Sector 3: Technical Left Bend leading towards Checkpoint 3
        curve = -Math.sin(((i - 335) / 80) * Math.PI) * 2.9 * track.curveFrequency;
      } else if (i >= 495 && i <= 600) {
        // Sector 4: THE 180° TECHNICAL RIGHT HAIRPIN!
        curve = Math.sin(((i - 495) / 105) * Math.PI) * 5.8 * track.curveFrequency;
      } else if (i >= 640 && i <= 690) {
        // Sector 5: S-CURVE / CHICANE — Part 1: Rapid Sharp Left
        curve = -Math.sin(((i - 640) / 50) * Math.PI) * 4.6 * track.curveFrequency;
      } else if (i >= 690 && i <= 740) {
        // Sector 5: S-CURVE / CHICANE — Part 2: Rapid Sharp Right
        curve = Math.sin(((i - 690) / 50) * Math.PI) * 4.6 * track.curveFrequency;
      }

      // Elevation Profile (Balanced waves so curY returns to 0 at segment 1000)
      if (i >= 220 && i <= 280) {
        // Sector 2: Rolling desert dune ridge
        hill = Math.sin(((i - 220) / 60) * 2 * Math.PI) * 320 * track.hillFrequency;
      } else if (i >= 780 && i <= 840) {
        // Sector 6: THE DUNE JUMP RAMP! Ascends steeply, crests at seg 810, then descends
        hill = Math.sin(((i - 780) / 60) * 2 * Math.PI) * 720 * track.hillFrequency;
      }

      curY += hill * 0.05;

      const isAlt = Math.floor(i / 3) % 2 === 0;
      const roadColor = isAlt ? '#222428' : '#181a1d';
      const grassColor = isAlt ? '#c27838' : '#ba6e2c';
      const rumbleColor = isAlt ? '#ef4444' : '#f8fafc';
      const laneColor = isAlt ? '#f8fafc' : 'transparent';
      const shoulderColor = isAlt ? '#b45309' : '#92400e';

      const sprites: Segment['sprites'] = [];

      // Start/Finish Line Gantry (Segment 0)
      if (i === 0) {
        sprites.push({ type: 'finish', offset: 0 });
      }

      // Checkpoints (Gantry Arch with Neon Amber Display & Scan Beam across 10 sectors)
      if (CHECKPOINT_SEGMENTS.includes(i)) {
        sprites.push({ type: 'checkpoint', offset: 0 });
      }

      // ── START GRID & FINAL STRAIGHT (0-55 and 860-999) ──
      // Racing Team Flags on metal poles along both sides of the straight
      if ((i >= 2 && i <= 50 && i % 8 === 0) || (i >= 870 && i <= 995 && i % 10 === 0)) {
        sprites.push({ type: 'flag', offset: -1.45 });
        sprites.push({ type: 'flag', offset: 1.45 });
      }
      // Fictional Sponsor Banners on Straights
      if (i === 15 || i === 30 || i === 45 || i === 205 || i === 615 || i === 890 || i === 940) {
        sprites.push({ type: 'sponsor_banner', offset: -1.38 });
        sprites.push({ type: 'sponsor_banner', offset: 1.38 });
      }

      // ── SECTOR 1: SWEEPING LEFT (65-145) ──
      if (i >= 80 && i <= 140 && i % 20 === 0) {
        sprites.push({ type: 'sign_left', offset: 1.35 });
      }

      // ── SECTOR 2: SWEEPING RIGHT (220-290) ──
      if (i >= 230 && i <= 285 && i % 20 === 0) {
        sprites.push({ type: 'sign_right', offset: -1.35 });
      }

      // ── SECTOR 3: TECHNICAL LEFT (335-415) ──
      if (i >= 345 && i <= 410 && i % 20 === 0) {
        sprites.push({ type: 'sign_left', offset: 1.35 });
      }

      // ── SECTOR 4: THE HAIRPIN (460-620) ──
      // Distance countdown boards before braking zone
      if (i === 465) {
        sprites.push({ type: 'sign_distance_300', offset: 1.35 });
      } else if (i === 475) {
        sprites.push({ type: 'sign_distance_200', offset: 1.35 });
        sprites.push({ type: 'sign_hairpin', offset: 1.35 });
      } else if (i === 485) {
        sprites.push({ type: 'sign_distance_100', offset: 1.35 });
      }
      if (i === 490) {
        sprites.push({ type: 'sign_hairpin', offset: 1.35 });
      }
      // Hairpin apex chevrons, continuous outer tire barriers, and rock cliff walls
      if (i >= 495 && i <= 600) {
        // Red/white tire barrier wall along the entire outside edge of the hairpin
        if (i % 3 === 0) {
          sprites.push({ type: 'barrier', offset: -1.35 });
        }
        // Sandstone canyon cliff towering on outside
        if (i % 12 === 0) {
          sprites.push({ type: 'cliff', offset: -1.85 });
        }
        // Apex direction chevrons
        if (i % 25 === 0) {
          sprites.push({ type: 'sign_right', offset: -1.35 });
        }
      }

      // ── SECTOR 5: S-CURVE / CHICANE (620-760) ──
      if (i === 625) {
        sprites.push({ type: 'sign_chicane', offset: 1.35 });
      }
      if (i >= 640 && i <= 685 && i % 18 === 0) {
        sprites.push({ type: 'sign_left', offset: 1.35 });
        sprites.push({ type: 'barrier', offset: -1.35 });
      }
      if (i >= 695 && i <= 738 && i % 18 === 0) {
        sprites.push({ type: 'sign_right', offset: -1.35 });
        sprites.push({ type: 'barrier', offset: 1.35 });
      }

      // ── SECTOR 6: DUNE JUMP RAMP (760-860) ──
      if (i === 765) {
        sprites.push({ type: 'sign_ramp', offset: 1.35 });
      }
      if (i >= 785 && i <= 835 && i % 12 === 0) {
        sprites.push({ type: 'flag', offset: -1.4 });
        sprites.push({ type: 'flag', offset: 1.4 });
      }

      // ── DESERT ENVIRONMENT PROPS: Dunes, Cacti, Rocks, Mesas, Tumbleweeds, Palms, Outposts ──
      // Scenic Oasis Palm Trees
      if ((i >= 150 && i <= 210 && i % 8 === 0) || (i >= 860 && i <= 930 && i % 10 === 0)) {
        const side = (i % 2 === 0 ? 1 : -1) * (1.75 + ((i * 13) % 40) / 30);
        sprites.push({ type: 'palm_tree', offset: side });
      }

      // Desert Outposts & Weathered Structures
      if (i === 70 || i === 260 || i === 440 || i === 750) {
        sprites.push({ type: 'abandoned_structure', offset: i % 2 === 0 ? 2.1 : -2.1 });
      }

      // High-visibility Chevron Warning Arrows in sharp bends
      if (i === 480 || i === 520 || i === 565 || i === 655 || i === 715) {
        sprites.push({ type: 'warning_arrow', offset: i === 520 ? -1.38 : 1.38 });
      }

      // Tire Barrier Walls along sharp apexes
      if ((i >= 490 && i <= 580 && i % 6 === 0) || (i >= 645 && i <= 725 && i % 8 === 0)) {
        sprites.push({ type: 'tire_barrier', offset: i < 600 ? -1.32 : 1.32 });
      }

      if (i > 8 && i % 5 === 0 && i !== 180 && i !== 320 && i !== 460) {
        const side = (i % 2 === 0 ? 1 : -1) * (1.75 + ((i * 19) % 100) / 45);
        const r = ((i * 37) % 100) / 100;
        if (r < 0.22) {
          sprites.push({ type: 'cactus', offset: side });
        } else if (r < 0.38) {
          sprites.push({ type: 'cactus_group', offset: side });
        } else if (r < 0.58) {
          sprites.push({ type: 'rock', offset: side });
        } else if (r < 0.78) {
          sprites.push({ type: 'dune', offset: side * 1.5 });
        } else if (r < 0.90) {
          sprites.push({ type: 'mesa', offset: side * 2.0 });
        } else {
          sprites.push({ type: 'tumbleweed', offset: side * 0.95 });
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
          lane: laneColor,
          shoulder: shoulderColor
        }
      });
    }

    return segments;
  }, []);

  // Initialize AI Opponents (4 Opponents + 1 Player = 5 Total Racers on Grid)
  const initAIOpponents = useCallback((track: RaceTrack): AICar[] => {
    // Grid Positions lined up with painted starting boxes (Slots 1, 2, 3, 5; Player is Slot 4):
    // Slot 1: Seg 24 (z: 3840, x: -0.35) — VIPER
    // Slot 2: Seg 19 (z: 3040, x: 0.35)  — BLAZE
    // Slot 3: Seg 14 (z: 2240, x: -0.35) — TITAN
    // Slot 4: Seg 9  (z: 1440, x: 0.35)  — PLAYER
    // Slot 5: Seg 4  (z: 640,  x: -0.35) — PHANTOM
    const aiConfig = [
      { name: 'VIPER', carModel: CARS[1], x: -0.35, z: 24 * SEGMENT_LENGTH },
      { name: 'BLAZE', carModel: CARS[2], x: 0.35, z: 19 * SEGMENT_LENGTH },
      { name: 'TITAN', carModel: CARS[3], x: -0.35, z: 14 * SEGMENT_LENGTH },
      { name: 'PHANTOM', carModel: CARS[4], x: -0.35, z: 4 * SEGMENT_LENGTH }
    ];

    return aiConfig.map((cfg, idx) => {
      const targetSpeedKmh = track.aiBaseSpeed + ((idx * 1.5) - 2.5);
      return {
        id: idx + 1,
        name: cfg.name,
        carModel: cfg.carModel,
        x: cfg.x,
        y: 0,
        z: cfg.z,
        speed: 0, // Starts stopped on starting grid during countdown
        targetSpeed: (targetSpeedKmh / 215) * 18,
        steer: 0,
        lap: 1,
        checkpointIndex: 0,
        isBraking: false,
        finished: false,
        finishTime: 0
      };
    });
  }, []);

  // Format Seconds to MM:SS.CC
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

    const currentTier = carUpgrades[selectedCar.id] || 0;
    const effective = getEffectiveCarStats(selectedCar, currentTier);

    // 30 ambient windblown sand dust particles drifting across the desert track
    const ambientDust = Array.from({ length: 30 }, () => ({
      x: Math.random() * 1280,
      y: 200 + Math.random() * 450,
      vx: -(2.5 + Math.random() * 4.5),
      vy: (Math.random() - 0.5) * 0.8,
      length: 25 + Math.random() * 55,
      alpha: 0.15 + Math.random() * 0.35
    }));

    simRef.current = {
      time: 0,
      width: canvasRef.current ? canvasRef.current.width : 1280,
      height: canvasRef.current ? canvasRef.current.height : 720,
      screenShake: 0,
      cameraTilt: 0,
      segments,
      trackLength: segments.length * SEGMENT_LENGTH,
      totalRacers: 5,
      ambientDust,
      player: {
        x: 0.35, // Starts at Grid Slot 4 (Seg 9)
        y: 0,
        vy: 0,
        inAir: false,
        z: 9 * SEGMENT_LENGTH, // Seg 9 (1440)
        speed: 0,
        maxSpeed: effective.topSpeed,
        accel: effective.accel,
        decel: 0.08,
        brake: 0.28,
        steer: 0,
        handling: effective.handling,
        driftFactor: effective.drift,
        durability: effective.durability,
        isDrifting: false,
        isBraking: false,
        isBoosting: false,
        boostRemaining: 100,
        boostPower: 45,
        driftAngle: 0,
        driftScore: 0,
        currentDriftCombo: 0,
        driftMultiplier: 1.0,
        bounce: 0,
        bumpCooldown: 0,
        lap: 1,
        checkpointIndex: 0,
        totalCheckpointsPassed: 0,
        timeRemaining: selectedTrack.timeLimitSec,
        raceTime: 0,
        finished: false,
        position: 4 // Starts 4th on grid behind 1st, 2nd, 3rd
      },
      aiCars,
      particles: [],
      keys: {
        left: false,
        right: false,
        up: false,
        down: false,
        drift: false,
        boost: false
      },
      countdownTimer: 180 // 3 seconds at 60fps
    };

    const savedBest = localStorage.getItem(selectedTrack.bestTimeKey);
    setBestTimeFormatted(savedBest ? formatTime(parseFloat(savedBest)) : '--:--');
    setRaceTimeFormatted('00:00.00');
    setPlayerSpeedKmh(0);
    setBoostRemaining(100);
    setIsBoosting(false);
    setPlayerLap(1);
    setPlayerPosition(4);
    const totalCps = selectedTrack.checkpointsPerLap || 10;
    setCheckpointText(`00 / ${String(totalCps).padStart(2, '0')}`);
    setTimeRemaining(selectedTrack.timeLimitSec);
    setDriftScore(0);
    setCurrentDriftCombo(0);
    setDriftMultiplier(1.0);
    setIsDrifting(false);
    setCheckpointBanner(null);
    setCheckpointDistanceMeters(null);
    setTrackProgress(0);
    setObjectiveText('REACH CHECKPOINT BEFORE TIMER EXPIRES');

    setGameState('COUNTDOWN');
  }, [buildTrackSegments, carUpgrades, getEffectiveCarStats, initAIOpponents, selectedCar, selectedTrack]);

  // Handle Race Complete
  const finishRace = useCallback(
    (won: boolean) => {
      const s = simRef.current;
      const p = s.player;
      p.finished = true;

      if (won) {
        if (soundEnabled) sound.playVictory();
        confetti({ particleCount: 150, spread: 85, origin: { y: 0.6 } });

        const timeStr = formatTime(p.raceTime);
        const bestKey = selectedTrack.bestTimeKey;
        const savedBest = localStorage.getItem(bestKey);
        let isNewRecord = false;

        if (!savedBest || p.raceTime < parseFloat(savedBest)) {
          localStorage.setItem(bestKey, p.raceTime.toString());
          isNewRecord = true;
        }

        const bestTimeStr = savedBest ? formatTime(Math.min(p.raceTime, parseFloat(savedBest))) : timeStr;
        const finalScore = Math.floor(10000 / (p.raceTime + 1) + p.driftScore + (6 - p.position) * 2000);

        // Calculate Coin Reward based on position out of 5
        const baseReward = selectedTrack.rewardCoins;
        const posMultiplier = p.position === 1 ? 1.0 : p.position === 2 ? 0.8 : p.position === 3 ? 0.6 : p.position === 4 ? 0.4 : 0.2;
        const driftBonus = Math.floor(p.driftScore / 20);
        const earnedCoins = Math.round(baseReward * posMultiplier + driftBonus);

        setCoins(prev => prev + earnedCoins);

        setRaceResult({
          position: p.position,
          timeStr,
          bestTimeStr,
          score: finalScore,
          driftScore: p.driftScore,
          earnedCoins,
          isNewRecord
        });

        setGameState('RACE_COMPLETE');
        if (onGameOver) onGameOver(finalScore);
        if (submitScore) {
          submitScore('desert-racer', 'Desert Racer', finalScore).catch(() => {});
        }
      } else {
        if (soundEnabled) sound.playGameOver();
        const distKm = ((p.lap - 1) * selectedTrack.distanceKm + (p.z / s.trackLength) * selectedTrack.distanceKm).toFixed(1);
        setRaceResult({
          position: p.position,
          timeStr: `${distKm} KM`,
          bestTimeStr: '--:--',
          score: Math.floor(p.driftScore + parseFloat(distKm) * 800),
          driftScore: p.driftScore,
          earnedCoins: 0,
          isNewRecord: false
        });
        setGameState('GAME_OVER');
      }
    },
    [onGameOver, selectedTrack, soundEnabled, submitScore]
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
      if (['ShiftLeft', 'ShiftRight', 'KeyN', 'KeyB'].includes(e.code)) {
        e.preventDefault();
        k.boost = true;
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
      if (['ShiftLeft', 'ShiftRight', 'KeyN', 'KeyB'].includes(e.code)) k.boost = false;
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
      const width = s.width;
      const height = s.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      s.time += 0.016;

      // -------------------------------------------------------------
      // 1. HANDLE COUNTDOWN STATE
      // -------------------------------------------------------------
      if (gameState === 'COUNTDOWN') {
        s.countdownTimer--;
        if (s.countdownTimer === 179 && soundEnabled) sound.playCountdownBeep(false);
        if (s.countdownTimer === 120 && soundEnabled) sound.playCountdownBeep(false);
        if (s.countdownTimer === 60 && soundEnabled) sound.playCountdownBeep(false);
        if (s.countdownTimer === 0 && soundEnabled) sound.playCountdownBeep(true);

        if (s.countdownTimer > 120) setCountdownVal('3');
        else if (s.countdownTimer > 60) setCountdownVal('2');
        else if (s.countdownTimer > 0) setCountdownVal('1');
        else if (s.countdownTimer > -30) setCountdownVal('GO!');
        else {
          setCountdownVal('');
          setGameState('RACING');
        }
      }

      // -------------------------------------------------------------
      // 2. SIMULATE PLAYER CAR PHYSICS (When RACING)
      // -------------------------------------------------------------
      if (gameState === 'RACING') {
        p.raceTime += 0.016;
        setRaceTimeFormatted(formatTime(p.raceTime));

        // Count down race timer
        p.timeRemaining -= 0.016;
        setTimeRemaining(Math.max(0, Math.ceil(p.timeRemaining)));

        if (p.timeRemaining <= 0) {
          finishRace(false);
          return;
        }

        // Merge Keyboard & Mobile Inputs
        const accelInput = s.keys.up || mobileControlsRef.current.accel;
        const brakeInput = s.keys.down || mobileControlsRef.current.brake;
        const leftInput = s.keys.left || mobileControlsRef.current.left;
        const rightInput = s.keys.right || mobileControlsRef.current.right;
        const driftInput = s.keys.drift || mobileControlsRef.current.drift;
        const boostInput = s.keys.boost || mobileControlsRef.current.boost;

        p.isBraking = brakeInput;

        // Nitro Boost System (Significant acceleration, higher top speed, visual fx)
        const canBoost = boostInput && p.boostRemaining > 0 && p.speed > 1.2;
        if (canBoost) {
          p.isBoosting = true;
          p.boostRemaining = Math.max(0, p.boostRemaining - 0.45);
          s.screenShake = Math.max(s.screenShake, 1.2);
          const boostedMax = (p.maxSpeed * 1.22) / 12;
          p.speed = Math.min(boostedMax, p.speed + p.accel * 1.8);

          // Cyan & Orange Nitro Exhaust Fire Particles
          if (Math.random() < 0.85) {
            s.particles.push({
              x: (Math.random() - 0.5) * 35,
              y: height * 0.86,
              vx: (Math.random() - 0.5) * 4,
              vy: 3 + Math.random() * 5,
              size: 4 + Math.random() * 6,
              color: Math.random() < 0.65 ? '#06b6d4' : '#f59e0b',
              alpha: 0.95,
              life: 16,
              maxLife: 16
            });
          }
        } else {
          p.isBoosting = false;
          // Passive boost regeneration over time
          p.boostRemaining = Math.min(100, p.boostRemaining + 0.12);
        }

        // Standard Acceleration & Braking (when not boosting)
        if (!canBoost) {
          if (accelInput) {
            p.speed = Math.min(p.maxSpeed / 12, p.speed + p.accel);
          } else if (brakeInput) {
            p.speed = Math.max(0, p.speed - p.brake);
          } else {
            p.speed = Math.max(0, p.speed - p.decel);
          }
        }

        // Calculate speed in KM/H
        const speedKmh = Math.round((p.speed / (p.maxSpeed / 12)) * p.maxSpeed);
        setPlayerSpeedKmh(speedKmh);
        setBoostRemaining(Math.round(p.boostRemaining));
        setIsBoosting(p.isBoosting);
        updateEngineAudio(p.speed / (p.maxSpeed / 12), p.isDrifting);

        // Steering & Drift Mechanics
        const sensMult = sensitivity === 'HIGH' ? 1.25 : sensitivity === 'LOW' ? 0.8 : 1.0;
        let steerDelta = 0;
        if (leftInput) steerDelta -= p.handling * sensMult;
        if (rightInput) steerDelta += p.handling * sensMult;

        const speedRatio = p.speed / (p.maxSpeed / 12);
        const isTurning = Math.abs(steerDelta) > 0.01;

        // Drift Initiation: Drifting when steering hard or holding drift button at speed
        const segIdx = Math.floor(p.z / SEGMENT_LENGTH) % s.segments.length;
        const curSeg = s.segments[segIdx];

        if ((driftInput || (isTurning && speedRatio > 0.62)) && isTurning && p.speed > 2) {
          p.isDrifting = true;
          p.driftMultiplier = Math.min(3.0, p.driftMultiplier + 0.012);
          p.currentDriftCombo += Math.round(18 * p.driftMultiplier);
          p.driftScore += Math.round(18 * p.driftMultiplier);
          p.boostRemaining = Math.min(100, p.boostRemaining + 0.35); // Stylish drifting refills nitro boost!
          setDriftScore(p.driftScore);
          setCurrentDriftCombo(p.currentDriftCombo);
          setDriftMultiplier(p.driftMultiplier);
          p.driftAngle = steerDelta * 6.5;
          s.cameraTilt = steerDelta * 0.08;

          // Lay down rubber skid marks on road segment
          if (curSeg) {
            if (!curSeg.skidMarks) curSeg.skidMarks = [];
            if (curSeg.skidMarks.length < 5) {
              curSeg.skidMarks.push({
                x: p.x,
                width: 0.22,
                alpha: 0.65
              });
            }
          }

          // Emit tire smoke particles from rear tires
          if (Math.random() < 0.7) {
            s.particles.push({
              x: (Math.random() - 0.5) * 45 + (p.x * 25),
              y: height * 0.84,
              vx: (Math.random() - 0.5) * 4 - steerDelta * 6,
              vy: -1.5 - Math.random() * 2.5,
              size: 6 + Math.random() * 8,
              color: Math.abs(p.x) > 1.0 ? '#d97706' : '#e2e8f0',
              alpha: 0.75,
              life: 25,
              maxLife: 25
            });
          }
        } else {
          if (p.isDrifting && p.currentDriftCombo > 0) {
            p.currentDriftCombo = 0;
            p.driftMultiplier = 1.0;
            setCurrentDriftCombo(0);
            setDriftMultiplier(1.0);
          }
          p.isDrifting = false;
          p.driftAngle *= 0.85;
          s.cameraTilt *= 0.85;
        }
        setIsDrifting(p.isDrifting);

        // Lateral Movement
        p.x += steerDelta * (p.speed / 10);

        // Centrifugal Cornering Force
        if (curSeg && curSeg.curve !== 0) {
          const curveForce = (curSeg.curve * 0.0075) * (p.speed / 10);
          p.x -= curveForce;
        }

        // Roadside Collision Boundaries (Tire barriers, cliffs, and dunes at |x| >= 1.35)
        // Prevents cars from driving through the open desert or shortcutting
        if (Math.abs(p.x) >= 1.35) {
          const side = Math.sign(p.x);
          p.x = side * 1.30;
          p.speed = Math.max(1, p.speed * 0.62);
          s.screenShake = 4.2;
          if (soundEnabled) sound.playLaser(180);
          for (let k = 0; k < 10; k++) {
            s.particles.push({
              x: (Math.random() - 0.5) * 50 + (side * 40),
              y: height * 0.84,
              vx: -side * (3 + Math.random() * 5),
              vy: -2 - Math.random() * 4,
              size: 4 + Math.random() * 5,
              color: Math.random() < 0.5 ? '#f59e0b' : '#ef4444',
              alpha: 0.9,
              life: 20,
              maxLife: 20
            });
          }
        }

        // In-Air Dune Jump Ramp Physics (Sector 6: Seg 780 to 840, crests at 805-825)
        if (!p.inAir && segIdx >= 800 && segIdx <= 825 && speedKmh > 105) {
          p.inAir = true;
          p.vy = (speedKmh / 215) * 12.5;
          if (soundEnabled) sound.playJump();
          s.screenShake = 2.5;
        }

        if (p.inAir) {
          p.y += p.vy;
          p.vy -= 0.65; // gravity
          if (p.y <= 0) {
            p.y = 0;
            p.inAir = false;
            p.vy = 0;
            s.screenShake = 4.0; // Heavy landing impact
            if (soundEnabled) sound.playLaser(160);

            // Landing dust burst
            for (let k = 0; k < 16; k++) {
              s.particles.push({
                x: (Math.random() - 0.5) * 80,
                y: height * 0.88,
                vx: (Math.random() - 0.5) * 7,
                vy: -2 - Math.random() * 4,
                size: 5 + Math.random() * 9,
                color: '#d97706',
                alpha: 0.85,
                life: 24,
                maxLife: 24
              });
            }
          }
        }

        // Off-Road Sand Physics & Billowing Dust (Outside asphalt kerbs: |x| > 1.0)
        if (Math.abs(p.x) > 1.0) {
          const durabilityFactor = 1 - (p.durability / 100) * 0.45;
          p.speed = Math.max(0, p.speed - 0.25 * durabilityFactor);
          s.screenShake = 1.6;

          // Billowing sand dust clouds from tires
          if (Math.random() < 0.75) {
            s.particles.push({
              x: (Math.random() - 0.5) * 60 + (p.x > 0 ? 35 : -35),
              y: height * 0.84,
              vx: (Math.random() - 0.5) * 6,
              vy: -2 - Math.random() * 4,
              size: 6 + Math.random() * 9,
              color: '#d97706',
              alpha: 0.85,
              life: 24,
              maxLife: 24
            });
          }
        }

        // Advance Forward on Track
        p.z += p.speed * 20;

        // Checkpoint Distance Calculation (Target: Next CP from CHECKPOINT_SEGMENTS, or Finish @ 1000)
        const nextCpSeg = p.checkpointIndex < CHECKPOINT_SEGMENTS.length ? CHECKPOINT_SEGMENTS[p.checkpointIndex] : 1000;
        let segDistToCp = nextCpSeg - segIdx;
        if (segDistToCp < 0) segDistToCp += s.segments.length;
        const distMeters = Math.round((segDistToCp * SEGMENT_LENGTH) / 10);
        setCheckpointDistanceMeters(distMeters);

        // Checkpoint Trigger Detection across all 10 Checkpoints
        if (p.checkpointIndex < CHECKPOINT_SEGMENTS.length) {
          const targetCpSeg = CHECKPOINT_SEGMENTS[p.checkpointIndex];
          if (segIdx >= targetCpSeg && segIdx <= targetCpSeg + 20) {
            p.checkpointIndex++;
            p.totalCheckpointsPassed++;
            p.timeRemaining = Math.min(99, p.timeRemaining + 14);
            if (soundEnabled) sound.playPowerUp();
            const cpStr = String(p.checkpointIndex).padStart(2, '0');
            const totalCpStr = String(CHECKPOINT_SEGMENTS.length).padStart(2, '0');
            setCheckpointBanner(`CHECKPOINT ${cpStr} / ${totalCpStr} PASSED! +14 SEC`);
            setTimeout(() => setCheckpointBanner(null), 2500);
            setCheckpointText(`${cpStr} / ${totalCpStr}`);
          }
        }

        // Lap Complete Detection (Crossing Start/Finish Line at Segment 0 / 1000)
        if (p.z >= s.trackLength) {
          p.z -= s.trackLength;
          p.checkpointIndex = 0;
          p.lap++;
          setPlayerLap(p.lap);
          const totalCpStr = String(CHECKPOINT_SEGMENTS.length).padStart(2, '0');
          setCheckpointText(`00 / ${totalCpStr}`);

          if (p.lap > selectedTrack.laps) {
            finishRace(true);
            return;
          } else {
            if (soundEnabled) sound.playLaser(1300);
            setCheckpointBanner(`LAP ${p.lap} / ${selectedTrack.laps}`);
            setTimeout(() => setCheckpointBanner(null), 2500);
          }
        }

        // Update Total Race Progress (0 to 1)
        const totalDistLaps = selectedTrack.laps * s.trackLength;
        const playerCurDist = (p.lap - 1) * s.trackLength + p.z;
        const pProgress = Math.min(1, Math.max(0, playerCurDist / totalDistLaps));
        setTrackProgress(pProgress);

        // -------------------------------------------------------------
        // 3. UPDATE AI OPPONENTS (4 AI Cars with Racing Line & Collisions)
        // -------------------------------------------------------------
        let currentPos = 1;
        const aiProg: { id: number; progress: number; color: string }[] = [];
        const playerTotalDist = (p.lap - 1) * s.trackLength + p.z;

        s.aiCars.forEach(ai => {
          const aiSegIdx = Math.floor(ai.z / SEGMENT_LENGTH) % s.segments.length;
          const lookAhead = s.segments[(aiSegIdx + 14) % s.segments.length];
          const curveAhead = lookAhead ? lookAhead.curve : 0;

          // Anticipate curve & cut toward inside apex
          let targetX = curveAhead !== 0 ? (curveAhead > 0 ? 0.42 : -0.42) : (ai.id % 2 === 0 ? 0.35 : -0.35);

          // Overtaking / Avoid player if nearby
          const dzToPlayer = p.z - ai.z;
          if (Math.abs(dzToPlayer) < 350 && Math.abs(ai.x - p.x) < 0.38) {
            targetX = p.x > 0 ? -0.48 : 0.48;
          }

          // Smooth steering towards racing line
          ai.x += (targetX - ai.x) * 0.045;
          ai.steer = (targetX - ai.x) * 2.2;

          // AI Brake into sharp curves, accelerate on straights
          const isSharp = Math.abs(curveAhead) > 2.2;
          if (isSharp) {
            ai.isBraking = true;
            ai.targetSpeed = (selectedTrack.aiBaseSpeed * 0.82 / 215) * 18;
          } else {
            ai.isBraking = false;
            ai.targetSpeed = (selectedTrack.aiBaseSpeed / 215) * 18 + ((ai.id * 0.4) - 0.8);
          }

          if (ai.speed < ai.targetSpeed) {
            ai.speed += 0.14;
          } else {
            ai.speed -= 0.18;
          }

          ai.z += ai.speed * 20;
          CHECKPOINT_SEGMENTS.forEach((cpSeg, idx) => {
            if (aiSegIdx >= cpSeg && ai.checkpointIndex === idx) {
              ai.checkpointIndex = idx + 1;
            }
          });
          if (ai.z >= s.trackLength) {
            ai.z -= s.trackLength;
            ai.checkpointIndex = 0;
            ai.lap++;
          }

          // Car-to-Car Collision with Player
          const dz = Math.abs(p.z - ai.z);
          const dx = Math.abs(p.x - ai.x);
          if (dz < 130 && dx < 0.36 && (!p.bumpCooldown || p.bumpCooldown <= 0)) {
            p.bumpCooldown = 22;
            s.screenShake = 3.6;
            if (soundEnabled) sound.playLaser(220);

            const pushDir = p.x > ai.x ? 1 : -1;
            p.x += pushDir * 0.14;
            ai.x -= pushDir * 0.14;

            p.speed = Math.max(2, p.speed * 0.94);
            ai.speed = Math.max(2, ai.speed * 0.94);

            for (let sp = 0; sp < 12; sp++) {
              s.particles.push({
                x: (Math.random() - 0.5) * 40,
                y: height * 0.86,
                vx: (Math.random() - 0.5) * 8,
                vy: -2 - Math.random() * 5,
                size: 3 + Math.random() * 4,
                color: Math.random() < 0.5 ? '#fbbf24' : '#ffffff',
                alpha: 1.0,
                life: 18,
                maxLife: 18
              });
            }
          }

          const aiTotalDist = (ai.lap - 1) * s.trackLength + ai.z;
          if (aiTotalDist > playerTotalDist) {
            currentPos++;
          }

          aiProg.push({
            id: ai.id,
            progress: Math.min(1, Math.max(0, aiTotalDist / totalDistLaps)),
            color: ai.carModel.color
          });
        });

        if (p.bumpCooldown && p.bumpCooldown > 0) p.bumpCooldown--;

        p.position = currentPos;
        setPlayerPosition(currentPos);
        setAiProgressList(aiProg);
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

      // Camera shake
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.25);
      }

      // Camera orientation kept rock-solid (no random screen rotation)

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

      // 5B. 3D Road Segments Projection (Curvature accumulation and perspective projection)
      const baseSegmentIndex = Math.floor(p.z / SEGMENT_LENGTH);
      const baseSegment = s.segments[baseSegmentIndex % s.segments.length];
      const playerSegmentPercent = (p.z % SEGMENT_LENGTH) / SEGMENT_LENGTH;
      const cameraX = p.x * ROAD_WIDTH;
      const cameraY = CAMERA_HEIGHT + p.y;
      const cameraZ = p.z;

      // Subtle dynamic camera zoom-out at high speed to reveal more road ahead
      const speedZoom = Math.min(0.09, (p.speed / 12) * 0.07);
      const effectiveCameraDepth = CAMERA_DEPTH - speedZoom;

      let x = 0;
      let dx = -(baseSegment ? baseSegment.curve * playerSegmentPercent : 0);

      const projectedSegments: Segment[] = [];

      for (let n = 0; n < DRAW_DISTANCE; n++) {
        const sIndex = (baseSegmentIndex + n) % s.segments.length;
        const segment = s.segments[sIndex];
        if (!segment) continue;

        const loopOffset = baseSegmentIndex + n >= s.segments.length ? s.trackLength : 0;

        const p1WorldZ = segment.p1.world.z + loopOffset - cameraZ;
        if (p1WorldZ <= 1) {
          x += dx;
          dx += segment.curve;
          continue;
        }
        const p1Scale = (effectiveCameraDepth / p1WorldZ) * (height / 2);

        const p2WorldZ = segment.p2.world.z + loopOffset - cameraZ;
        const p2Scale = p2WorldZ > 0 ? (effectiveCameraDepth / p2WorldZ) * (height / 2) : p1Scale;

        segment.p1.screen = {
          x: Math.round(width / 2 + p1Scale * (x - cameraX)),
          y: Math.round(height * 0.52 - p1Scale * (segment.p1.world.y - cameraY)),
          w: Math.round(p1Scale * ROAD_WIDTH),
          scale: p1Scale
        };

        segment.p2.screen = {
          x: Math.round(width / 2 + p2Scale * ((x + dx) - cameraX)),
          y: Math.round(height * 0.52 - p2Scale * (segment.p2.world.y - cameraY)),
          w: Math.round(p2Scale * ROAD_WIDTH),
          scale: p2Scale
        };

        x += dx;
        dx += segment.curve;

        projectedSegments.push(segment);
      }

      // PASS 1: Render All Road Geometry from Back to Front
      for (let n = projectedSegments.length - 1; n >= 0; n--) {
        const seg = projectedSegments[n];
        const p1 = seg.p1.screen;
        const p2 = seg.p2.screen;

        if (p1.y <= p2.y || p2.y >= height) continue;

        // Sand Terrain
        ctx.fillStyle = seg.color.grass;
        ctx.fillRect(0, p2.y, width, p1.y - p2.y);

        // Sand Shoulder (Tougher desert gravel shoulder outside curbs)
        if (seg.color.shoulder) {
          const sh1 = p1.w * 1.35;
          const sh2 = p2.w * 1.35;
          ctx.fillStyle = seg.color.shoulder;
          ctx.beginPath();
          ctx.moveTo(p1.x - sh1, p1.y);
          ctx.lineTo(p1.x + sh1, p1.y);
          ctx.lineTo(p2.x + sh2, p2.y);
          ctx.lineTo(p2.x - sh2, p2.y);
          ctx.closePath();
          ctx.fill();
        }

        // Rumble Kerbs (Alternating red & white on curves)
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

        // Asphalt Road
        ctx.fillStyle = seg.color.road;
        ctx.beginPath();
        ctx.moveTo(p1.x - p1.w, p1.y);
        ctx.lineTo(p1.x + p1.w, p1.y);
        ctx.lineTo(p2.x + p2.w, p2.y);
        ctx.lineTo(p2.x - p2.w, p2.y);
        ctx.closePath();
        ctx.fill();

        // High-Contrast Solid White Road Edge Boundary Lines
        const ew1 = Math.max(2, p1.w * 0.03);
        const ew2 = Math.max(2, p2.w * 0.03);
        ctx.fillStyle = '#ffffff';
        // Left solid white edge
        ctx.beginPath();
        ctx.moveTo(p1.x - p1.w, p1.y);
        ctx.lineTo(p1.x - p1.w + ew1, p1.y);
        ctx.lineTo(p2.x - p2.w + ew2, p2.y);
        ctx.lineTo(p2.x - p2.w, p2.y);
        ctx.closePath();
        ctx.fill();
        // Right solid white edge
        ctx.beginPath();
        ctx.moveTo(p1.x + p1.w - ew1, p1.y);
        ctx.lineTo(p1.x + p1.w, p1.y);
        ctx.lineTo(p2.x + p2.w, p2.y);
        ctx.lineTo(p2.x + p2.w - ew2, p2.y);
        ctx.closePath();
        ctx.fill();

        // Pre-baked Rubber Tire Grooves (Racing Line Groove)
        [-0.45, 0.45].forEach(trkOff => {
          const trkW1 = p1.w * 0.16;
          const trkW2 = p2.w * 0.16;
          const trkX1 = p1.x + p1.w * trkOff;
          const trkX2 = p2.x + p2.w * trkOff;
          ctx.fillStyle = 'rgba(15, 15, 20, 0.32)';
          ctx.beginPath();
          ctx.moveTo(trkX1 - trkW1, p1.y);
          ctx.lineTo(trkX1 + trkW1, p1.y);
          ctx.lineTo(trkX2 + trkW2, p2.y);
          ctx.lineTo(trkX2 - trkW2, p2.y);
          ctx.closePath();
          ctx.fill();
        });

        // Heavy Braking Tire Skid Marks Baked on Asphalt in Technical Zones
        if ((seg.index >= 475 && seg.index <= 495) || (seg.index >= 625 && seg.index <= 645)) {
          [-0.45, 0.45].forEach(bOff => {
            const bw1 = p1.w * 0.18;
            const bw2 = p2.w * 0.18;
            const bx1 = p1.x + p1.w * bOff;
            const bx2 = p2.x + p2.w * bOff;
            ctx.fillStyle = 'rgba(10, 10, 12, 0.55)';
            ctx.beginPath();
            ctx.moveTo(bx1 - bw1, p1.y);
            ctx.lineTo(bx1 + bw1, p1.y);
            ctx.lineTo(bx2 + bw2, p2.y);
            ctx.lineTo(bx2 - bw2, p2.y);
            ctx.closePath();
            ctx.fill();
          });
        }

        // Checkered Finish Line on Asphalt (Segment 0)
        if (seg.index === 0) {
          const checks = 12;
          const checkW1 = (p1.w * 2) / checks;
          const checkW2 = (p2.w * 2) / checks;
          for (let c = 0; c < checks; c++) {
            ctx.fillStyle = c % 2 === 0 ? '#ffffff' : '#000000';
            ctx.beginPath();
            ctx.moveTo(p1.x - p1.w + c * checkW1, p1.y);
            ctx.lineTo(p1.x - p1.w + (c + 1) * checkW1, p1.y);
            ctx.lineTo(p2.x - p2.w + (c + 1) * checkW2, p2.y);
            ctx.lineTo(p2.x - p2.w + c * checkW2, p2.y);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Starting Grid Boxes on Asphalt (Positions 1 to 5)
        const gridSegments = [
          { seg: 24, slot: 1, xOff: -0.35 },
          { seg: 19, slot: 2, xOff: 0.35 },
          { seg: 14, slot: 3, xOff: -0.35 },
          { seg: 9,  slot: 4, xOff: 0.35 }, // Player grid slot
          { seg: 4,  slot: 5, xOff: -0.35 }
        ];
        const gridBox = gridSegments.find(g => g.seg === seg.index);
        if (gridBox) {
          const boxX1 = p1.x + p1.w * gridBox.xOff;
          const bW1 = p1.w * 0.28;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = Math.max(1, p1.scale * 3);
          ctx.strokeRect(boxX1 - bW1 / 2, p2.y, bW1, p1.y - p2.y);

          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${Math.max(8, Math.round(p1.scale * 16))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(gridBox.slot.toString(), boxX1, p1.y - 2);
        }

        // Multi-lane Dividers (3 Lanes separated by dashed white lines)
        if (seg.color.lane !== 'transparent') {
          const laneOffsets = [-0.33, 0.33];
          laneOffsets.forEach(lOff => {
            const lw1 = Math.max(1.5, p1.w * 0.02);
            const lw2 = Math.max(1.5, p2.w * 0.02);
            const lx1 = p1.x + p1.w * lOff;
            const lx2 = p2.x + p2.w * lOff;
            ctx.fillStyle = seg.color.lane;
            ctx.beginPath();
            ctx.moveTo(lx1 - lw1, p1.y);
            ctx.lineTo(lx1 + lw1, p1.y);
            ctx.lineTo(lx2 + lw2, p2.y);
            ctx.lineTo(lx2 - lw2, p2.y);
            ctx.closePath();
            ctx.fill();
          });
        }

        // Rubber Skid Marks
        if (seg.skidMarks && seg.skidMarks.length > 0) {
          seg.skidMarks.forEach(sm => {
            const smX1 = p1.x + p1.w * sm.x;
            const smX2 = p2.x + p2.w * sm.x;
            const smW1 = p1.w * (sm.width * 0.5);
            const smW2 = p2.w * (sm.width * 0.5);
            ctx.fillStyle = `rgba(15, 15, 15, ${sm.alpha * 0.7})`;
            ctx.beginPath();
            ctx.moveTo(smX1 - smW1, p1.y);
            ctx.lineTo(smX1 + smW1, p1.y);
            ctx.lineTo(smX2 + smW2, p2.y);
            ctx.lineTo(smX2 - smW2, p2.y);
            ctx.closePath();
            ctx.fill();
          });
        }
      }

      // PASS 2: Render All Roadside Props & AI Opponents from Back to Front
      for (let n = projectedSegments.length - 1; n >= 0; n--) {
        const seg = projectedSegments[n];
        const p1 = seg.p1.screen;
        const p2 = seg.p2.screen;

        if (p1.y <= p2.y || p2.y >= height) continue;

        // Roadside Props
        seg.sprites.forEach(sprite => {
          const spriteX = p1.x + p1.scale * sprite.offset * ROAD_WIDTH;
          const spriteY = p1.y;
          const spriteScale = p1.scale * 1600;

          if (sprite.type === 'checkpoint') {
            // High-tech Neon Amber Checkpoint Gantry Arch
            const gantryW = p1.w * 2.2;
            const postW = p1.w * 0.12;

            // Dual Truss Posts
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(p1.x - gantryW / 2, spriteY - spriteScale * 1.0, postW, spriteScale * 1.0);
            ctx.fillRect(p1.x + gantryW / 2 - postW, spriteY - spriteScale * 1.0, postW, spriteScale * 1.0);

            // Overhead Banner Box
            ctx.fillStyle = '#09090b';
            ctx.fillRect(p1.x - gantryW / 2, spriteY - spriteScale * 1.0, gantryW, spriteScale * 0.28);

            // Neon Glowing Frame
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = Math.max(1, spriteScale * 0.02);
            ctx.strokeRect(p1.x - gantryW / 2, spriteY - spriteScale * 1.0, gantryW, spriteScale * 0.28);

            // Sensor Scan Beam
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
            ctx.fillRect(p1.x - gantryW / 2 + postW, spriteY - spriteScale * 0.72, gantryW - postW * 2, spriteScale * 0.72);

            // Neon Checkpoint Text
            ctx.fillStyle = '#f59e0b';
            ctx.font = `black italic ${Math.max(10, Math.round(spriteScale * 0.13))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('⚡ CHECKPOINT ⚡', p1.x, spriteY - spriteScale * 0.82);
          } else if (sprite.type === 'finish') {
            // Grand Checkered Start/Finish Racing Arch
            const gantryW = p1.w * 2.3;
            const postW = p1.w * 0.14;

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(p1.x - gantryW / 2, spriteY - spriteScale * 1.05, postW, spriteScale * 1.05);
            ctx.fillRect(p1.x + gantryW / 2 - postW, spriteY - spriteScale * 1.05, postW, spriteScale * 1.05);

            // Checkered Banner Board
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p1.x - gantryW / 2, spriteY - spriteScale * 1.05, gantryW, spriteScale * 0.32);

            ctx.fillStyle = '#000000';
            ctx.font = `black italic ${Math.max(10, Math.round(spriteScale * 0.14))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🏁 FINISH LINE 🏁', p1.x, spriteY - spriteScale * 0.85);

            ctx.fillStyle = '#d97706';
            ctx.font = `bold ${Math.max(7, Math.round(spriteScale * 0.065))}px sans-serif`;
            ctx.fillText('DESERT RACER CHAMPIONSHIP', p1.x, spriteY - spriteScale * 0.76);
          } else if (sprite.type === 'sign_hairpin') {
            // Reflective Warning Signboard: 180° Hairpin Ahead
            const sW = spriteScale * 0.65;
            const sH = spriteScale * 0.42;
            ctx.fillStyle = '#18181b';
            ctx.fillRect(spriteX - sW / 2, spriteY - sH * 1.6, sW, sH);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = Math.max(1.5, spriteScale * 0.02);
            ctx.strokeRect(spriteX - sW / 2, spriteY - sH * 1.6, sW, sH);

            ctx.fillStyle = '#ef4444';
            ctx.font = `900 ${Math.max(8, Math.round(sH * 0.34))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ 180° HAIRPIN', spriteX, spriteY - sH * 1.15);
            ctx.fillStyle = '#fef08a';
            ctx.font = `bold ${Math.max(7, Math.round(sH * 0.28))}px sans-serif`;
            ctx.fillText('HEAVY BRAKE & DRIFT', spriteX, spriteY - sH * 0.78);

            // Steel Support Pole
            ctx.fillStyle = '#52525b';
            ctx.fillRect(spriteX - sW * 0.06, spriteY - sH * 0.6, sW * 0.12, sH * 0.6);
          } else if (sprite.type === 'sign_chicane') {
            // Reflective Warning Signboard: S-Curves Chicane
            const sW = spriteScale * 0.62;
            const sH = spriteScale * 0.38;
            ctx.fillStyle = '#18181b';
            ctx.fillRect(spriteX - sW / 2, spriteY - sH * 1.55, sW, sH);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = Math.max(1.5, spriteScale * 0.02);
            ctx.strokeRect(spriteX - sW / 2, spriteY - sH * 1.55, sW, sH);

            ctx.fillStyle = '#f59e0b';
            ctx.font = `900 ${Math.max(8, Math.round(sH * 0.36))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('⚡ S-CURVES / CHICANE', spriteX, spriteY - sH * 1.05);
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(7, Math.round(sH * 0.28))}px sans-serif`;
            ctx.fillText('APEX CORNERING', spriteX, spriteY - sH * 0.72);

            ctx.fillStyle = '#52525b';
            ctx.fillRect(spriteX - sW * 0.06, spriteY - sH * 0.55, sW * 0.12, sH * 0.55);
          } else if (sprite.type === 'sign_ramp') {
            // Jump Ramp Ahead Warning
            const sW = spriteScale * 0.58;
            const sH = spriteScale * 0.36;
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(spriteX - sW / 2, spriteY - sH * 1.5, sW, sH);
            ctx.fillStyle = '#09090b';
            ctx.font = `900 ${Math.max(8, Math.round(sH * 0.36))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🚀 DUNE JUMP RAMP', spriteX, spriteY - sH * 1.05);
            ctx.font = `bold ${Math.max(7, Math.round(sH * 0.26))}px sans-serif`;
            ctx.fillText('MAX SPEED AIRTIME', spriteX, spriteY - sH * 0.72);

            ctx.fillStyle = '#52525b';
            ctx.fillRect(spriteX - sW * 0.06, spriteY - sH * 0.5, sW * 0.12, sH * 0.5);
          } else if (sprite.type === 'sign_left') {
            // High-Contrast Yellow/Black Chevron Left Warning Board
            const sW = spriteScale * 0.36;
            const sH = spriteScale * 0.28;
            ctx.fillStyle = '#eab308';
            ctx.fillRect(spriteX - sW / 2, spriteY - sH * 1.4, sW, sH);
            ctx.fillStyle = '#000000';
            ctx.font = `900 ${Math.max(9, Math.round(sH * 0.75))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('<<<', spriteX, spriteY - sH * 0.65);
            ctx.fillStyle = '#52525b';
            ctx.fillRect(spriteX - sW * 0.08, spriteY - sH * 0.4, sW * 0.16, sH * 0.4);
          } else if (sprite.type === 'sign_right') {
            // High-Contrast Yellow/Black Chevron Right Warning Board
            const sW = spriteScale * 0.36;
            const sH = spriteScale * 0.28;
            ctx.fillStyle = '#eab308';
            ctx.fillRect(spriteX - sW / 2, spriteY - sH * 1.4, sW, sH);
            ctx.fillStyle = '#000000';
            ctx.font = `900 ${Math.max(9, Math.round(sH * 0.75))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('>>>', spriteX, spriteY - sH * 0.65);
            ctx.fillStyle = '#52525b';
            ctx.fillRect(spriteX - sW * 0.08, spriteY - sH * 0.4, sW * 0.16, sH * 0.4);
          } else if (sprite.type === 'barrier') {
            // Tire Barrier Stack (Red and White striped FIA safety barrier)
            const bW = spriteScale * 0.48;
            const bH = spriteScale * 0.26;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(spriteX - bW / 2, spriteY - bH, bW, bH);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(spriteX - bW * 0.22, spriteY - bH, bW * 0.44, bH);
            // Black tire tread rims
            ctx.fillStyle = '#09090b';
            ctx.fillRect(spriteX - bW / 2, spriteY - bH, bW, bH * 0.15);
            ctx.fillRect(spriteX - bW / 2, spriteY - bH * 0.15, bW, bH * 0.15);
          } else if (sprite.type === 'sponsor_banner') {
            // Professional Roadside Motorsport Sponsor Banner Board
            const sbW = spriteScale * 0.78;
            const sbH = spriteScale * 0.28;
            const sponsors = ['APEX RACING', 'OCTANE 105', 'HYPERION TIRES', 'NITRO DUNE'];
            const spText = sponsors[seg.index % sponsors.length];
            const spBg = seg.index % 2 === 0 ? '#09090b' : '#b45309';

            ctx.fillStyle = spBg;
            ctx.fillRect(spriteX - sbW / 2, spriteY - sbH * 1.3, sbW, sbH);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = Math.max(1, spriteScale * 0.015);
            ctx.strokeRect(spriteX - sbW / 2, spriteY - sbH * 1.3, sbW, sbH);

            ctx.fillStyle = '#fef08a';
            ctx.font = `900 ${Math.max(7, Math.round(sbH * 0.42))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(spText, spriteX, spriteY - sbH * 0.72);

            // Mounting poles
            ctx.fillStyle = '#71717a';
            ctx.fillRect(spriteX - sbW * 0.35, spriteY - sbH * 0.3, sbW * 0.05, sbH * 0.3);
            ctx.fillRect(spriteX + sbW * 0.3, spriteY - sbH * 0.3, sbW * 0.05, sbH * 0.3);
          } else if (
            sprite.type === 'sign_distance_300' ||
            sprite.type === 'sign_distance_200' ||
            sprite.type === 'sign_distance_100'
          ) {
            // Formula-Style Braking Distance Marker Board (300m / 200m / 100m)
            const dmW = spriteScale * 0.32;
            const dmH = spriteScale * 0.42;
            const distNum =
              sprite.type === 'sign_distance_300'
                ? '300'
                : sprite.type === 'sign_distance_200'
                ? '200'
                : '100';
            const stripes =
              sprite.type === 'sign_distance_300' ? 3 : sprite.type === 'sign_distance_200' ? 2 : 1;

            ctx.fillStyle = '#09090b';
            ctx.fillRect(spriteX - dmW / 2, spriteY - dmH * 1.25, dmW, dmH);
            ctx.strokeStyle = '#e4e4e7';
            ctx.lineWidth = Math.max(1.5, spriteScale * 0.018);
            ctx.strokeRect(spriteX - dmW / 2, spriteY - dmH * 1.25, dmW, dmH);

            // Black/White Diagonal Hash Bars
            ctx.fillStyle = '#ffffff';
            for (let s = 0; s < stripes; s++) {
              ctx.fillRect(spriteX - dmW * 0.38, spriteY - dmH * 1.15 + s * (dmH * 0.14), dmW * 0.76, dmH * 0.08);
            }

            ctx.fillStyle = '#f59e0b';
            ctx.font = `900 ${Math.max(8, Math.round(dmH * 0.32))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(distNum, spriteX, spriteY - dmH * 0.38);

            // Support Pole
            ctx.fillStyle = '#52525b';
            ctx.fillRect(spriteX - dmW * 0.08, spriteY - dmH * 0.25, dmW * 0.16, dmH * 0.25);
          } else if (sprite.type === 'cliff') {
            // Sandstone Canyon Rock Wall Towering Along Outer Track Edge
            const clW = spriteScale * 1.6;
            const clH = spriteScale * 1.1;
            ctx.fillStyle = '#7c2d12';
            ctx.fillRect(spriteX - clW / 2, spriteY - clH, clW, clH);
            // Geological sedimentary strata layers
            ctx.fillStyle = '#9a3412';
            ctx.fillRect(spriteX - clW / 2, spriteY - clH * 0.75, clW, clH * 0.22);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(spriteX - clW / 2, spriteY - clH * 0.35, clW, clH * 0.16);
            ctx.fillStyle = '#451a03';
            ctx.fillRect(spriteX - clW / 2, spriteY - clH, clW, clH * 0.08);
          } else if (sprite.type === 'flag') {
            // Tall Desert Racing Flagpole with Fluttering Banner
            const fH = spriteScale * 0.95;
            const pW = Math.max(2, spriteScale * 0.035);
            // Steel pole
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(spriteX - pW / 2, spriteY - fH, pW, fH);
            // Flag fluttering with wind
            const wave = Math.sin(s.time * 8 + sprite.offset) * (spriteScale * 0.05);
            const fW = spriteScale * 0.32;
            const fHgt = spriteScale * 0.22;
            ctx.fillStyle = (seg.index % 2 === 0) ? '#f59e0b' : '#38bdf8';
            ctx.beginPath();
            ctx.moveTo(spriteX + pW / 2, spriteY - fH);
            ctx.lineTo(spriteX + pW / 2 + fW, spriteY - fH + wave);
            ctx.lineTo(spriteX + pW / 2 + fW, spriteY - fH + fHgt + wave);
            ctx.lineTo(spriteX + pW / 2, spriteY - fH + fHgt);
            ctx.closePath();
            ctx.fill();
          } else if (sprite.type === 'dune') {
            // Sculpted Sand Dune Ridge
            const dW = spriteScale * 1.8;
            const dH = spriteScale * 0.55;
            ctx.fillStyle = '#d97706';
            ctx.beginPath();
            ctx.ellipse(spriteX, spriteY - dH * 0.3, dW * 0.5, dH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.ellipse(spriteX - dW * 0.1, spriteY - dH * 0.45, dW * 0.35, dH * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (sprite.type === 'cactus') {
            // Branching Saguaro Cactus
            const cW = spriteScale * 0.14;
            const cH = spriteScale * 0.65;
            ctx.fillStyle = '#15803d';
            ctx.fillRect(spriteX - cW / 2, spriteY - cH, cW, cH);
            // Left arm
            ctx.fillRect(spriteX - cW * 1.6, spriteY - cH * 0.65, cW * 1.6, cW * 0.8);
            ctx.fillRect(spriteX - cW * 1.6, spriteY - cH * 0.9, cW * 0.8, cH * 0.28);
            // Right arm
            ctx.fillRect(spriteX + cW * 0.5, spriteY - cH * 0.5, cW * 1.5, cW * 0.8);
            ctx.fillRect(spriteX + cW * 1.2, spriteY - cH * 0.75, cW * 0.8, cH * 0.28);
          } else if (sprite.type === 'rock') {
            // Desert Boulder
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.ellipse(spriteX, spriteY - spriteScale * 0.1, spriteScale * 0.25, spriteScale * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.ellipse(spriteX - spriteScale * 0.05, spriteY - spriteScale * 0.14, spriteScale * 0.15, spriteScale * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (sprite.type === 'mesa') {
            // Red Sandstone Mesa
            ctx.fillStyle = '#9a3412';
            ctx.fillRect(spriteX - spriteScale * 0.9, spriteY - spriteScale * 0.55, spriteScale * 1.8, spriteScale * 0.55);
            ctx.fillStyle = '#c2410c';
            ctx.fillRect(spriteX - spriteScale * 0.9, spriteY - spriteScale * 0.55, spriteScale * 1.8, spriteScale * 0.08);
          } else if (sprite.type === 'tumbleweed') {
            // Tumbleweed
            ctx.fillStyle = '#a16207';
            ctx.beginPath();
            ctx.arc(spriteX, spriteY - spriteScale * 0.08, spriteScale * 0.1, 0, Math.PI * 2);
            ctx.fill();
          } else if (sprite.type === 'palm_tree') {
            // Majestic Desert Oasis Palm Tree
            const tH = spriteScale * 1.05;
            const tW = spriteScale * 0.1;
            // Curved trunk
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.moveTo(spriteX - tW * 0.5, spriteY);
            ctx.quadraticCurveTo(spriteX + tW * 0.8, spriteY - tH * 0.5, spriteX + tW * 0.4, spriteY - tH);
            ctx.lineTo(spriteX + tW * 1.1, spriteY - tH);
            ctx.quadraticCurveTo(spriteX + tW * 1.5, spriteY - tH * 0.5, spriteX + tW * 0.5, spriteY);
            ctx.closePath();
            ctx.fill();
            // Palm fronds
            const topX = spriteX + tW * 0.7;
            const topY = spriteY - tH;
            ctx.fillStyle = '#15803d';
            for (let f = 0; f < 6; f++) {
              const fAngle = (f / 6) * Math.PI * 2;
              const frondLen = spriteScale * 0.42;
              ctx.beginPath();
              ctx.ellipse(
                topX + Math.cos(fAngle) * (frondLen * 0.5),
                topY + Math.sin(fAngle) * (frondLen * 0.25) + 3,
                frondLen * 0.5,
                spriteScale * 0.11,
                fAngle,
                0,
                Math.PI * 2
              );
              ctx.fill();
            }
          } else if (sprite.type === 'abandoned_structure') {
            // Weathered Desert Outpost & Fuel Station Ruins
            const bW = spriteScale * 1.15;
            const bH = spriteScale * 0.65;
            ctx.fillStyle = '#713f12';
            ctx.fillRect(spriteX - bW * 0.5, spriteY - bH, bW, bH);
            // Rusty corrugated pitched roof
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(spriteX - bW * 0.55, spriteY - bH);
            ctx.lineTo(spriteX, spriteY - bH * 1.35);
            ctx.lineTo(spriteX + bW * 0.55, spriteY - bH);
            ctx.closePath();
            ctx.fill();
            // Openings
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(spriteX - bW * 0.38, spriteY - bH * 0.72, bW * 0.22, bH * 0.38);
            ctx.fillRect(spriteX + bW * 0.1, spriteY - bH * 0.85, bW * 0.26, bH * 0.85);
          } else if (sprite.type === 'cactus_group') {
            // Cluster of 3 saguaro cacti
            const heights = [0.72, 0.52, 0.4];
            const offsets = [-0.16, 0.14, 0.0];
            ctx.fillStyle = '#166534';
            heights.forEach((hMul, idx) => {
              const cW = spriteScale * 0.11;
              const cH = spriteScale * hMul;
              const cX = spriteX + spriteScale * offsets[idx];
              ctx.fillRect(cX - cW * 0.5, spriteY - cH, cW, cH);
              if (idx === 0) {
                ctx.fillRect(cX - cW * 1.5, spriteY - cH * 0.65, cW * 1.5, cW * 0.75);
                ctx.fillRect(cX - cW * 1.5, spriteY - cH * 0.88, cW * 0.75, cH * 0.25);
                ctx.fillRect(cX + cW * 0.5, spriteY - cH * 0.5, cW * 1.4, cW * 0.75);
                ctx.fillRect(cX + cW * 1.15, spriteY - cH * 0.72, cW * 0.75, cH * 0.24);
              }
            });
          } else if (sprite.type === 'tire_barrier') {
            // Heavy FIA Stacked Safety Tire Wall
            const tbW = spriteScale * 0.56;
            const tbH = spriteScale * 0.32;
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(spriteX - tbW * 0.5, spriteY - tbH, tbW, tbH);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(spriteX - tbW * 0.2, spriteY - tbH, tbW * 0.4, tbH);
            ctx.fillStyle = '#18181b';
            ctx.fillRect(spriteX - tbW * 0.5, spriteY - tbH * 0.55, tbW, tbH * 0.12);
          } else if (sprite.type === 'warning_arrow') {
            // High-visibility Chevron Apex Warning Arrow
            const aW = spriteScale * 0.44;
            const aH = spriteScale * 0.32;
            ctx.fillStyle = '#09090b';
            ctx.fillRect(spriteX - aW * 0.5, spriteY - aH * 1.4, aW, aH);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = Math.max(1.5, spriteScale * 0.02);
            ctx.strokeRect(spriteX - aW * 0.5, spriteY - aH * 1.4, aW, aH);
            ctx.fillStyle = '#f59e0b';
            ctx.font = `900 ${Math.max(9, Math.round(aH * 0.7))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('➔➔', spriteX, spriteY - aH * 0.65);
            ctx.fillStyle = '#52525b';
            ctx.fillRect(spriteX - aW * 0.07, spriteY - aH * 0.4, aW * 0.14, aH * 0.4);
          }
        });

        // Draw AI Opponents with realistic chassis, wings, and illuminated taillights
        s.aiCars.forEach(ai => {
          if (Math.floor(ai.z / SEGMENT_LENGTH) === seg.index) {
            const aiScale = p1.scale * 1750;
            const aiX = p1.x + p1.scale * ai.x * ROAD_WIDTH;
            const aiY = p1.y;

            ctx.save();
            ctx.translate(aiX, aiY);

            // Car Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.beginPath();
            ctx.ellipse(0, 0, aiScale * 0.38, aiScale * 0.1, 0, 0, Math.PI * 2);
            ctx.fill();

            // Tires
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(-aiScale * 0.32, -aiScale * 0.22, aiScale * 0.1, aiScale * 0.22);
            ctx.fillRect(aiScale * 0.22, -aiScale * 0.22, aiScale * 0.1, aiScale * 0.22);

            // Main Car Body
            ctx.fillStyle = ai.carModel.color;
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = Math.max(1, aiScale * 0.015);
            ctx.beginPath();
            ctx.roundRect(-aiScale * 0.28, -aiScale * 0.34, aiScale * 0.56, aiScale * 0.32, 6);
            ctx.fill();
            ctx.stroke();

            // Racing Stripe
            ctx.fillStyle = ai.carModel.stripeColor;
            ctx.fillRect(-aiScale * 0.06, -aiScale * 0.34, aiScale * 0.12, aiScale * 0.32);

            // Cockpit Windshield
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.roundRect(-aiScale * 0.18, -aiScale * 0.44, aiScale * 0.36, aiScale * 0.16, 4);
            ctx.fill();

            // Rear Wing Spoiler
            ctx.fillStyle = '#18181b';
            ctx.fillRect(-aiScale * 0.32, -aiScale * 0.38, aiScale * 0.64, aiScale * 0.05);

            // Dual LED Taillights (Glow intense red when braking!)
            const tailColor = ai.isBraking ? '#ef4444' : '#b91c1c';
            ctx.fillStyle = tailColor;
            if (ai.isBraking) {
              ctx.shadowColor = '#ef4444';
              ctx.shadowBlur = 10;
            }
            ctx.fillRect(-aiScale * 0.25, -aiScale * 0.16, aiScale * 0.1, aiScale * 0.06);
            ctx.fillRect(aiScale * 0.15, -aiScale * 0.16, aiScale * 0.1, aiScale * 0.06);
            ctx.shadowBlur = 0;

            // Racer Tag
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(8, Math.round(aiScale * 0.08))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(ai.name, 0, -aiScale * 0.52);

            ctx.restore();
          }
        });
      }

      // PASS 3: Ambient Windblown Desert Sand Dust Drifting Across Road
      if (s.ambientDust && s.ambientDust.length > 0) {
        s.ambientDust.forEach(dust => {
          dust.x += dust.vx;
          dust.y += dust.vy;
          if (dust.x < -100) {
            dust.x = width + 50;
            dust.y = height * 0.45 + Math.random() * (height * 0.45);
          }
          const grad = ctx.createLinearGradient(dust.x, dust.y, dust.x + dust.length, dust.y);
          grad.addColorStop(0, 'rgba(217, 119, 6, 0)');
          grad.addColorStop(0.5, `rgba(251, 191, 36, ${dust.alpha})`);
          grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(dust.x, dust.y);
          ctx.lineTo(dust.x + dust.length, dust.y);
          ctx.stroke();
        });
      }

      // 5C. Draw Player Car (Centered near bottom with dynamic jump elevation)
      const carScreenX = width / 2;
      const carScreenY = height * 0.86 - p.y;
      const carW = 165;
      const carH = 82;

      ctx.save();
      ctx.translate(carScreenX, carScreenY);

      if (p.isDrifting) {
        ctx.rotate(p.driftAngle * 0.04);
      }

      // Car Shadow (expands & fades during jumps)
      const shadowAlpha = Math.max(0.2, 0.6 - p.y * 0.005);
      const shadowScale = 1 + p.y * 0.003;
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 16 + p.y, carW * 0.52 * shadowScale, 18 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Forward Headlight Beams illuminating the asphalt ahead
      ctx.save();
      const beamGradL = ctx.createLinearGradient(-35, -carH * 0.6, -80, -carH * 3.5);
      beamGradL.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      beamGradL.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGradL;
      ctx.beginPath();
      ctx.moveTo(-35, -carH * 0.6);
      ctx.lineTo(-95, -carH * 3.5);
      ctx.lineTo(-20, -carH * 3.5);
      ctx.closePath();
      ctx.fill();

      const beamGradR = ctx.createLinearGradient(35, -carH * 0.6, 80, -carH * 3.5);
      beamGradR.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
      beamGradR.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGradR;
      ctx.beginPath();
      ctx.moveTo(35, -carH * 0.6);
      ctx.lineTo(20, -carH * 3.5);
      ctx.lineTo(95, -carH * 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Large Desert Off-Road Tires with Alloy Hubs
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(-carW * 0.54, -20, 32, 48);
      ctx.fillRect(carW * 0.54 - 32, -20, 32, 48);
      // Alloy wheel rims
      ctx.fillStyle = '#71717a';
      ctx.fillRect(-carW * 0.54 + 6, -14, 20, 36);
      ctx.fillRect(carW * 0.54 - 26, -14, 20, 36);

      const steerAngle =
        s.keys.left || mobileControlsRef.current.left
          ? -0.28
          : s.keys.right || mobileControlsRef.current.right
          ? 0.28
          : 0;

      ctx.save();
      ctx.translate(-carW * 0.45, -carH * 0.6);
      ctx.rotate(steerAngle);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(-10, -18, 20, 38);
      ctx.fillStyle = '#71717a';
      ctx.fillRect(-6, -12, 12, 26);
      ctx.restore();

      ctx.save();
      ctx.translate(carW * 0.45, -carH * 0.6);
      ctx.rotate(steerAngle);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(-10, -18, 20, 38);
      ctx.fillStyle = '#71717a';
      ctx.fillRect(-6, -12, 12, 26);
      ctx.restore();

      // Main Off-road Chassis
      ctx.fillStyle = selectedCar.color;
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-carW * 0.44, -carH * 0.52, carW * 0.88, carH * 0.68, 8);
      ctx.fill();
      ctx.stroke();

      // Center Racing Stripe
      ctx.fillStyle = selectedCar.stripeColor;
      ctx.fillRect(-15, -carH * 0.52, 30, carH * 0.68);

      // Cabin Roof
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-carW * 0.26, -carH * 0.84, carW * 0.52, carH * 0.44, 6);
      ctx.fill();

      // Tinted Rear Window with Cyan Reflection
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(-carW * 0.2, -carH * 0.76, carW * 0.4, carH * 0.18);
      ctx.shadowBlur = 0;

      // Illuminated Dual LED Tail-lights
      const playerBraking = s.keys.down || mobileControlsRef.current.brake;
      ctx.fillStyle = playerBraking ? '#ef4444' : '#dc2626';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = playerBraking ? 18 : 10;
      ctx.fillRect(-carW * 0.38, -carH * 0.12, 36, 13);
      ctx.fillRect(carW * 0.38 - 36, -carH * 0.12, 36, 13);
      ctx.shadowBlur = 0;

      // Exhaust Boost Flames (Twin fiery exhaust blasts or Mega Nitro Jets)
      if (p.isBoosting) {
        // High-velocity Cyan/Blue Nitro Blast with White Core
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 26;
        ctx.beginPath();
        ctx.ellipse(-26, 24, 9, 28 + Math.random() * 16, 0, 0, Math.PI * 2);
        ctx.ellipse(26, 24, 9, 28 + Math.random() * 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-26, 18, 4, 14 + Math.random() * 8, 0, 0, Math.PI * 2);
        ctx.ellipse(26, 18, 4, 14 + Math.random() * 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (s.keys.up || mobileControlsRef.current.accel) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.ellipse(-26, 16, 6, 14 + Math.random() * 9, 0, 0, Math.PI * 2);
        ctx.ellipse(26, 16, 6, 14 + Math.random() * 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // 5D. High-Speed Warp Streak Lines (When exceeding 160 KM/H)
      const curSpeedKmh = Math.round((p.speed / (p.maxSpeed / 12)) * p.maxSpeed);
      if (curSpeedKmh > 160) {
        const streakAlpha = Math.min(0.55, (curSpeedKmh - 160) / 70);
        ctx.strokeStyle = `rgba(255, 255, 255, ${streakAlpha})`;
        ctx.lineWidth = 1.5;
        for (let sl = 0; sl < 8; sl++) {
          const angle = ((sl / 8) + (s.time * 0.5)) * Math.PI * 2;
          const rInner = 140;
          const rOuter = 320 + Math.random() * 80;
          ctx.beginPath();
          ctx.moveTo(width / 2 + Math.cos(angle) * rInner, height * 0.55 + Math.sin(angle) * rInner);
          ctx.lineTo(width / 2 + Math.cos(angle) * rOuter, height * 0.55 + Math.sin(angle) * rOuter);
          ctx.stroke();
        }
      }

      // 5E. Render Dust / Smoke Particles
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

  // Upgrade vehicle tier (Free in-game currency only!)
  const handleUpgradeCar = (carId: string) => {
    const currentTier = carUpgrades[carId] || 0;
    if (currentTier >= 5) return;
    const UPGRADE_COST = 400;

    if (coins < UPGRADE_COST) {
      if (soundEnabled) sound.playLaser(220);
      return;
    }

    sound.playCoin();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setCoins(prev => prev - UPGRADE_COST);
    setCarUpgrades(prev => ({
      ...prev,
      [carId]: currentTier + 1
    }));
  };

  // Virtual Touch Input Handler
  const handleInputPress = (key: 'left' | 'right' | 'up' | 'down' | 'drift' | 'boost', pressed: boolean) => {
    if (key === 'left') mobileControlsRef.current.left = pressed;
    if (key === 'right') mobileControlsRef.current.right = pressed;
    if (key === 'up') mobileControlsRef.current.accel = pressed;
    if (key === 'down') mobileControlsRef.current.brake = pressed;
    if (key === 'drift') mobileControlsRef.current.drift = pressed;
    if (key === 'boost') mobileControlsRef.current.boost = pressed;
  };

  const currentTier = carUpgrades[selectedCar.id] || 0;
  const currentEffective = getEffectiveCarStats(selectedCar, currentTier);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] bg-[#05070d] text-white font-sans overflow-hidden select-none touch-none"
    >
      {/* 3D Game Canvas (Active during COUNTDOWN, RACING, and background for PAUSED) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-default"
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. CINEMATIC MAIN MENU
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'MAIN_MENU' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between overflow-hidden">
          {/* Background Hero Scene */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src={heroBg}
              alt="Desert Racer"
              className="w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.08]"
            />
            {/* Cinematic Shadow Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/50" />
            <MenuDustCanvas />
          </div>

          {/* 3D CAR VISIBLE ON THE RIGHT SIDE OF MAIN MENU */}
          <div className="absolute right-0 bottom-8 lg:bottom-12 w-full sm:w-[60%] lg:w-[50%] h-[320px] sm:h-[420px] lg:h-[480px] pointer-events-auto z-10 hidden sm:flex items-center justify-center">
            <div className="relative w-full h-full">
              {/* Radial ground ambient light */}
              <div
                className="absolute inset-x-12 bottom-6 h-16 rounded-full blur-2xl opacity-40 -z-10"
                style={{ backgroundColor: selectedCar.color }}
              />
              <GarageShowcaseCanvas
                car={selectedCar}
                onColorChange={hex => {
                  setSelectedCar(prev => ({ ...prev, color: hex, accentColor: hex }));
                }}
              />
              {/* Subtle Car Badge Overlay */}
              <div className="absolute bottom-4 right-8 px-3 py-1.5 rounded-lg bg-neutral-950/80 border border-white/10 backdrop-blur-md flex items-center gap-2 pointer-events-none">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCar.color }} />
                <span className="text-[11px] font-mono font-bold text-white tracking-wider">
                  {selectedCar.name}
                </span>
                <span className="text-[10px] font-mono text-amber-400">
                  {currentEffective.topSpeed} KM/H
                </span>
              </div>
            </div>
          </div>

          {/* TOP BAR: Exit Portal / Fullscreen (Left) • PROFILE / COINS / SETTINGS (Top-Right) */}
          <header className="relative z-20 w-full px-4 sm:px-8 pt-4 sm:pt-6 flex items-center justify-between pointer-events-auto">
            {/* Left: Exit to Portal & Fullscreen */}
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onBack();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-zinc-800 hover:border-amber-400/50 text-white text-xs font-mono font-medium transition-all cursor-pointer shadow-md"
                  title="Exit to GameNova Portal"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">EXIT PORTAL</span>
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-zinc-800 hover:border-amber-400/50 text-white text-xs transition-all cursor-pointer shadow-md"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Top-Right: PROFILE • COINS • SETTINGS */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* PROFILE */}
              <div className="px-3 py-1 rounded-lg bg-neutral-950/85 border border-zinc-800 backdrop-blur-xl shadow-md flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-black text-[11px]">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-white leading-tight">
                    {profile?.displayName || profile?.username || username || 'DESERT_VIPER'}
                  </span>
                  <span className="text-[8px] font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                    LVL {profile?.level || 12}
                  </span>
                </div>
              </div>

              {/* COINS */}
              <div className="px-3 py-1 rounded-lg bg-neutral-950/85 border border-amber-400/40 backdrop-blur-xl shadow-md flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span className="font-mono font-black text-xs text-amber-300 tracking-wider">
                  {coins.toLocaleString()}
                </span>
              </div>

              {/* SETTINGS */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSettings(true);
                }}
                className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 border border-zinc-800 hover:border-zinc-600 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-md"
                title="Settings"
              >
                <Settings className="w-4 h-4 text-neutral-300" />
              </button>
            </div>
          </header>

          {/* LEFT SIDE: DESERT / RACER + SUBTITLE + COMPACT PREMIUM BUTTONS */}
          <main className="relative z-20 px-6 sm:px-12 lg:px-16 my-auto max-w-lg text-left pointer-events-auto">
            {/* Title: DESERT RACER */}
            <div className="flex flex-col mb-1.5">
              <span className="text-4xl sm:text-6xl lg:text-7xl font-black italic tracking-tighter text-white leading-none drop-shadow">
                DESERT
              </span>
              <span className="text-4xl sm:text-6xl lg:text-7xl font-black italic tracking-tighter text-amber-400 leading-none drop-shadow">
                RACER
              </span>
            </div>

            {/* Small Subtitle: CONQUER THE DUNES */}
            <p className="text-xs sm:text-sm font-mono font-bold tracking-[0.25em] uppercase text-neutral-400 mb-6 drop-shadow">
              CONQUER THE DUNES
            </p>

            {/* Compact Premium Buttons (Not huge rounded rectangles) */}
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              {/* ▶ PLAY RACE */}
              <button
                onClick={startRace}
                className="w-full px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-black text-xs tracking-wider uppercase flex items-center justify-between shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-yellow-200/50"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>PLAY RACE</span>
                </div>
                <span className="text-[10px] font-mono font-bold opacity-75">
                  {selectedTrack.name}
                </span>
              </button>

              {/* 🏁 RACE SELECT */}
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('RACE_SELECT');
                }}
                className="w-full px-5 py-2.5 rounded-lg bg-neutral-900/85 hover:bg-neutral-800 border border-zinc-800 hover:border-amber-400/60 text-white font-mono font-bold text-xs tracking-wider uppercase flex items-center justify-between shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  <span>RACE SELECT</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-neutral-400">
                  {selectedTrack.subtitle}
                </span>
              </button>

              {/* 🚗 GARAGE */}
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('GARAGE');
                }}
                className="w-full px-5 py-2.5 rounded-lg bg-neutral-900/85 hover:bg-neutral-800 border border-zinc-800 hover:border-cyan-400/60 text-white font-mono font-bold text-xs tracking-wider uppercase flex items-center justify-between shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  <span>GARAGE</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-neutral-400">
                  {selectedCar.name}
                </span>
              </button>

              {/* ⚙ SETTINGS */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSettings(true);
                }}
                className="w-full px-5 py-2.5 rounded-lg bg-neutral-900/85 hover:bg-neutral-800 border border-zinc-800 hover:border-zinc-600 text-neutral-300 hover:text-white font-mono font-bold text-xs tracking-wider uppercase flex items-center justify-between shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-neutral-400" />
                  <span>SETTINGS</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
              </button>
            </div>
          </main>

          {/* BOTTOM BAR: ACTIVE LOADOUT SUMMARY */}
          <footer className="relative z-20 w-full px-4 sm:px-8 pb-3 sm:pb-5 flex flex-col sm:flex-row items-center justify-between gap-2 pointer-events-auto">
            <div className="flex items-center gap-2.5 text-[11px] font-mono text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedCar.color }} />
                <span className="text-white font-bold">{selectedCar.name}</span>
              </span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{selectedTrack.subtitle}</span>
              <span>•</span>
              <span>{selectedTrack.distanceKm} KM CIRCUIT</span>
            </div>

            <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">WASD / ARROWS</span>
              <span>STEER</span>
              <span className="text-white/20">•</span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">SPACE</span>
              <span>DRIFT</span>
              <span className="text-white/20">•</span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">ESC</span>
              <span>PAUSE</span>
            </div>
          </footer>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. RACE SELECT SCREEN (LARGE HORIZONTAL RACE CARDS)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'RACE_SELECT' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-neutral-950/95 backdrop-blur-2xl overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto flex flex-col h-full justify-between gap-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('MAIN_MENU');
                  }}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 hover:border-amber-400 text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight text-white flex items-center gap-2">
                    RACE SELECT
                  </h2>
                  <p className="text-xs font-mono text-neutral-400">
                    SELECT A CIRCUIT TO COMPETE IN THE DESERT CHAMPIONSHIP
                  </p>
                </div>
              </div>

              {/* Coins Badge */}
              <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-amber-400/40 backdrop-blur-xl flex items-center gap-1.5 shadow-md">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono font-black text-xs text-amber-300">
                  {coins.toLocaleString()} COINS
                </span>
              </div>
            </div>

            {/* LARGE HORIZONTAL RACE CARDS: DESERT RUN, CANYON RUSH, DUNE STORM, SUNSET CIRCUIT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto">
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
                    className={`group relative rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden border flex flex-col sm:flex-row items-stretch ${
                      isSelected
                        ? 'bg-neutral-900 border-amber-400 shadow-xl shadow-amber-500/15'
                        : 'bg-neutral-900/70 border-zinc-800 hover:border-zinc-600 hover:bg-neutral-900'
                    }`}
                  >
                    {/* Horizontal Track Preview Image */}
                    <div className="relative w-full sm:w-48 lg:w-56 h-36 sm:h-full shrink-0 overflow-hidden">
                      <img
                        src={track.previewImage}
                        alt={track.subtitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-neutral-950 via-neutral-950/40 to-transparent" />

                      {/* Difficulty Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <span
                          className={`text-[9px] font-mono font-black px-2 py-0.5 rounded shadow-md ${
                            track.difficulty === 'EASY'
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50'
                              : track.difficulty === 'NORMAL'
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                              : track.difficulty === 'HARD'
                              ? 'bg-orange-500/30 text-orange-300 border border-orange-400/50'
                              : 'bg-rose-500/30 text-rose-300 border border-rose-400/50'
                          }`}
                        >
                          {track.difficulty}
                        </span>
                      </div>

                      {/* Track Code Tag */}
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold text-neutral-300">
                        {track.name}
                      </div>
                    </div>

                    {/* Right Details Panel */}
                    <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1 gap-2.5">
                      <div>
                        {/* Track Name */}
                        <h3 className="text-xl font-black italic tracking-tight text-white group-hover:text-amber-400 transition-colors">
                          {track.subtitle}
                        </h3>
                        <p className="text-[11px] text-neutral-400 line-clamp-1">
                          {track.description}
                        </p>
                      </div>

                      {/* Stats Grid: Distance, Difficulty, Best Time, Reward */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-mono py-2 border-y border-zinc-800">
                        <div className="flex justify-between text-neutral-400">
                          <span>DISTANCE:</span>
                          <span className="text-white font-bold">{track.distanceKm} KM</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>DIFFICULTY:</span>
                          <span className="text-amber-300 font-bold">{track.difficulty}</span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>BEST TIME:</span>
                          <span className="text-amber-400 font-bold">
                            {best ? formatTime(parseFloat(best)) : '--:--'}
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>REWARD:</span>
                          <span className="text-amber-400 font-bold">+{track.rewardCoins}</span>
                        </div>
                      </div>

                      {/* SELECT button */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-neutral-400">
                          {track.laps} LAPS
                        </span>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedTrack(track);
                            startRace();
                          }}
                          className={`px-4 py-1.5 rounded-lg font-mono font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-zinc-700'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{isSelected ? 'RACE NOW' : 'SELECT'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Nav Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-xs font-mono font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                ← BACK
              </button>

              <button
                onClick={startRace}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-mono font-black text-xs tracking-wider uppercase shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START ({selectedTrack.subtitle})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. VEHICLE GARAGE (PROFESSIONAL CAR SHOWROOM UI)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'GARAGE' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-neutral-950/95 backdrop-blur-2xl overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto flex flex-col h-full justify-between gap-4">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('MAIN_MENU');
                  }}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 hover:border-amber-400 text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight text-white flex items-center gap-2">
                    GARAGE
                  </h2>
                  <p className="text-xs font-mono text-neutral-400">
                    PROFESSIONAL CAR SHOWROOM & PERFORMANCE TUNING
                  </p>
                </div>
              </div>

              {/* Coins Wallet */}
              <div className="px-3.5 py-1.5 rounded-lg bg-neutral-900 border border-amber-400/40 backdrop-blur-xl flex items-center gap-2 shadow-md">
                <Coins className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span className="font-mono font-black text-xs sm:text-sm text-amber-300">
                  {coins.toLocaleString()} COINS
                </span>
              </div>
            </div>

            {/* 3-Column Layout: LEFT (CAR COLLECTION) • CENTER (LARGE CAR PREVIEW) • RIGHT (CAR PERFORMANCE) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 my-auto py-2">
              {/* LEFT: CAR COLLECTION */}
              <div className="lg:col-span-3 flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-400 px-1 mb-1">
                  CAR COLLECTION
                </div>

                {CARS.map(c => {
                  const isSelected = selectedCar.id === c.id;
                  const tier = carUpgrades[c.id] || 0;
                  const eff = getEffectiveCarStats(c, tier);

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedCar(c);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-neutral-900 border-amber-400 shadow-md shadow-amber-500/10'
                          : 'bg-neutral-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center shrink-0 shadow-inner"
                          style={{ backgroundColor: c.color }}
                        >
                          <Car className="w-4 h-4 text-black" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs text-white tracking-wide">
                            {c.name}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {c.category} • {eff.topSpeed} KM/H
                          </span>
                        </div>
                      </div>

                      {/* Tier Pips */}
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-mono font-bold text-amber-400">
                          T{tier}
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(pip => (
                            <div
                              key={pip}
                              className={`w-1 h-1 rounded-full ${
                                pip <= tier ? 'bg-amber-400' : 'bg-neutral-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CENTER: LARGE CAR PREVIEW WITH ROTATING/ANIMATED PRESENTATION */}
              <div className="lg:col-span-6 relative w-full h-[320px] sm:h-[420px] lg:h-[480px] rounded-2xl bg-gradient-to-b from-neutral-900/80 to-neutral-950 border border-zinc-800 overflow-hidden shadow-2xl flex items-center justify-center">
                <GarageShowcaseCanvas
                  car={selectedCar}
                  onColorChange={hex => {
                    setSelectedCar(prev => ({ ...prev, color: hex, accentColor: hex }));
                  }}
                />
              </div>

              {/* RIGHT: CAR PERFORMANCE */}
              <div className="lg:col-span-3 p-4 sm:p-5 rounded-2xl bg-neutral-900/90 border border-zinc-800 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                      CAR PERFORMANCE
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[9px] font-bold text-white">
                      TIER {currentTier}/5
                    </span>
                  </div>

                  <h3 className="text-xl font-black italic tracking-tight text-white mb-0.5">
                    {selectedCar.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-medium mb-4">
                    {selectedCar.tagline}
                  </p>

                  {/* Thin Premium Stat Bars: TOP SPEED, ACCELERATION, HANDLING, DRIFT, BRAKING */}
                  <div className="space-y-3 font-mono text-xs">
                    {/* TOP SPEED */}
                    <div>
                      <div className="flex justify-between mb-1 text-neutral-300 text-[11px]">
                        <span>TOP SPEED</span>
                        <span className="font-bold text-white">
                          {currentEffective.topSpeed} KM/H
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                          style={{ width: `${currentEffective.stats.speed}%` }}
                        />
                      </div>
                    </div>

                    {/* ACCELERATION */}
                    <div>
                      <div className="flex justify-between mb-1 text-neutral-300 text-[11px]">
                        <span>ACCELERATION</span>
                        <span className="font-bold text-white">{currentEffective.stats.accel}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-300"
                          style={{ width: `${currentEffective.stats.accel}%` }}
                        />
                      </div>
                    </div>

                    {/* HANDLING */}
                    <div>
                      <div className="flex justify-between mb-1 text-neutral-300 text-[11px]">
                        <span>HANDLING</span>
                        <span className="font-bold text-white">{currentEffective.stats.handling}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                          style={{ width: `${currentEffective.stats.handling}%` }}
                        />
                      </div>
                    </div>

                    {/* DRIFT */}
                    <div>
                      <div className="flex justify-between mb-1 text-neutral-300 text-[11px]">
                        <span>DRIFT</span>
                        <span className="font-bold text-white">{currentEffective.stats.drift}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full transition-all duration-300"
                          style={{ width: `${currentEffective.stats.drift}%` }}
                        />
                      </div>
                    </div>

                    {/* BRAKING */}
                    <div>
                      <div className="flex justify-between mb-1 text-neutral-300 text-[11px]">
                        <span>BRAKING</span>
                        <span className="font-bold text-white">{currentEffective.stats.braking}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-300"
                          style={{ width: `${currentEffective.stats.braking}%` }}
                        />
                      </div>
                    </div>

                    {/* NITRO BOOST */}
                    <div>
                      <div className="flex justify-between mb-1 text-neutral-300 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          <span>NITRO BOOST</span>
                        </span>
                        <span className="font-bold text-cyan-400">{currentEffective.stats.boost || 85}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/50"
                          style={{ width: `${currentEffective.stats.boost || 85}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade Button */}
                <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                  <div className="text-[9px] font-mono text-neutral-400 text-center">
                    {currentTier < 5
                      ? `UPGRADE TIER: +3.5% STAT BOOST • 400 COINS`
                      : 'MAXIMUM PERFORMANCE LEVEL'}
                  </div>

                  <button
                    onClick={() => handleUpgradeCar(selectedCar.id)}
                    disabled={currentTier >= 5 || coins < 400}
                    className={`w-full py-2.5 px-3 rounded-lg font-mono font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                      currentTier >= 5
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        : coins < 400
                        ? 'bg-neutral-800 text-neutral-400 border border-zinc-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black shadow-amber-500/20 active:scale-98'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {currentTier >= 5
                        ? 'MAXED (TIER 5)'
                        : coins < 400
                        ? `NEED 400 COINS (${400 - coins} MORE)`
                        : 'UPGRADE (+1 TIER)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Bar: BACK • UPGRADE • SELECT CAR */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              {/* BACK */}
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-xs font-mono font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                ← BACK
              </button>

              <div className="flex items-center gap-2">
                {/* UPGRADE */}
                <button
                  onClick={() => handleUpgradeCar(selectedCar.id)}
                  disabled={currentTier >= 5 || coins < 400}
                  className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-700 text-xs font-mono font-bold text-neutral-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  UPGRADE
                </button>

                {/* SELECT CAR */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('MAIN_MENU');
                  }}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-mono font-black text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SELECT CAR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. MINIMAL PREMIUM IN-RACE HUD
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {(gameState === 'RACING' || gameState === 'COUNTDOWN') && (
        <DesertRacerHUD
          speedKmh={playerSpeedKmh}
          topSpeed={currentEffective.topSpeed}
          position={playerPosition}
          totalRacers={5}
          lap={playerLap}
          totalLaps={selectedTrack.laps}
          raceTimeFormatted={raceTimeFormatted}
          bestTimeFormatted={bestTimeFormatted}
          trackProgress={trackProgress}
          aiProgressList={aiProgressList}
          checkpointText={checkpointText}
          checkpointDistanceMeters={checkpointDistanceMeters}
          checkpointBanner={checkpointBanner}
          driftScore={driftScore}
          currentDriftCombo={currentDriftCombo}
          driftMultiplier={driftMultiplier}
          isDrifting={isDrifting}
          boostRemaining={boostRemaining}
          isBoosting={isBoosting}
          countdownVal={countdownVal}
          isStarting={gameState === 'COUNTDOWN'}
          isMuted={!soundEnabled || sound.getIsMuted()}
          isFullscreen={isFullscreen}
          onToggleMute={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            sound.toggleMute();
          }}
          onToggleFullscreen={toggleFullscreen}
          onPause={() => setGameState('PAUSED')}
          onInputPress={handleInputPress}
          isMobile={isTouchDevice}
          trackName={selectedTrack.subtitle}
        />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. COMPACT CENTERED RACING-STYLE PAUSE MENU
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[280px] p-6 rounded-2xl bg-neutral-950/90 border border-zinc-800 shadow-2xl shadow-black/80 text-center animate-fadeIn">
            {/* Title: PAUSED */}
            <h3 className="text-xl font-black italic tracking-tight text-white mb-4">
              PAUSED
            </h3>

            {/* Action Buttons Stack: RESUME, RESTART, SETTINGS, EXIT RACE */}
            <div className="flex flex-col gap-2 font-mono text-xs">
              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('RACING');
                }}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                RESUME
              </button>

              <button
                onClick={startRace}
                className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                RESTART
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-neutral-300 hover:text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                SETTINGS
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="w-full py-2.5 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-zinc-800 text-neutral-400 hover:text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                EXIT RACE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. PREMIUM RACE COMPLETE RESULTS SCREEN
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'RACE_COMPLETE' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-sm p-6 sm:p-7 rounded-2xl bg-neutral-950/95 border border-zinc-800 shadow-2xl text-center animate-fadeIn font-mono">
            {/* Title: RACE COMPLETE */}
            <h3 className="text-xl sm:text-2xl font-black italic tracking-tight text-white mb-3">
              RACE COMPLETE
            </h3>

            {/* Position: 01 FIRST PLACE */}
            <div className="mb-4">
              <div className="text-4xl sm:text-5xl font-black text-amber-400 leading-none drop-shadow">
                {String(raceResult.position).padStart(2, '0')}
              </div>
              <div className="text-xs font-bold text-neutral-300 tracking-widest uppercase mt-1">
                {raceResult.position === 1
                  ? 'FIRST PLACE'
                  : raceResult.position === 2
                  ? 'SECOND PLACE'
                  : raceResult.position === 3
                  ? 'THIRD PLACE'
                  : `${raceResult.position}TH PLACE`}
              </div>
            </div>

            {/* Stats Grid: TIME, BEST TIME, DRIFT SCORE, REWARD */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs mb-4">
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-zinc-800">
                <div className="text-[9px] text-neutral-400 uppercase">TIME</div>
                <div className="text-sm font-bold text-white">{raceResult.timeStr}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-zinc-800">
                <div className="text-[9px] text-neutral-400 uppercase">BEST TIME</div>
                <div className="text-sm font-bold text-amber-400">
                  {raceResult.bestTimeStr}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-zinc-800">
                <div className="text-[9px] text-neutral-400 uppercase">DRIFT SCORE</div>
                <div className="text-sm font-bold text-amber-300">
                  {raceResult.driftScore.toLocaleString()}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-zinc-800">
                <div className="text-[9px] text-neutral-400 uppercase">REWARD</div>
                <div className="text-sm font-bold text-amber-400">
                  +{raceResult.earnedCoins.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Buttons: NEXT RACE, REPLAY, GARAGE, MAIN MENU */}
            <div className="flex flex-col gap-2 text-xs">
              <button
                onClick={() => {
                  sound.playClick();
                  const nextTrackIdx = (TRACKS.findIndex(t => t.id === selectedTrack.id) + 1) % TRACKS.length;
                  setSelectedTrack(TRACKS[nextTrackIdx]);
                  startRace();
                }}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                NEXT RACE
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={startRace}
                  className="py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  REPLAY
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('GARAGE');
                  }}
                  className="py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  GARAGE
                </button>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="w-full py-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-zinc-800 text-neutral-400 hover:text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. COMPACT MOTORSPORT FAILURE SCREEN (GAME OVER)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-[300px] p-6 rounded-2xl bg-neutral-950/95 border border-zinc-800 shadow-2xl text-center animate-fadeIn font-mono">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center mx-auto mb-2.5 shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-xl font-black italic tracking-tight text-white mb-0.5">
              RACE OVER
            </h3>
            <p className="text-[10px] text-rose-400 uppercase tracking-widest mb-4">
              TIME EXPIRED • MISSED CHECKPOINT
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4 text-left text-xs">
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-zinc-800">
                <div className="text-[9px] text-neutral-400 uppercase">POSITION</div>
                <div className="text-sm font-bold text-white">
                  {raceResult.position} / 5
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-zinc-800">
                <div className="text-[9px] text-neutral-400 uppercase">TIME</div>
                <div className="text-sm font-bold text-amber-400">{raceResult.timeStr}</div>
              </div>

              <div className="col-span-2 p-2.5 rounded-lg bg-neutral-900/80 border border-zinc-800">
                <div className="text-[9px] text-neutral-400 uppercase">DRIFT SCORE</div>
                <div className="text-sm font-bold text-white">{raceResult.score.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <button
                onClick={startRace}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:brightness-110 text-white font-black uppercase tracking-wider shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RETRY RACE</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('RACE_SELECT');
                }}
                className="w-full py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                RACE SELECT
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGameState('MAIN_MENU');
                }}
                className="w-full py-2 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-zinc-800 text-neutral-400 hover:text-white font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          9. COMPACT MOTORSPORT SETTINGS MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-[340px] p-5 sm:p-6 rounded-2xl bg-neutral-950/95 border border-zinc-800 shadow-2xl font-mono">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
              <h3 className="text-base font-black italic tracking-tight text-white uppercase flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>SETTINGS</span>
              </h3>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowSettings(false);
                }}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-zinc-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              {/* Sound FX Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/90 border border-zinc-800">
                <span className="text-neutral-300">SOUND FX</span>
                <button
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    sound.toggleMute();
                  }}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                    soundEnabled ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-neutral-400'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Engine Synth Audio */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900/90 border border-zinc-800">
                <span className="text-neutral-300">ENGINE AUDIO</span>
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                    musicEnabled ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-neutral-400'
                  }`}
                >
                  {musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Steering Sensitivity */}
              <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-zinc-800 space-y-1.5">
                <div className="flex justify-between text-neutral-300 text-[11px]">
                  <span>STEERING SENSITIVITY</span>
                  <span className="text-amber-400 font-bold">{sensitivity}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => {
                        sound.playClick();
                        setSensitivity(s);
                      }}
                      className={`py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        sensitivity === s
                          ? 'bg-amber-400 text-black'
                          : 'bg-zinc-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls Reference */}
              <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-zinc-800 space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-neutral-400 tracking-wider">CONTROLS GUIDE</span>
                <div className="space-y-1 text-[10px] text-neutral-300">
                  <div className="flex justify-between">
                    <span>STEER:</span>
                    <span className="font-bold text-white">A / D or ← / →</span>
                  </div>
                  <div className="flex justify-between">
                    <span>THROTTLE / BRAKE:</span>
                    <span className="font-bold text-white">W / S or ↑ / ↓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DRIFT:</span>
                    <span className="font-bold text-amber-400">SPACEBAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PAUSE:</span>
                    <span className="font-bold text-white">ESC</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setShowSettings(false);
              }}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black uppercase tracking-wider text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
