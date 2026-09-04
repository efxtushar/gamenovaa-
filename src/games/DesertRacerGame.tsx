import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { 
  Play, RotateCcw, Trophy, Gauge, Zap, Volume2, VolumeX, 
  Pause, Shield, Flag, Clock, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Sparkles, CheckCircle2, AlertTriangle, ChevronRight
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

// Particle interface for smoke, dust, sparks, and nitro flames
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
  type: 'dust' | 'smoke' | 'spark' | 'nitro';
}

// AI Rival Car
interface RivalCar {
  id: number;
  name: string;
  x: number;
  y: number;
  speed: number;
  targetSpeed: number;
  baseSpeed: number;
  width: number;
  height: number;
  bodyColor: string;
  roofColor: string;
  laneTarget: number;
  distance: number;
  lap: number;
  currentSegment: number;
}

// Track Obstacle / Collectible
interface TrackEntity {
  id: number;
  x: number;
  y: number;
  type: 'cactus' | 'rock' | 'barrel' | 'coin' | 'nitro' | 'checkpoint' | 'finish';
  collected?: boolean;
  width: number;
  height: number;
}

// Curved Road Segment
interface RoadPoint {
  x: number;
  y: number;
  width: number;
  curve: number;
}

const TOTAL_LAPS = 3;
const TRACK_LENGTH = 16000; // Track world length in units
const CHECKPOINT_INTERVAL = 4000;

