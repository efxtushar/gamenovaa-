import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Swords,
  Trophy,
  Zap,
  Shield,
  Volume2,
  VolumeX,
  Pause,
  ArrowLeft,
  Sparkles,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Flame,
  Settings,
  Bot
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

// Enemy Archetypes
type EnemyType = 'guard' | 'ninja' | 'enforcer' | 'drone';

interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  speed: number;
  hp: number;
  maxHp: number;
  type: EnemyType;
  alive: boolean;
  attackTimer: number;
  attackInterval: number;
  telegraphTimer: number;
  walkFrame: number;
  facing: -1 | 1;
  hitFlash: number;
  deathAnim: number; // 0 to 1 for disintegration
}

interface SlashEffect {
  id: number;
  x: number;
  y: number;
  facing: -1 | 1;
  stage: number; // 1, 2, or 3
  radius: number;
  angle: number;
  color: string;
  glowColor: string;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'spark' | 'energy' | 'dash' | 'voxel' | 'mist';
}

interface FlyingVehicle {
  x: number;
  y: number;
  speed: number;
  len: number;
  color: string;
  altitude: number;
}

interface NeonSign {
  x: number;
  y: number;
  text: string;
  color: string;
  vertical: boolean;
}

const ARENA_WIDTH = 2600;
const GROUND_Y = 480;

