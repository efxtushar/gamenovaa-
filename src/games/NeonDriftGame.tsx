import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import { isLeftKey, isRightKey, isUpKey, isDownKey } from '../utils/gameInput';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Trophy,
  Zap,
  Volume2,
  Pause,
  ArrowLeft,
  Flame,
  HelpCircle,
  X,
  Settings,
  Compass,
  Maximize2
} from 'lucide-react';
import {
  ActiveEventState,
  Particle,
  SkidMark,
  TrafficCar,
  RaceEvent,
  DriftZone,
  SpeedTrap
} from './neon-drift/types';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  DISTRICTS,
  ROADS,
  BUILDINGS,
  SPEED_TRAPS,
  DRIFT_ZONES,
  JUMP_RAMPS
} from './neon-drift/worldMap';
import { RACE_EVENTS } from './neon-drift/eventsSystem';
import { initTrafficSystem, updateTrafficCars } from './neon-drift/trafficSystem';
import { renderOpenWorld } from './neon-drift/openWorldRenderer';
import { OpenWorldHud } from './neon-drift/hudComponents';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

export const NeonDriftGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_neon-drift') || '0', 10);
  });
  const [nitro, setNitro] = useState(100);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [driftPoints, setDriftPoints] = useState(0);
  const [driftMultiplier, setDriftMultiplier] = useState(1);
  const [isDrifting, setIsDrifting] = useState(false);
  const [airtimeSecs, setAirtimeSecs] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [forceTouchControls, setForceTouchControls] = useState(false);

  // Open World telemetry & status
  const [districtName, setDistrictName] = useState('Downtown Metropolis');
  const [activeEvent, setActiveEvent] = useState<ActiveEventState | null>(null);
  const [nearbyEvent, setNearbyEvent] = useState<RaceEvent | null>(null);
  const [activityBanner, setActivityBanner] = useState<{
    text: string;
    subText?: string;
    color?: string;
  } | null>(null);

  // Player position for HUD minimap
  const [playerHudPos, setPlayerHudPos] = useState({ x: 1600, y: 1800, angle: Math.PI * 0.5 });

  // Touch device detection
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));
  }, []);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (soundEnabled) sound.playClick();
    try {
      if (!document.fullscreenElement) {
        const target = containerRef.current || document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Fullscreen not supported or blocked
    }
  };

  // State ref for 60 FPS Open World Physics & Simulation Loop
  const stateRef = useRef({
    // Player car state
    carX: 1600, // Downtown Grand Central
    carY: 1800,
    carAngle: Math.PI * 0.5, // facing East
    carSpeed: 0,
    carVx: 0,
    carVy: 0,

    topCruiseSpeed: 9.2, // ~200 km/h
    topNitroSpeed: 13.5, // ~290 km/h
    accelRate: 0.16,
    brakeRate: 0.32,
    reverseTopSpeed: -3.5,
    steerAngle: 0,
    wheelAngle: 0,
    driftAngle: 0,
    isDrifting: false,
    driftAccumulator: 0,
    driftMultiplier: 1,
    driftCooldown: 0,

    nitro: 100,
    nitroActive: false,

    // Airtime physics (Stunt ramps)
    jumpHeight: 0,
    jumpVelocity: 0,
    isAirborne: false,
    airtimeDuration: 0,

    invulnTimer: 0,
    screenShake: 0,

    // Camera
    camX: 1600,
    camY: 1800,

    // Telemetry & scoring
    score: 0,
    totalDriftScore: 0,
    maxSpeedKmh: 0,

    // Traffic System
    trafficCars: initTrafficSystem(14),

    // Visual particles & skid marks
    particles: [] as Particle[],
    skidMarks: [] as SkidMark[],

    // World state
    activeEvent: null as ActiveEventState | null,
    nearbyEvent: null as RaceEvent | null,
    activeDriftZone: null as DriftZone | null,
    speedTrapFlash: 0,
    speedTrapCooldown: 0,

    // Banner timer
    bannerTimer: 0,

    // Input state
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      space: false,
      nitro: false,
      interact: false
    },

    frameCounter: 0
  });

  const startGame = useCallback(() => {
    if (soundEnabled) sound.playClick();

    stateRef.current = {
      carX: 1600,
      carY: 1800,
      carAngle: Math.PI * 0.5,
      carSpeed: 2.0,
      carVx: 2.0,
      carVy: 0,

      topCruiseSpeed: 9.2,
      topNitroSpeed: 13.5,
      accelRate: 0.16,
      brakeRate: 0.32,
      reverseTopSpeed: -3.5,
      steerAngle: 0,
      wheelAngle: 0,
      driftAngle: 0,
      isDrifting: false,
      driftAccumulator: 0,
      driftMultiplier: 1,
      driftCooldown: 0,

      nitro: 100,
      nitroActive: false,

      jumpHeight: 0,
      jumpVelocity: 0,
      isAirborne: false,
      airtimeDuration: 0,

      invulnTimer: 0,
      screenShake: 0,

      camX: 1600,
      camY: 1800,

      score: 0,
      totalDriftScore: 0,
      maxSpeedKmh: 0,

      trafficCars: initTrafficSystem(14),
      particles: [],
      skidMarks: [],

      activeEvent: null,
      nearbyEvent: null,
      activeDriftZone: null,
      speedTrapFlash: 0,
      speedTrapCooldown: 0,
      bannerTimer: 0,

      keys: {
        left: false,
        right: false,
        up: false,
        down: false,
        space: false,
        nitro: false,
        interact: false
      },

      frameCounter: 0
    };

    setGameState('PLAYING');
    setScore(0);
    setActiveEvent(null);
    setNearbyEvent(null);
    setActivityBanner(null);
  }, [soundEnabled]);

  // Start a nearby race event
  const handleStartEvent = useCallback((event: RaceEvent) => {
    const s = stateRef.current;
    s.activeEvent = {
      event,
      currentCheckpointIndex: 0,
      startTime: performance.now(),
      elapsedTime: 0,
      isCompleted: false
    };
    s.nearbyEvent = null;
    setActiveEvent(s.activeEvent);
    setNearbyEvent(null);

    setActivityBanner({
      text: `🏁 ${event.name.toUpperCase()} STARTED!`,
      subText: event.description,
      color: 'cyan'
    });
    s.bannerTimer = 180;

    if (soundEnabled) sound.playPowerUp();
  }, [soundEnabled]);

  // Abort active event back to free roam
  const handleAbortEvent = useCallback(() => {
    const s = stateRef.current;
    s.activeEvent = null;
    setActiveEvent(null);
    setActivityBanner({
      text: 'FREE ROAM RESUMED',
      color: 'cyan'
    });
    s.bannerTimer = 120;
    if (soundEnabled) sound.playClick();
  }, [soundEnabled]);

  // Auto-resize Canvas dynamically
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    updateCanvasSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(updateCanvasSize);
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateCanvasSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (isUpKey(e)) k.up = true;
      if (isDownKey(e)) k.down = true;
      if (isLeftKey(e)) {
        k.left = true;
        k.right = false;
      }
      if (isRightKey(e)) {
        k.right = true;
        k.left = false;
      }
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          k.space = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          k.nitro = true;
          break;
        case 'KeyE':
        case 'Enter':
          k.interact = true;
          if (stateRef.current.nearbyEvent && !stateRef.current.activeEvent) {
            handleStartEvent(stateRef.current.nearbyEvent);
          }
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyP':
        case 'Escape':
          setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (isUpKey(e)) k.up = false;
      if (isDownKey(e)) k.down = false;
      if (isLeftKey(e)) k.left = false;
      if (isRightKey(e)) k.right = false;
      switch (e.code) {
        case 'Space':
          k.space = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          k.nitro = false;
          break;
        case 'KeyE':
        case 'Enter':
          k.interact = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleStartEvent]);

  // Main 60 FPS Open World Simulation Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const now = performance.now();
      s.frameCounter++;

      // 1. NITRO BOOST & ACCELERATION / BRAKING / REVERSE
      s.nitroActive = s.keys.nitro && s.nitro > 0;
      if (s.nitroActive) {
        s.nitro = Math.max(0, s.nitro - 0.45);
        s.carSpeed = Math.min(s.topNitroSpeed, s.carSpeed + s.accelRate * 2.2);
        s.screenShake = Math.min(2.0, s.screenShake + 0.2);

        // Spawn cyan nitro flames behind the car
        if (s.particles.length < 50 && Math.random() < 0.75) {
          const rearDist = 45;
          const rx = s.carX - Math.sin(s.carAngle) * rearDist + (Math.random() - 0.5) * 12;
          const ry = s.carY + Math.cos(s.carAngle) * rearDist + (Math.random() - 0.5) * 12;
          s.particles.push({
            x: rx,
            y: ry,
            vx: -Math.sin(s.carAngle) * (4 + Math.random() * 4),
            vy: Math.cos(s.carAngle) * (4 + Math.random() * 4),
            size: 3 + Math.random() * 3,
            color: '#00f5ff',
            alpha: 1,
            life: 12,
            maxLife: 12,
            type: 'nitro'
          });
        }
      } else {
        // Regenerate nitro slowly
        s.nitro = Math.min(100, s.nitro + 0.16);

        if (s.keys.up) {
          // Accelerate forward
          s.carSpeed = Math.min(s.topCruiseSpeed, s.carSpeed + s.accelRate);
        } else if (s.keys.down) {
          // Brake or Reverse
          if (s.carSpeed > 0.4) {
            s.carSpeed = Math.max(0, s.carSpeed - s.brakeRate);
          } else {
            // Reverse gear
            s.carSpeed = Math.max(s.reverseTopSpeed, s.carSpeed - s.accelRate * 0.7);
          }
        } else {
          // Coasting drag
          if (s.carSpeed > 0) {
            s.carSpeed = Math.max(0, s.carSpeed - 0.04);
          } else if (s.carSpeed < 0) {
            s.carSpeed = Math.min(0, s.carSpeed + 0.05);
          }
        }
      }

      // 2. STEERING & REALISTIC DRIFTING PHYSICS
      const speedRatio = Math.min(1.0, Math.abs(s.carSpeed) / 6.0);
      const isReversing = s.carSpeed < 0;
      const steerDirection = isReversing ? -1 : 1;

      if (s.keys.left) {
        s.wheelAngle = -0.42;
        s.steerAngle = -0.042 * speedRatio * steerDirection;
      } else if (s.keys.right) {
        s.wheelAngle = 0.42;
        s.steerAngle = 0.042 * speedRatio * steerDirection;
      } else {
        s.wheelAngle *= 0.65;
        s.steerAngle *= 0.65;
      }

      // Drift handbrake mechanic
      s.isDrifting = (s.keys.space || (s.nitroActive && Math.abs(s.steerAngle) > 0.02)) && Math.abs(s.carSpeed) > 3.0;

      if (s.isDrifting) {
        // Accelerate car angular rotation while maintaining slide velocity
        s.carAngle += s.steerAngle * 1.6;
        s.carSpeed = Math.max(2.5, s.carSpeed - 0.02); // slight drift scrub

        // Active drift zone multiplier
        const currentMult = s.activeDriftZone ? s.activeDriftZone.multiplier : 1;
        s.driftMultiplier = currentMult;

        // Accumulate drift score
        s.driftAccumulator += Math.floor(Math.abs(s.carSpeed) * 14 * currentMult);

        // Spawn tire smoke & skid marks behind left and right rear tires
        if (s.frameCounter % 2 === 0) {
          const rearDist = 32;
          const leftX = s.carX - Math.sin(s.carAngle) * rearDist - Math.cos(s.carAngle) * 18;
          const leftY = s.carY + Math.cos(s.carAngle) * rearDist - Math.sin(s.carAngle) * 18;
          const rightX = s.carX - Math.sin(s.carAngle) * rearDist + Math.cos(s.carAngle) * 18;
          const rightY = s.carY + Math.cos(s.carAngle) * rearDist + Math.sin(s.carAngle) * 18;

          // Skid marks (capped at 160 for high performance)
          if (s.skidMarks.length > 160) s.skidMarks.shift();
          s.skidMarks.push({
            x1: leftX,
            y1: leftY,
            x2: leftX + Math.sin(s.carAngle) * 4,
            y2: leftY - Math.cos(s.carAngle) * 4,
            alpha: 0.65
          });

          // Tire smoke particles
          if (s.particles.length < 50) {
            s.particles.push({
              x: (leftX + rightX) / 2 + (Math.random() - 0.5) * 8,
              y: (leftY + rightY) / 2 + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              size: 4 + Math.random() * 5,
              color: 'rgba(203, 213, 225, 0.5)',
              alpha: 0.7,
              life: 20,
              maxLife: 20,
              type: 'smoke'
            });
          }
        }
      } else {
        // Standard grip steering
        s.carAngle += s.steerAngle;

        // Bank drift score when drifting ends
        if (s.driftAccumulator > 0) {
          s.score += s.driftAccumulator;
          s.totalDriftScore += s.driftAccumulator;
          s.driftAccumulator = 0;
          s.driftMultiplier = 1;
        }
      }

      // Normalise angle to 0..2π
      s.carAngle = (s.carAngle + Math.PI * 2) % (Math.PI * 2);

      // 3. APPLY VELOCITY VECTOR & FORWARD MOVEMENT
      s.carVx = Math.sin(s.carAngle) * s.carSpeed;
      s.carVy = -Math.cos(s.carAngle) * s.carSpeed;

      s.carX += s.carVx;
      s.carY += s.carVy;

      // 4. AIRTIME STUNT RAMPS PHYSICS
      for (const ramp of JUMP_RAMPS) {
        const distToRamp = Math.hypot(s.carX - ramp.x, s.carY - ramp.y);
        if (distToRamp < 40 && !s.isAirborne && s.carSpeed > 4.5) {
          s.isAirborne = true;
          s.jumpVelocity = ramp.boost;
          s.airtimeDuration = 0;
          if (soundEnabled) sound.playJump();
        }
      }

      if (s.isAirborne) {
        s.jumpHeight += s.jumpVelocity;
        s.jumpVelocity -= 0.65; // gravity
        s.airtimeDuration += 1 / 60;

        if (s.jumpHeight <= 0) {
          // Landing with bonus stunt points
          s.jumpHeight = 0;
          s.jumpVelocity = 0;
          s.isAirborne = false;
          const airtimePoints = Math.floor(s.airtimeDuration * 600);
          s.score += airtimePoints;
          s.screenShake = 2.5;

          // Landing sparks
          for (let sp = 0; sp < 8; sp++) {
            s.particles.push({
              x: s.carX + (Math.random() - 0.5) * 20,
              y: s.carY + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              size: 2.5,
              color: '#facc15',
              alpha: 1,
              life: 14,
              maxLife: 14,
              type: 'spark'
            });
          }
          if (soundEnabled) sound.playClick();
        }
      }

      // 5. MAP BOUNDARIES & SAFE RETENTION (Do not hard reset, soft bounce)
      if (s.carX < 60) {
        s.carX = 60;
        s.carSpeed *= -0.4;
      } else if (s.carX > WORLD_WIDTH - 60) {
        s.carX = WORLD_WIDTH - 60;
        s.carSpeed *= -0.4;
      }
      if (s.carY < 60) {
        s.carY = 60;
        s.carSpeed *= -0.4;
      } else if (s.carY > WORLD_HEIGHT - 60) {
        s.carY = WORLD_HEIGHT - 60;
        s.carSpeed *= -0.4;
      }

      // 6. BUILDING AABB COLLISIONS (Elastic bounce, sparks, no clipping)
      for (const b of BUILDINGS) {
        // Expand building bounding box by car radius ~20
        const pad = 22;
        if (
          s.carX > b.x - pad &&
          s.carX < b.x + b.width + pad &&
          s.carY > b.y - pad &&
          s.carY < b.y + b.height + pad
        ) {
          // Find closest push-out edge
          const dl = s.carX - (b.x - pad);
          const dr = b.x + b.width + pad - s.carX;
          const dt = s.carY - (b.y - pad);
          const db = b.y + b.height + pad - s.carY;
          const minOverlap = Math.min(dl, dr, dt, db);

          if (minOverlap === dl) s.carX = b.x - pad;
          else if (minOverlap === dr) s.carX = b.x + b.width + pad;
          else if (minOverlap === dt) s.carY = b.y - pad;
          else if (minOverlap === db) s.carY = b.y + b.height + pad;

          s.carSpeed *= -0.35;
          s.screenShake = 2.0;

          // Sparks
          for (let sp = 0; sp < 6; sp++) {
            s.particles.push({
              x: s.carX,
              y: s.carY,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              size: 2,
              color: '#f97316',
              alpha: 1,
              life: 10,
              maxLife: 10,
              type: 'spark'
            });
          }

          if (soundEnabled && s.invulnTimer <= 0) {
            sound.playHit();
            s.invulnTimer = 20;
          }
        }
      }

      if (s.invulnTimer > 0) s.invulnTimer--;

      // 7. TRAFFIC CARS SIMULATION & COLLISIONS
      updateTrafficCars(s.trafficCars, s.carX, s.carY, s.carSpeed);

      for (const tc of s.trafficCars) {
        const d = Math.hypot(s.carX - tc.x, s.carY - tc.y);
        if (d < 46) {
          // Push apart
          const pushAngle = Math.atan2(s.carY - tc.y, s.carX - tc.x);
          s.carX += Math.cos(pushAngle) * 5;
          s.carY += Math.sin(pushAngle) * 5;
          tc.x -= Math.cos(pushAngle) * 5;
          tc.y -= Math.sin(pushAngle) * 5;

          s.carSpeed *= 0.65;
          tc.speed *= 0.5;
          s.screenShake = 1.8;

          // Sparks
          for (let sp = 0; sp < 4; sp++) {
            s.particles.push({
              x: (s.carX + tc.x) / 2,
              y: (s.carY + tc.y) / 2,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              size: 2,
              color: '#00f5ff',
              alpha: 1,
              life: 10,
              maxLife: 10,
              type: 'spark'
            });
          }
          if (soundEnabled && s.invulnTimer <= 0) {
            sound.playHit();
            s.invulnTimer = 25;
          }
        }
      }

      // 8. SPEED TRAP RADAR ACTIVITIES
      if (s.speedTrapCooldown > 0) s.speedTrapCooldown--;
      const curKmh = Math.floor(Math.abs(s.carSpeed) * 22);

      for (const st of SPEED_TRAPS) {
        const d = Math.hypot(s.carX - st.x, s.carY - st.y);
        if (d < st.radius && s.speedTrapCooldown <= 0 && curKmh >= st.targetKmh) {
          s.speedTrapFlash = 1.0;
          s.speedTrapCooldown = 240; // 4 second cooldown
          s.score += 2000;

          setActivityBanner({
            text: `📸 SPEED TRAP FLASH: ${curKmh} KM/H!`,
            subText: `TARGET PASSED! +2,000 PTS`,
            color: 'amber'
          });
          s.bannerTimer = 180;
          if (soundEnabled) sound.playPowerUp();
        }
      }

      if (s.speedTrapFlash > 0) {
        s.speedTrapFlash = Math.max(0, s.speedTrapFlash - 0.08);
      }

      // 9. DRIFT ZONE DETECTION
      let inZone: DriftZone | null = null;
      for (const dz of DRIFT_ZONES) {
        if (
          s.carX > dz.x &&
          s.carX < dz.x + dz.width &&
          s.carY > dz.y &&
          s.carY < dz.y + dz.height
        ) {
          inZone = dz;
          break;
        }
      }
      s.activeDriftZone = inZone;

      // 10. CURRENT DISTRICT IDENTIFICATION
      let curDistrictName = 'Downtown Metropolis';
      for (const dist of DISTRICTS) {
        const b = dist.bounds;
        if (s.carX >= b.minX && s.carX <= b.maxX && s.carY >= b.minY && s.carY <= b.maxY) {
          curDistrictName = dist.name;
          break;
        }
      }

      // 11. NEARBY EVENT DETECTION (Free Roam)
      if (!s.activeEvent) {
        let closeEvent: RaceEvent | null = null;
        for (const ev of RACE_EVENTS) {
          const d = Math.hypot(s.carX - ev.startPos.x, s.carY - ev.startPos.y);
          if (d < 120) {
            closeEvent = ev;
            break;
          }
        }
        s.nearbyEvent = closeEvent;
      }

      // 12. ACTIVE EVENT CHECKPOINT ADVANCEMENT
      if (s.activeEvent) {
        const ev = s.activeEvent;
        const cp = ev.event.checkpoints[ev.currentCheckpointIndex];
        const distToCp = Math.hypot(s.carX - cp.x, s.carY - cp.y);

        if (distToCp < cp.radius) {
          // Checkpoint cleared!
          ev.currentCheckpointIndex++;
          if (soundEnabled) sound.playPowerUp();

          // Gate fireworks sparks
          for (let p = 0; p < 12; p++) {
            s.particles.push({
              x: cp.x,
              y: cp.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              size: 3,
              color: ev.event.color,
              alpha: 1,
              life: 18,
              maxLife: 18,
              type: 'spark'
            });
          }

          if (ev.currentCheckpointIndex >= ev.event.checkpoints.length) {
            // EVENT VICTORY!
            ev.isCompleted = true;
            s.score += ev.event.rewardPoints;

            setActivityBanner({
              text: `🏆 ${ev.event.name.toUpperCase()} COMPLETED!`,
              subText: `+${ev.event.rewardPoints.toLocaleString()} PTS! RETURNED TO FREE ROAM`,
              color: 'cyan'
            });
            s.bannerTimer = 240;

            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 }
            });

            s.activeEvent = null;
          }
        }
      }

      // Update particle lifespans
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
        }
      }

      // Banner timer countdown
      if (s.bannerTimer > 0) {
        s.bannerTimer--;
        if (s.bannerTimer === 0) setActivityBanner(null);
      }

      // Smooth Camera following with forward lookahead
      const lookDist = s.carSpeed * 12;
      const targetCamX = s.carX + Math.sin(s.carAngle) * lookDist;
      const targetCamY = s.carY - Math.cos(s.carAngle) * lookDist;
      s.camX += (targetCamX - s.camX) * 0.085;
      s.camY += (targetCamY - s.camY) * 0.085;

      // Screen shake damping
      if (s.screenShake > 0) {
        s.camX += (Math.random() - 0.5) * s.screenShake * 4;
        s.camY += (Math.random() - 0.5) * s.screenShake * 4;
        s.screenShake = Math.max(0, s.screenShake - 0.12);
      }

      // 13. RENDER THE COMPLETE OPEN-WORLD CANVAS
      renderOpenWorld({
        ctx,
        viewWidth: w,
        viewHeight: h,
        camX: s.camX,
        camY: s.camY,
        playerX: s.carX,
        playerY: s.carY,
        playerAngle: s.carAngle,
        playerSpeed: s.carSpeed,
        wheelAngle: s.wheelAngle,
        isBraking: s.keys.down && s.carSpeed > 0.4,
        isAccelerating: s.keys.up,
        isNitro: s.nitroActive,
        jumpHeight: s.jumpHeight,
        isDrifting: s.isDrifting,
        invulnerable: s.invulnTimer > 0,
        trafficCars: s.trafficCars,
        particles: s.particles,
        skidMarks: s.skidMarks,
        activeEvent: s.activeEvent,
        nearbyEvent: s.nearbyEvent,
        activeDriftZone: s.activeDriftZone,
        speedTrapFlash: s.speedTrapFlash,
        time: now
      });

      // 14. SYNC HUD STATE ONCE EVERY 4 FRAMES
      if (s.frameCounter % 4 === 0) {
        const speedVal = Math.floor(Math.abs(s.carSpeed) * 22);
        setSpeedKmh(speedVal);
        setNitro(Math.floor(s.nitro));
        setScore(s.score);
        setIsDrifting(s.isDrifting);
        setDriftPoints(s.driftAccumulator);
        setDriftMultiplier(s.driftMultiplier);
        setAirtimeSecs(s.airtimeDuration);
        setDistrictName(curDistrictName);
        setActiveEvent(s.activeEvent ? { ...s.activeEvent } : null);
        setNearbyEvent(s.nearbyEvent ? { ...s.nearbyEvent } : null);
        setPlayerHudPos({ x: s.carX, y: s.carY, angle: s.carAngle });

        if (s.score > highScore) {
          setHighScore(s.score);
          localStorage.setItem('gamenova_hs_neon-drift', s.score.toString());
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, highScore, soundEnabled]);

  // Touch control callbacks
  const handleSteerLeftStart = () => {
    stateRef.current.keys.left = true;
    stateRef.current.keys.right = false;
  };
  const handleSteerLeftEnd = () => {
    stateRef.current.keys.left = false;
  };
  const handleSteerRightStart = () => {
    stateRef.current.keys.right = true;
    stateRef.current.keys.left = false;
  };
  const handleSteerRightEnd = () => {
    stateRef.current.keys.right = false;
  };
  const handleGasStart = () => {
    stateRef.current.keys.up = true;
    stateRef.current.keys.down = false;
  };
  const handleGasEnd = () => {
    stateRef.current.keys.up = false;
  };
  const handleBrakeStart = () => {
    stateRef.current.keys.down = true;
    stateRef.current.keys.up = false;
  };
  const handleBrakeEnd = () => {
    stateRef.current.keys.down = false;
  };
  const handleDriftStart = () => {
    stateRef.current.keys.space = true;
  };
  const handleDriftEnd = () => {
    stateRef.current.keys.space = false;
  };
  const handleBoostStart = () => {
    stateRef.current.keys.nitro = true;
  };
  const handleBoostEnd = () => {
    stateRef.current.keys.nitro = false;
  };

  return (
    <div
      ref={containerRef}
      id="neon-drift-game-container"
      className="relative w-full h-full min-h-[500px] bg-slate-950 flex items-center justify-center overflow-hidden select-none font-sans"
    >
      {/* Primary Canvas */}
      <canvas
        ref={canvasRef}
        id="neon-drift-canvas"
        className="w-full h-full block cursor-crosshair"
      />

      {/* -------------------------------------------------------------
          ACTIVE IN-GAME OPEN WORLD HUD
          ------------------------------------------------------------- */}
      {gameState === 'PLAYING' && (
        <OpenWorldHud
          districtName={districtName}
          activeEvent={activeEvent}
          nearbyEvent={nearbyEvent}
          onStartNearbyEvent={() => {
            if (nearbyEvent) handleStartEvent(nearbyEvent);
          }}
          onAbortEvent={handleAbortEvent}
          onExitGame={onBack}
          playerX={playerHudPos.x}
          playerY={playerHudPos.y}
          playerAngle={playerHudPos.angle}
          speedKmh={speedKmh}
          nitroPercent={nitro}
          isNitroActive={stateRef.current.nitroActive}
          isDrifting={isDrifting}
          driftScore={driftPoints}
          driftMultiplier={driftMultiplier}
          airtimeSecs={airtimeSecs}
          score={score}
          highScore={highScore}
          activityBanner={activityBanner}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isPaused={false}
          onTogglePause={() => setGameState('PAUSED')}
          isTouchDevice={isTouchDevice}
          forceTouchControls={forceTouchControls}
          onSteerLeftStart={handleSteerLeftStart}
          onSteerLeftEnd={handleSteerLeftEnd}
          onSteerRightStart={handleSteerRightStart}
          onSteerRightEnd={handleSteerRightEnd}
          onGasStart={handleGasStart}
          onGasEnd={handleGasEnd}
          onBrakeStart={handleBrakeStart}
          onBrakeEnd={handleBrakeEnd}
          onDriftStart={handleDriftStart}
          onDriftEnd={handleDriftEnd}
          onBoostStart={handleBoostStart}
          onBoostEnd={handleBoostEnd}
        />
      )}

      {/* -------------------------------------------------------------
          START SCREEN OVERLAY
          ------------------------------------------------------------- */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 z-40">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,245,255,0.2)] text-center flex flex-col items-center">
            {/* Title & Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-black tracking-widest uppercase mb-3">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> OPEN WORLD EDITION
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-fuchsia-400 tracking-tight drop-shadow-[0_0_20px_rgba(0,245,255,0.6)]">
              NEON DRIFT
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xs">
              Explore a connected open-world neon coastal city. Drift anywhere, trigger speed traps, launch off stunt ramps, and compete in optional street races!
            </p>

            {/* Key Features Overview */}
            <div className="mt-4 grid grid-cols-2 gap-2 w-full text-left font-mono text-[10px]">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
                <span className="text-cyan-400 font-bold block">🌆 FREE ROAM</span>
                <span className="text-slate-400">Drive anywhere in the city without track limits</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
                <span className="text-amber-400 font-bold block">🏁 STREET RACES</span>
                <span className="text-slate-400">6 optional events across highways & avenues</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
                <span className="text-fuchsia-400 font-bold block">⚡ DRIFT ZONES</span>
                <span className="text-slate-400">3x multipliers at the Neon Drift Arena</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
                <span className="text-emerald-400 font-bold block">🚗 CITY TRAFFIC</span>
                <span className="text-slate-400">Dynamic AI vehicles navigating city roads</span>
              </div>
            </div>

            {/* High Score Badge */}
            {highScore > 0 && (
              <div className="mt-4 px-4 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs text-slate-300">
                  RECORD:{' '}
                  <strong className="text-amber-400 font-black">{highScore.toLocaleString()}</strong>
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                id="neon-drift-start-btn"
                type="button"
                onClick={startGame}
                className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-slate-950 font-mono text-sm font-black tracking-wider flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,245,255,0.4)] active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START DRIVING</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHowToPlay(true)}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>CONTROLS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          PAUSE MODAL
          ------------------------------------------------------------- */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-40">
          <div className="max-w-xs w-full p-6 rounded-3xl bg-slate-900 border border-white/15 shadow-2xl text-center flex flex-col items-center">
            <h2 className="text-2xl font-black text-white tracking-wide font-mono">GAME PAUSED</h2>
            <p className="mt-1 text-xs text-slate-400">Neon Drift • Open World</p>

            <div className="mt-5 flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => setGameState('PLAYING')}
                className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-black tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
              >
                RESUME
              </button>

              <button
                type="button"
                onClick={startGame}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/15 font-mono text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                RESTART CITY
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="py-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  BACK TO CATALOG
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CONTROLS / HOW TO PLAY MODAL
          ------------------------------------------------------------- */}
      {showHowToPlay && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-cyan-500/30 text-slate-200 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-mono text-base font-black text-cyan-300 flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" /> OPEN WORLD CONTROLS
              </h3>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400">Accelerate / Gas</span>
                <span className="font-mono text-cyan-300 font-bold">W / ↑</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400">Brake / Reverse</span>
                <span className="font-mono text-rose-300 font-bold">S / ↓</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400">Steer Left / Right</span>
                <span className="font-mono text-cyan-300 font-bold">A / D or ← / →</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400">Power Drift</span>
                <span className="font-mono text-purple-300 font-bold">SPACEBAR</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400">Nitro Boost</span>
                <span className="font-mono text-cyan-300 font-bold">SHIFT</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400">Start Nearby Event</span>
                <span className="font-mono text-amber-300 font-bold">E / ENTER</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-slate-400">Pause Game</span>
                <span className="font-mono text-slate-300 font-bold">ESC / P</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-mono text-xs font-black tracking-wider hover:bg-cyan-400 transition-all cursor-pointer"
            >
              GOT IT, LET'S CRUISE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