export const DesertRacerGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'COUNTDOWN' | 'RACING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_desert-racer') || '0', 10);
  });
  const [lap, setLap] = useState(1);
  const [position, setPosition] = useState(8);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [nitro, setNitro] = useState(100);
  const [health, setHealth] = useState(100);
  const [timeRemaining, setTimeRemaining] = useState(50);
  const [totalRaceTime, setTotalRaceTime] = useState(0);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [countdownNum, setCountdownNum] = useState<number | string>(3);
  const [soundMuted, setSoundMuted] = useState(sound.getIsMuted());
  const [checkpointFlash, setCheckpointFlash] = useState<string | null>(null);

  // Engine state ref for seamless 60FPS loop
  const stateRef = useRef({
    player: {
      x: 0, // Road horizontal offset (-1 to 1 is on asphalt, >1 is shoulder/offroad)
      y: 0, // Track progress along road (0 to TRACK_LENGTH)
      speed: 0,
      maxSpeed: 24,
      accel: 0.14,
      decel: 0.07,
      brake: 0.28,
      steer: 0,
      steerAngle: 0,
      nitro: 100,
      health: 100,
      lap: 1,
      totalDistance: 0,
      lapStartTime: 0,
      bestLap: null as number | null
    },
    rivals: [] as RivalCar[],
    entities: [] as TrackEntity[],
    particles: [] as Particle[],
    roadOffset: 0,
    currentCurve: 0,
    targetCurve: 0,
    cameraY: 0,
    shake: 0,
    timeRemaining: 50,
    raceStartTime: 0,
    lastTime: 0,
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      nitro: false
    },
    isCountingDown: false,
    raceFinished: false,
    score: 0,
    checkpointNotification: null as { text: string; time: number } | null
  });

  // Track shape generator: smooth curves, straightaways, and bends
  const getTrackCurveAt = (distance: number): number => {
    const pos = (distance % TRACK_LENGTH) / TRACK_LENGTH;
    if (pos < 0.15) return 0; // Starting straight
    if (pos < 0.25) return Math.sin((pos - 0.15) * 10 * Math.PI) * 0.45; // Turn 1
    if (pos < 0.35) return -Math.sin((pos - 0.25) * 10 * Math.PI) * 0.55; // Turn 2 Hairpin
    if (pos < 0.50) return Math.sin((pos - 0.35) * 6.66 * Math.PI) * 0.25; // S-Curve
    if (pos < 0.65) return 0; // Canyon Straight
    if (pos < 0.78) return -Math.sin((pos - 0.65) * 7.7 * Math.PI) * 0.6; // Sand Dune Sweep
    if (pos < 0.90) return Math.sin((pos - 0.78) * 8.33 * Math.PI) * 0.35; // Final Chicanes
    return 0; // Finish line straight
  };

  // Initialize track items and opponents
  const initRaceWorld = useCallback(() => {
    const rivals: RivalCar[] = [
      { id: 1, name: 'Scorpion RS', x: -0.4, y: 350, speed: 14.5, targetSpeed: 15.5, baseSpeed: 15.0, width: 44, height: 74, bodyColor: '#ef4444', roofColor: '#1e293b', laneTarget: -0.4, distance: 350, lap: 1, currentSegment: 0 },
      { id: 2, name: 'Sandstorm GT', x: 0.35, y: 700, speed: 15.2, targetSpeed: 16.2, baseSpeed: 15.8, width: 42, height: 72, bodyColor: '#f59e0b', roofColor: '#0f172a', laneTarget: 0.35, distance: 700, lap: 1, currentSegment: 0 },
      { id: 3, name: 'Viper 4x4', x: -0.2, y: 1100, speed: 16.0, targetSpeed: 17.0, baseSpeed: 16.5, width: 46, height: 76, bodyColor: '#10b981', roofColor: '#064e3b', laneTarget: -0.2, distance: 1100, lap: 1, currentSegment: 0 },
      { id: 4, name: 'Dune Crusher', x: 0.5, y: 1600, speed: 16.8, targetSpeed: 17.8, baseSpeed: 17.2, width: 48, height: 80, bodyColor: '#6366f1', roofColor: '#1e1b4b', laneTarget: 0.5, distance: 1600, lap: 1, currentSegment: 0 },
      { id: 5, name: 'Mirage Racer', x: -0.5, y: 2200, speed: 17.5, targetSpeed: 18.5, baseSpeed: 18.0, width: 42, height: 70, bodyColor: '#ec4899', roofColor: '#500724', laneTarget: -0.5, distance: 2200, lap: 1, currentSegment: 0 },
      { id: 6, name: 'Road Phantom', x: 0.15, y: 2800, speed: 18.5, targetSpeed: 19.5, baseSpeed: 19.0, width: 44, height: 74, bodyColor: '#06b6d4', roofColor: '#083344', laneTarget: 0.15, distance: 2800, lap: 1, currentSegment: 0 },
      { id: 7, name: 'Desert Fox', x: -0.1, y: 3400, speed: 19.5, targetSpeed: 20.5, baseSpeed: 20.0, width: 42, height: 72, bodyColor: '#8b5cf6', roofColor: '#2e1065', laneTarget: -0.1, distance: 3400, lap: 1, currentSegment: 0 }
    ];

    const entities: TrackEntity[] = [];
    let idCounter = 1;

    // Place Checkpoints and Finish lines along track
    for (let cpDist = CHECKPOINT_INTERVAL; cpDist < TRACK_LENGTH; cpDist += CHECKPOINT_INTERVAL) {
      entities.push({
        id: idCounter++,
        x: 0,
        y: cpDist,
        type: 'checkpoint',
        width: 320,
        height: 40
      });
    }

    // Place Start / Finish Line
    entities.push({
      id: idCounter++,
      x: 0,
      y: 0,
      type: 'finish',
      width: 320,
      height: 40
    });

    // Populate track with pickups and desert obstacles
    for (let y = 500; y < TRACK_LENGTH; y += 180 + Math.random() * 140) {
      // Don't spawn right on checkpoints
      if (Math.abs((y % CHECKPOINT_INTERVAL)) < 200 || Math.abs(y % TRACK_LENGTH) < 200) continue;

      const rand = Math.random();
      if (rand < 0.28) {
        // Coin pickup
        entities.push({
          id: idCounter++,
          x: (Math.random() - 0.5) * 1.3,
          y,
          type: 'coin',
          width: 24,
          height: 24
        });
      } else if (rand < 0.45) {
        // Nitro Boost canister
        entities.push({
          id: idCounter++,
          x: (Math.random() - 0.5) * 1.2,
          y,
          type: 'nitro',
          width: 26,
          height: 32
        });
      } else if (rand < 0.68) {
        // Cactus near shoulder
        const side = Math.random() > 0.5 ? 1 : -1;
        entities.push({
          id: idCounter++,
          x: side * (0.75 + Math.random() * 0.45),
          y,
          type: 'cactus',
          width: 30,
          height: 42
        });
      } else if (rand < 0.85) {
        // Desert Rock
        const side = Math.random() > 0.5 ? 1 : -1;
        entities.push({
          id: idCounter++,
          x: side * (0.8 + Math.random() * 0.5),
          y,
          type: 'rock',
          width: 38,
          height: 28
        });
      } else {
        // Hazard barrel on outer lane
        entities.push({
          id: idCounter++,
          x: (Math.random() - 0.5) * 1.5,
          y,
          type: 'barrel',
          width: 28,
          height: 34
        });
      }
    }

    stateRef.current = {
      player: {
        x: 0,
        y: 0,
        speed: 0,
        maxSpeed: 25,
        accel: 0.14,
        decel: 0.07,
        brake: 0.32,
        steer: 0,
        steerAngle: 0,
        nitro: 100,
        health: 100,
        lap: 1,
        totalDistance: 0,
        lapStartTime: Date.now(),
        bestLap: null
      },
      rivals,
      entities,
      particles: [],
      roadOffset: 0,
      currentCurve: 0,
      targetCurve: 0,
      cameraY: 0,
      shake: 0,
      timeRemaining: 35,
      raceStartTime: Date.now(),
      lastTime: performance.now(),
      keys: {
        left: false,
        right: false,
        up: false,
        down: false,
        nitro: false
      },
      isCountingDown: false,
      raceFinished: false,
      score: 0,
      checkpointNotification: null
    };

    setScore(0);
    setLap(1);
    setPosition(8);
    setSpeedKmh(0);
    setNitro(100);
    setHealth(100);
    setTimeRemaining(35);
    setTotalRaceTime(0);
    setBestLapTime(null);
  }, []);

  // Start Race Sequence with 3..2..1..GO countdown
  const startCountdown = useCallback(() => {
    sound.playClick();
    initRaceWorld();
    setGameState('COUNTDOWN');
    setCountdownNum(3);
    sound.playCountdownBeep(false);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        sound.playCountdownBeep(false);
      } else if (count === 0) {
        setCountdownNum('GO!');
        sound.playCountdownBeep(true);
      } else {
        clearInterval(interval);
        setGameState('RACING');
        stateRef.current.player.lapStartTime = Date.now();
        stateRef.current.raceStartTime = Date.now();
        stateRef.current.lastTime = performance.now();
      }
    }, 850);
  }, [initRaceWorld]);

  // Restart race directly
  const handleRestart = useCallback(() => {
    startCountdown();
  }, [startCountdown]);

  // Pause & Resume
  const handleTogglePause = useCallback(() => {
    setGameState(prev => {
      if (prev === 'RACING') {
        sound.playClick();
        return 'PAUSED';
      }
      if (prev === 'PAUSED') {
        sound.playClick();
        stateRef.current.lastTime = performance.now();
        return 'RACING';
      }
      return prev;
    });
  }, []);

  // Finish / Game Over Handlers
  const handleRaceWin = useCallback((finalScore: number, raceTime: number, bestLap: number | null) => {
    sound.playVictory();
    setGameState('VICTORY');
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 }
    });

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_desert-racer', finalScore.toString());
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const handleGameOverState = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_desert-racer', finalScore.toString());
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Keyboard Event Management with page scroll prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scrolling for racing controls
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        handleTogglePause();
        return;
      }

      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) k.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) k.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = true;
      if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) k.nitro = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) k.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) k.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) k.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) k.down = false;
      if (['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) k.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleTogglePause]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    if (gameState !== 'RACING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (currentTime: number) => {
      const s = stateRef.current;
      const p = s.player;
      const dt = Math.min(33, currentTime - (s.lastTime || currentTime)) / 16.66;
      s.lastTime = currentTime;

      const w = canvas.width;
      const h = canvas.height;

      // 1. CAR PHYSICS & SMOOTH ACCELERATION
      const onAsphalt = Math.abs(p.x) <= 0.88;
      const onShoulder = Math.abs(p.x) > 0.88 && Math.abs(p.x) <= 1.35;
      const offRoad = Math.abs(p.x) > 1.35;

      // Progressive Max Speed scaling with race progress
      const lapSpeedBonus = (p.lap - 1) * 1.5;
      let effectiveMaxSpeed = p.maxSpeed + lapSpeedBonus;

      // Nitro Boost handling
      let isBoosting = false;
      if (s.keys.nitro && p.nitro > 0 && p.speed > 8) {
        isBoosting = true;
        effectiveMaxSpeed += 7;
        p.nitro = Math.max(0, p.nitro - 0.45 * dt);
        // Spawn cyan nitro particles
        if (Math.random() < 0.7) {
          s.particles.push({
            x: 0, // relative to car
            y: 35,
            vx: (Math.random() - 0.5) * 2,
            vy: 4 + Math.random() * 5,
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#00e5ff' : '#38bdf8',
            alpha: 0.9,
            life: 0,
            maxLife: 15,
            type: 'nitro'
          });
        }
      } else {
        // Slowly regenerate nitro when not boosting
        p.nitro = Math.min(100, p.nitro + 0.08 * dt);
      }

      // Acceleration & Braking (smooth progression)
      if (s.keys.up) {
        const acceleration = isBoosting ? p.accel * 1.8 : p.accel;
        if (p.speed < effectiveMaxSpeed) {
          p.speed += acceleration * dt;
        }
      } else if (s.keys.down) {
        if (p.speed > 0) {
          p.speed -= p.brake * dt;
          if (p.speed < 0) p.speed = 0;
        }
      } else {
        // Natural rolling resistance
        p.speed -= p.decel * dt;
        if (p.speed < 0) p.speed = 0;
      }

      // Off-road & shoulder penalties
      if (offRoad) {
        if (p.speed > 10) p.speed -= 0.25 * dt;
        // Offroad dust particles
        if (Math.random() < 0.6 && p.speed > 4) {
          s.particles.push({
            x: (Math.random() - 0.5) * 30,
            y: 25,
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 3,
            size: 4 + Math.random() * 6,
            color: '#d97706',
            alpha: 0.6,
            life: 0,
            maxLife: 20,
            type: 'dust'
          });
        }
      } else if (onShoulder) {
        if (p.speed > 18) p.speed -= 0.08 * dt;
      }

      // 2. SMOOTH STEERING PHYSICS
      const curveForce = getTrackCurveAt(p.y);
      s.currentCurve += (curveForce - s.currentCurve) * 0.08 * dt;

      // Centrifugal push in curves proportional to speed
      p.x -= s.currentCurve * (p.speed / 20) * 0.022 * dt;

      let steerInput = 0;
      if (s.keys.left) steerInput -= 1;
      if (s.keys.right) steerInput += 1;

      // Speed-dependent steering agility
      const steerSensitivity = 0.028 * (Math.min(p.speed, 15) / 15);
      p.steer += (steerInput * steerSensitivity - p.steer) * 0.2 * dt;
      p.x += p.steer * (p.speed / 10) * dt;

      // Target visual steering angle for car chassis
      p.steerAngle += (steerInput * 0.35 - p.steerAngle) * 0.25 * dt;

      // 3. TRACK BOUNDARIES & COLLISION BARRIER
      // Keep car within desert bounds with elastic rebound
      if (p.x < -1.8) {
        p.x = -1.8;
        p.steer = 0.015;
        p.speed *= 0.85;
        s.shake = 6;
        sound.playHit();
      } else if (p.x > 1.8) {
        p.x = 1.8;
        p.steer = -0.015;
        p.speed *= 0.85;
        s.shake = 6;
        sound.playHit();
      }

      // Progress forward along track
      const deltaDistance = p.speed * dt;
      p.y += deltaDistance;
      p.totalDistance += deltaDistance;
      s.cameraY += deltaDistance;

      // Distance score increment
      s.score += Math.floor(p.speed * 0.15 * dt);

      // Checkpoint Countdown Timer deduction
      s.timeRemaining -= (1 / 60) * dt;
      if (s.timeRemaining <= 0) {
        s.timeRemaining = 0;
        handleGameOverState(s.score);
        return;
      }

      // 4. CHECKPOINTS, LAPS & FINISH DETECTION
      const currentLapProgress = p.y % TRACK_LENGTH;
      const previousProgress = (p.y - deltaDistance) % TRACK_LENGTH;

      // Crossing Checkpoints
      for (let cpDist = CHECKPOINT_INTERVAL; cpDist < TRACK_LENGTH; cpDist += CHECKPOINT_INTERVAL) {
        if (previousProgress < cpDist && currentLapProgress >= cpDist) {
          // Checkpoint reached!
          sound.playCoin();
          s.timeRemaining = Math.min(60, s.timeRemaining + 15);
          s.score += 1000;
          s.checkpointNotification = { text: 'CHECKPOINT! +15 SEC', time: 70 };
          setCheckpointFlash('CHECKPOINT! +15s');
          setTimeout(() => setCheckpointFlash(null), 1800);
        }
      }

      // Crossing Lap Finish Line
      if (p.y >= p.lap * TRACK_LENGTH) {
        const lapTime = (Date.now() - p.lapStartTime) / 1000;
        if (!p.bestLap || lapTime < p.bestLap) {
          p.bestLap = lapTime;
          setBestLapTime(lapTime);
        }

        if (p.lap >= TOTAL_LAPS) {
          // RACE VICTORY!
          p.speed = 0;
          const totalTime = (Date.now() - s.raceStartTime) / 1000;
          s.score += 5000 + Math.floor(s.timeRemaining * 100);
          handleRaceWin(s.score, totalTime, p.bestLap);
          return;
        } else {
          // Advance to next lap
          p.lap += 1;
          p.lapStartTime = Date.now();
          setLap(p.lap);
          sound.playPowerUp();
          s.timeRemaining = Math.min(60, s.timeRemaining + 20);
          s.score += 2500;
          s.checkpointNotification = { text: `LAP ${p.lap} / ${TOTAL_LAPS}!`, time: 80 };
          setCheckpointFlash(`LAP ${p.lap} / ${TOTAL_LAPS}!`);
          setTimeout(() => setCheckpointFlash(null), 2000);
        }
      }

      // 5. UPDATE AI RIVAL OPPONENTS
      s.rivals.forEach(rival => {
        // AI Speed variation & curve slowing
        const rivalCurve = Math.abs(getTrackCurveAt(rival.distance));
        const curveSpeedPenalty = rivalCurve * 4;
        rival.targetSpeed = rival.baseSpeed - curveSpeedPenalty + (Math.sin(rival.distance * 0.005) * 1.5);
        rival.speed += (rival.targetSpeed - rival.speed) * 0.05 * dt;

        rival.distance += rival.speed * dt;
        rival.y = rival.distance % TRACK_LENGTH;

        // AI Lane Keeping and Overtaking behavior
        const distToPlayer = rival.distance - p.totalDistance;
        if (Math.abs(distToPlayer) < 300) {
          // Avoid player car if too close
          if (Math.abs(rival.x - p.x) < 0.35) {
            rival.laneTarget = p.x > 0 ? rival.x - 0.4 : rival.x + 0.4;
          }
        }
        rival.laneTarget = Math.max(-0.7, Math.min(0.7, rival.laneTarget));
        rival.x += (rival.laneTarget - rival.x) * 0.03 * dt;

        // Player vs Rival Collision
        const yDist = rival.distance - p.totalDistance;
        if (Math.abs(yDist) < 65) {
          const roadWidthPx = 320;
          const playerPxX = p.x * (roadWidthPx / 2);
          const rivalPxX = rival.x * (roadWidthPx / 2);

          if (Math.abs(playerPxX - rivalPxX) < 40) {
            // Collision reaction!
            sound.playHit();
            s.shake = 8;
            p.health = Math.max(0, p.health - 6 * dt);
            
            // Push player and rival apart elastically
            const pushDir = playerPxX > rivalPxX ? 1 : -1;
            p.x += pushDir * 0.06;
            rival.x -= pushDir * 0.06;

            p.speed = Math.max(6, p.speed * 0.88);
            rival.speed *= 0.9;

            // Sparks
            for (let i = 0; i < 4; i++) {
              s.particles.push({
                x: (Math.random() - 0.5) * 20,
                y: yDist > 0 ? -30 : 30,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: 2 + Math.random() * 3,
                color: '#f59e0b',
                alpha: 1,
                life: 0,
                maxLife: 12,
                type: 'spark'
              });
            }
          }
        }
      });

      // 6. CALCULATE RACE POSITION (1st to 8th)
      let currentRank = 1;
      s.rivals.forEach(r => {
        if (r.distance > p.totalDistance) currentRank++;
      });
      setPosition(currentRank);

      // 7. TRACK ENTITIES & PICKUPS COLLISION
      const roadWidthPx = 340;
      const playerWorldX = p.x * (roadWidthPx / 2);

      s.entities.forEach(entity => {
        if (entity.collected) return;

        // Calculate distance relative to current player lap progress
        let relY = entity.y - (p.y % TRACK_LENGTH);
        if (relY < -500) relY += TRACK_LENGTH;

        // Check if entity is near car vertically
        if (relY > -30 && relY < 50) {
          const entityWorldX = entity.x * (roadWidthPx / 2);
          const xDist = Math.abs(playerWorldX - entityWorldX);

          if (xDist < entity.width / 2 + 20) {
            if (entity.type === 'coin') {
              entity.collected = true;
              sound.playCoin();
              s.score += 500;
              s.particles.push({
                x: 0,
                y: 0,
                vx: 0,
                vy: -3,
                size: 6,
                color: '#fbbf24',
                alpha: 1,
                life: 0,
                maxLife: 15,
                type: 'spark'
              });
            } else if (entity.type === 'nitro') {
              entity.collected = true;
              sound.playPowerUp();
              p.nitro = Math.min(100, p.nitro + 40);
              s.score += 250;
            } else if (['cactus', 'rock', 'barrel'].includes(entity.type)) {
              entity.collected = true;
              sound.playHit();
              s.shake = 10;
              p.health = Math.max(0, p.health - 15);
              p.speed = Math.max(4, p.speed * 0.7);

              // Explosion / Impact sparks & smoke
              for (let i = 0; i < 8; i++) {
                s.particles.push({
                  x: (Math.random() - 0.5) * 20,
                  y: 0,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  size: 3 + Math.random() * 5,
                  color: entity.type === 'cactus' ? '#16a34a' : '#ef4444',
                  alpha: 1,
                  life: 0,
                  maxLife: 18,
                  type: 'spark'
                });
              }
            }
          }
        }
      });

      // Health check
      if (p.health <= 0) {
        p.health = 0;
        handleGameOverState(s.score);
        return;
      }

      // Update Screen Shake decay
      if (s.shake > 0) s.shake -= 0.6 * dt;

      // Update State variables for UI Display
      const calculatedKmh = Math.floor(p.speed * 9.5);
      setSpeedKmh(calculatedKmh);
      setNitro(Math.floor(p.nitro));
      setHealth(Math.floor(p.health));
      setTimeRemaining(Math.ceil(s.timeRemaining));
      setScore(s.score);
      setTotalRaceTime((Date.now() - s.raceStartTime) / 1000);

      // ==========================================
      // 8. RENDER CANVAS (DESERT SPEEDWAY ENGINE)
      // ==========================================
      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Apply screen shake if any
      if (s.shake > 0) {
        ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      }

      // 8.1 Desert Sky & Horizon Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#1e110a');
      skyGrad.addColorStop(0.5, '#7c2d12');
      skyGrad.addColorStop(0.85, '#ea580c');
      skyGrad.addColorStop(1, '#fed7aa');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.45);

      // Distant desert sun
      const sunX = w * 0.5 + s.currentCurve * 150;
      const sunY = h * 0.28;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 120);
      sunGrad.addColorStop(0, 'rgba(255, 247, 237, 0.95)');
      sunGrad.addColorStop(0.3, 'rgba(254, 215, 170, 0.6)');
      sunGrad.addColorStop(0.7, 'rgba(251, 146, 60, 0.2)');
      sunGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
      ctx.fill();

      // Distant Desert Mountain Ranges (Parallax Layer 1)
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      for (let mx = 0; mx <= w; mx += 80) {
        const my = h * 0.42 - Math.sin((mx + p.y * 0.05) * 0.008) * 35 - Math.cos(mx * 0.015) * 20;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(w, h * 0.45);
      ctx.closePath();
      ctx.fill();

      // Mid-distance Dunes (Parallax Layer 2)
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      for (let mx = 0; mx <= w; mx += 60) {
        const my = h * 0.44 - Math.sin((mx - p.y * 0.12) * 0.01) * 22;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(w, h * 0.45);
      ctx.closePath();
      ctx.fill();

      // 8.2 Ground / Sand Field
      const groundGrad = ctx.createLinearGradient(0, h * 0.45, 0, h);
      groundGrad.addColorStop(0, '#92400e');
      groundGrad.addColorStop(0.4, '#b45309');
      groundGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, h * 0.45, w, h * 0.55);

      // Sand terrain texture stripes (gives fast scrolling sensation)
      const stripeOffset = (p.y * 1.5) % 60;
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
      ctx.lineWidth = 2;
      for (let sy = h * 0.45 + stripeOffset; sy < h; sy += 60) {
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
        ctx.stroke();
      }

      // 8.3 Draw Structured Racing Road (Asphalt, Kerbs, Markings)
      const roadCenterBaseX = w / 2;
      const horizonY = h * 0.45;
      const roadBottomY = h;
      const roadTopWidth = 70;
      const roadBottomWidth = Math.min(w * 0.85, 620);
      const roadCurvature = s.currentCurve * 220;

      // Draw Road base polygon
      ctx.beginPath();
      ctx.moveTo(roadCenterBaseX - roadTopWidth / 2 + roadCurvature * 0.2, horizonY);
      ctx.lineTo(roadCenterBaseX + roadTopWidth / 2 + roadCurvature * 0.2, horizonY);
      ctx.lineTo(roadCenterBaseX + roadBottomWidth / 2, roadBottomY);
      ctx.lineTo(roadCenterBaseX - roadBottomWidth / 2, roadBottomY);
      ctx.closePath();

      // Asphalt Fill
      const asphaltGrad = ctx.createLinearGradient(0, horizonY, 0, roadBottomY);
      asphaltGrad.addColorStop(0, '#27272a');
      asphaltGrad.addColorStop(1, '#18181b');
      ctx.fillStyle = asphaltGrad;
      ctx.fill();

      // Road Rumble Kerbs (Red & White Alternating Stripes on road edges)
      const curbWidthTop = 8;
      const curbWidthBottom = 28;
      const numCurbSegments = 24;

      for (let i = 0; i < numCurbSegments; i++) {
        const t1 = i / numCurbSegments;
        const t2 = (i + 1) / numCurbSegments;

        const y1 = horizonY + (roadBottomY - horizonY) * t1;
        const y2 = horizonY + (roadBottomY - horizonY) * t2;

        const w1 = roadTopWidth + (roadBottomWidth - roadTopWidth) * t1;
        const w2 = roadTopWidth + (roadBottomWidth - roadTopWidth) * t2;

        const c1 = roadCurvature * (1 - t1);
        const c2 = roadCurvature * (1 - t2);

        const leftX1 = roadCenterBaseX - w1 / 2 + c1;
        const leftX2 = roadCenterBaseX - w2 / 2 + c2;
        const rightX1 = roadCenterBaseX + w1 / 2 + c1;
        const rightX2 = roadCenterBaseX + w2 / 2 + c2;

        const isRed = Math.floor((p.y * 0.08 + i)) % 2 === 0;
        ctx.fillStyle = isRed ? '#dc2626' : '#f8fafc';

        // Left Kerb
        ctx.beginPath();
        ctx.moveTo(leftX1 - (curbWidthTop + (curbWidthBottom - curbWidthTop) * t1), y1);
        ctx.lineTo(leftX1, y1);
        ctx.lineTo(leftX2, y2);
        ctx.lineTo(leftX2 - (curbWidthTop + (curbWidthBottom - curbWidthTop) * t2), y2);
        ctx.closePath();
        ctx.fill();

        // Right Kerb
        ctx.beginPath();
        ctx.moveTo(rightX1, y1);
        ctx.lineTo(rightX1 + (curbWidthTop + (curbWidthBottom - curbWidthTop) * t1), y1);
        ctx.lineTo(rightX2 + (curbWidthTop + (curbWidthBottom - curbWidthTop) * t2), y2);
        ctx.lineTo(rightX2, y2);
        ctx.closePath();
        ctx.fill();
      }

      // Yellow Center Dashed Lane Markings
      const dashSegments = 16;
      for (let i = 0; i < dashSegments; i++) {
        const t1 = i / dashSegments;
        const t2 = (i + 0.5) / dashSegments;

        const y1 = horizonY + (roadBottomY - horizonY) * t1;
        const y2 = horizonY + (roadBottomY - horizonY) * t2;

        const c1 = roadCurvature * (1 - t1);
        const c2 = roadCurvature * (1 - t2);

        const isYellow = Math.floor((p.y * 0.05 + i)) % 2 === 0;
        if (isYellow) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3 + t1 * 6;
          ctx.beginPath();
          ctx.moveTo(roadCenterBaseX + c1, y1);
          ctx.lineTo(roadCenterBaseX + c2, y2);
          ctx.stroke();
        }
      }

      // 8.4 Render Track Objects & Pickups
      s.entities.forEach(entity => {
        if (entity.collected) return;

        let relY = entity.y - (p.y % TRACK_LENGTH);
        if (relY < -500) relY += TRACK_LENGTH;

        // Only draw visible entities ahead (0 to 1800 units)
        if (relY > -100 && relY < 2000) {
          const depthT = Math.max(0, Math.min(1, 1 - (relY / 2000)));
          const renderY = horizonY + (roadBottomY - horizonY) * (depthT * depthT);
          const roadWidthAtDepth = roadTopWidth + (roadBottomWidth - roadTopWidth) * (depthT * depthT);
          const curveAtDepth = roadCurvature * (1 - depthT);
          const renderX = roadCenterBaseX + curveAtDepth + (entity.x * (roadWidthAtDepth / 2));
          const scale = 0.3 + depthT * 0.9;

          if (renderY >= horizonY && renderY <= h + 50) {
            ctx.save();
            ctx.translate(renderX, renderY);
            ctx.scale(scale, scale);

            if (entity.type === 'coin') {
              // Golden Rotating Coin
              const coinW = Math.abs(Math.sin(Date.now() * 0.006)) * 18 + 4;
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.ellipse(0, 0, coinW, 16, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('$', 0, 0);
            } else if (entity.type === 'nitro') {
              // Glowing Cyan Nitro Canister
              ctx.fillStyle = '#06b6d4';
              ctx.beginPath();
              ctx.roundRect(-10, -18, 20, 36, 6);
              ctx.fill();
              ctx.strokeStyle = '#67e8f9';
              ctx.lineWidth = 2;
              ctx.stroke();
              // Top cap
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(-5, -24, 10, 6);
              // Nitro text
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 8px monospace';
              ctx.textAlign = 'center';
              ctx.fillText('N2O', 0, 4);
            } else if (entity.type === 'cactus') {
              // Desert Saguaro Cactus
              ctx.fillStyle = '#15803d';
              // Main trunk
              ctx.beginPath();
              ctx.roundRect(-6, -36, 12, 40, 5);
              ctx.fill();
              // Left arm
              ctx.beginPath();
              ctx.roundRect(-18, -26, 14, 7, 3);
              ctx.roundRect(-18, -34, 7, 15, 3);
              ctx.fill();
              // Right arm
              ctx.beginPath();
              ctx.roundRect(4, -20, 14, 7, 3);
              ctx.roundRect(11, -30, 7, 17, 3);
              ctx.fill();
            } else if (entity.type === 'rock') {
              // Desert Boulder
              ctx.fillStyle = '#78350f';
              ctx.beginPath();
              ctx.moveTo(-18, 0);
              ctx.lineTo(-12, -22);
              ctx.lineTo(8, -26);
              ctx.lineTo(20, -10);
              ctx.lineTo(16, 0);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#92400e';
              ctx.beginPath();
              ctx.moveTo(-10, -20);
              ctx.lineTo(6, -24);
              ctx.lineTo(14, -12);
              ctx.closePath();
              ctx.fill();
            } else if (entity.type === 'barrel') {
              // Hazard Oil Drum
              ctx.fillStyle = '#dc2626';
              ctx.beginPath();
              ctx.roundRect(-12, -26, 24, 30, 4);
              ctx.fill();
              ctx.strokeStyle = '#18181b';
              ctx.lineWidth = 2;
              ctx.stroke();
              // Hazard yellow stripes
              ctx.fillStyle = '#facc15';
              ctx.fillRect(-12, -18, 24, 6);
            } else if (entity.type === 'checkpoint' || entity.type === 'finish') {
              // Checkpoint Arch Banner spanning across road
              const archWidth = roadWidthAtDepth + 40;
              ctx.fillStyle = entity.type === 'finish' ? '#1e293b' : '#0284c7';
              // Arch Left Pillar
              ctx.fillRect(-archWidth / 2, -70, 12, 70);
              // Arch Right Pillar
              ctx.fillRect(archWidth / 2 - 12, -70, 12, 70);
              // Arch Top Crossbar
              ctx.fillRect(-archWidth / 2, -70, archWidth, 24);
              
              if (entity.type === 'finish') {
                // Checkered pattern on finish line arch
                const boxW = archWidth / 12;
                for (let b = 0; b < 12; b++) {
                  ctx.fillStyle = b % 2 === 0 ? '#f8fafc' : '#0f172a';
                  ctx.fillRect(-archWidth / 2 + b * boxW, -70, boxW, 24);
                }
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('START / FINISH', 0, -54);
              } else {
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(-archWidth / 2 + 6, -66, archWidth - 12, 16);
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('CHECKPOINT', 0, -54);
              }
            }

            ctx.restore();
          }
        }
      });

      // 8.5 Render AI Rival Cars
      s.rivals.forEach(rival => {
        let relY = rival.distance - p.totalDistance;
        if (relY > -100 && relY < 1800) {
          const depthT = Math.max(0, Math.min(1, 1 - (relY / 1800)));
          const renderY = horizonY + (roadBottomY - horizonY) * (depthT * depthT);
          const roadWidthAtDepth = roadTopWidth + (roadBottomWidth - roadTopWidth) * (depthT * depthT);
          const curveAtDepth = roadCurvature * (1 - depthT);
          const renderX = roadCenterBaseX + curveAtDepth + (rival.x * (roadWidthAtDepth / 2));
          const scale = 0.4 + depthT * 0.8;

          if (renderY >= horizonY && renderY <= h + 60) {
            ctx.save();
            ctx.translate(renderX, renderY);
            ctx.scale(scale, scale);

            // Car Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 5, 24, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Rival Car Chassis (Sporty Desert Racer)
            ctx.fillStyle = rival.bodyColor;
            ctx.beginPath();
            ctx.roundRect(-20, -36, 40, 72, 8);
            ctx.fill();

            // Roof / Cockpit
            ctx.fillStyle = rival.roofColor;
            ctx.beginPath();
            ctx.roundRect(-14, -18, 28, 38, 5);
            ctx.fill();

            // Windshield
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.roundRect(-12, -15, 24, 10, 3);
            ctx.fill();

            // Tires
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-23, -30, 5, 16);
            ctx.fillRect(18, -30, 5, 16);
            ctx.fillRect(-23, 14, 5, 16);
            ctx.fillRect(18, 14, 5, 16);

            // Tail lights
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-16, 32, 8, 4);
            ctx.fillRect(8, 32, 8, 4);

            // Name Tag above car
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.fillRect(-35, -52, 70, 14);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(rival.name, 0, -42);

            ctx.restore();
          }
        }
      });

      // 8.6 Render Player's Desert Sports Car (Bottom Center Forefront)
      const playerRenderY = h - 95;
      const playerRenderX = roadCenterBaseX + (p.x * (roadBottomWidth / 2));

      ctx.save();
      ctx.translate(playerRenderX, playerRenderY);
      ctx.rotate(p.steerAngle);

      // Car Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 28, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Main Car Body (Metallic Desert Amber / Crimson Sports Chassis)
      const bodyGrad = ctx.createLinearGradient(-24, 0, 24, 0);
      bodyGrad.addColorStop(0, '#ea580c');
      bodyGrad.addColorStop(0.5, '#f97316');
      bodyGrad.addColorStop(1, '#c2410c');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-24, -42, 48, 84, 10);
      ctx.fill();
      ctx.strokeStyle = '#ffedd5';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Racing Stripes down hood & trunk
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5, -42, 10, 84);

      // Cockpit / Tinted Glass
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.roundRect(-16, -20, 32, 42, 6);
      ctx.fill();

      // Front Windshield Reflection
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-14, -18, 28, 12, 3);
      ctx.fill();

      // Rear Glass
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-14, 10, 28, 8, 2);
      ctx.fill();

      // Rear Spoiler / Wing
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-26, 34, 52, 6);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-28, 32, 6, 10);
      ctx.fillRect(22, 32, 6, 10);

      // Big All-Terrain Racing Tires
      ctx.fillStyle = '#18181b';
      // Front Tires (Turn with steering angle)
      ctx.save();
      ctx.translate(-27, -26);
      ctx.rotate(p.steerAngle * 0.5);
      ctx.fillRect(0, 0, 6, 20);
      ctx.restore();

      ctx.save();
      ctx.translate(21, -26);
      ctx.rotate(p.steerAngle * 0.5);
      ctx.fillRect(0, 0, 6, 20);
      ctx.restore();

      // Rear Tires
      ctx.fillRect(-27, 18, 6, 20);
      ctx.fillRect(21, 18, 6, 20);

      // Tail lights (Bright red when braking)
      ctx.fillStyle = s.keys.down ? '#ff0000' : '#ef4444';
      ctx.fillRect(-20, 39, 10, 4);
      ctx.fillRect(10, 39, 10, 4);
      if (s.keys.down) {
        // Brake glow
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(-15, 41, 12, 0, Math.PI * 2);
        ctx.arc(15, 41, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Particles relative to player
      s.particles.forEach((pt, index) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);

        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (pt.life >= pt.maxLife) {
          s.particles.splice(index, 1);
        }
      });

      ctx.restore();

      // 8.7 Checkpoint Banner Overlay in-world notification
      if (s.checkpointNotification && s.checkpointNotification.time > 0) {
        s.checkpointNotification.time--;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(w / 2 - 160, h * 0.32, 320, 44, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.checkpointNotification.text, w / 2, h * 0.32 + 22);
        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [gameState, handleGameOverState, handleRaceWin]);

  // Handle Canvas Resize to dynamically fill container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect && rect.width && rect.height) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleAudio = () => {
    const muted = sound.toggleMute();
    setSoundMuted(muted);
  };

  return (
    <div className="relative w-full h-full bg-[#05070d] flex items-center justify-center overflow-hidden select-none outline-none font-sans">
      {/* 1. Fullscreen Racing Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none"
      />

      {/* 2. IN-GAME RACING HUD (Transparent, Metallic, Dark Desert Theme) */}
      {(gameState === 'RACING' || gameState === 'COUNTDOWN') && (
        <div className="absolute inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between z-20">
          {/* Top HUD Bar */}
          <div className="flex items-start justify-between gap-4">
            {/* Top-Left: Position & Hull Health */}
            <div className="flex flex-col gap-2">
              {/* Position Pill */}
              <div className="bg-[#0f172a]/85 backdrop-blur-md border border-[#334155] rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg shadow-black/40">
                <Trophy className="w-5 h-5 text-[#f59e0b]" />
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-[#94a3b8] uppercase font-bold tracking-wider">POS</span>
                  <span className="text-2xl font-black text-white">{position}</span>
                  <span className="text-xs text-[#64748b] font-bold">/ 8</span>
                </div>
              </div>

              {/* Hull / Health Bar */}
              <div className="bg-[#0f172a]/85 backdrop-blur-md border border-[#334155] rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg w-44">
                <Shield className="w-4 h-4 text-[#ef4444] shrink-0" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                    <span>HULL</span>
                    <span className={health < 30 ? 'text-red-400 animate-pulse' : 'text-slate-200'}>{health}%</span>
                  </div>
                  <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        health > 50 ? 'bg-gradient-to-r from-emerald-500 to-green-400' : health > 25 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-600 to-rose-500'
                      }`}
                      style={{ width: `${health}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Top-Center: Lap Counter & Checkpoint Timer */}
            <div className="flex flex-col items-center gap-2">
              {/* Lap Badge */}
              <div className="bg-[#0f172a]/85 backdrop-blur-md border border-[#334155] rounded-xl px-5 py-2 flex items-center gap-2.5 shadow-lg shadow-black/40">
                <Flag className="w-4 h-4 text-[#38bdf8]" />
                <span className="text-sm font-black tracking-widest text-white">
                  LAP <span className="text-[#38bdf8]">{lap}</span> / {TOTAL_LAPS}
                </span>
              </div>

              {/* Checkpoint Countdown Timer */}
              <div className={`backdrop-blur-md border rounded-xl px-4 py-1.5 flex items-center gap-2 shadow-lg transition-colors ${
                timeRemaining <= 8
                  ? 'bg-red-950/90 border-red-500 text-red-300 animate-pulse'
                  : 'bg-[#0f172a]/85 border-[#334155] text-white'
              }`}>
                <Clock className={`w-4 h-4 ${timeRemaining <= 8 ? 'text-red-400' : 'text-[#f59e0b]'}`} />
                <span className="text-xs text-[#94a3b8] uppercase font-bold tracking-wider">TIME:</span>
                <span className="text-lg font-mono font-bold">{timeRemaining}s</span>
              </div>
            </div>

            {/* Top-Right: Score, Pause, Audio */}
            <div className="flex flex-col items-end gap-2">
              {/* Score Display */}
              <div className="bg-[#0f172a]/85 backdrop-blur-md border border-[#334155] rounded-xl px-4 py-2 flex flex-col items-end shadow-lg shadow-black/40">
                <div className="text-[10px] text-[#94a3b8] uppercase font-bold tracking-widest">SCORE</div>
                <div className="text-xl font-mono font-black text-[#f59e0b] tracking-wider">{score.toLocaleString()}</div>
              </div>

              {/* Action Buttons (Pointer Events Enabled) */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={toggleAudio}
                  title="Toggle Audio"
                  className="p-2 rounded-xl bg-[#0f172a]/85 hover:bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                >
                  {soundMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#38bdf8]" />}
                </button>
                <button
                  onClick={handleTogglePause}
                  title="Pause (Esc)"
                  className="p-2 rounded-xl bg-[#0f172a]/85 hover:bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white transition-colors cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom HUD Bar */}
          <div className="flex items-end justify-between gap-4">
            {/* Bottom-Left: Digital Speedometer & Gear */}
            <div className="bg-[#0f172a]/85 backdrop-blur-md border border-[#334155] rounded-2xl p-4 flex items-center gap-4 shadow-xl shadow-black/50">
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-tighter">
                  {speedKmh}
                </div>
                <div className="text-[10px] font-bold tracking-widest text-[#94a3b8] uppercase">KM / H</div>
              </div>

              <div className="h-10 w-[1px] bg-[#334155]" />

              <div className="flex flex-col items-center">
                <div className="text-xl font-mono font-black text-[#38bdf8]">
                  {speedKmh > 170 ? '5' : speedKmh > 120 ? '4' : speedKmh > 80 ? '3' : speedKmh > 30 ? '2' : '1'}
                </div>
                <div className="text-[9px] font-bold tracking-wider text-[#64748b] uppercase">GEAR</div>
              </div>
            </div>

            {/* Bottom-Right: Nitro Boost Bar */}
            <div className="bg-[#0f172a]/85 backdrop-blur-md border border-[#334155] rounded-2xl p-3 sm:p-4 flex flex-col gap-1.5 shadow-xl shadow-black/50 w-44 sm:w-52">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                <div className="flex items-center gap-1 text-[#00e5ff]">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>NITRO BOOST</span>
                </div>
                <span className="font-mono text-white">{nitro}%</span>
              </div>
              <div className="w-full bg-[#1e293b] h-3 rounded-full overflow-hidden p-0.5 border border-[#334155]">
                <div
                  className="h-full bg-gradient-to-r from-[#00b4d8] to-[#00e5ff] rounded-full transition-all duration-100 shadow-[0_0_10px_rgba(0,229,255,0.6)]"
                  style={{ width: `${nitro}%` }}
                />
              </div>
              <div className="text-[9px] text-[#64748b] text-right font-medium">PRESS SPACE / SHIFT</div>
            </div>
          </div>
        </div>
      )}

      {/* 3. 3-2-1-GO COUNTDOWN OVERLAY */}
      {gameState === 'COUNTDOWN' && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-orange-500 to-red-600 drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] animate-scale-up tracking-wider">
            {countdownNum}
          </div>
        </div>
      )}

      {/* 4. ORIGINAL START MENU OVERLAY */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-40 bg-gradient-to-t from-[#090d16] via-[#090d16]/90 to-transparent backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#0f172a]/95 border border-[#334155] rounded-3xl p-8 shadow-2xl shadow-orange-950/40 flex flex-col items-center space-y-6">
            {/* Game Badge / Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/30">
              <Gauge className="w-8 h-8" />
            </div>

            {/* Game Title */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wider">
                DESERT <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">RACER</span>
              </h1>
              <p className="text-xs text-[#94a3b8] uppercase tracking-widest font-semibold">
                High-Speed Desert Speedway Championship
              </p>
            </div>

            {/* High Score Banner */}
            <div className="bg-[#1e293b]/80 border border-[#334155] rounded-xl px-5 py-2.5 flex items-center gap-3 w-full justify-center">
              <Trophy className="w-5 h-5 text-[#f59e0b]" />
              <div className="text-left">
                <div className="text-[10px] text-[#94a3b8] uppercase font-bold">ALL-TIME BEST SCORE</div>
                <div className="text-lg font-mono font-black text-white">{highScore.toLocaleString()} PTS</div>
              </div>
            </div>

            {/* Controls Guide */}
            <div className="w-full bg-[#131b2e] border border-[#1e293b] rounded-2xl p-4 text-xs space-y-2">
              <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider text-left mb-2">
                Driver Controls
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="bg-[#1e293b] border border-[#334155] px-2 py-0.5 rounded text-[11px] font-mono text-amber-400 font-bold">W / ↑</span>
                  <span>Accelerate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#1e293b] border border-[#334155] px-2 py-0.5 rounded text-[11px] font-mono text-amber-400 font-bold">S / ↓</span>
                  <span>Brake</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#1e293b] border border-[#334155] px-2 py-0.5 rounded text-[11px] font-mono text-amber-400 font-bold">A / D</span>
                  <span>Steer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#1e293b] border border-[#334155] px-2 py-0.5 rounded text-[11px] font-mono text-cyan-400 font-bold">SPACE</span>
                  <span>Nitro</span>
                </div>
              </div>
            </div>

            {/* Start Race Button */}
            <button
              onClick={startCountdown}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-orange-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START RACE</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. IN-GAME PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm p-8 rounded-3xl bg-[#0f172a] border border-[#334155] shadow-2xl flex flex-col items-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Pause className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-wider">RACE PAUSED</h2>
              <p className="text-xs text-[#94a3b8]">The championship is on hold</p>
            </div>

            <div className="w-full space-y-3">
              <button
                onClick={handleTogglePause}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm tracking-wider uppercase hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>RESUME</span>
              </button>

              <button
                onClick={handleRestart}
                className="w-full py-3.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-white font-bold text-sm tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESTART</span>
              </button>

              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full py-3 rounded-xl bg-transparent hover:bg-red-500/10 text-red-400 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                >
                  EXIT RACE
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. GAME OVER MODAL */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-sm p-8 rounded-3xl bg-[#0f172a] border border-red-900/50 shadow-2xl shadow-red-950/60 flex flex-col items-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-black text-red-500 tracking-wider">GAME OVER</h2>
              <p className="text-xs text-[#94a3b8]">
                {health <= 0 ? 'Vehicle destroyed in collision' : 'Time ran out before next checkpoint'}
              </p>
            </div>

            {/* Score & Stats Breakdown */}
            <div className="w-full bg-[#1e293b]/70 border border-[#334155] rounded-2xl p-4 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#94a3b8] font-bold uppercase">FINAL SCORE</span>
                <span className="text-lg font-mono font-black text-[#f59e0b]">{score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#94a3b8] font-bold uppercase">TIME SURVIVED</span>
                <span className="text-sm font-mono font-bold text-white">{totalRaceTime.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#94a3b8] font-bold uppercase">FINAL POSITION</span>
                <span className="text-sm font-bold text-white">{position} / 8</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3">
              <button
                onClick={handleRestart}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white font-black text-sm uppercase tracking-wider hover:opacity-90 shadow-lg shadow-orange-950/50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RETRY RACE</span>
              </button>

              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-white font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                >
                  EXIT
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. VICTORY / RACE COMPLETE MODAL */}
      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md p-8 rounded-3xl bg-[#0f172a] border border-amber-500/50 shadow-2xl shadow-amber-950/60 flex flex-col items-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-200 tracking-wider">
                CHAMPIONSHIP FINISH!
              </h2>
              <p className="text-xs text-[#94a3b8]">You completed all 3 laps across the desert</p>
            </div>

            {/* Results Grid */}
            <div className="w-full bg-[#1e293b]/80 border border-[#334155] rounded-2xl p-4 space-y-2.5 text-left">
              <div className="flex justify-between items-center border-b border-[#334155]/60 pb-2">
                <span className="text-xs text-[#94a3b8] font-bold uppercase">FINISH POSITION</span>
                <span className={`text-base font-black ${position === 1 ? 'text-amber-400' : 'text-white'}`}>
                  {position === 1 ? '🥇 1ST PLACE' : position === 2 ? '🥈 2ND PLACE' : position === 3 ? '🥉 3RD PLACE' : `${position}TH PLACE`}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-[#334155]/60 pb-2">
                <span className="text-xs text-[#94a3b8] font-bold uppercase">TOTAL TIME</span>
                <span className="text-sm font-mono font-bold text-white">{totalRaceTime.toFixed(2)}s</span>
              </div>
              {bestLapTime && (
                <div className="flex justify-between items-center border-b border-[#334155]/60 pb-2">
                  <span className="text-xs text-[#94a3b8] font-bold uppercase">BEST LAP</span>
                  <span className="text-sm font-mono font-bold text-[#38bdf8]">{bestLapTime.toFixed(2)}s</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs text-[#94a3b8] font-bold uppercase">TOTAL SCORE</span>
                <span className="text-xl font-mono font-black text-amber-400">{score.toLocaleString()} PTS</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="w-full space-y-3">
              <button
                onClick={handleRestart}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white font-black text-sm uppercase tracking-wider hover:opacity-90 shadow-lg shadow-orange-950/50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>RACE AGAIN</span>
              </button>

              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-white font-bold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                >
                  EXIT TO MENU
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
