import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Bot,
  Shield,
  Zap,
  Crosshair,
  Trophy,
  Volume2,
  VolumeX,
  Pause,
  ArrowLeft,
  Flame,
  Sparkles,
  Maximize2,
  Minimize2,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Rocket,
  Target,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  r: number;
  color: string;
  glowColor: string;
  isPlayer: boolean;
  isMissile?: boolean;
  targetId?: string | null;
  life?: number;
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
  type?: 'smoke' | 'spark' | 'explosion' | 'debris' | 'shockwave' | 'casing';
  rot?: number;
  vRot?: number;
}

interface EnemyMech {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'drone' | 'scout' | 'siege' | 'titan';
  attackTimer: number;
  attackInterval: number;
  chargeTimer: number; // Attack telegraph charging spark
  walkFrame: number;
  facing: -1 | 1;
  hitFlashTimer: number;
  vy?: number;
}

const ARENA_WIDTH = 2600;
const FLOOR_Y = 560;

export const MechaBattleGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game States
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [wave, setWave] = useState(1);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerShield, setPlayerShield] = useState(100);
  const [missileAmmo, setMissileAmmo] = useState(6);
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [activeHostiles, setActiveHostiles] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_mecha-battle') || '0', 10);
  });
  const [soundEnabled, setSoundEnabled] = useState(() => !sound.getIsMuted());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [forceTouchControls, setForceTouchControls] = useState(false);
  const [waveBanner, setWaveBanner] = useState<string | null>(null);

  // Virtual Joystick Touch Tracking
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0, active: false });
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // End-game Telemetry
  const [finalStats, setFinalStats] = useState({
    score: 0,
    kills: 0,
    wave: 1,
    damageDealt: 0,
    isNewRecord: false
  });

  // Master Engine State Ref
  const stateRef = useRef({
    screenShake: 0,
    damageVignette: 0,
    cameraX: 0,
    cameraY: 0,
    viewport: { w: 1200, h: 700 },
    player: {
      x: 350,
      y: FLOOR_Y,
      vx: 0,
      vy: 0,
      isGrounded: true,
      facing: 1 as -1 | 1,
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      isShielding: false,
      missiles: 6,
      heat: 0,
      walkFrame: 0,
      gunAngle: 0,
      barrelAngle: 0,
      recoilOffset: 0,
      shootCooldown: 0,
      missileCooldown: 0,
      hitFlashTimer: 0,
      missileRegenTimer: 0
    },
    enemies: [] as EnemyMech[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    score: 0,
    kills: 0,
    damageDealt: 0,
    waveNum: 1,
    enemyIdCounter: 1,
    time: 0,
    isTargetLocked: false,
    mouse: {
      worldX: 600,
      worldY: 400,
      screenX: 600,
      screenY: 400,
      isDown: false
    },
    keys: {
      left: false,
      right: false,
      jump: false,
      shoot: false,
      missile: false,
      shield: false
    }
  });

  // Detect touch capability
  useEffect(() => {
    const isTouch =
      'ontouchstart' in window ||
      (navigator && navigator.maxTouchPoints > 0) ||
      window.innerWidth < 1024;
    setIsTouchDevice(isTouch);
  }, []);

  // Monitor Fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    sound.playClick();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Fullscreen failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Spawn Enemy Waves with relaxed, comfortable pacing and gradual curve
  const spawnWave = useCallback((wNum: number) => {
    const s = stateRef.current;
    s.enemies = [];

    // Wave 1: strictly 2 enemies (very easy, relaxed introduction)
    // Wave 2: strictly 3 enemies (still easy and comfortable)
    // Wave 3: 4 enemies (gradually introduces siege artillery)
    // Wave 4: 4 enemies
    // Wave 5: 1 Titan Warlord + 2 minor escorts (boss wave)
    // Wave 6+: smoothly scales up to maximum 6 hostiles
    const count =
      wNum === 1 ? 2 :
      wNum === 2 ? 3 :
      wNum === 5 ? 3 :
      Math.min(6, 2 + Math.floor(wNum * 0.65));

    // Formatted wave banner with leading zero
    const waveStr = wNum < 10 ? `0${wNum}` : `${wNum}`;
    setWaveBanner(`WAVE ${waveStr} // PURGE DIRECTIVE INITIALIZED`);
    setTimeout(() => setWaveBanner(null), 2800);

    for (let i = 0; i < count; i++) {
      const isTitan = wNum >= 5 && i === 0;
      const isSiege = wNum >= 3 && (i === 1 || (wNum >= 4 && i === 0));
      const eType = isTitan ? 'titan' : isSiege ? 'siege' : (wNum > 1 && i % 2 === 1) ? 'drone' : 'scout';

      // Distribute spawns well away from player - NEVER crowd or surround the player
      const minDistance = 750;
      const spawnX = Math.min(ARENA_WIDTH - 140, Math.max(s.player.x + minDistance, 1250 + i * 260));
      const spawnY = eType === 'drone' ? FLOOR_Y - 170 - (i % 2) * 40 : FLOOR_Y;

      // Relaxed attack intervals (frames at 60fps):
      // Wave 1: 240 frames (~4.0s between attacks)
      // Wave 2: 210 frames (~3.5s)
      // Wave 3+: 150-190 frames (~2.5-3.2s)
      const baseInterval = wNum === 1 ? 240 : wNum === 2 ? 210 : Math.max(130, 210 - (wNum - 2) * 16);
      const attackInterval =
        eType === 'titan' ? Math.floor(baseInterval * 0.85) :
        eType === 'drone' ? Math.floor(baseInterval * 0.95) :
        baseInterval;

      s.enemies.push({
        id: `m_${s.enemyIdCounter++}`,
        x: spawnX,
        y: spawnY,
        hp: eType === 'titan' ? 320 : eType === 'siege' ? 130 : eType === 'scout' ? 65 : 45,
        maxHp: eType === 'titan' ? 320 : eType === 'siege' ? 130 : eType === 'scout' ? 65 : 45,
        type: eType,
        attackTimer: -70 - i * 45, // Generous grace period: enemies do not fire immediately
        attackInterval,
        chargeTimer: 0,
        walkFrame: 0,
        facing: -1,
        hitFlashTimer: 0,
        vy: 0
      });
    }
    setActiveHostiles(s.enemies.length);
  }, []);

  // Shoulder Missile Salvo
  const fireMissileBarrage = useCallback(() => {
    const s = stateRef.current;
    if (s.player.missiles <= 0 || s.player.missileCooldown > 0) return;

    if (soundEnabled) sound.playExplosion();
    s.player.missiles--;
    setMissileAmmo(s.player.missiles);
    s.player.missileCooldown = 45;
    s.screenShake = 6;

    // Launch dual homing rockets from left and right shoulder silos
    for (let i = -1; i <= 1; i += 2) {
      const launchX = s.player.x + i * 16;
      const launchY = s.player.y - 72;

      // Find initial closest enemy for homing
      let nearestEnemy: EnemyMech | null = null;
      let minDist = 99999;
      s.enemies.forEach(e => {
        const d = Math.hypot(e.x - launchX, e.y - launchY);
        if (d < minDist) {
          minDist = d;
          nearestEnemy = e;
        }
      });

      s.projectiles.push({
        x: launchX,
        y: launchY,
        vx: s.player.facing * 7 + (Math.random() - 0.5) * 3,
        vy: -9 + (Math.random() - 0.5) * 4,
        damage: 90,
        r: 5,
        color: '#f97316',
        glowColor: '#ea580c',
        isPlayer: true,
        isMissile: true,
        targetId: nearestEnemy ? (nearestEnemy as EnemyMech).id : null,
        life: 140
      });

      // Launch blast puff & sparks
      for (let k = 0; k < 6; k++) {
        s.particles.push({
          x: launchX,
          y: launchY,
          vx: (Math.random() - 0.5) * 4,
          vy: -2 + Math.random() * 3,
          color: '#f97316',
          size: 3 + Math.random() * 3,
          alpha: 0.9,
          life: 18,
          maxLife: 18,
          type: 'spark'
        });
      }
    }
  }, [soundEnabled]);

  // Start / Restart
  const startGame = useCallback(() => {
    if (soundEnabled) sound.playClick();
    stateRef.current = {
      screenShake: 0,
      damageVignette: 0,
      cameraX: 0,
      cameraY: 0,
      viewport: { w: 1200, h: 700 },
      player: {
        x: 320,
        y: FLOOR_Y,
        vx: 0,
        vy: 0,
        isGrounded: true,
        facing: 1,
        hp: 100,
        maxHp: 100,
        shield: 100,
        maxShield: 100,
        isShielding: false,
        missiles: 6,
        heat: 0,
        walkFrame: 0,
        gunAngle: 0,
        barrelAngle: 0,
        recoilOffset: 0,
        shootCooldown: 0,
        missileCooldown: 0,
        hitFlashTimer: 0,
        missileRegenTimer: 0
      },
      enemies: [],
      projectiles: [],
      particles: [],
      score: 0,
      kills: 0,
      damageDealt: 0,
      waveNum: 1,
      enemyIdCounter: 1,
      time: 0,
      isTargetLocked: false,
      mouse: {
        worldX: 600,
        worldY: 400,
        screenX: 600,
        screenY: 400,
        isDown: false
      },
      keys: { left: false, right: false, jump: false, shoot: false, missile: false, shield: false }
    };

    setJoystickPos({ x: 0, y: 0, active: false });
    joystickTouchIdRef.current = null;
    setScore(0);
    setKills(0);
    setPlayerHp(100);
    setPlayerShield(100);
    setMissileAmmo(6);
    setWave(1);
    setGameState('PLAYING');
    spawnWave(1);
  }, [soundEnabled, spawnWave]);

  // Virtual Joystick Mobile Touch Handlers
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
      s.player.facing = -1;
    } else if (jx > 8) {
      s.keys.right = true;
      s.keys.left = false;
      s.player.facing = 1;
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
          s.player.facing = -1;
        } else if (jx > 8) {
          s.keys.right = true;
          s.keys.left = false;
          s.player.facing = 1;
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

  // Handle Game Over
  const handleGameOver = useCallback((finalScore: number) => {
    if (soundEnabled) sound.playGameOver();
    const s = stateRef.current;
    const isNew = finalScore > highScore;
    setFinalStats({
      score: finalScore,
      kills: s.kills,
      wave: s.waveNum,
      damageDealt: s.damageDealt,
      isNewRecord: isNew
    });

    setGameState('GAMEOVER');
    if (isNew) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_mecha-battle', finalScore.toString());
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver, soundEnabled]);

  // Keyboard & Mouse Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) {
        s.keys.left = true;
        s.player.facing = -1;
      }
      if (['KeyD', 'ArrowRight'].includes(e.code)) {
        s.keys.right = true;
        s.player.facing = 1;
      }
      // Jump Jets
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        s.keys.jump = true;
      }
      // Vulcan fire
      if (['KeyF', 'KeyJ'].includes(e.code)) s.keys.shoot = true;
      // Missiles
      if (['KeyE', 'KeyK'].includes(e.code)) fireMissileBarrage();
      // Shield
      if (['ShiftLeft', 'ShiftRight', 'KeyS', 'ArrowDown'].includes(e.code)) s.keys.shield = true;
      // Fullscreen (F)
      if (e.code === 'KeyF' && !s.keys.shoot) {
        // Only toggle fullscreen if not actively firing
      }
      // Pause
      if (['KeyP', 'Escape'].includes(e.code)) {
        setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = false;
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) s.keys.jump = false;
      if (['KeyF', 'KeyJ'].includes(e.code)) s.keys.shoot = false;
      if (['ShiftLeft', 'ShiftRight', 'KeyS', 'ArrowDown'].includes(e.code)) s.keys.shield = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const s = stateRef.current;

      const scale = Math.max(0.7, Math.min(1.25, s.viewport.h / 620));
      s.mouse.screenX = screenX;
      s.mouse.screenY = screenY;
      s.mouse.worldX = screenX / scale + s.cameraX;
      s.mouse.worldY = screenY / scale + s.cameraY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        stateRef.current.keys.shoot = true;
        stateRef.current.mouse.isDown = true;
      }
      if (e.button === 2) {
        e.preventDefault();
        fireMissileBarrage();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        stateRef.current.keys.shoot = false;
        stateRef.current.mouse.isDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [fireMissileBarrage]);

  // Main 60FPS War Engine & Canvas Render Pipeline
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Keep dynamic canvas sizing in sync with container
    const updateDimensions = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        stateRef.current.viewport.w = w;
        stateRef.current.viewport.h = h;
      }
    };
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    const gameLoop = () => {
      const s = stateRef.current;
      const p = s.player;
      s.time += 0.016;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = s.viewport.w;
      const vh = s.viewport.h;

      // -----------------------------------------------------------
      // 1. UPDATE PLAYER MECH (SMOOTH ACCELERATION & CONTROLLABLE INERTIA)
      // -----------------------------------------------------------
      const maxSpeed = p.isShielding ? 1.8 : 3.4; // Slightly slower, comfortable and controllable
      const targetVx = s.keys.left ? -maxSpeed : s.keys.right ? maxSpeed : 0;

      if (targetVx !== 0) {
        // Smooth acceleration toward target velocity
        p.vx += (targetVx - p.vx) * 0.15;
        p.facing = targetVx > 0 ? 1 : -1;
        p.walkFrame += 0.18;
      } else {
        // Smooth deceleration to natural halt
        p.vx *= 0.82;
        if (Math.abs(p.vx) < 0.05) p.vx = 0;
      }

      p.x += p.vx;
      p.x = Math.max(90, Math.min(ARENA_WIDTH - 90, p.x));

      // Thruster Jet Jump - floaty, controllable and predictable
      if (s.keys.jump && p.isGrounded) {
        p.vy = -12.4;
        p.isGrounded = false;
        if (soundEnabled) sound.playPowerUp();

        // High intensity ion thruster blast
        for (let i = 0; i < 10; i++) {
          s.particles.push({
            x: p.x - p.facing * 12 + (Math.random() - 0.5) * 16,
            y: p.y - 12,
            vx: -p.facing * 2 + (Math.random() - 0.5) * 4,
            vy: 3 + Math.random() * 4,
            color: Math.random() < 0.6 ? '#00f5ff' : '#38bdf8',
            size: 3 + Math.random() * 3,
            alpha: 1,
            life: 20,
            maxLife: 20,
            type: 'spark'
          });
        }
      }

      // Smooth Gravity & Landing
      if (!p.isGrounded) {
        p.vy += 0.52; // gentle gravity for comfortable air time
        p.y += p.vy;

        // In-flight thruster trail
        if (Math.random() < 0.6) {
          s.particles.push({
            x: p.x - p.facing * 14 + (Math.random() - 0.5) * 8,
            y: p.y - 14,
            vx: -p.facing * 2 + (Math.random() - 0.5) * 2,
            vy: 2 + Math.random() * 3,
            color: '#00f5ff',
            size: 2.5,
            alpha: 0.8,
            life: 14,
            maxLife: 14,
            type: 'spark'
          });
        }

        if (p.y >= FLOOR_Y) {
          p.y = FLOOR_Y;
          p.vy = 0;
          p.isGrounded = true;
          s.screenShake = 3.5;

          // Landing dust puff
          for (let i = 0; i < 8; i++) {
            s.particles.push({
              x: p.x + (Math.random() - 0.5) * 30,
              y: FLOOR_Y - 2,
              vx: (Math.random() - 0.5) * 4,
              vy: -1 - Math.random() * 2,
              color: '#475569',
              size: 3 + Math.random() * 3,
              alpha: 0.6,
              life: 20,
              maxLife: 20,
              type: 'smoke'
            });
          }
        }
      }

      // Energy Shielding
      p.isShielding = s.keys.shield && p.shield > 2;
      if (p.isShielding) {
        p.shield = Math.max(0, p.shield - 0.4);
      } else {
        p.shield = Math.min(p.maxShield, p.shield + 0.18);
      }
      setPlayerShield(Math.floor(p.shield));

      // Missile Passive Recharge (1 every 6 seconds)
      p.missileRegenTimer++;
      if (p.missileRegenTimer > 360) {
        p.missileRegenTimer = 0;
        if (p.missiles < 6) {
          p.missiles++;
          setMissileAmmo(p.missiles);
        }
      }

      // Aiming: compute angle toward mouse cursor (or auto-aim toward closest hostile on touch)
      if (isTouchDevice && !s.mouse.isDown && s.enemies.length > 0) {
        // Smart auto-lead to nearest enemy
        let closestE: EnemyMech | null = null;
        let cDist = 99999;
        s.enemies.forEach(e => {
          const d = Math.hypot(e.x - p.x, e.y - (p.y - 45));
          if (d < cDist) {
            cDist = d;
            closestE = e;
          }
        });
        if (closestE) {
          p.gunAngle = Math.atan2((closestE as EnemyMech).y - 30 - (p.y - 45), (closestE as EnemyMech).x - p.x);
        } else {
          p.gunAngle = p.facing === 1 ? 0.05 : Math.PI - 0.05;
        }
      } else {
        p.gunAngle = Math.atan2(s.mouse.worldY - (p.y - 45), s.mouse.worldX - p.x);
      }

      // Weapon Cooldowns & Recoil
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.missileCooldown > 0) p.missileCooldown--;
      if (p.recoilOffset > 0) p.recoilOffset *= 0.8;
      if (p.hitFlashTimer > 0) p.hitFlashTimer--;

      // Rotary Vulcan Rapid Fire
      if (s.keys.shoot && p.shootCooldown <= 0 && !p.isShielding) {
        p.shootCooldown = 6;
        p.barrelAngle += Math.PI / 3;
        p.recoilOffset = 5.5;
        if (soundEnabled) sound.playLaser(1450);
        s.screenShake = 1.2;

        const muzzleDist = 38;
        const barrelX = p.x + Math.cos(p.gunAngle) * muzzleDist;
        const barrelY = p.y - 45 + Math.sin(p.gunAngle) * muzzleDist;

        s.projectiles.push({
          x: barrelX,
          y: barrelY,
          vx: Math.cos(p.gunAngle) * 20,
          vy: Math.sin(p.gunAngle) * 20,
          damage: 32,
          r: 3.5,
          color: '#38bdf8',
          glowColor: '#00f5ff',
          isPlayer: true
        });

        // Glowing muzzle flash burst
        s.particles.push({
          x: barrelX,
          y: barrelY,
          vx: Math.cos(p.gunAngle) * 2,
          vy: Math.sin(p.gunAngle) * 2,
          color: '#e0f2fe',
          size: 5,
          alpha: 1,
          life: 6,
          maxLife: 6,
          type: 'spark'
        });

        // Ejected brass shell casing
        s.particles.push({
          x: p.x - Math.cos(p.gunAngle) * 5,
          y: p.y - 45,
          vx: -p.facing * (1.5 + Math.random() * 2),
          vy: -3 - Math.random() * 2,
          color: '#fbbf24',
          size: 2.2,
          alpha: 1,
          life: 30,
          maxLife: 30,
          type: 'casing',
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.3
        });
      }

      // -----------------------------------------------------------
      // 2. UPDATE PROJECTILES & COLLISION DETECTION
      // -----------------------------------------------------------
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const proj = s.projectiles[i];

        // Homing Missile Logic
        if (proj.isMissile) {
          if (proj.life) proj.life--;
          if (proj.life && proj.life <= 0) {
            s.projectiles.splice(i, 1);
            continue;
          }

          // Search or track target
          let targetE: EnemyMech | undefined;
          if (proj.targetId) {
            targetE = s.enemies.find(e => e.id === proj.targetId);
          }
          if (!targetE && s.enemies.length > 0) {
            targetE = s.enemies[0];
            proj.targetId = targetE.id;
          }

          if (targetE) {
            const desiredAngle = Math.atan2(targetE.y - 30 - proj.y, targetE.x - proj.x);
            const curAngle = Math.atan2(proj.vy, proj.vx);
            let diff = desiredAngle - curAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            const turnRate = 0.12;
            const newAngle = curAngle + Math.sign(diff) * Math.min(Math.abs(diff), turnRate);
            const speed = 14;
            proj.vx = Math.cos(newAngle) * speed;
            proj.vy = Math.sin(newAngle) * speed;
          }

          // Dense missile smoke plume & flame
          if (Math.random() < 0.85) {
            s.particles.push({
              x: proj.x,
              y: proj.y,
              vx: -proj.vx * 0.2 + (Math.random() - 0.5) * 2,
              vy: -proj.vy * 0.2 + (Math.random() - 0.5) * 2,
              color: Math.random() < 0.4 ? '#f97316' : '#64748b',
              size: 3.5 + Math.random() * 4,
              alpha: 0.85,
              life: 25,
              maxLife: 25,
              type: 'smoke'
            });
          }
        }

        proj.x += proj.vx;
        proj.y += proj.vy;

        // Player shots vs Enemies
        if (proj.isPlayer) {
          let hitEnemy = false;
          for (let j = s.enemies.length - 1; j >= 0; j--) {
            const e = s.enemies[j];
            const hitH = e.type === 'titan' ? 65 : e.type === 'siege' ? 50 : 38;
            const hitW = e.type === 'titan' ? 45 : e.type === 'siege' ? 35 : 28;

            if (Math.abs(proj.x - e.x) < hitW && Math.abs(proj.y - (e.y - hitH / 2)) < hitH) {
              e.hp -= proj.damage;
              e.hitFlashTimer = 6;
              s.damageDealt += proj.damage;
              hitEnemy = true;
              if (soundEnabled) sound.playHit();

              // Spark explosion
              for (let k = 0; k < (proj.isMissile ? 14 : 6); k++) {
                s.particles.push({
                  x: proj.x,
                  y: proj.y,
                  vx: (Math.random() - 0.5) * (proj.isMissile ? 10 : 6),
                  vy: (Math.random() - 0.5) * (proj.isMissile ? 10 : 6),
                  color: Math.random() < 0.5 ? '#facc15' : '#00f5ff',
                  size: 2.5 + Math.random() * 2,
                  alpha: 1,
                  life: 18,
                  maxLife: 18,
                  type: 'spark'
                });
              }

              // Area shockwave on missile impact
              if (proj.isMissile) {
                s.particles.push({
                  x: proj.x,
                  y: proj.y,
                  vx: 0,
                  vy: 0,
                  color: '#f97316',
                  size: 6,
                  alpha: 1,
                  life: 20,
                  maxLife: 20,
                  type: 'shockwave'
                });
              }

              // Enemy Destroyed
              if (e.hp <= 0) {
                s.enemies.splice(j, 1);
                if (soundEnabled) sound.playExplosion();
                s.screenShake = e.type === 'titan' ? 12 : 6;
                s.kills++;
                setKills(s.kills);

                const eScore = e.type === 'titan' ? 500 : e.type === 'siege' ? 240 : 100;
                s.score += eScore;
                setScore(s.score);
                setActiveHostiles(s.enemies.length);

                // Huge explosion debris & fireball chunks
                const pCount = e.type === 'titan' ? 32 : 18;
                for (let k = 0; k < pCount; k++) {
                  s.particles.push({
                    x: e.x + (Math.random() - 0.5) * 30,
                    y: e.y - 30 + (Math.random() - 0.5) * 30,
                    vx: (Math.random() - 0.5) * 11,
                    vy: -2 - Math.random() * 8,
                    color: Math.random() < 0.4 ? '#ef4444' : Math.random() < 0.7 ? '#f97316' : '#334155',
                    size: 4 + Math.random() * 6,
                    alpha: 1,
                    life: 35,
                    maxLife: 35,
                    type: Math.random() < 0.6 ? 'explosion' : 'debris'
                  });
                }
              }
              break;
            }
          }

          if (hitEnemy) {
            s.projectiles.splice(i, 1);
            continue;
          }
        } else {
          // Enemy shots vs Player
          if (Math.abs(proj.x - p.x) < 28 && Math.abs(proj.y - (p.y - 38)) < 42) {
            s.projectiles.splice(i, 1);
            if (soundEnabled) sound.playHit();
            p.hitFlashTimer = 8;

            if (p.isShielding) {
              // Kinetic shield absorbs 80% of damage
              p.shield = Math.max(0, p.shield - proj.damage * 0.4);
              setPlayerShield(Math.floor(p.shield));
              s.screenShake = 2;
            } else {
              p.hp = Math.max(0, p.hp - proj.damage);
              setPlayerHp(Math.floor(p.hp));
              s.screenShake = 3.5;
              s.damageVignette = 0.55; // Subtle, gentle screen flash

              if (p.hp <= 0) {
                handleGameOver(s.score);
                return;
              }
            }
            continue;
          }
        }

        // Out of bounds or floor hit
        if (proj.x < 0 || proj.x > ARENA_WIDTH || proj.y < 0 || proj.y > FLOOR_Y + 40) {
          s.projectiles.splice(i, 1);
        }
      }

      // -----------------------------------------------------------
      // 3. UPDATE ENEMIES (SLOWER, RELAXED AI & ATTACK TELEGRAPHS)
      // -----------------------------------------------------------
      s.enemies.forEach(e => {
        const dx = p.x - e.x;
        e.facing = dx > 0 ? 1 : -1;
        if (e.hitFlashTimer > 0) e.hitFlashTimer--;

        // Drone hovering motion - slow gentle glide
        if (e.type === 'drone') {
          e.y = FLOOR_Y - 170 + Math.sin(s.time * 2.2 + parseFloat(e.id.replace('m_', ''))) * 20;
          if (Math.abs(dx) > 260) {
            e.x += e.facing * 1.1; // Noticeably reduced speed (was 2.6)
          }
        } else {
          // Ground units maintain comfortable combat distance - never crowd the player
          const stopDist = e.type === 'titan' ? 300 : e.type === 'siege' ? 330 : 240;
          if (Math.abs(dx) > stopDist) {
            // Smooth, slow movement in early waves
            const spd =
              e.type === 'scout'
                ? s.waveNum === 1
                  ? 0.95
                  : 1.2
                : e.type === 'siege'
                ? 0.65
                : 0.5;
            e.x += e.facing * spd;
            e.walkFrame += 0.12;
          }
        }

        // Enemy Attack Charging & Firing with Visual Telegraph
        e.attackTimer++;

        // 25 frames before firing: visual charging spark gives player clear reaction time
        if (e.attackTimer > e.attackInterval - 25 && e.attackTimer < e.attackInterval) {
          e.chargeTimer = 25;
          if (Math.random() < 0.45) {
            s.particles.push({
              x: e.x + e.facing * (e.type === 'siege' ? 24 : 14),
              y: e.y - (e.type === 'drone' ? 18 : 34),
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              color: '#f97316',
              size: 2.2,
              alpha: 0.8,
              life: 10,
              maxLife: 10,
              type: 'spark'
            });
          }
        } else {
          e.chargeTimer = 0;
        }

        if (e.attackTimer >= e.attackInterval) {
          e.attackTimer = 0;
          const eAngle = Math.atan2(p.y - 38 - (e.y - 32), p.x - e.x);

          // Slower, clearly visible enemy projectiles with glow & trail (speed ~3.8-4.2 instead of 7.8-8.5)
          const projSpeed = e.type === 'titan' ? 4.2 : e.type === 'siege' ? 3.6 : 3.9;

          if (e.type === 'titan') {
            // Titan fires dual plasma balls
            for (let off = -7; off <= 7; off += 14) {
              s.projectiles.push({
                x: e.x + Math.cos(eAngle) * 22,
                y: e.y - 45 + off,
                vx: Math.cos(eAngle) * projSpeed,
                vy: Math.sin(eAngle) * projSpeed,
                damage: 16,
                r: 6,
                color: '#ef4444',
                glowColor: '#dc2626',
                isPlayer: false
              });
            }
          } else {
            s.projectiles.push({
              x: e.x + Math.cos(eAngle) * 16,
              y: e.y - (e.type === 'drone' ? 18 : 32),
              vx: Math.cos(eAngle) * projSpeed,
              vy: Math.sin(eAngle) * projSpeed,
              damage: e.type === 'siege' ? 14 : e.type === 'drone' ? 6 : 7,
              r: e.type === 'siege' ? 5.5 : 4.5,
              color: e.type === 'siege' ? '#fb923c' : '#f87171',
              glowColor: '#ef4444',
              isPlayer: false
            });
          }
        }
      });

      // Target lock calculation for crosshair reticle
      let targetLocked = false;
      for (const e of s.enemies) {
        const eCenterY = e.type === 'drone' ? e.y - 18 : e.y - 40;
        const dist = Math.hypot(e.x - s.mouse.worldX, eCenterY - s.mouse.worldY);
        if (dist < 60) {
          targetLocked = true;
          break;
        }
      }
      s.isTargetLocked = targetLocked;

      // Next Wave Progression
      if (s.enemies.length === 0) {
        s.waveNum++;
        setWave(s.waveNum);
        p.missiles = Math.min(6, p.missiles + 3);
        setMissileAmmo(p.missiles);
        // Repair hull +20 and full shield recharge on wave victory
        p.hp = Math.min(100, p.hp + 20);
        p.shield = 100;
        setPlayerHp(p.hp);
        setPlayerShield(100);
        spawnWave(s.waveNum);
      }

      // -----------------------------------------------------------
      // 4. PARTICLES UPDATE
      // -----------------------------------------------------------
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.type === 'casing' || pt.type === 'debris') {
          pt.vy += 0.35; // gravity on metal debris
          if (pt.rot !== undefined && pt.vRot !== undefined) pt.rot += pt.vRot;
          if (pt.y >= FLOOR_Y) {
            pt.y = FLOOR_Y;
            pt.vx *= 0.5;
            pt.vy = -pt.vy * 0.3;
          }
        }
        if (pt.type === 'shockwave') {
          pt.size += 2.8;
        }

        pt.life--;
        pt.alpha = pt.life / pt.maxLife;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // -----------------------------------------------------------
      // 5. SMOOTH THIRD-PERSON / SCI-FI COMBAT CAMERA MATH
      // -----------------------------------------------------------
      const scale = Math.max(0.7, Math.min(1.25, vh / 620));
      const visibleWorldW = vw / scale;
      const visibleWorldH = vh / scale;

      // Target position leads slightly in direction the player is facing
      const targetCamX = p.x - visibleWorldW * 0.45 + p.facing * 60;
      const clampedCamX = Math.max(0, Math.min(ARENA_WIDTH - visibleWorldW, targetCamX));
      s.cameraX += (clampedCamX - s.cameraX) * 0.1;

      // Floor positioned at ~78% screen height
      const targetCamY = FLOOR_Y - visibleWorldH * 0.78;
      s.cameraY += (targetCamY - s.cameraY) * 0.1;

      // -----------------------------------------------------------
      // 6. WARZONE RENDERING PIPELINE (CANVAS 2D)
      // -----------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);

      // Screen Shake translation
      let shakeX = 0;
      let shakeY = 0;
      if (s.screenShake > 0) {
        shakeX = (Math.random() - 0.5) * s.screenShake * 2;
        shakeY = (Math.random() - 0.5) * s.screenShake * 2;
        s.screenShake = Math.max(0, s.screenShake - 0.35);
      }
      ctx.translate(shakeX, shakeY);

      // Clear Canvas
      ctx.fillStyle = '#050711';
      ctx.fillRect(0, 0, vw, vh);

      // -----------------------------------------------------------
      // LAYER 1: CINEMATIC SKY & DISTANT CYBER SKYLINE (PARALLAX)
      // -----------------------------------------------------------
      const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
      skyGrad.addColorStop(0, '#040714');
      skyGrad.addColorStop(0.5, '#0b1329');
      skyGrad.addColorStop(1, '#111827');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, vw, vh);

      // Distant industrial skyline (parallax factor 0.18)
      const skyOffsetX = -(s.cameraX * 0.18) % 360;
      ctx.fillStyle = '#090d1a';
      for (let bx = skyOffsetX - 360; bx < vw + 360; bx += 70) {
        const bHeight = 160 + Math.sin(bx * 0.05) * 60;
        ctx.fillRect(bx, vh * 0.75 - bHeight, 62, bHeight);

        // Blinking aviation warning beacon lights on towers
        if (Math.floor(bx / 70) % 3 === 0) {
          ctx.fillStyle = Math.sin(s.time * 4 + bx) > 0 ? '#ef4444' : '#450a0a';
          ctx.beginPath();
          ctx.arc(bx + 31, vh * 0.75 - bHeight - 4, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#090d1a';
        }
      }

      // Midground industrial conduits & cooling towers (parallax factor 0.45)
      const midOffsetX = -(s.cameraX * 0.45) % 480;
      ctx.fillStyle = '#0e1526';
      for (let mx = midOffsetX - 480; mx < vw + 480; mx += 140) {
        const tHeight = 110 + Math.cos(mx * 0.04) * 40;
        ctx.fillRect(mx, vh * 0.75 - tHeight, 100, tHeight);

        // Subtle cyan hazard light strip on cooling towers
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(mx + 10, vh * 0.75 - tHeight + 15, 80, 2);
        ctx.fillStyle = '#0e1526';
      }

      // -----------------------------------------------------------
      // WORLD SPACE RENDERING (SCALED & TRANSLATED)
      // -----------------------------------------------------------
      ctx.save();
      ctx.scale(scale, scale);
      ctx.translate(-s.cameraX, -s.cameraY);

      // ARENA GROUND (Heavy industrial blast metal floor)
      const groundGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 300);
      groundGrad.addColorStop(0, '#111827');
      groundGrad.addColorStop(0.15, '#0f172a');
      groundGrad.addColorStop(1, '#030712');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, FLOOR_Y, ARENA_WIDTH, 400);

      // Metallic floor plate grid & glowing cyan circuit conduits
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      for (let gx = 0; gx < ARENA_WIDTH; gx += 80) {
        ctx.beginPath();
        ctx.moveTo(gx, FLOOR_Y);
        ctx.lineTo(gx, FLOOR_Y + 180);
        ctx.stroke();
      }

      // Glowing Cyan Floor Guide Rail
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, FLOOR_Y);
      ctx.lineTo(ARENA_WIDTH, FLOOR_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Hazard warning chevron stripes on floor edge
      ctx.fillStyle = '#f59e0b';
      for (let hx = 20; hx < ARENA_WIDTH; hx += 160) {
        ctx.beginPath();
        ctx.moveTo(hx, FLOOR_Y + 6);
        ctx.lineTo(hx + 30, FLOOR_Y + 6);
        ctx.lineTo(hx + 15, FLOOR_Y + 16);
        ctx.closePath();
        ctx.fill();
      }

      // Arena Boundary Force-Field Pylons (Left & Right)
      const renderPylon = (px: number) => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px - 14, FLOOR_Y - 260, 28, 260);
        ctx.fillStyle = '#00f5ff';
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(px - 4, FLOOR_Y - 250, 8, 240);
        ctx.shadowBlur = 0;
      };
      renderPylon(80);
      renderPylon(ARENA_WIDTH - 80);

      // -----------------------------------------------------------
      // RENDER ENEMIES (DRONES, SCOUTS, SIEGE WALKERS, TITANS)
      // -----------------------------------------------------------
      s.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(e.facing, 1);

        const isHit = e.hitFlashTimer > 0;

        if (e.type === 'titan') {
          // TITAN WARLORD MECH
          ctx.fillStyle = isHit ? '#ffffff' : '#0f172a';
          ctx.beginPath();
          ctx.roundRect(-30, -90, 60, 90, 8);
          ctx.fill();

          // Armored Chest Plates & Glowing Core Reactor
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-22, -80, 44, 40);

          // Dark Red Reactor Core
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, -60, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Heavy Shoulder Cannons
          ctx.fillStyle = '#334155';
          ctx.fillRect(16, -78, 24, 12);
          ctx.fillRect(-34, -78, 14, 12);

          // Cyclops Red Visor
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(8, -82, 14, 4);

          // Heavy Feet
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-24, -12, 18, 12);
          ctx.fillRect(6, -12, 18, 12);
        } else if (e.type === 'siege') {
          // SIEGE ARTILLERY WALKER
          ctx.fillStyle = isHit ? '#ffffff' : '#1e293b';
          ctx.beginPath();
          ctx.roundRect(-22, -60, 44, 60, 6);
          ctx.fill();

          // Hazard plate
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-16, -48, 32, 8);

          // Heavy mortar barrel
          ctx.fillStyle = '#475569';
          ctx.fillRect(10, -56, 22, 10);

          // Quad legs
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-18, -10, 10, 10);
          ctx.fillRect(8, -10, 10, 10);
        } else if (e.type === 'drone') {
          // ASSAULT DRONE
          ctx.fillStyle = isHit ? '#ffffff' : '#1e1b4b';
          ctx.beginPath();
          ctx.ellipse(0, -18, 26, 14, 0, 0, Math.PI * 2);
          ctx.fill();

          // Anti-grav ring glow
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(0, -18, 32, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Red Cyclops Optic Eye
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(8, -18, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // SCOUT BIPEDAL MECH
          ctx.fillStyle = isHit ? '#ffffff' : '#27272a';
          ctx.beginPath();
          ctx.roundRect(-16, -45, 32, 45, 4);
          ctx.fill();

          // Red Visor
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(4, -38, 10, 4);

          // Hydraulic legs
          const legOff = Math.sin(e.walkFrame) * 6;
          ctx.fillStyle = '#18181b';
          ctx.fillRect(-12, -14 + legOff, 8, 14);
          ctx.fillRect(4, -14 - legOff, 8, 14);
        }

        // Enemy Health Bar & Indicator
        if (e.hp < e.maxHp || e.type === 'titan') {
          const barW = e.type === 'titan' ? 56 : 36;
          const barY = e.type === 'titan' ? -106 : -72;
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillRect(-barW / 2, barY, barW, 5);
          ctx.fillStyle = e.type === 'titan' ? '#ef4444' : '#f97316';
          ctx.fillRect(-barW / 2, barY, barW * (e.hp / e.maxHp), 5);
        }

        // Charging Weapon Telegraph Indicator (advance warning to player)
        if (e.attackTimer > e.attackInterval - 25 && e.attackTimer < e.attackInterval) {
          const muzzleX = e.type === 'titan' ? 38 : e.type === 'siege' ? 32 : e.type === 'drone' ? 14 : 16;
          const muzzleY = e.type === 'titan' ? -74 : e.type === 'siege' ? -51 : e.type === 'drone' ? -18 : -36;
          const chargeFrac = (e.attackTimer - (e.attackInterval - 25)) / 25;
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(muzzleX, muzzleY, 2 + chargeFrac * 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.restore();
      });

      // -----------------------------------------------------------
      // RENDER PLAYER MECHA (TITAN-01 APEX // METALLIC SCULPT)
      // -----------------------------------------------------------
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.facing, 1);

      // Contact Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      const isPlayerHit = p.hitFlashTimer > 0;

      // 1. Back Thruster Ion Flames (When jumping or moving fast)
      if (!p.isGrounded || Math.abs(p.vx) > 1.2) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(-18, -62);
        ctx.lineTo(-28 - Math.random() * 8, -58 + (Math.random() - 0.5) * 6);
        ctx.lineTo(-18, -54);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 2. Heavy Articulated Hydraulic Legs
      const legOff = Math.sin(p.walkFrame) * 8;
      ctx.fillStyle = isPlayerHit ? '#ffffff' : '#0f172a';
      // Left leg
      ctx.fillRect(-16, -42 + legOff, 13, 42);
      // Right leg
      ctx.fillRect(3, -42 - legOff, 13, 42);

      // Metallic knee guards with cyan accent
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-16, -24 + legOff, 13, 4);
      ctx.fillRect(3, -24 - legOff, 13, 4);

      // Heavy foot grip treads
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-20, -6 + legOff, 18, 6);
      ctx.fillRect(1, -6 - legOff, 18, 6);

      // 3. Armored Chassis Torso (Angular Beveled Armor Plates)
      ctx.fillStyle = isPlayerHit ? '#ffffff' : '#1e293b';
      ctx.beginPath();
      ctx.roundRect(-22, -74, 44, 38, 6);
      ctx.fill();

      // Armor plating highlights & seams
      ctx.fillStyle = '#334155';
      ctx.fillRect(-18, -70, 36, 12);

      // Glowing Cyan Fusion Reactor Core
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, -56, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cockpit Visor (Angular Cyan Sensor Glass)
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(4, -68, 16, 6);
      ctx.shadowBlur = 0;

      // 4. Shoulder Micro-Missile Pods
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-22, -88, 16, 16);
      // Missile tube openings with glowing rocket tips
      ctx.fillStyle = p.missiles > 0 ? '#f97316' : '#334155';
      for (let my = -84; my <= -76; my += 5) {
        ctx.fillRect(-20, my, 4, 3);
        ctx.fillRect(-14, my, 4, 3);
      }

      // 5. Rotary Vulcan Cannon (Aimed with Recoil & Rotation)
      ctx.save();
      ctx.translate(2, -48);
      // Note: gunAngle in world coords; account for facing direction
      const localGunAngle = p.facing === 1 ? p.gunAngle : Math.PI - p.gunAngle;
      ctx.rotate(localGunAngle);
      ctx.translate(-p.recoilOffset, 0);

      // Heavy Gun Swivel Yoke
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -6, 14, 12);

      // Rotary Barrel Cluster
      ctx.fillStyle = '#475569';
      ctx.fillRect(14, -5, 24, 10);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(34, -4, 4, 8);
      ctx.restore();

      // 6. Kinetic Energy Shield Dome
      if (p.isShielding) {
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(0, -42, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Hexagonal Field Sheen
        ctx.fillStyle = 'rgba(0, 245, 255, 0.12)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      // -----------------------------------------------------------
      // RENDER PROJECTILES & LASERS
      // -----------------------------------------------------------
      s.projectiles.forEach(pr => {
        ctx.fillStyle = pr.color;
        ctx.shadowColor = pr.glowColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();

        if (pr.isMissile) {
          // Missiles rendered with fiery flame tail
          ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(pr.x - pr.vx * 0.4, pr.y - pr.vy * 0.4, pr.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Elongated laser bolt
          const angle = Math.atan2(pr.vy, pr.vx);
          ctx.save();
          ctx.translate(pr.x, pr.y);
          ctx.rotate(angle);
          ctx.fillRect(-8, -pr.r, 16, pr.r * 2);
          ctx.restore();
        }
        ctx.shadowBlur = 0;
      });

      // -----------------------------------------------------------
      // RENDER PARTICLES (SPARKS, SMOKE, EXPLOSIONS, DEBRIS)
      // -----------------------------------------------------------
      s.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));
        ctx.fillStyle = pt.color;

        if (pt.type === 'shockwave') {
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (pt.type === 'casing') {
          ctx.translate(pt.x, pt.y);
          if (pt.rot) ctx.rotate(pt.rot);
          ctx.fillRect(-2, -1, 4, 2);
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1, pt.size), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // -----------------------------------------------------------
      // RETICLE CROSSHAIR IN WORLD SPACE (MINIMAL FUTURISTIC)
      // -----------------------------------------------------------
      ctx.save();
      ctx.translate(s.mouse.worldX, s.mouse.worldY);

      if (s.isTargetLocked) {
        // Target Locked feedback: soft crimson/amber brackets pull inward
        ctx.strokeStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.6;

        // Outer corner brackets
        const bSize = 6;
        const bDist = 11;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(-bDist, -bDist + bSize);
        ctx.lineTo(-bDist, -bDist);
        ctx.lineTo(-bDist + bSize, -bDist);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(bDist - bSize, -bDist);
        ctx.lineTo(bDist, -bDist);
        ctx.lineTo(bDist, -bDist + bSize);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(-bDist, bDist - bSize);
        ctx.lineTo(-bDist, bDist);
        ctx.lineTo(-bDist + bSize, bDist);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bDist - bSize, bDist);
        ctx.lineTo(bDist, bDist);
        ctx.lineTo(bDist, bDist - bSize);
        ctx.stroke();

        // Center pip
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Idle futuristic reticle: minimalist cyan circle with 4 small ticks
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();

        // 4 small cross ticks
        ctx.beginPath();
        ctx.moveTo(-11, 0); ctx.lineTo(-7, 0);
        ctx.moveTo(7, 0); ctx.lineTo(11, 0);
        ctx.moveTo(0, -11); ctx.lineTo(0, -7);
        ctx.moveTo(0, 7); ctx.lineTo(0, 11);
        ctx.stroke();

        // Small center dot
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.restore(); // restore scaled world transform

      // -----------------------------------------------------------
      // SCREEN-SPACE DAMAGE VIGNETTE (SUBTLE & NON-BLINDING)
      // -----------------------------------------------------------
      if (s.damageVignette > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${s.damageVignette * 0.22})`;
        ctx.fillRect(0, 0, vw, vh);
        s.damageVignette = Math.max(0, s.damageVignette - 0.04);
      }

      ctx.restore(); // restore dpr & shake transform

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [gameState, handleGameOver, isTouchDevice, soundEnabled, spawnWave]);

  return (
    <div
      ref={containerRef}
      id="mecha-battle-viewport"
      className="relative w-full h-full min-h-screen bg-[#050711] text-white select-none overflow-hidden font-mono"
    >
      {/* -------------------------------------------------------------
          FULLSCREEN 100VW × 100VH SCI-FI WARZONE CANVAS
          ------------------------------------------------------------- */}
      <canvas
        ref={canvasRef}
        id="mecha-battle-canvas"
        className="absolute inset-0 w-full h-full object-cover cursor-crosshair z-0"
      />

      {/* -------------------------------------------------------------
          1. TOP FLOATING COMBAT HUD (FUTURISTIC SCI-FI GLASS PANEL)
          ------------------------------------------------------------- */}
      <header
        id="mecha-battle-top-hud"
        className="absolute top-0 inset-x-0 z-20 px-3 sm:px-6 pt-3 pb-6 pointer-events-none flex items-start justify-between gap-2 bg-gradient-to-b from-[#050711]/90 via-[#050711]/40 to-transparent"
      >
        {/* TOP LEFT: Mecha HP & Shield / Energy Gauges */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onBack && (
            <button
              id="mecha-exit-btn"
              type="button"
              onClick={onBack}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono font-medium transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md"
              title="Exit Combat (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">EXIT</span>
            </button>
          )}

          {/* Mecha HP & Shield Cluster */}
          <div
            id="mecha-status-cluster"
            className="flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md shadow-lg min-w-[145px] sm:min-w-[190px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-black text-[10px] sm:text-xs text-white tracking-wider">
                  MECHA HP // TITAN-01
                </span>
              </div>
              {playerHp <= 30 && (
                <span className="flex items-center gap-0.5 text-[8px] font-mono font-black text-red-400 animate-pulse">
                  <AlertTriangle className="w-2.5 h-2.5" /> CRITICAL
                </span>
              )}
            </div>

            {/* Health Bar with smooth transition */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-black text-red-400 w-7">HULL</span>
              <div className="flex-1 h-2 rounded-full bg-slate-900/90 border border-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    playerHp <= 30
                      ? 'bg-red-500 animate-pulse'
                      : playerHp <= 60
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                  }`}
                  style={{ width: `${Math.max(0, playerHp)}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-200 w-7 text-right tabular-nums">
                {playerHp}%
              </span>
            </div>

            {/* Shield / Energy Bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono font-black text-cyan-400 w-7">ENERGY</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-900/90 border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-[#00f5ff] transition-all duration-100 shadow-[0_0_8px_rgba(0,245,255,0.4)]"
                  style={{ width: `${Math.max(0, playerShield)}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-cyan-300 w-7 text-right tabular-nums">
                {playerShield}%
              </span>
            </div>
          </div>
        </div>

        {/* TOP CENTER: Wave & Objective / Status Tracker */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div
            id="mecha-wave-tracker"
            className="px-3.5 sm:px-4 py-1.5 rounded-2xl bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md shadow-lg flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f5ff]" />
            <span className="font-mono font-black text-xs sm:text-sm text-white tracking-widest uppercase">
              WAVE {wave < 10 ? `0${wave}` : wave}
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="font-mono text-[10px] font-bold text-slate-300">
              PURGE SECTOR
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="font-mono text-[10px] font-black text-red-400">
              {activeHostiles} HOSTILE{activeHostiles === 1 ? '' : 'S'}
            </span>
          </div>

          {/* Temporary Wave Directive Banner */}
          {waveBanner && (
            <div className="mt-2 px-3.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/60 shadow-[0_0_16px_rgba(0,245,255,0.4)] backdrop-blur-md text-[9px] font-mono font-black text-cyan-300 tracking-wider animate-in fade-in zoom-in-95 duration-200">
              {waveBanner}
            </div>
          )}
        </div>

        {/* TOP RIGHT: Score • Kills • Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Score Box */}
          <div
            id="mecha-score-box"
            className="flex flex-col items-end px-2.5 sm:px-3 py-1 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md shadow-md"
          >
            <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase leading-tight">
              SCORE
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-amber-300 tabular-nums leading-tight">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Kills Box */}
          <div
            id="mecha-kills-box"
            className="hidden sm:flex flex-col items-end px-2.5 sm:px-3 py-1 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md shadow-md"
          >
            <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase leading-tight">
              KILLS
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-red-400 tabular-nums leading-tight">
              {kills}
            </span>
          </div>

          {/* Sound Toggle Button */}
          <button
            id="mecha-audio-btn"
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.toggleMute();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
          </button>

          {/* Fullscreen Button */}
          <button
            id="mecha-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Pause Button */}
          <button
            id="mecha-pause-btn"
            type="button"
            onClick={() => setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev))}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title="Pause Combat (P / Esc)"
          >
            {gameState === 'PAUSED' ? <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          2. BOTTOM HUD (SYSTEMS STATUS & WEAPONS)
          ------------------------------------------------------------- */}
      {gameState === 'PLAYING' && (
        <>
          {/* BOTTOM LEFT: Systems Status & Key Indicators */}
          <div
            id="mecha-systems-status"
            className="absolute bottom-4 left-4 z-20 pointer-events-none hidden md:flex flex-col gap-1 text-[9px] font-mono text-slate-400"
          >
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 backdrop-blur-md shadow-md flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">SYSTEMS ONLINE</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-medium">THRUSTERS [READY]</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-medium">SHIELD [READY]</span>
            </div>
            <span className="text-[8px] text-slate-400 px-1">
              [A][D] MOVE • [SPACE] JET JUMP • [LEFT CLICK] CANNON • [RIGHT CLICK] SALVO • [SHIFT] SHIELD
            </span>
          </div>

          {/* BOTTOM RIGHT: Weapon / Ammo Cluster */}
          <div
            id="mecha-armament-cluster"
            className="absolute bottom-4 right-4 z-20 pointer-events-none flex flex-col items-end gap-1.5"
          >
            <div className="px-3 py-2 rounded-2xl bg-slate-950/85 border border-white/10 backdrop-blur-md shadow-lg flex flex-col gap-1.5 min-w-[155px]">
              {/* Primary Weapon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[9px] text-cyan-400 font-bold uppercase">
                  <Crosshair className="w-3 h-3" />
                  <span>VULCAN-X</span>
                </div>
                <span className="text-[9px] text-emerald-400 font-black">ONLINE</span>
              </div>

              {/* Secondary Missile Pods */}
              <div className="flex items-center justify-between border-t border-white/5 pt-1">
                <div className="flex items-center gap-1 text-[9px] text-orange-400 font-bold uppercase">
                  <Rocket className="w-3 h-3" />
                  <span>SALVO MISSILES</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-2.5 rounded-xs transition-all ${
                        i < missileAmmo ? 'bg-orange-500 shadow-[0_0_6px_#f97316]' : 'bg-slate-800'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-[9px] text-orange-300 font-black tabular-nums">{missileAmmo}/6</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* -------------------------------------------------------------
          3. MOBILE ON-SCREEN TOUCH CONTROLS (VIRTUAL JOYSTICK + ACTION BUTTONS)
          ------------------------------------------------------------- */}
      {(isTouchDevice || forceTouchControls) && gameState === 'PLAYING' && (
        <div
          id="mecha-mobile-controls"
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20 pb-5 px-4 sm:px-6 select-none"
        >
          <div className="flex items-end justify-between w-full">
            {/* LEFT: Premium Virtual Joystick with Touch Tracking */}
            <div className="pointer-events-auto flex flex-col items-center gap-1">
              <div
                id="mecha-virtual-joystick-base"
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

                {/* Subtle Directional Arrows */}
                <span className="absolute left-2 text-[10px] text-cyan-400/50 font-bold pointer-events-none">◀</span>
                <span className="absolute right-2 text-[10px] text-cyan-400/50 font-bold pointer-events-none">▶</span>
                <span className="absolute top-2 text-[10px] text-cyan-400/50 font-bold pointer-events-none">▲</span>

                {/* Thumb Knob */}
                <div
                  id="mecha-joystick-knob"
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

            {/* RIGHT: Transparent Glass Action Buttons with Subtle Neon Borders */}
            <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
              {/* Jump Thruster Button */}
              <button
                id="btn-touch-jump"
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
                aria-label="Jump Jets"
              >
                <Flame className="w-4 h-4 mb-0.5 fill-current" />
                <span>JUMP</span>
              </button>

              {/* Energy Shield Button */}
              <button
                id="btn-touch-shield"
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  stateRef.current.keys.shield = true;
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  stateRef.current.keys.shield = false;
                }}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-slate-950/45 border border-cyan-400/40 active:bg-cyan-400/30 active:border-cyan-300 active:scale-95 flex flex-col items-center justify-center text-cyan-300 text-[9px] font-mono font-bold backdrop-blur-md shadow-xl select-none transition-transform cursor-pointer"
                aria-label="Energy Shield"
              >
                <Shield className="w-4 h-4 mb-0.5" />
                <span>SHIELD</span>
              </button>

              {/* Missile Salvo Button */}
              <button
                id="btn-touch-missile"
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  fireMissileBarrage();
                }}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/45 border border-orange-500/40 active:bg-orange-500/30 active:border-orange-400 active:scale-95 flex flex-col items-center justify-center text-orange-300 text-[9px] font-mono font-black backdrop-blur-md shadow-xl select-none transition-transform cursor-pointer"
                aria-label="Missile Salvo"
              >
                <Rocket className="w-4 h-4 mb-0.5" />
                <span>SALVO</span>
              </button>

              {/* Vulcan Primary Fire Button */}
              <button
                id="btn-touch-fire"
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  stateRef.current.keys.shoot = true;
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  stateRef.current.keys.shoot = false;
                }}
                className="w-14 h-14 sm:w-15 sm:h-15 rounded-2xl bg-cyan-950/40 border border-cyan-400/60 active:bg-cyan-500/35 active:border-cyan-300 active:scale-95 flex flex-col items-center justify-center text-[#00f5ff] text-[10px] font-mono font-black backdrop-blur-md shadow-[0_0_16px_rgba(0,245,255,0.25)] select-none transition-transform cursor-pointer"
                aria-label="Vulcan Cannon Fire"
              >
                <Crosshair className="w-5 h-5 mb-0.5" />
                <span>FIRE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          4. START SCREEN OVERLAY (PREMIUM SCI-FI TITLE CARD)
          ------------------------------------------------------------- */}
      {gameState === 'START' && (
        <div
          id="mecha-start-screen"
          className="absolute inset-0 bg-[#050711]/92 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30 animate-in fade-in duration-200"
        >
          {/* Titan Unit Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(0,245,255,0.25)]">
            <Bot className="w-7 h-7" />
          </div>

          <h1 className="font-mono font-black text-3xl sm:text-5xl text-white tracking-[0.15em] mb-1">
            MECHA BATTLE
          </h1>
          <p className="text-[10px] sm:text-xs text-cyan-400 font-mono tracking-widest uppercase mb-6">
            TITAN PROTOCOL // SECTOR RECLAMATION
          </p>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg w-full mb-6 text-left">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                MOVEMENT & JUMP
              </span>
              <p className="text-xs font-mono font-bold text-white mt-0.5">A / D (Move) • SPACE (Jets)</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                VULCAN CANNON
              </span>
              <p className="text-xs font-mono font-bold text-white mt-0.5">Left Click or F Key</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-orange-400 uppercase tracking-wider font-bold">
                HELLFIRE MISSILES
              </span>
              <p className="text-xs font-mono font-bold text-white mt-0.5">Right Click or E Key</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="mecha-start-btn"
              type="button"
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>INITIALIZE TITAN MECH</span>
            </button>

            <button
              id="mecha-help-btn"
              type="button"
              onClick={() => setShowHowToPlay(true)}
              className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white cursor-pointer transition-all active:scale-[0.98]"
              title="Tactical Briefing"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HOW TO PLAY BRIEFING MODAL */}
      {showHowToPlay && (
        <div
          id="mecha-howto-modal"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-40 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0a0f1d] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <h2 className="text-sm font-mono font-black text-white tracking-widest flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                TACTICAL COMBAT BRIEFING
              </h2>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 font-mono">
              <p>• <span className="text-cyan-400 font-bold">ROTARY VULCAN:</span> Aim with your cursor and hold Left Click (or F) for rapid laser fire.</p>
              <p>• <span className="text-orange-400 font-bold">HOMING MISSILES:</span> Right Click (or E) to unleash twin shoulder rockets that home in on hostiles.</p>
              <p>• <span className="text-cyan-300 font-bold">KINETIC SHIELD:</span> Hold Shift or S to generate an energy barrier dome that reduces incoming damage.</p>
              <p>• <span className="text-emerald-400 font-bold">JUMP JETS:</span> Press Space or W to ignite vertical ion thrusters and leap over enemy fire.</p>
              <p>• <span className="text-amber-400 font-bold">WAVE PURGE:</span> Complete waves to repair your hull integrity (+20 HP) and restock missiles.</p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono font-bold text-white transition-all active:scale-95"
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          5. PAUSE MENU OVERLAY (AAA SCI-FI PAUSE INTERFACE)
          ------------------------------------------------------------- */}
      {gameState === 'PAUSED' && !showSettings && (
        <div
          id="mecha-pause-screen"
          className="fixed inset-0 bg-[#050711]/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30 animate-in fade-in duration-150"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-center text-cyan-400 mb-3 shadow-lg">
            <Pause className="w-6 h-6" />
          </div>

          <h2 className="font-mono font-black text-2xl sm:text-3xl text-white tracking-[0.25em]">
            MECHA BATTLE
          </h2>
          <p className="text-[10px] font-mono tracking-widest text-cyan-400 mt-0.5 mb-5 uppercase">
            PAUSED // SYSTEM TELEMETRY SUSPENDED
          </p>

          {/* Current Combat Snapshot */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-xs mb-6 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">WAVE</span>
              <p className="text-xs font-mono font-black text-white mt-0.5">{wave}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">SCORE</span>
              <p className="text-xs font-mono font-black text-amber-300 mt-0.5">{score.toLocaleString()}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">HULL</span>
              <p className="text-xs font-mono font-black text-red-400 mt-0.5">{playerHp}%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">KILLS</span>
              <p className="text-xs font-mono font-black text-cyan-400 mt-0.5">{kills}</p>
            </div>
          </div>

          {/* Buttons: RESUME, RESTART, SETTINGS, EXIT */}
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              id="pause-btn-resume"
              type="button"
              onClick={() => setGameState('PLAYING')}
              className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,245,255,0.25)] transition-all active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME COMBAT</span>
            </button>

            <button
              id="pause-btn-restart"
              type="button"
              onClick={startGame}
              className="py-3 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-cyan-400/40 text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>REBOOT TITAN</span>
            </button>

            <button
              id="pause-btn-settings"
              type="button"
              onClick={() => setShowSettings(true)}
              className="py-3 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-purple-400/40 text-slate-200 hover:text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>SETTINGS</span>
            </button>

            {onBack && (
              <button
                id="pause-btn-exit"
                type="button"
                onClick={onBack}
                className="py-3 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-white/5 hover:border-rose-500/40 text-slate-400 hover:text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>EXIT TO HUB</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div
          id="mecha-settings-modal"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-40 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm p-5 rounded-2xl bg-[#0a0f1d] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <h2 className="text-sm font-mono font-black text-white tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                COMBAT SETTINGS
              </h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Sound FX Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Audio & Sound FX</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    sound.toggleMute();
                  }}
                  className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
                    soundEnabled
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border border-slate-700 text-slate-500'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Fullscreen Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                  <Maximize2 className="w-4 h-4 text-purple-400" />
                  <span>Fullscreen View</span>
                </div>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
                    isFullscreen
                      ? 'bg-purple-500/20 border border-purple-400 text-purple-300'
                      : 'bg-slate-900 border border-slate-700 text-slate-500'
                  }`}
                >
                  {isFullscreen ? 'ACTIVE' : 'EXPAND'}
                </button>
              </div>

              {/* Force Mobile Touch Controls Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                  <span>Touch Overlay Buttons</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForceTouchControls(prev => !prev)}
                  className={`px-3 py-1 rounded-lg font-mono text-[10px] font-bold transition-all ${
                    isTouchDevice || forceTouchControls
                      ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border border-slate-700 text-slate-500'
                  }`}
                >
                  {isTouchDevice || forceTouchControls ? 'SHOWN' : 'HIDDEN'}
                </button>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono font-bold text-white transition-all active:scale-95"
              >
                RETURN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. GAME OVER SCREEN OVERLAY (MISSION FAILED // TELEMETRY)
          ------------------------------------------------------------- */}
      {gameState === 'GAMEOVER' && (
        <div
          id="mecha-gameover-screen"
          className="fixed inset-0 bg-[#050711]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30 animate-in fade-in duration-200"
        >
          {/* Mission Failed Badge */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-3 shadow-[0_0_24px_rgba(239,68,68,0.25)]">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="font-mono font-black text-3xl sm:text-4xl text-white tracking-[0.2em]">
            MISSION FAILED
          </h2>
          <p className="text-[10px] font-mono tracking-widest text-red-400 uppercase mt-0.5 mb-5">
            HULL BREACHED // TITAN-01 DESTROYED
          </p>

          {/* New Record Banner if applicable */}
          {finalStats.isNewRecord && (
            <div className="mb-4 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_16px_rgba(16,185,129,0.3)] animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>★ NEW SECTOR RECORD ESTABLISHED ★</span>
            </div>
          )}

          {/* Comprehensive Telemetry Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-lg mb-6">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                FINAL SCORE
              </span>
              <p className="text-base font-mono font-black text-amber-300 mt-0.5 tabular-nums">
                {finalStats.score.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                HOSTILES PURGED
              </span>
              <p className="text-base font-mono font-black text-red-400 mt-0.5 tabular-nums">
                {finalStats.kills}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                WAVE REACHED
              </span>
              <p className="text-base font-mono font-black text-cyan-400 mt-0.5 tabular-nums">
                {finalStats.wave}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                DAMAGE DEALT
              </span>
              <p className="text-base font-mono font-black text-emerald-400 mt-0.5 tabular-nums">
                {finalStats.damageDealt.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="gameover-btn-retry"
              type="button"
              onClick={startGame}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-mono font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REDEPLOY TITAN</span>
            </button>

            {onBack && (
              <button
                id="gameover-btn-menu"
                type="button"
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white font-mono font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>MAIN MENU</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