export const CyberSamuraiGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [activeHostiles, setActiveHostiles] = useState(0);
  const [health, setHealth] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_cyber-samurai') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState(!sound.getIsMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [waveBanner, setWaveBanner] = useState<string | null>(null);

  // Settings modal inside pause
  const [showSettings, setShowSettings] = useState(false);

  // Mobile virtual joystick & touch state
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0, active: false });
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickOriginRef = useRef({ x: 0, y: 0 });

  // Core Simulation State
  const stateRef = useRef({
    samurai: {
      x: 500,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      isGrounded: true,
      hp: 100,
      energy: 100,
      facing: 1 as -1 | 1,
      // Attack combo
      isSlashing: false,
      slashStage: 1,
      slashTimer: 0,
      slashCooldown: 0,
      // Abilities
      isParrying: false,
      parryTimer: 0,
      isDashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      // Visuals
      walkFrame: 0,
      hitFlash: 0,
      afterImages: [] as { x: number; y: number; facing: -1 | 1; alpha: number }[]
    },
    cameraX: 0,
    enemies: [] as Enemy[],
    slashes: [] as SlashEffect[],
    particles: [] as Particle[],
    flyingVehicles: [] as FlyingVehicle[],
    neonSigns: [] as NeonSign[],
    neonRain: [] as { x: number; y: number; speed: number; len: number; color: string }[],
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboTimer: 0,
    kills: 0,
    wave: 1,
    waveEnemiesSpawned: 0,
    waveTargetKills: 2,
    spawnCooldown: 0,
    enemyIdCounter: 1,
    screenShake: 0,
    time: 0,
    keys: {
      left: false,
      right: false,
      jump: false,
      attack: false,
      parry: false,
      dash: false
    }
  });

  // Detect Touch screen
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  // Fullscreen state listener
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

  // Initialize background parallax elements
  const initEnvironment = useCallback(() => {
    // Flying vehicles
    const vehicles: FlyingVehicle[] = [
      { x: 100, y: 110, speed: 3.2, len: 55, color: '#00f0ff', altitude: 110 },
      { x: 750, y: 155, speed: -2.6, len: 45, color: '#ff007f', altitude: 155 },
      { x: 1400, y: 85, speed: 4.0, len: 65, color: '#fde047', altitude: 85 },
      { x: 1950, y: 135, speed: -3.0, len: 50, color: '#06b6d4', altitude: 135 },
      { x: 2300, y: 100, speed: 3.6, len: 60, color: '#c084fc', altitude: 100 }
    ];

    // Neon signs on rooftops/buildings
    const signs: NeonSign[] = [
      { x: 280, y: 180, text: 'ネオ東京', color: '#00f0ff', vertical: true },
      { x: 680, y: 140, text: 'サイバー', color: '#ff007f', vertical: false },
      { x: 1120, y: 160, text: '電脳街', color: '#38bdf8', vertical: true },
      { x: 1560, y: 130, text: '刀魂', color: '#f43f5e', vertical: false },
      { x: 2040, y: 170, text: '無頼漢', color: '#a855f7', vertical: true },
      { x: 2420, y: 150, text: '夜叉', color: '#00f0ff', vertical: false }
    ];

    // Neon rain streaks
    const rain: { x: number; y: number; speed: number; len: number; color: string }[] = [];
    for (let i = 0; i < 90; i++) {
      rain.push({
        x: Math.random() * ARENA_WIDTH,
        y: Math.random() * 650,
        speed: 12 + Math.random() * 7,
        len: 16 + Math.random() * 12,
        color: Math.random() < 0.7 ? 'rgba(0, 240, 255, 0.45)' : 'rgba(255, 0, 127, 0.4)'
      });
    }

    return { vehicles, signs, rain };
  }, []);

  // Trigger attack combo slash
  const executeSlash = useCallback(() => {
    const s = stateRef.current;
    if (s.samurai.slashCooldown > 0 || s.samurai.isDashing) return;

    if (soundEnabled) sound.playLaser(1300);

    const sam = s.samurai;
    sam.isSlashing = true;
    sam.slashTimer = 16;
    sam.slashCooldown = 12;

    // Cycle through 3-hit combo
    sam.slashStage = (sam.slashStage % 3) + 1;
    const stage = sam.slashStage;

    s.screenShake = stage === 3 ? 5 : 3;

    // Determine slash color & reach based on stage
    const slashColor = stage === 3 ? '#fde047' : stage === 2 ? '#ff007f' : '#00f0ff';
    const slashGlow = stage === 3 ? '#f59e0b' : stage === 2 ? '#ec4899' : '#06b6d4';
    const radius = stage === 3 ? 80 : stage === 2 ? 72 : 66;

    const sX = sam.x + sam.facing * (stage === 3 ? 46 : 40);
    const sY = sam.y - 28;

    s.slashes.push({
      id: Math.random(),
      x: sX,
      y: sY,
      facing: sam.facing,
      stage,
      radius,
      angle: sam.facing === 1 ? -Math.PI / 4 : (Math.PI * 5) / 4,
      color: slashColor,
      glowColor: slashGlow,
      life: 14,
      maxLife: 14
    });

    // Slight forward step on attack
    sam.vx += sam.facing * (stage === 3 ? 3.5 : 2.0);

    let hitsCount = 0;
    const baseDamage = stage === 3 ? 65 : stage === 2 ? 45 : 38;

    s.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const dx = Math.abs(enemy.x - sX);
      const dy = Math.abs(enemy.y - sY);

      if (dx < radius + 25 && dy < 60) {
        enemy.hp -= baseDamage;
        enemy.hitFlash = 8;
        enemy.vx = sam.facing * (stage === 3 ? 6.5 : 4.0); // Knockback
        if (soundEnabled) sound.playHit();
        hitsCount++;

        // Kinetic spark impact particles
        for (let i = 0; i < (stage === 3 ? 18 : 12); i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 6;
          s.particles.push({
            x: enemy.x,
            y: enemy.y - 24,
            vx: Math.cos(angle) * spd + sam.facing * 3,
            vy: Math.sin(angle) * spd - 1,
            color: Math.random() < 0.6 ? slashColor : '#ffffff',
            size: 2 + Math.random() * 2.5,
            alpha: 1,
            life: 18,
            maxLife: 18,
            type: 'spark'
          });
        }

        // Enemy Defeated
        if (enemy.hp <= 0) {
          enemy.alive = false;
          enemy.deathAnim = 1;
          s.kills++;
          setKills(s.kills);

          const enemyScore =
            enemy.type === 'enforcer' ? 300 : enemy.type === 'ninja' ? 220 : enemy.type === 'drone' ? 140 : 160;

          const comboMult = 1 + s.combo * 0.15;
          s.score += Math.floor(enemyScore * comboMult);
          s.combo++;
          s.comboTimer = 160; // ~2.6 seconds decay timer
          if (s.combo > s.maxCombo) {
            s.maxCombo = s.combo;
            setMaxCombo(s.combo);
          }

          setScore(s.score);
          setCombo(s.combo);

          // Energy / Chi recovery on kill
          sam.energy = Math.min(100, sam.energy + 14);
          setEnergy(Math.floor(sam.energy));

          // Voxel disintegration effect
          for (let p = 0; p < 20; p++) {
            s.particles.push({
              x: enemy.x + (Math.random() - 0.5) * 20,
              y: enemy.y - 30 + (Math.random() - 0.5) * 35,
              vx: (Math.random() - 0.5) * 5,
              vy: -1 - Math.random() * 4,
              color: enemy.type === 'enforcer' ? '#c084fc' : enemy.type === 'ninja' ? '#f43f5e' : '#00f0ff',
              size: 2.5 + Math.random() * 3,
              alpha: 1,
              life: 24,
              maxLife: 24,
              type: 'voxel'
            });
          }
        }
      }
    });

    if (hitsCount > 0) {
      sam.energy = Math.min(100, sam.energy + 6);
      setEnergy(Math.floor(sam.energy));
    }
  }, [soundEnabled]);

  // Special Chi Dash Strike (Q / Right Click / Mobile Dash)
  const executeDash = useCallback(() => {
    const s = stateRef.current;
    const sam = s.samurai;
    if (sam.dashCooldown > 0 || sam.energy < 25) return;

    if (soundEnabled) sound.playPowerUp();
    sam.energy -= 25;
    setEnergy(Math.floor(sam.energy));

    sam.isDashing = true;
    sam.dashTimer = 10;
    sam.dashCooldown = 35;
    sam.vx = sam.facing * 16;
    s.screenShake = 4;

    // Dash trail particles
    for (let i = 0; i < 14; i++) {
      s.particles.push({
        x: sam.x - sam.facing * i * 8,
        y: sam.y - 25 + (Math.random() - 0.5) * 20,
        vx: -sam.facing * (1 + Math.random() * 3),
        vy: (Math.random() - 0.5) * 2,
        color: '#00f0ff',
        size: 3,
        alpha: 0.9,
        life: 15,
        maxLife: 15,
        type: 'dash'
      });
    }

    // Hit all enemies along dash trajectory
    s.enemies.forEach(enemy => {
      if (!enemy.alive) return;
      const dx = enemy.x - sam.x;
      if (Math.sign(dx) === sam.facing && Math.abs(dx) < 160 && Math.abs(enemy.y - sam.y) < 50) {
        enemy.hp -= 40;
        enemy.hitFlash = 8;
        enemy.vx = sam.facing * 6;
        if (soundEnabled) sound.playHit();
      }
    });
  }, [soundEnabled]);

  // Deflect / Energy Shield (E / Shift / K / Mobile Shield)
  const executeParry = useCallback(() => {
    const s = stateRef.current;
    const sam = s.samurai;
    if (sam.parryTimer > 0 || sam.energy < 20) return;

    if (soundEnabled) sound.playPowerUp();
    sam.energy -= 20;
    setEnergy(Math.floor(sam.energy));
    sam.isParrying = true;
    sam.parryTimer = 24;
    s.screenShake = 3;

    // Energy Shield Pulse
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      s.particles.push({
        x: sam.x,
        y: sam.y - 28,
        vx: Math.cos(angle) * 5.5,
        vy: Math.sin(angle) * 5.5,
        color: '#ff007f',
        size: 3,
        alpha: 1,
        life: 18,
        maxLife: 18,
        type: 'energy'
      });
    }

    // Push away and stun nearby enemies
    s.enemies.forEach(enemy => {
      if (enemy.alive && Math.abs(enemy.x - sam.x) < 120 && Math.abs(enemy.y - sam.y) < 60) {
        enemy.vx = (enemy.x > sam.x ? 1 : -1) * 8;
        enemy.attackTimer = 0;
        enemy.hp -= 28;
        enemy.hitFlash = 10;
        if (soundEnabled) sound.playHit();
      }
    });
  }, [soundEnabled]);

  // Start / Restart Game Session
  const startGame = useCallback(() => {
    sound.playClick();
    const env = initEnvironment();

    stateRef.current = {
      samurai: {
        x: 450,
        y: GROUND_Y,
        vx: 0,
        vy: 0,
        isGrounded: true,
        hp: 100,
        energy: 100,
        facing: 1,
        isSlashing: false,
        slashStage: 1,
        slashTimer: 0,
        slashCooldown: 0,
        isParrying: false,
        parryTimer: 0,
        isDashing: false,
        dashTimer: 0,
        dashCooldown: 0,
        walkFrame: 0,
        hitFlash: 0,
        afterImages: []
      },
      cameraX: 0,
      enemies: [],
      slashes: [],
      particles: [],
      flyingVehicles: env.vehicles,
      neonSigns: env.signs,
      neonRain: env.rain,
      score: 0,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      kills: 0,
      wave: 1,
      waveEnemiesSpawned: 0,
      waveTargetKills: 2, // Wave 1 has only 1-2 enemies! Very gentle start!
      spawnCooldown: 40,
      enemyIdCounter: 1,
      screenShake: 0,
      time: 0,
      keys: {
        left: false,
        right: false,
        jump: false,
        attack: false,
        parry: false,
        dash: false
      }
    };

    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setKills(0);
    setWave(1);
    setActiveHostiles(0);
    setHealth(100);
    setEnergy(100);
    setWaveBanner('WAVE 01 // PURGE ROOFTOP SECTOR');
    setTimeout(() => setWaveBanner(null), 3000);
    setGameState('PLAYING');
  }, [initEnvironment]);

  // Handle Game Over
  const handleGameOver = useCallback(
    (finalScore: number) => {
      if (soundEnabled) sound.playGameOver();
      setGameState('GAMEOVER');
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('gamenova_hs_cyber-samurai', finalScore.toString());
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
      if (onGameOver) onGameOver(finalScore);
    },
    [highScore, onGameOver, soundEnabled]
  );

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) {
        s.keys.left = true;
        s.samurai.facing = -1;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        s.keys.right = true;
        s.samurai.facing = 1;
      }
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        s.keys.jump = true;
      }
      if (['KeyJ'].includes(e.code)) {
        e.preventDefault();
        executeSlash();
      }
      if (['KeyE', 'KeyK', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault();
        executeParry();
      }
      if (['KeyQ'].includes(e.code)) {
        e.preventDefault();
        executeDash();
      }
      if (['KeyP', 'Escape'].includes(e.code)) {
        setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = false;
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) s.keys.jump = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [executeSlash, executeParry, executeDash]);

  // Mobile Touch Joystick Handlers
  const handleJoystickTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickTouchIdRef.current = touch.identifier;
    joystickOriginRef.current = { x: centerX, y: centerY };

    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const maxRadius = 38;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const jx = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const jy = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    setJoystickPos({ x: jx, y: jy, active: true });

    const s = stateRef.current;
    if (jx < -8) {
      s.keys.left = true;
      s.keys.right = false;
      s.samurai.facing = -1;
    } else if (jx > 8) {
      s.keys.right = true;
      s.keys.left = false;
      s.samurai.facing = 1;
    } else {
      s.keys.left = false;
      s.keys.right = false;
    }

    if (jy < -16) {
      s.keys.jump = true;
    }
  }, []);

  const handleJoystickTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const origin = joystickOriginRef.current;
        const dx = touch.clientX - origin.x;
        const dy = touch.clientY - origin.y;
        const maxRadius = 38;
        const dist = Math.hypot(dx, dy);
        const clampedDist = Math.min(maxRadius, dist);
        const angle = Math.atan2(dy, dx);
        const jx = dist > 0 ? Math.cos(angle) * clampedDist : 0;
        const jy = dist > 0 ? Math.sin(angle) * clampedDist : 0;

        setJoystickPos({ x: jx, y: jy, active: true });

        const s = stateRef.current;
        if (jx < -8) {
          s.keys.left = true;
          s.keys.right = false;
          s.samurai.facing = -1;
        } else if (jx > 8) {
          s.keys.right = true;
          s.keys.left = false;
          s.samurai.facing = 1;
        } else {
          s.keys.left = false;
          s.keys.right = false;
        }

        if (jy < -16) {
          s.keys.jump = true;
        } else {
          s.keys.jump = false;
        }
        break;
      }
    }
  }, []);

  const handleJoystickTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickPos({ x: 0, y: 0, active: false });
        const s = stateRef.current;
        s.keys.left = false;
        s.keys.right = false;
        s.keys.jump = false;
        break;
      }
    }
  }, []);

  // Main Canvas Render & Simulation Engine
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI scaling & resize
    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gameLoop = () => {
      const s = stateRef.current;
      const sam = s.samurai;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;

      s.time += 0.016;

      // -------------------------------------------------------------
      // 1. UPDATE SAMURAI PHYSICS & MOVEMENT
      // -------------------------------------------------------------
      // Horizontal Acceleration & Friction
      const targetVx = s.keys.left ? -4.6 : s.keys.right ? 4.6 : 0;
      sam.vx += (targetVx - sam.vx) * 0.22;
      sam.x += sam.vx;

      if (Math.abs(sam.vx) > 0.3 && sam.isGrounded) {
        sam.walkFrame += 0.22;
      }

      // Arena boundary checks
      sam.x = Math.max(90, Math.min(ARENA_WIDTH - 90, sam.x));

      // Jump Physics
      if (s.keys.jump && sam.isGrounded) {
        sam.vy = -13.5;
        sam.isGrounded = false;
        if (soundEnabled) sound.playLaser(800);
        // Jump dust/sparks
        for (let j = 0; j < 6; j++) {
          s.particles.push({
            x: sam.x + (Math.random() - 0.5) * 20,
            y: sam.y,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 2,
            color: '#00f0ff',
            size: 2,
            alpha: 0.8,
            life: 12,
            maxLife: 12,
            type: 'mist'
          });
        }
      }

      // Gravity & Ground Collision
      sam.vy += 0.65;
      sam.y += sam.vy;
      if (sam.y >= GROUND_Y) {
        sam.y = GROUND_Y;
        sam.vy = 0;
        sam.isGrounded = true;
      } else {
        sam.isGrounded = false;
      }

      // Timers & Cooldowns
      if (sam.slashTimer > 0) sam.slashTimer--;
      else sam.isSlashing = false;
      if (sam.slashCooldown > 0) sam.slashCooldown--;

      if (sam.parryTimer > 0) sam.parryTimer--;
      else sam.isParrying = false;

      if (sam.dashTimer > 0) {
        sam.dashTimer--;
        // Store afterimage during dash
        sam.afterImages.push({ x: sam.x, y: sam.y, facing: sam.facing, alpha: 0.7 });
      } else {
        sam.isDashing = false;
      }
      if (sam.dashCooldown > 0) sam.dashCooldown--;
      if (sam.hitFlash > 0) sam.hitFlash--;

      // Decay afterimages
      for (let ai = sam.afterImages.length - 1; ai >= 0; ai--) {
        sam.afterImages[ai].alpha -= 0.08;
        if (sam.afterImages[ai].alpha <= 0) sam.afterImages.splice(ai, 1);
      }

      // Passive Energy / Chi regeneration
      sam.energy = Math.min(100, sam.energy + 0.28);
      setEnergy(Math.floor(sam.energy));

      // Combo Decay Timer
      if (s.comboTimer > 0) {
        s.comboTimer--;
        if (s.comboTimer <= 0) {
          s.combo = 0;
          setCombo(0);
        }
      }

      // -------------------------------------------------------------
      // 2. SMOOTH 2D CAMERA SYSTEM (CENTERED ON PLAYER WITH LERP)
      // -------------------------------------------------------------
      const targetCamX = sam.x - viewW / 2;
      s.cameraX += (targetCamX - s.cameraX) * 0.1;
      s.cameraX = Math.max(0, Math.min(ARENA_WIDTH - viewW, s.cameraX));

      // -------------------------------------------------------------
      // 3. ENEMY SPAWNER & WAVE PROGRESSION (EASY START)
      // -------------------------------------------------------------
      const currentLiving = s.enemies.filter(e => e.alive).length;
      setActiveHostiles(currentLiving);

      // Wave completion condition: Target kills reached and all enemies cleared
      if (s.waveEnemiesSpawned >= s.waveTargetKills && currentLiving === 0) {
        s.wave++;
        s.waveEnemiesSpawned = 0;
        // Gradual increase: Wave 1: 2, Wave 2: 3, Wave 3: 4, Wave 4: 5, etc.
        s.waveTargetKills = Math.min(10, 1 + s.wave);
        s.spawnCooldown = 90; // Generous breather between waves
        setWave(s.wave);

        // Field repair bonus on wave clear
        sam.hp = Math.min(100, sam.hp + 25);
        setHealth(Math.floor(sam.hp));
        sam.energy = 100;
        setEnergy(100);

        setWaveBanner(`WAVE 0${s.wave} // FIELD REPAIR +25 HP`);
        setTimeout(() => setWaveBanner(null), 3000);
      }

      // Spawn individual enemies with comfortable spacing
      if (s.waveEnemiesSpawned < s.waveTargetKills) {
        s.spawnCooldown--;
        // Early game spawn rate is very slow (every ~180-220 frames = 3+ seconds)
        const spawnDelay = Math.max(80, 190 - s.wave * 14);

        if (s.spawnCooldown <= 0 && currentLiving < Math.min(3, 1 + Math.floor(s.wave / 2))) {
          s.spawnCooldown = spawnDelay;
          s.waveEnemiesSpawned++;

          // Spawn from comfortable distance beyond the visible camera edges
          const spawnSide = Math.random() < 0.5 ? -1 : 1;
          const spawnX =
            spawnSide === -1
              ? Math.max(100, s.cameraX - 120 - Math.random() * 80)
              : Math.min(ARENA_WIDTH - 100, s.cameraX + viewW + 120 + Math.random() * 80);

          // Determine enemy archetype based on current wave
          let eType: EnemyType = 'guard';
          const r = Math.random();
          if (s.wave >= 4 && r < 0.25) {
            eType = 'enforcer';
          } else if (s.wave >= 3 && r < 0.45) {
            eType = 'ninja';
          } else if (s.wave >= 2 && r < 0.4) {
            eType = 'drone';
          } else {
            eType = 'guard';
          }

          // Slow, readable enemy speeds for comfortable beginner play
          const speed =
            eType === 'ninja'
              ? 1.9 + Math.min(1.0, s.wave * 0.1)
              : eType === 'drone'
              ? 1.3
              : eType === 'enforcer'
              ? 1.0
              : 1.2 + Math.min(0.8, s.wave * 0.08);

          const maxHp = eType === 'enforcer' ? 95 : eType === 'ninja' ? 45 : eType === 'drone' ? 26 : 36;

          s.enemies.push({
            id: `e_${s.enemyIdCounter++}`,
            x: spawnX,
            y: eType === 'drone' ? 380 : GROUND_Y,
            vx: 0,
            speed,
            hp: maxHp,
            maxHp,
            type: eType,
            alive: true,
            attackTimer: 0,
            attackInterval: eType === 'drone' ? 140 : eType === 'enforcer' ? 120 : 95,
            telegraphTimer: 0,
            walkFrame: 0,
            facing: spawnX < sam.x ? 1 : -1,
            hitFlash: 0,
            deathAnim: 0
          });
        }
      }

      // -------------------------------------------------------------
      // 4. UPDATE ENEMIES (AI & ATTACK PATTERNS)
      // -------------------------------------------------------------
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (!e.alive) {
          e.deathAnim -= 0.05;
          if (e.deathAnim <= 0) {
            s.enemies.splice(i, 1);
          }
          continue;
        }

        if (e.hitFlash > 0) e.hitFlash--;

        const dx = sam.x - e.x;
        const dist = Math.abs(dx);
        e.facing = dx > 0 ? 1 : -1;

        // Apply knockback velocity damping
        e.x += e.vx;
        e.vx *= 0.85;

        // Drone flight trajectory
        if (e.type === 'drone') {
          e.y = 380 + Math.sin(s.time * 3 + e.x * 0.02) * 20;
        }

        // Approach samurai smoothly
        const attackRange = e.type === 'drone' ? 240 : e.type === 'enforcer' ? 55 : 42;
        if (dist > attackRange) {
          e.x += e.facing * e.speed;
          e.walkFrame += 0.18;
          e.attackTimer = Math.max(0, e.attackTimer - 1);
        } else {
          // Inside strike range: Charge attack and telegraph advance warning
          e.attackTimer++;

          // Advance Telegraph warning 24 frames before strike
          if (e.attackTimer > e.attackInterval - 24) {
            e.telegraphTimer = e.attackTimer - (e.attackInterval - 24);
          } else {
            e.telegraphTimer = 0;
          }

          if (e.attackTimer >= e.attackInterval) {
            e.attackTimer = 0;
            e.telegraphTimer = 0;

            // Check if player parried or dodged
            if (sam.isParrying) {
              // Successfully Parried!
              if (soundEnabled) sound.playPowerUp();
              e.vx = -e.facing * 9;
              e.hp -= 30;
              e.hitFlash = 12;
              s.screenShake = 4;

              // Spark burst on parry
              for (let p = 0; p < 12; p++) {
                s.particles.push({
                  x: (e.x + sam.x) / 2,
                  y: sam.y - 25,
                  vx: (Math.random() - 0.5) * 7,
                  vy: (Math.random() - 0.5) * 7,
                  color: '#ff007f',
                  size: 3,
                  alpha: 1,
                  life: 16,
                  maxLife: 16,
                  type: 'spark'
                });
              }
            } else if (!sam.isDashing) {
              // Samurai takes hit
              const dmg = e.type === 'enforcer' ? 22 : e.type === 'ninja' ? 16 : e.type === 'drone' ? 10 : 12;

              sam.hp = Math.max(0, sam.hp - dmg);
              sam.hitFlash = 10;
              sam.vx = e.facing * 4;
              setHealth(Math.floor(sam.hp));
              if (soundEnabled) sound.playHit();
              s.screenShake = 6;

              if (sam.hp <= 0) {
                handleGameOver(s.score);
                return;
              }
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 5. UPDATE BACKGROUND FLYING VEHICLES & PARTICLES
      // -------------------------------------------------------------
      s.flyingVehicles.forEach(v => {
        v.x += v.speed;
        if (v.speed > 0 && v.x > ARENA_WIDTH + 100) v.x = -100;
        if (v.speed < 0 && v.x < -100) v.x = ARENA_WIDTH + 100;
      });

      // Update Slashes
      for (let i = s.slashes.length - 1; i >= 0; i--) {
        const sl = s.slashes[i];
        sl.life--;
        if (sl.life <= 0) s.slashes.splice(i, 1);
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // -------------------------------------------------------------
      // 6. HIGH-END PROCEDURAL CYBERPUNK RENDERING PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);

      // Camera Shake
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.4);
      }

      // 6A. Night Sky Gradient (Dark purple/blue cyberpunk atmosphere)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
      skyGrad.addColorStop(0, '#06040f');
      skyGrad.addColorStop(0.4, '#120826');
      skyGrad.addColorStop(0.8, '#1d0e3b');
      skyGrad.addColorStop(1, '#271249');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      // Cyber Moon with Holo-Rings
      const moonX = viewW * 0.75;
      const moonY = 90;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Hologram ring around moon
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(moonX, moonY, 52, 14, -0.2, 0, Math.PI * 2);
      ctx.stroke();

      // 6B. Distant Layer Parallax (0.15x camera speed)
      const p1Offset = s.cameraX * 0.15;
      ctx.fillStyle = '#0a0618';
      for (let bx = -100; bx < viewW + 150; bx += 85) {
        const worldX = Math.floor((bx + p1Offset) / 85) * 85;
        const bH = 260 + Math.sin(worldX * 0.02) * 60;
        ctx.fillRect(bx, GROUND_Y - bH, 75, bH);
        // Radio tower beacon
        if (Math.abs(worldX % 255) < 85) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(bx + 37, GROUND_Y - bH);
          ctx.lineTo(bx + 37, GROUND_Y - bH - 35);
          ctx.stroke();
          ctx.fillStyle = Math.sin(s.time * 6) > 0 ? '#ef4444' : 'rgba(239, 68, 68, 0.2)';
          ctx.beginPath();
          ctx.arc(bx + 37, GROUND_Y - bH - 35, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 6C. Midground Layer Parallax (0.4x camera speed)
      const p2Offset = s.cameraX * 0.4;
      for (let mx = -120; mx < viewW + 160; mx += 110) {
        const worldX = Math.floor((mx + p2Offset) / 110) * 110;
        const bH = 200 + Math.sin(worldX * 0.05) * 90;
        ctx.fillStyle = '#110c26';
        ctx.fillRect(mx, GROUND_Y - bH, 95, bH);

        // Lit cyber windows grid
        ctx.fillStyle = worldX % 220 === 0 ? 'rgba(0, 240, 255, 0.45)' : 'rgba(255, 0, 127, 0.35)';
        for (let wy = GROUND_Y - bH + 20; wy < GROUND_Y - 20; wy += 18) {
          for (let wx = mx + 10; wx < mx + 85; wx += 14) {
            if (Math.sin(worldX * 3 + wx * 7 + wy) > -0.15) {
              ctx.fillRect(wx, wy, 6, 7);
            }
          }
        }
      }

      // 6D. Flying Hover Vehicles (0.6x camera offset)
      s.flyingVehicles.forEach(v => {
        const screenVx = v.x - s.cameraX * 0.6;
        if (screenVx > -100 && screenVx < viewW + 100) {
          ctx.fillStyle = v.color;
          ctx.shadowColor = v.color;
          ctx.shadowBlur = 10;
          ctx.fillRect(screenVx, v.y, v.len, 5);
          // Headlight
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(v.speed > 0 ? screenVx + v.len - 4 : screenVx, v.y, 4, 5);
          ctx.shadowBlur = 0;
        }
      });

      // -------------------------------------------------------------
      // 6E. MAIN WORLD LAYER (OFFSET BY CAMERA X)
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(-s.cameraX, 0);

      // Neon Signs on Arena Buildings
      s.neonSigns.forEach(ns => {
        ctx.fillStyle = ns.color;
        ctx.shadowColor = ns.color;
        ctx.shadowBlur = 12;
        ctx.font = '900 13px monospace';
        ctx.fillText(ns.text, ns.x, ns.y);
        ctx.shadowBlur = 0;
      });

      // Rooftop Combat Deck (Wet reflective surface)
      const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, viewH);
      floorGrad.addColorStop(0, '#101426');
      floorGrad.addColorStop(0.3, '#0b0e1a');
      floorGrad.addColorStop(1, '#05070d');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, GROUND_Y, ARENA_WIDTH, viewH - GROUND_Y);

      // Wet Floor Horizontal Deck Seams
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let dy = GROUND_Y + 16; dy < viewH; dy += 24) {
        ctx.beginPath();
        ctx.moveTo(0, dy);
        ctx.lineTo(ARENA_WIDTH, dy);
        ctx.stroke();
      }

      // Neon Glowing Perimeter Edge
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(ARENA_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Wet reflections of neon billboard glows on the floor
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      for (let rx = 100; rx < ARENA_WIDTH; rx += 140) {
        ctx.fillRect(rx, GROUND_Y + 2, 45, 90);
      }
      ctx.fillStyle = 'rgba(255, 0, 127, 0.07)';
      for (let rx = 180; rx < ARENA_WIDTH; rx += 180) {
        ctx.fillRect(rx, GROUND_Y + 2, 50, 90);
      }

      // Arena Boundary Barriers (Left & Right)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.fillRect(70, GROUND_Y - 140, 6, 140);
      ctx.fillRect(ARENA_WIDTH - 76, GROUND_Y - 140, 6, 140);
      ctx.shadowBlur = 0;

      // Diagonal hazard strips on boundaries
      ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('WARNING // SECTOR EDGE', 85, GROUND_Y - 110);
      ctx.fillText('WARNING // SECTOR EDGE', ARENA_WIDTH - 220, GROUND_Y - 110);

      // Neon Rain
      ctx.lineWidth = 1.3;
      s.neonRain.forEach(r => {
        r.y += r.speed;
        if (r.y > viewH) {
          r.y = -20;
          r.x = Math.random() * ARENA_WIDTH;
        }
        ctx.strokeStyle = r.color;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y + r.len);
        ctx.stroke();
      });

      // -------------------------------------------------------------
      // 6F. DRAW ENEMIES
      // -------------------------------------------------------------
      s.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(e.facing, 1);

        // Disintegration alpha on death
        if (!e.alive) {
          ctx.globalAlpha = Math.max(0, e.deathAnim);
        }

        // Hit flash (white/cyan)
        if (e.hitFlash > 0) {
          ctx.filter = 'brightness(3) drop-shadow(0 0 8px #00f0ff)';
        }

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (e.type === 'drone') {
          // COMBAT DRONE
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Crimson Visor Core
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(8, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Drone laser targeting line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(80, 0);
          ctx.stroke();
        } else if (e.type === 'enforcer') {
          // HEAVY ENFORCER MECH
          const legOff = Math.sin(e.walkFrame) * 6;
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(-12, -42 + legOff, 10, 42);
          ctx.fillRect(2, -42 - legOff, 10, 42);

          // Heavy armored torso
          ctx.fillStyle = '#312e81';
          ctx.beginPath();
          ctx.roundRect(-16, -68, 32, 32, 4);
          ctx.fill();

          // Purple Reactor Core
          ctx.fillStyle = '#a855f7';
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, -52, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Visor
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(4, -64, 8, 3);

          // Heavy Plasma Shield & Hammer
          ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 12;
          ctx.fillRect(18, -75, 8, 50);
          ctx.shadowBlur = 0;
        } else if (e.type === 'ninja') {
          // ROGUE CYBER NINJA / ASSASSIN
          const legOff = Math.sin(e.walkFrame) * 8;
          ctx.fillStyle = '#09090b';
          ctx.fillRect(-8, -38 + legOff, 7, 38);
          ctx.fillRect(1, -38 - legOff, 7, 38);

          // Sleek Torso
          ctx.fillStyle = '#18181b';
          ctx.beginPath();
          ctx.roundRect(-10, -58, 20, 26, 3);
          ctx.fill();

          // Flowing Neon Scarf
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(-8, -54);
          ctx.lineTo(-24 - Math.sin(s.time * 6) * 6, -50 + Math.cos(s.time * 6) * 4);
          ctx.lineTo(-8, -48);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Crimson Visor
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.fillRect(4, -54, 7, 3);
          ctx.shadowBlur = 0;

          // Dual Cyber Katana
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(10, -48, 26, 2.5);
        } else {
          // CYBER GUARD
          const legOff = Math.sin(e.walkFrame) * 7;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-9, -36 + legOff, 8, 36);
          ctx.fillRect(1, -36 - legOff, 8, 36);

          // Torso
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.roundRect(-11, -56, 22, 24, 3);
          ctx.fill();

          // Amber Eye Visor
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          ctx.fillRect(4, -52, 6, 3);
          ctx.shadowBlur = 0;

          // Stun Baton
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(8, -44, 20, 2.5);
        }

        // ATTACK TELEGRAPH INDICATOR (Glowing pre-attack charging spark)
        if (e.telegraphTimer > 0) {
          const tFrac = e.telegraphTimer / 24;
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(20, -45, 3 + tFrac * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Enemy HP Bar
        if (e.hp < e.maxHp && e.alive) {
          const barW = 28;
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(-barW / 2, -74, barW, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-barW / 2, -74, barW * (e.hp / e.maxHp), 4);
        }

        ctx.restore();
      });

      // -------------------------------------------------------------
      // 6G. DRAW CYBER SAMURAI CHARACTER
      // -------------------------------------------------------------
      // Render Dash Afterimages
      sam.afterImages.forEach(ai => {
        ctx.save();
        ctx.translate(ai.x, ai.y);
        ctx.scale(ai.facing, 1);
        ctx.globalAlpha = ai.alpha * 0.5;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.roundRect(-12, -64, 24, 32, 4);
        ctx.fill();
        ctx.restore();
      });

      ctx.save();
      ctx.translate(sam.x, sam.y);
      ctx.scale(sam.facing, 1);

      // Hit Flash filter
      if (sam.hitFlash > 0) {
        ctx.filter = 'brightness(3) drop-shadow(0 0 10px #ff007f)';
      }

      // Ground Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cyber Armor Legs
      const legOffset = sam.isGrounded ? Math.sin(sam.walkFrame) * 8 : -4;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-11, -38 + legOffset, 9, 38);
      ctx.fillRect(2, -38 - legOffset, 9, 38);

      // Exoskeleton Torso & Breastplate
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-13, -64, 26, 32, 4);
      ctx.fill();

      // Flowing Cyber Scarf / Sash (billowing behind)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-8, -58);
      ctx.lineTo(-26 - Math.sin(s.time * 8) * 8, -52 + Math.cos(s.time * 8) * 5);
      ctx.lineTo(-8, -50);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cyan Core Reactor (Pulsing Chest Arc Reactor)
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, -50, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Samurai Helmet (Kabuto Crescent Crest & Visor)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, -70, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Golden Kabuto Crest Crescent
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-2, -78, 6, -0.3, Math.PI * 0.8);
      ctx.lineTo(-2, -75);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Radiant Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(3, -72, 8, 3.5);
      ctx.shadowBlur = 0;

      // Plasma Katana (Blade changes position when slashing)
      const katanaGlow = sam.slashStage === 3 ? '#fde047' : sam.slashStage === 2 ? '#ff007f' : '#00f0ff';
      ctx.fillStyle = katanaGlow;
      ctx.shadowColor = katanaGlow;
      ctx.shadowBlur = 16;
      if (sam.isSlashing) {
        ctx.fillRect(14, -76, 50, 4);
      } else {
        ctx.fillRect(9, -58, 34, 3);
      }
      ctx.shadowBlur = 0;

      // Deflect / Parry Energy Shield Bubble
      if (sam.isParrying) {
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(0, -44, 44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // -------------------------------------------------------------
      // 6H. DRAW SLASH ARCS & COMBAT PARTICLES
      // -------------------------------------------------------------
      s.slashes.forEach(sl => {
        ctx.save();
        ctx.translate(sl.x, sl.y);
        ctx.scale(sl.facing, 1);
        ctx.strokeStyle = sl.color;
        ctx.shadowColor = sl.glowColor;
        ctx.shadowBlur = 22;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, sl.radius, sl.angle - Math.PI / 2.8, sl.angle + Math.PI / 2.8);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      });

      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      ctx.restore(); // Restore world camera translate

      // Low Health Crimson Vignette Overlay
      if (sam.hp <= 25) {
        const pulse = (Math.sin(s.time * 8) + 1) * 0.5;
        ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + pulse * 0.15})`;
        ctx.fillRect(0, 0, viewW, viewH);
      }

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameState, handleGameOver, soundEnabled]);

  return (
    <div
      ref={containerRef}
      id="cyber-samurai-root"
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#05070d] text-white select-none overflow-hidden font-sans"
    >
      {/* -------------------------------------------------------------
          1. FULLSCREEN CANVAS LAYER
          ------------------------------------------------------------- */}
      <canvas
        ref={canvasRef}
        id="cyber-samurai-canvas"
        onClick={executeSlash}
        onContextMenu={e => {
          e.preventDefault();
          executeDash();
        }}
        className="absolute inset-0 w-full h-full cursor-crosshair object-cover"
      />

      {/* -------------------------------------------------------------
          2. COMPACT TOP CYBERPUNK GLASS HUD
          ------------------------------------------------------------- */}
      <header
        id="cyber-samurai-top-hud"
        className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4 pointer-events-none"
      >
        {/* TOP LEFT: Back • Pause • Sound • Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {onBack && (
            <button
              id="cs-back-btn"
              type="button"
              onClick={onBack}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
              title="Back to Games"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <button
            id="cs-pause-btn"
            type="button"
            onClick={() => setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev))}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title="Pause Duel (ESC / P)"
          >
            {gameState === 'PAUSED' ? <Play className="w-4 h-4 text-cyan-400 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            id="cs-sound-btn"
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.toggleMute();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            id="cs-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* TOP CENTER: Wave Status Banner */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div
            id="cs-wave-tracker"
            className="px-3.5 sm:px-4 py-1.5 rounded-2xl bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md shadow-lg flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f0ff]" />
            <span className="font-mono font-black text-xs sm:text-sm text-white tracking-widest uppercase">
              WAVE {wave < 10 ? `0${wave}` : wave}
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="font-mono text-[10px] font-bold text-slate-300">
              SECTOR 9
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="font-mono text-[10px] font-black text-red-400">
              {activeHostiles} HOSTILE{activeHostiles === 1 ? '' : 'S'}
            </span>
          </div>

          {waveBanner && (
            <div className="mt-2 px-3.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/60 shadow-[0_0_16px_rgba(0,245,255,0.4)] backdrop-blur-md text-[9px] font-mono font-black text-cyan-300 tracking-wider animate-in fade-in zoom-in-95 duration-200">
              {waveBanner}
            </div>
          )}
        </div>

        {/* TOP RIGHT: Health • Chi • Combo • Score */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Status Gauges */}
          <div
            id="cs-status-cluster"
            className="flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-white/10 backdrop-blur-md shadow-lg min-w-[145px] sm:min-w-[185px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-[10px] sm:text-xs text-white tracking-wider">
                CYBER SAMURAI HP
              </span>
              {health <= 30 && (
                <span className="flex items-center gap-0.5 text-[8px] font-mono font-black text-red-400 animate-pulse">
                  <AlertTriangle className="w-2.5 h-2.5" /> CRITICAL
                </span>
              )}
            </div>

            {/* Health Bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-black text-red-400 w-7">HULL</span>
              <div className="flex-1 h-2 rounded-full bg-slate-900/90 border border-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    health <= 30
                      ? 'bg-red-500 animate-pulse'
                      : health <= 60
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                  }`}
                  style={{ width: `${Math.max(0, health)}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-200 w-7 text-right tabular-nums">
                {health}%
              </span>
            </div>

            {/* Chi / Energy Bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-black text-cyan-400 w-7">CHI</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-900/90 border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-[#00f0ff] transition-all duration-100 shadow-[0_0_8px_rgba(0,245,255,0.4)]"
                  style={{ width: `${Math.max(0, energy)}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-cyan-300 w-7 text-right tabular-nums">
                {energy}%
              </span>
            </div>
          </div>

          {/* Combo Streak Pill */}
          {combo > 1 && (
            <div
              id="cs-combo-badge"
              className="hidden sm:flex flex-col items-center px-2.5 py-1 rounded-xl bg-fuchsia-950/85 border border-fuchsia-500/50 backdrop-blur-md shadow-md animate-pulse"
            >
              <div className="flex items-center gap-1 text-[8px] font-mono font-black text-fuchsia-300 uppercase">
                <Sparkles className="w-3 h-3 text-fuchsia-400" />
                <span>COMBO</span>
              </div>
              <span className="font-mono font-black text-sm text-white">{combo}x</span>
            </div>
          )}

          {/* Score Box */}
          <div
            id="cs-score-box"
            className="flex flex-col items-end px-2.5 sm:px-3 py-1 rounded-xl bg-slate-950/85 border border-white/10 backdrop-blur-md shadow-md"
          >
            <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase leading-tight">
              SCORE
            </span>
            <span className="font-mono font-black text-xs sm:text-sm text-amber-400 tabular-nums">
              {score.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------------
          3. DESKTOP KEY HINTS BAR (BOTTOM-LEFT)
          ------------------------------------------------------------- */}
      {gameState === 'PLAYING' && (
        <div
          id="cs-desktop-hints"
          className="absolute bottom-4 left-4 z-20 pointer-events-none hidden md:flex flex-col gap-1 text-[9px] font-mono text-slate-400"
        >
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md shadow-md flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-bold">SYSTEMS ONLINE</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-medium">KATANA [READY]</span>
            <span className="text-slate-500">•</span>
            <span className="text-fuchsia-400 font-medium">DEFLECT [READY]</span>
          </div>
          <span className="text-[8px] text-slate-400 px-1">
            [A][D] RUN • [SPACE] JUMP • [CLICK / J] SLASH • [E / SHIFT] DEFLECT • [Q] CHI DASH
          </span>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. MOBILE ON-SCREEN TOUCH CONTROLS (VIRTUAL JOYSTICK + ACTION BUTTONS)
          ------------------------------------------------------------- */}
      {isTouchDevice && gameState === 'PLAYING' && (
        <div
          id="cs-mobile-controls"
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20 pb-5 px-4 sm:px-6 select-none"
        >
          <div className="flex items-end justify-between w-full">
            {/* LEFT: Virtual Joystick */}
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <div
                id="cs-virtual-joystick-base"
                onTouchStart={handleJoystickTouchStart}
                onTouchMove={handleJoystickTouchMove}
                onTouchEnd={handleJoystickTouchEnd}
                onTouchCancel={handleJoystickTouchEnd}
                className={`relative w-24 h-24 rounded-full border flex items-center justify-center backdrop-blur-md shadow-2xl transition-colors cursor-pointer touch-none ${
                  joystickPos.active
                    ? 'bg-slate-950/60 border-cyan-400/60 shadow-[0_0_20px_rgba(0,245,255,0.25)]'
                    : 'bg-slate-950/40 border-cyan-500/25'
                }`}
              >
                {/* Concentric Guide Rings */}
                <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute inset-6 rounded-full border border-cyan-500/15 pointer-events-none" />

                {/* Direction Arrows */}
                <span className="absolute left-2 text-[10px] text-cyan-400/50 font-bold pointer-events-none">◀</span>
                <span className="absolute right-2 text-[10px] text-cyan-400/50 font-bold pointer-events-none">▶</span>
                <span className="absolute top-2 text-[10px] text-cyan-400/50 font-bold pointer-events-none">▲</span>

                {/* Thumb Knob */}
                <div
                  id="cs-joystick-knob"
                  className={`w-11 h-11 rounded-full border flex items-center justify-center backdrop-blur-lg pointer-events-none transition-transform duration-75 shadow-lg ${
                    joystickPos.active
                      ? 'bg-cyan-500/30 border-cyan-300 text-white shadow-[0_0_12px_rgba(0,245,255,0.5)]'
                      : 'bg-slate-900/70 border-cyan-500/30 text-cyan-400/80'
                  }`}
                  style={{
                    transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
                  }}
                >
                  <Bot className="w-5 h-5" />
                </div>
              </div>
              <span className="text-[8px] font-mono font-bold text-cyan-400/60 tracking-wider uppercase">
                JOYSTICK
              </span>
            </div>

            {/* RIGHT: Translucent Action Buttons */}
            <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
              {/* Jump Button */}
              <button
                id="btn-cs-jump"
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  stateRef.current.keys.jump = true;
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  stateRef.current.keys.jump = false;
                }}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-slate-950/45 border border-cyan-500/30 active:bg-cyan-500/30 active:border-cyan-400 active:scale-95 flex flex-col items-center justify-center text-cyan-300 text-[9px] font-mono font-bold backdrop-blur-md shadow-xl select-none transition-transform cursor-pointer"
                aria-label="Jump"
              >
                <Flame className="w-4 h-4 mb-0.5 fill-current" />
                <span>JUMP</span>
              </button>

              {/* Deflect / Parry Shield */}
              <button
                id="btn-cs-deflect"
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  executeParry();
                }}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-slate-950/45 border border-fuchsia-500/40 active:bg-fuchsia-500/30 active:border-fuchsia-400 active:scale-95 flex flex-col items-center justify-center text-fuchsia-300 text-[9px] font-mono font-bold backdrop-blur-md shadow-xl select-none transition-transform cursor-pointer"
                aria-label="Energy Deflect Shield"
              >
                <Shield className="w-4 h-4 mb-0.5" />
                <span>DEFLECT</span>
              </button>

              {/* Chi Dash */}
              <button
                id="btn-cs-dash"
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  executeDash();
                }}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-slate-950/45 border border-purple-500/40 active:bg-purple-500/30 active:border-purple-400 active:scale-95 flex flex-col items-center justify-center text-purple-300 text-[9px] font-mono font-bold backdrop-blur-md shadow-xl select-none transition-transform cursor-pointer"
                aria-label="Chi Dash Strike"
              >
                <Zap className="w-4 h-4 mb-0.5 fill-current" />
                <span>DASH</span>
              </button>

              {/* Sword Slash Button */}
              <button
                id="btn-cs-slash"
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  executeSlash();
                }}
                className="w-14 h-14 sm:w-15 sm:h-15 rounded-2xl bg-cyan-950/40 border border-cyan-400/60 active:bg-cyan-500/35 active:border-cyan-300 active:scale-95 flex flex-col items-center justify-center text-[#00f0ff] text-[10px] font-mono font-black backdrop-blur-md shadow-[0_0_16px_rgba(0,245,255,0.25)] select-none transition-transform cursor-pointer"
                aria-label="Katana Slash"
              >
                <Swords className="w-5 h-5 mb-0.5" />
                <span>SLASH</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. START SCREEN OVERLAY
          ------------------------------------------------------------- */}
      {gameState === 'START' && (
        <div
          id="cs-start-screen"
          className="absolute inset-0 bg-[#06040f]/92 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in duration-300"
        >
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_24px_rgba(0,245,255,0.3)]">
            <Swords className="w-8 h-8" />
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl text-white tracking-widest mb-2">
            CYBER SAMURAI
          </h1>
          <p className="text-xs sm:text-sm text-cyan-300 font-mono tracking-wider max-w-md mb-6">
            NEO-TOKYO // RAIN-SLICKED ROOFTOP COMBAT PROTOCOL
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-6 text-left">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Movement</span>
              <p className="text-xs font-bold text-white mt-0.5">A / D or Virtual Joystick</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Plasma Katana</span>
              <p className="text-xs font-bold text-[#00f0ff] mt-0.5">Left Click / J / Slash</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Energy Deflect</span>
              <p className="text-xs font-bold text-fuchsia-400 mt-0.5">E / Shift (20 Chi)</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Chi Dash Strike</span>
              <p className="text-xs font-bold text-cyan-300 mt-0.5">Q / Right Click (25 Chi)</p>
            </div>
          </div>

          <button
            id="btn-cs-start"
            type="button"
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-black text-sm tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(0,245,255,0.4)] transition-transform active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>DRAW BLADE</span>
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. PAUSE OVERLAY (CLEAN FUTURISTIC GLASS PANEL)
          ------------------------------------------------------------- */}
      {gameState === 'PAUSED' && (
        <div
          id="cs-pause-screen"
          className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-white/10 shadow-[0_0_40px_rgba(0,245,255,0.15)] flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3 shadow-md">
              <Pause className="w-6 h-6" />
            </div>

            <h2 className="font-display font-black text-2xl text-white tracking-widest">
              CYBER SAMURAI
            </h2>
            <p className="text-xs font-mono text-cyan-400 tracking-wider mb-6">
              PAUSED // COMBAT SUSPENDED
            </p>

            {!showSettings ? (
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setGameState('PLAYING')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs tracking-wider cursor-pointer shadow-md transition-transform active:scale-95"
                >
                  RESUME
                </button>

                <button
                  type="button"
                  onClick={startGame}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs tracking-wider cursor-pointer transition-colors"
                >
                  RESTART
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>SETTINGS</span>
                </button>

                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full py-3 rounded-xl bg-slate-900/60 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-bold text-xs tracking-wider cursor-pointer transition-colors"
                  >
                    EXIT
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-mono">Sound Audio</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      sound.toggleMute();
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-mono font-bold text-cyan-300 cursor-pointer"
                  >
                    {soundEnabled ? 'ENABLED' : 'MUTED'}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-mono">Display</span>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-mono font-bold text-cyan-300 cursor-pointer"
                  >
                    {isFullscreen ? 'WINDOWED' : 'FULLSCREEN'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wider cursor-pointer mt-2"
                >
                  BACK TO MENU
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          7. GAME OVER SCREEN (MISSION FAILED)
          ------------------------------------------------------------- */}
      {gameState === 'GAMEOVER' && (
        <div
          id="cs-gameover-screen"
          className="absolute inset-0 bg-[#06040f]/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in duration-300"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-500/50 flex items-center justify-center text-red-400 mb-3 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <Trophy className="w-8 h-8" />
          </div>

          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-widest">
            MISSION FAILED
          </h2>
          <p className="text-xs text-red-400 font-mono tracking-wider mt-1 mb-6">
            COMBAT PROTOCOL TERMINATED // SAMURAI FALLEN
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md mb-6">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[9px] font-mono text-slate-400 uppercase">Score</span>
              <p className="text-sm font-black text-amber-300 mt-0.5">{score.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[9px] font-mono text-slate-400 uppercase">Wave</span>
              <p className="text-sm font-black text-cyan-300 mt-0.5">{wave}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[9px] font-mono text-slate-400 uppercase">Max Combo</span>
              <p className="text-sm font-black text-fuchsia-300 mt-0.5">{maxCombo}x</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[9px] font-mono text-slate-400 uppercase">Defeated</span>
              <p className="text-sm font-black text-emerald-400 mt-0.5">{kills}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-cs-retry"
              type="button"
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-transform active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RETRY</span>
            </button>
            {onBack && (
              <button
                id="btn-cs-main-menu"
                type="button"
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs tracking-wider cursor-pointer transition-colors"
              >
                MAIN MENU
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
