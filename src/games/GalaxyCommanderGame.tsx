import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Zap,
  Shield,
  Volume2,
  VolumeX,
  Pause,
  ArrowLeft,
  Sparkles,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  Crosshair as CrosshairIcon,
  Flame,
  Radio,
  RefreshCw
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

// -------------------------------------------------------------
// TYPES & DATA STRUCTURES
// -------------------------------------------------------------
type EnemyType = 'scout' | 'fighter' | 'heavy' | 'elite';

interface Star {
  x: number;
  y: number;
  z: number; // depth: 1 (far, slow, tiny) to 3 (near, fast, bright)
  size: number;
  alpha: number;
}

interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

interface Planet {
  x: number;
  y: number;
  radius: number;
  baseColor: string;
  glowColor: string;
  hasRing: boolean;
  ringColor?: string;
  speed: number;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  hp: number;
  maxHp: number;
  vertices: { x: number; y: number }[];
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  glowColor: string;
  isPlayer: boolean;
  life: number;
  maxLife: number;
  isEnergyBlast?: boolean;
}

interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  hp: number;
  maxHp: number;
  shield?: number;
  maxShield?: number;
  speed: number;
  shootCooldown: number;
  shootInterval: number;
  behaviorTimer: number;
  hitFlash: number;
  alive: boolean;
  deathAnim: number; // 1 down to 0
  radius: number;
  color: string;
  glowColor: string;
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
  type?: 'spark' | 'plasma' | 'smoke' | 'debris' | 'shockwave';
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export const GalaxyCommanderGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High level game state
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(!sound.getIsMuted());
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [quality, setQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');

  // Gameplay HUD state
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [activeHostiles, setActiveHostiles] = useState(0);
  const [health, setHealth] = useState(100);
  const [shield, setShield] = useState(100);
  const [ammo, setAmmo] = useState(24);
  const [maxAmmo] = useState(24);
  const [isReloading, setIsReloading] = useState(false);
  const [energyBlastCooldown, setEnergyBlastCooldown] = useState(0); // 0 = ready, >0 = cooldown frames
  const [isLockedOn, setIsLockedOn] = useState(false);
  const [waveBanner, setWaveBanner] = useState<string | null>(null);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_galaxy_commander') || '0', 10);
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Touch / Mobile Controls
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0, active: false });
  const joystickOriginRef = useRef({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);
  const isMobileFiringRef = useRef(false);

  // Audio Context for Ambient Space Synth Music
  const musicOscRef = useRef<{
    ctx: AudioContext | null;
    osc1: OscillatorNode | null;
    osc2: OscillatorNode | null;
    gainNode: GainNode | null;
  }>({ ctx: null, osc1: null, osc2: null, gainNode: null });

  // Core Simulation Ref
  const simRef = useRef({
    time: 0,
    width: 1280,
    height: 720,
    screenShake: 0,
    // Player ship
    player: {
      x: 640,
      y: 520,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2, // Facing upwards
      bankAngle: 0,
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      shieldRechargeTimer: 0,
      ammo: 24,
      maxAmmo: 24,
      isReloading: false,
      reloadTimer: 0,
      maxReloadTime: 90, // ~1.5s
      shootCooldown: 0,
      energyBlastCooldown: 0,
      maxBlastCooldown: 300, // 5s
      isBlasting: false,
      blastRadius: 0,
      hitFlash: 0
    },
    // Crosshair / Aim
    crosshair: {
      x: 640,
      y: 300,
      isLockedOn: false
    },
    // Keys
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false
    },
    // Waves & Progression
    wave: 1,
    waveSpawned: 0,
    waveTargetKills: 3, // Wave 1 has only 3 enemies - beginner friendly!
    spawnCooldown: 40,
    score: 0,
    kills: 0,
    // Entities
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    asteroids: [] as Asteroid[],
    floatingTexts: [] as FloatingText[],
    // Background
    stars: [] as Star[],
    nebulas: [] as NebulaCloud[],
    planets: [] as Planet[],
    nextProjId: 1,
    nextEnemyId: 1
  });

  // Check Touchscreen
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  // Listen to Fullscreen changes
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

  // Ambient Space Synth Music Generator (Web Audio API)
  const startSpaceMusic = useCallback(() => {
    if (!musicEnabled || sound.getIsMuted()) return;
    try {
      if (!musicOscRef.current.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          musicOscRef.current.ctx = new AudioCtx();
        }
      }
      const ctx = musicOscRef.current.ctx;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop previous
      if (musicOscRef.current.osc1) {
        try {
          musicOscRef.current.osc1.stop();
          musicOscRef.current.osc2?.stop();
        } catch {}
      }

      // Create warm low sci-fi drone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, ctx.currentTime); // A2 note

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      gain.gain.setValueAtTime(0.045, ctx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      musicOscRef.current = { ctx, osc1, osc2, gainNode: gain };
    } catch {}
  }, [musicEnabled]);

  const stopSpaceMusic = useCallback(() => {
    try {
      if (musicOscRef.current.osc1) {
        musicOscRef.current.osc1.stop();
        musicOscRef.current.osc2?.stop();
        musicOscRef.current.osc1 = null;
        musicOscRef.current.osc2 = null;
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (gameState === 'PLAYING' && musicEnabled && !sound.getIsMuted()) {
      startSpaceMusic();
    } else {
      stopSpaceMusic();
    }
    return () => {
      stopSpaceMusic();
    };
  }, [gameState, musicEnabled, startSpaceMusic, stopSpaceMusic]);

  // Initialize Space Environment (Stars, Nebulas, Planets, Asteroids)
  const initSpaceEnvironment = useCallback((w: number, h: number, q: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const starCount = q === 'HIGH' ? 140 : q === 'MEDIUM' ? 90 : 50;
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      const z = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        size: z === 3 ? 1.8 + Math.random() * 1.2 : z === 2 ? 1.2 + Math.random() * 0.8 : 0.8 + Math.random() * 0.6,
        alpha: z === 3 ? 0.8 + Math.random() * 0.2 : z === 2 ? 0.5 + Math.random() * 0.3 : 0.3 + Math.random() * 0.2
      });
    }

    const nebulas: NebulaCloud[] = [
      { x: w * 0.25, y: h * 0.3, radius: 240, color: 'rgba(56, 189, 248, 0.08)', speed: 0.15 },
      { x: w * 0.75, y: h * 0.4, radius: 280, color: 'rgba(168, 85, 247, 0.09)', speed: 0.12 },
      { x: w * 0.5, y: h * 0.8, radius: 260, color: 'rgba(236, 72, 153, 0.07)', speed: 0.18 }
    ];

    const planets: Planet[] = [
      {
        x: w * 0.85,
        y: h * 0.25,
        radius: 46,
        baseColor: '#0284c7',
        glowColor: '#38bdf8',
        hasRing: true,
        ringColor: 'rgba(56, 189, 248, 0.4)',
        speed: 0.05
      },
      {
        x: w * 0.15,
        y: h * 0.75,
        radius: 28,
        baseColor: '#7c3aed',
        glowColor: '#c084fc',
        hasRing: false,
        speed: 0.03
      }
    ];

    // Asteroids drifting in background
    const asteroids: Asteroid[] = [];
    const numAst = q === 'HIGH' ? 6 : 4;
    for (let i = 0; i < numAst; i++) {
      const radius = 18 + Math.random() * 26;
      const numPts = 7 + Math.floor(Math.random() * 4);
      const vertices = [];
      for (let p = 0; p < numPts; p++) {
        const angle = (p / numPts) * Math.PI * 2;
        const rad = radius * (0.8 + Math.random() * 0.4);
        vertices.push({ x: Math.cos(angle) * rad, y: Math.sin(angle) * rad });
      }
      asteroids.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.2 + Math.random() * 0.4,
        radius,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        hp: 35,
        maxHp: 35,
        vertices
      });
    }

    return { stars, nebulas, planets, asteroids };
  }, []);

  // Fire Plasma Cannon (Left Mouse / Fire Button)
  const fireWeapon = useCallback(() => {
    const s = simRef.current;
    const p = s.player;
    if (p.isReloading || p.shootCooldown > 0 || p.ammo <= 0) {
      if (p.ammo <= 0 && !p.isReloading) {
        // Trigger automatic reload when empty
        triggerReload();
      }
      return;
    }

    p.ammo--;
    setAmmo(p.ammo);
    p.shootCooldown = 11; // Smooth rapid fire rate
    if (soundEnabled) sound.playLaser(1100);

    // Muzzle flash / recoil
    s.screenShake = 2.5;

    // Calculate aim angle towards crosshair
    const dx = s.crosshair.x - p.x;
    const dy = s.crosshair.y - p.y;
    const aimAngle = Math.atan2(dy, dx);

    // Twin cannon offsets
    const perpAngle = aimAngle + Math.PI / 2;
    const offset = 14;

    const leftX = p.x + Math.cos(perpAngle) * offset + Math.cos(aimAngle) * 16;
    const leftY = p.y + Math.sin(perpAngle) * offset + Math.sin(aimAngle) * 16;
    const rightX = p.x - Math.cos(perpAngle) * offset + Math.cos(aimAngle) * 16;
    const rightY = p.y - Math.sin(perpAngle) * offset + Math.sin(aimAngle) * 16;

    const projSpeed = 16;
    const pVx = Math.cos(aimAngle) * projSpeed;
    const pVy = Math.sin(aimAngle) * projSpeed;

    // Fire two high-energy plasma bolts
    [
      { x: leftX, y: leftY },
      { x: rightX, y: rightY }
    ].forEach(origin => {
      s.projectiles.push({
        id: s.nextProjId++,
        x: origin.x,
        y: origin.y,
        vx: pVx,
        vy: pVy,
        radius: 4,
        damage: 18,
        color: '#00f0ff',
        glowColor: '#38bdf8',
        isPlayer: true,
        life: 55,
        maxLife: 55
      });

      // Muzzle sparks
      for (let m = 0; m < 3; m++) {
        const sparkAngle = aimAngle + (Math.random() - 0.5) * 0.8;
        const spd = 2 + Math.random() * 4;
        s.particles.push({
          x: origin.x,
          y: origin.y,
          vx: Math.cos(sparkAngle) * spd,
          vy: Math.sin(sparkAngle) * spd,
          color: '#00f0ff',
          size: 2,
          alpha: 1,
          life: 10,
          maxLife: 10,
          type: 'spark'
        });
      }
    });

    if (p.ammo <= 0) {
      triggerReload();
    }
  }, [soundEnabled]);

  // Reload Plasma Cannon
  const triggerReload = useCallback(() => {
    const s = simRef.current;
    const p = s.player;
    if (p.isReloading || p.ammo >= p.maxAmmo) return;

    p.isReloading = true;
    p.reloadTimer = p.maxReloadTime;
    setIsReloading(true);
    if (soundEnabled) sound.playClick();
  }, [soundEnabled]);

  // Special Ability: ENERGY BLAST
  const fireEnergyBlast = useCallback(() => {
    const s = simRef.current;
    const p = s.player;
    if (p.energyBlastCooldown > 0) return;

    if (soundEnabled) sound.playPowerUp();
    p.energyBlastCooldown = p.maxBlastCooldown;
    setEnergyBlastCooldown(p.maxBlastCooldown);
    p.isBlasting = true;
    p.blastRadius = 15;
    s.screenShake = 7;

    // Spawn massive shockwave ring
    s.projectiles.push({
      id: s.nextProjId++,
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      radius: 20,
      damage: 75,
      color: '#c084fc',
      glowColor: '#a855f7',
      isPlayer: true,
      life: 40,
      maxLife: 40,
      isEnergyBlast: true
    });

    // Radial plasma particles
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const spd = 6 + Math.random() * 5;
      s.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: Math.random() < 0.5 ? '#c084fc' : '#38bdf8',
        size: 3.5,
        alpha: 1,
        life: 25,
        maxLife: 25,
        type: 'shockwave'
      });
    }

    // Damage and push back all enemies currently on screen
    s.enemies.forEach(e => {
      if (!e.alive) return;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 340) {
        e.hp -= 65;
        e.hitFlash = 12;
        const pushAngle = Math.atan2(dy, dx);
        e.vx += Math.cos(pushAngle) * 8;
        e.vy += Math.sin(pushAngle) * 8;
      }
    });
  }, [soundEnabled]);

  // Start New Game Session
  const startGame = useCallback(() => {
    sound.playClick();
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 1280;
    const h = canvas ? canvas.height : 720;
    const env = initSpaceEnvironment(w, h, quality);

    simRef.current = {
      time: 0,
      width: w,
      height: h,
      screenShake: 0,
      player: {
        x: w / 2,
        y: h * 0.75,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        bankAngle: 0,
        hp: 100,
        maxHp: 100,
        shield: 100,
        maxShield: 100,
        shieldRechargeTimer: 0,
        ammo: 24,
        maxAmmo: 24,
        isReloading: false,
        reloadTimer: 0,
        maxReloadTime: 90,
        shootCooldown: 0,
        energyBlastCooldown: 0,
        maxBlastCooldown: 300,
        isBlasting: false,
        blastRadius: 0,
        hitFlash: 0
      },
      crosshair: {
        x: w / 2,
        y: h * 0.35,
        isLockedOn: false
      },
      keys: {
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false
      },
      wave: 1,
      waveSpawned: 0,
      waveTargetKills: 3, // Wave 1: exactly 3 easy scouts!
      spawnCooldown: 40,
      score: 0,
      kills: 0,
      enemies: [],
      projectiles: [],
      particles: [],
      asteroids: env.asteroids,
      floatingTexts: [],
      stars: env.stars,
      nebulas: env.nebulas,
      planets: env.planets,
      nextProjId: 1,
      nextEnemyId: 1
    };

    setScore(0);
    setKills(0);
    setWave(1);
    setActiveHostiles(0);
    setHealth(100);
    setShield(100);
    setAmmo(24);
    setIsReloading(false);
    setEnergyBlastCooldown(0);
    setIsLockedOn(false);

    setWaveBanner('WAVE 01 // HOSTILES INCOMING');
    setTimeout(() => setWaveBanner(null), 3000);
    setGameState('PLAYING');
  }, [initSpaceEnvironment, quality]);

  // Handle Game Over
  const handleGameOver = useCallback(
    (finalScore: number) => {
      if (soundEnabled) sound.playGameOver();
      setGameState('GAMEOVER');
      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem('gamenova_hs_galaxy_commander', finalScore.toString());
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
      if (onGameOver) onGameOver(finalScore);
    },
    [highScore, onGameOver, soundEnabled]
  );

  // Keyboard Controls Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = simRef.current;
      if (['KeyW', 'ArrowUp'].includes(e.code)) s.keys.up = true;
      if (['KeyS', 'ArrowDown'].includes(e.code)) s.keys.down = true;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = true;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = true;
      if (['KeyR'].includes(e.code)) triggerReload();
      if (['Space'].includes(e.code)) {
        e.preventDefault();
        fireEnergyBlast();
      }
      if (['Escape', 'KeyP'].includes(e.code)) {
        setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = simRef.current;
      if (['KeyW', 'ArrowUp'].includes(e.code)) s.keys.up = false;
      if (['KeyS', 'ArrowDown'].includes(e.code)) s.keys.down = false;
      if (['KeyA', 'ArrowLeft'].includes(e.code)) s.keys.left = false;
      if (['KeyD', 'ArrowRight'].includes(e.code)) s.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [fireEnergyBlast, triggerReload]);

  // Mouse Movement & Firing on Canvas
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);

    const s = simRef.current;
    s.crosshair.x = mx;
    s.crosshair.y = my;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      simRef.current.keys.fire = true;
      fireWeapon();
    } else if (e.button === 2) {
      e.preventDefault();
      fireEnergyBlast();
    }
  }, [fireWeapon, fireEnergyBlast]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      simRef.current.keys.fire = false;
    }
  }, []);

  // Mobile Virtual Joystick Touch Handlers
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
    const maxDist = 38;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(maxDist, dist);
    const jx = Math.cos(angle) * clampedDist;
    const jy = Math.sin(angle) * clampedDist;

    setJoystickPos({ x: jx, y: jy, active: true });

    const s = simRef.current;
    s.keys.left = jx < -8;
    s.keys.right = jx > 8;
    s.keys.up = jy < -8;
    s.keys.down = jy > 8;
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
        const maxDist = 38;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(maxDist, dist);
        const jx = Math.cos(angle) * clampedDist;
        const jy = Math.sin(angle) * clampedDist;

        setJoystickPos({ x: jx, y: jy, active: true });

        const s = simRef.current;
        s.keys.left = jx < -8;
        s.keys.right = jx > 8;
        s.keys.up = jy < -8;
        s.keys.down = jy > 8;
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
        const s = simRef.current;
        s.keys.left = false;
        s.keys.right = false;
        s.keys.up = false;
        s.keys.down = false;
        break;
      }
    }
  }, []);

  // Main Simulation & Rendering Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI resize
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
      const viewW = s.width;
      const viewH = s.height;

      s.time += 0.016;

      // -------------------------------------------------------------
      // 1. UPDATE PLAYER PHYSICS & MOVEMENT
      // -------------------------------------------------------------
      const speedMultiplier = sensitivity === 'HIGH' ? 6.8 : sensitivity === 'LOW' ? 4.8 : 5.8;

      let moveX = 0;
      let moveY = 0;
      if (s.keys.left) moveX -= 1;
      if (s.keys.right) moveX += 1;
      if (s.keys.up) moveY -= 1;
      if (s.keys.down) moveY += 1;

      // Normalize diagonal speed
      if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.7071;
        moveY *= 0.7071;
      }

      // Smooth inertia
      p.vx += (moveX * speedMultiplier - p.vx) * 0.18;
      p.vy += (moveY * speedMultiplier - p.vy) * 0.18;

      p.x += p.vx;
      p.y += p.vy;

      // Banking angle based on horizontal movement
      const targetBank = (p.vx / speedMultiplier) * 0.28;
      p.bankAngle += (targetBank - p.bankAngle) * 0.15;

      // Arena boundaries (keep player securely on screen)
      const margin = 36;
      p.x = Math.max(margin, Math.min(viewW - margin, p.x));
      p.y = Math.max(margin, Math.min(viewH - margin, p.y));

      // Engine thruster particle trail
      if (Math.random() < 0.8) {
        s.particles.push({
          x: p.x - Math.sin(p.bankAngle) * 8 + (Math.random() - 0.5) * 8,
          y: p.y + 24 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 3 + Math.random() * 4,
          color: Math.random() < 0.6 ? '#00f0ff' : '#38bdf8',
          size: 2.5 + Math.random() * 2,
          alpha: 0.9,
          life: 16,
          maxLife: 16,
          type: 'plasma'
        });
      }

      // Continuous firing while held (desktop or mobile)
      if ((s.keys.fire || isMobileFiringRef.current) && p.shootCooldown <= 0) {
        fireWeapon();
      }

      // Weapon Cooldown & Reloading
      if (p.shootCooldown > 0) p.shootCooldown--;
      if (p.isReloading) {
        p.reloadTimer--;
        if (p.reloadTimer <= 0) {
          p.isReloading = false;
          p.ammo = p.maxAmmo;
          setIsReloading(false);
          setAmmo(p.maxAmmo);
          if (soundEnabled) sound.playLaser(1400);
        }
      }

      // Energy Blast Cooldown
      if (p.energyBlastCooldown > 0) {
        p.energyBlastCooldown--;
        if (p.energyBlastCooldown % 15 === 0 || p.energyBlastCooldown === 0) {
          setEnergyBlastCooldown(p.energyBlastCooldown);
        }
      }

      // Shield Passive Regeneration (starts recharging after 120 frames without taking hit)
      p.shieldRechargeTimer++;
      if (p.shieldRechargeTimer > 120 && p.shield < p.maxShield) {
        p.shield = Math.min(p.maxShield, p.shield + 0.35);
        setShield(Math.floor(p.shield));
      }

      if (p.hitFlash > 0) p.hitFlash--;

      // -------------------------------------------------------------
      // 2. CROSSHAIR & ENEMY TARGET LOCK DETECTION
      // -------------------------------------------------------------
      let lockedOnAny = false;
      for (const e of s.enemies) {
        if (!e.alive) continue;
        const distToCross = Math.hypot(e.x - s.crosshair.x, e.y - s.crosshair.y);
        if (distToCross < e.radius + 18) {
          lockedOnAny = true;
          break;
        }
      }
      s.crosshair.isLockedOn = lockedOnAny;
      setIsLockedOn(lockedOnAny);

      // -------------------------------------------------------------
      // 3. WAVES & PROGRESSIVE ENEMY SPAWNER
      // -------------------------------------------------------------
      const livingEnemies = s.enemies.filter(e => e.alive).length;
      setActiveHostiles(livingEnemies);

      // Wave Clear Check
      if (s.waveSpawned >= s.waveTargetKills && livingEnemies === 0) {
        s.wave++;
        s.waveSpawned = 0;
        // Gradual scaling: Wave 1: 3, Wave 2: 4, Wave 3: 6, Wave 4: 8, Wave 5: 10
        s.waveTargetKills = Math.min(16, 2 + s.wave * 2);
        s.spawnCooldown = 90; // Generous intermission
        setWave(s.wave);

        // System repair rewards on wave clear
        p.shield = p.maxShield;
        p.hp = Math.min(p.maxHp, p.hp + 20);
        p.ammo = p.maxAmmo;
        setShield(p.shield);
        setHealth(p.hp);
        setAmmo(p.ammo);

        setWaveBanner(`WAVE 0${s.wave} // SYSTEMS RESTORED`);
        setTimeout(() => setWaveBanner(null), 3000);
      }

      // Spawn individual enemies smoothly
      if (s.waveSpawned < s.waveTargetKills) {
        s.spawnCooldown--;
        // Early wave spawn intervals are very relaxed (every 140+ frames = 2.5s)
        const spawnDelay = Math.max(65, 140 - s.wave * 8);

        // Max concurrent enemies allowed on screen scales gently: Wave 1: 2, Wave 2: 3, Wave 3: 4
        const maxConcurrent = Math.min(6, 2 + Math.floor(s.wave / 2));

        if (s.spawnCooldown <= 0 && livingEnemies < maxConcurrent) {
          s.spawnCooldown = spawnDelay;
          s.waveSpawned++;

          // Determine enemy archetype based on current wave progression
          let eType: EnemyType = 'scout';
          const r = Math.random();
          if (s.wave >= 4 && r < 0.2) {
            eType = 'elite';
          } else if (s.wave >= 3 && r < 0.35) {
            eType = 'heavy';
          } else if (s.wave >= 2 && r < 0.5) {
            eType = 'fighter';
          } else {
            eType = 'scout';
          }

          // Enemy stats tuned for beginner-friendly start
          const maxHp = eType === 'heavy' ? 110 : eType === 'elite' ? 65 : eType === 'fighter' ? 42 : 20;
          const speed =
            eType === 'scout'
              ? 1.6 + Math.min(0.8, s.wave * 0.05)
              : eType === 'fighter'
              ? 1.3
              : eType === 'elite'
              ? 1.8
              : 0.9;

          const shootInterval = eType === 'scout' ? 160 : eType === 'heavy' ? 120 : eType === 'elite' ? 85 : 100;

          s.enemies.push({
            id: `en_${s.nextEnemyId++}`,
            type: eType,
            x: 80 + Math.random() * (viewW - 160),
            y: -50, // Spawn just above top screen
            vx: (Math.random() - 0.5) * 1.5,
            vy: speed,
            angle: Math.PI / 2, // Facing downwards
            targetAngle: Math.PI / 2,
            hp: maxHp,
            maxHp,
            shield: eType === 'elite' ? 30 : 0,
            maxShield: eType === 'elite' ? 30 : 0,
            speed,
            shootCooldown: Math.floor(Math.random() * 60) + 40,
            shootInterval,
            behaviorTimer: 0,
            hitFlash: 0,
            alive: true,
            deathAnim: 1,
            radius: eType === 'heavy' ? 32 : eType === 'elite' ? 24 : eType === 'fighter' ? 22 : 16,
            color: eType === 'heavy' ? '#a855f7' : eType === 'elite' ? '#f43f5e' : eType === 'fighter' ? '#f59e0b' : '#38bdf8',
            glowColor: eType === 'heavy' ? '#c084fc' : eType === 'elite' ? '#fb7185' : eType === 'fighter' ? '#fbbf24' : '#00f0ff'
          });
        }
      }

      // -------------------------------------------------------------
      // 4. UPDATE ENEMY AI & COMBAT PATTERNS
      // -------------------------------------------------------------
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (!e.alive) {
          e.deathAnim -= 0.06;
          if (e.deathAnim <= 0) {
            s.enemies.splice(i, 1);
          }
          continue;
        }

        if (e.hitFlash > 0) e.hitFlash--;
        e.behaviorTimer += 0.03;

        // Custom archetype navigation
        if (e.type === 'scout') {
          // Fast strafing in weave patterns
          e.vy = e.speed;
          e.vx = Math.sin(e.behaviorTimer * 2 + e.y * 0.01) * 2.2;
          e.y += e.vy;
          e.x += e.vx;
          if (e.y > viewH + 40) e.y = -30; // Loop back from top
        } else if (e.type === 'fighter') {
          // Moves down to mid screen and circles/strafes
          if (e.y < viewH * 0.35) {
            e.y += e.speed;
          } else {
            e.x += Math.sin(e.behaviorTimer * 1.5) * 2.4;
            e.y += Math.cos(e.behaviorTimer * 0.8) * 0.8;
          }
        } else if (e.type === 'heavy') {
          // Slow ponderous battleship
          if (e.y < viewH * 0.28) {
            e.y += e.speed * 0.7;
          } else {
            e.x += Math.sin(e.behaviorTimer * 0.8) * 1.2;
          }
        } else if (e.type === 'elite') {
          // Advanced evasive strafing
          const dxToPlayer = p.x - e.x;
          e.vx += (Math.sign(dxToPlayer) * 1.5 - e.vx) * 0.1;
          e.x += e.vx;
          e.y += Math.sin(e.behaviorTimer * 2) * 1.4;
          if (e.y < 120) e.y += 1.2;
        }

        // Clamp inside horizontal bounds
        e.x = Math.max(e.radius + 15, Math.min(viewW - e.radius - 15, e.x));

        // Enemy Shooting Logic
        e.shootCooldown--;
        if (e.shootCooldown <= 0 && e.y > 40 && e.y < viewH * 0.65) {
          e.shootCooldown = e.shootInterval;

          const dx = p.x - e.x;
          const dy = p.y - e.y;
          const angleToPlayer = Math.atan2(dy, dx);
          const enemyBulletSpeed = e.type === 'elite' ? 5.5 : 4.2;

          if (e.type === 'heavy') {
            // Triple spread salvo
            [-0.25, 0, 0.25].forEach(angOff => {
              const finalAngle = angleToPlayer + angOff;
              s.projectiles.push({
                id: s.nextProjId++,
                x: e.x,
                y: e.y + e.radius,
                vx: Math.cos(finalAngle) * enemyBulletSpeed,
                vy: Math.sin(finalAngle) * enemyBulletSpeed,
                radius: 4.5,
                damage: 15,
                color: '#ef4444',
                glowColor: '#f97316',
                isPlayer: false,
                life: 140,
                maxLife: 140
              });
            });
          } else if (e.type === 'fighter') {
            // Twin plasma bolt
            [-10, 10].forEach(xOff => {
              s.projectiles.push({
                id: s.nextProjId++,
                x: e.x + xOff,
                y: e.y + e.radius,
                vx: Math.cos(angleToPlayer) * enemyBulletSpeed,
                vy: Math.sin(angleToPlayer) * enemyBulletSpeed,
                radius: 3.5,
                damage: 12,
                color: '#f59e0b',
                glowColor: '#fbbf24',
                isPlayer: false,
                life: 120,
                maxLife: 120
              });
            });
          } else {
            // Single directed laser bolt
            s.projectiles.push({
              id: s.nextProjId++,
              x: e.x,
              y: e.y + e.radius,
              vx: Math.cos(angleToPlayer) * enemyBulletSpeed,
              vy: Math.sin(angleToPlayer) * enemyBulletSpeed,
              radius: 3,
              damage: 9,
              color: '#38bdf8',
              glowColor: '#00f0ff',
              isPlayer: false,
              life: 120,
              maxLife: 120
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 5. UPDATE PROJECTILES & COLLISION DETECTION
      // -------------------------------------------------------------
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const pr = s.projectiles[i];
        pr.x += pr.vx;
        pr.y += pr.vy;
        pr.life--;

        // Remove offscreen or dead projectiles
        if (pr.life <= 0 || pr.x < -40 || pr.x > viewW + 40 || pr.y < -40 || pr.y > viewH + 40) {
          s.projectiles.splice(i, 1);
          continue;
        }

        // PLAYER PROJECTILE HITTING ENEMY
        if (pr.isPlayer) {
          for (let eIdx = 0; eIdx < s.enemies.length; eIdx++) {
            const e = s.enemies[eIdx];
            if (!e.alive) continue;

            const dist = Math.hypot(e.x - pr.x, e.y - pr.y);
            if (dist < e.radius + pr.radius + 4) {
              // Apply damage
              if (e.shield && e.shield > 0) {
                e.shield -= pr.damage;
                if (e.shield < 0) {
                  e.hp += e.shield;
                  e.shield = 0;
                }
              } else {
                e.hp -= pr.damage;
              }

              e.hitFlash = 6;
              if (soundEnabled) sound.playHit();

              // Impact kinetic sparks
              for (let sp = 0; sp < 6; sp++) {
                const spAngle = Math.random() * Math.PI * 2;
                const spSpeed = 2 + Math.random() * 4;
                s.particles.push({
                  x: pr.x,
                  y: pr.y,
                  vx: Math.cos(spAngle) * spSpeed,
                  vy: Math.sin(spAngle) * spSpeed,
                  color: pr.color,
                  size: 2,
                  alpha: 1,
                  life: 12,
                  maxLife: 12,
                  type: 'spark'
                });
              }

              // Non-energy blasts terminate on impact
              if (!pr.isEnergyBlast) {
                s.projectiles.splice(i, 1);
              }

              // Enemy Defeated
              if (e.hp <= 0) {
                e.alive = false;
                e.deathAnim = 1;
                s.kills++;
                setKills(s.kills);
                if (soundEnabled) sound.playExplosion();

                const killPoints = e.type === 'heavy' ? 350 : e.type === 'elite' ? 280 : e.type === 'fighter' ? 180 : 100;
                s.score += killPoints;
                setScore(s.score);

                // Small screen shake on defeat
                s.screenShake = e.type === 'heavy' ? 6 : 3;

                // Destruction explosion debris & shockwave
                for (let d = 0; d < (e.type === 'heavy' ? 24 : 14); d++) {
                  const dAngle = Math.random() * Math.PI * 2;
                  const dSpd = 1.5 + Math.random() * 5.5;
                  s.particles.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(dAngle) * dSpd,
                    vy: Math.sin(dAngle) * dSpd,
                    color: Math.random() < 0.6 ? e.color : '#ffffff',
                    size: 2.5 + Math.random() * 3,
                    alpha: 1,
                    life: 22,
                    maxLife: 22,
                    type: 'debris'
                  });
                }
              }
              break;
            }
          }
        } else {
          // ENEMY PROJECTILE HITTING PLAYER
          const distToPlayer = Math.hypot(p.x - pr.x, p.y - pr.y);
          if (distToPlayer < 24 + pr.radius) {
            s.projectiles.splice(i, 1);
            p.hitFlash = 10;
            p.shieldRechargeTimer = 0; // Reset shield regen delay
            s.screenShake = 5;

            // Shield absorbs damage first
            if (p.shield > 0) {
              p.shield -= pr.damage;
              if (p.shield < 0) {
                p.hp += p.shield;
                p.shield = 0;
              }
              setShield(Math.max(0, Math.floor(p.shield)));
              if (soundEnabled) sound.playHit();
            } else {
              p.hp = Math.max(0, p.hp - pr.damage);
              setHealth(Math.floor(p.hp));
              if (soundEnabled) sound.playHit();
            }

            // Shield / Hull impact ring
            for (let sh = 0; sh < 10; sh++) {
              const ang = Math.random() * Math.PI * 2;
              s.particles.push({
                x: pr.x,
                y: pr.y,
                vx: Math.cos(ang) * 3,
                vy: Math.sin(ang) * 3,
                color: p.shield > 0 ? '#38bdf8' : '#ef4444',
                size: 2.5,
                alpha: 1,
                life: 14,
                maxLife: 14,
                type: 'plasma'
              });
            }

            if (p.hp <= 0) {
              handleGameOver(s.score);
              return;
            }
          }
        }
      }

      // -------------------------------------------------------------
      // 6. UPDATE PARTICLES & ASTEROIDS
      // -------------------------------------------------------------
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        pt.alpha = pt.life / pt.maxLife;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // Asteroids drift in space
      s.asteroids.forEach(ast => {
        ast.x += ast.vx;
        ast.y += ast.vy;
        ast.rotation += ast.rotSpeed;
        if (ast.y > viewH + ast.radius) {
          ast.y = -ast.radius;
          ast.x = Math.random() * viewW;
        }
      });

      // Stars scroll slowly downward to give sense of cruising forward
      s.stars.forEach(st => {
        st.y += st.z * 0.45;
        if (st.y > viewH) {
          st.y = -5;
          st.x = Math.random() * viewW;
        }
      });

      // -------------------------------------------------------------
      // 7. HIGH-END PROCEDURAL SPACE RENDERING PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);

      // Camera Shake
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.4);
      }

      // 7A. Deep Space Void Background
      const spaceGrad = ctx.createLinearGradient(0, 0, 0, viewH);
      spaceGrad.addColorStop(0, '#030712');
      spaceGrad.addColorStop(0.5, '#080d1a');
      spaceGrad.addColorStop(1, '#050a14');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      // 7B. Glowing Nebulas
      s.nebulas.forEach(n => {
        const nGrad = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, n.radius);
        nGrad.addColorStop(0, n.color);
        nGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nGrad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 7C. Distant Planets
      s.planets.forEach(pl => {
        // Base planet body
        ctx.fillStyle = pl.baseColor;
        ctx.shadowColor = pl.glowColor;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Planetary Ring
        if (pl.hasRing && pl.ringColor) {
          ctx.strokeStyle = pl.ringColor;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(pl.x, pl.y, pl.radius * 1.8, pl.radius * 0.45, -0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // 7D. Multi-layered Starfield
      s.stars.forEach(st => {
        ctx.fillStyle = st.z === 3 ? '#e0f2fe' : st.z === 2 ? '#bae6fd' : '#7dd3fc';
        ctx.globalAlpha = st.alpha;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 7E. Drifting Asteroids
      s.asteroids.forEach(ast => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ast.vertices.forEach((v, idx) => {
          if (idx === 0) ctx.moveTo(v.x, v.y);
          else ctx.lineTo(v.x, v.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // -------------------------------------------------------------
      // 7F. DRAW ENEMIES
      // -------------------------------------------------------------
      s.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);

        if (!e.alive) {
          ctx.globalAlpha = Math.max(0, e.deathAnim);
        }

        if (e.hitFlash > 0) {
          ctx.filter = 'brightness(3) drop-shadow(0 0 10px #ffffff)';
        }

        if (e.type === 'scout') {
          // SCOUT: Sleek arrow interceptor
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = e.glowColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(0, 16);
          ctx.lineTo(-14, -14);
          ctx.lineTo(0, -6);
          ctx.lineTo(14, -14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Scout eye core
          ctx.fillStyle = e.glowColor;
          ctx.beginPath();
          ctx.arc(0, 4, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === 'fighter') {
          // FIGHTER: Winged predator
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = e.glowColor;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(0, 20);
          ctx.lineTo(-20, -10);
          ctx.lineTo(-10, -20);
          ctx.lineTo(0, -12);
          ctx.lineTo(10, -20);
          ctx.lineTo(20, -10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Amber reactor core
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(0, 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === 'heavy') {
          // HEAVY: Armored dreadnought cruiser
          ctx.fillStyle = '#0f0e17';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = e.glowColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(-28, -26, 56, 48, 6);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Heavy forward armor plates
          ctx.fillStyle = '#312e81';
          ctx.fillRect(-22, 10, 44, 8);

          // Purple Fusion Reactor
          ctx.fillStyle = '#c084fc';
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, -2, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (e.type === 'elite') {
          // ELITE: Geometric diamond striker with shield
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = e.glowColor;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(0, 24);
          ctx.lineTo(-22, 0);
          ctx.lineTo(0, -24);
          ctx.lineTo(22, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Energy shield glow on elite
          if (e.shield && e.shield > 0) {
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Enemy Health Bar
        if (e.hp < e.maxHp && e.alive) {
          const barW = e.radius * 1.8;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(-barW / 2, -e.radius - 12, barW, 4);
          ctx.fillStyle = e.color;
          ctx.fillRect(-barW / 2, -e.radius - 12, barW * (e.hp / e.maxHp), 4);
        }

        ctx.restore();
      });

      // -------------------------------------------------------------
      // 7G. DRAW PLAYER SPACECRAFT
      // -------------------------------------------------------------
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.bankAngle);

      if (p.hitFlash > 0) {
        ctx.filter = 'brightness(3) drop-shadow(0 0 12px #ef4444)';
      }

      // Cyan Energy Shield Aura
      if (p.shield > 0) {
        const shieldAlpha = 0.25 + (p.shield / p.maxShield) * 0.35;
        ctx.strokeStyle = `rgba(56, 189, 248, ${shieldAlpha})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Spacecraft Main Wings & Hull
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(0, -26); // Nose
      ctx.lineTo(8, -10);
      ctx.lineTo(24, 14); // Right wing tip
      ctx.lineTo(16, 20);
      ctx.lineTo(6, 14);
      ctx.lineTo(0, 18);
      ctx.lineTo(-6, 14);
      ctx.lineTo(-16, 20);
      ctx.lineTo(-24, 14); // Left wing tip
      ctx.lineTo(-8, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Cockpit Canopy Visor
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, -6, 4.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Twin Plasma Cannon Barrels
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-15, -4, 3, 16);
      ctx.fillRect(12, -4, 3, 16);

      ctx.restore();

      // -------------------------------------------------------------
      // 7H. DRAW PROJECTILES & PARTICLES
      // -------------------------------------------------------------
      s.projectiles.forEach(pr => {
        ctx.save();
        if (pr.isEnergyBlast) {
          // Shockwave Ring
          const blastR = 25 + (1 - pr.life / pr.maxLife) * 320;
          ctx.strokeStyle = pr.color;
          ctx.shadowColor = pr.glowColor;
          ctx.shadowBlur = 24;
          ctx.lineWidth = 6 * (pr.life / pr.maxLife);
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, blastR, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Plasma Bolt
          ctx.fillStyle = pr.color;
          ctx.shadowColor = pr.glowColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Particles
      s.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // -------------------------------------------------------------
      // 7I. FUTURISTIC RETICLE / CROSSHAIR
      // -------------------------------------------------------------
      const c = s.crosshair;
      ctx.save();
      ctx.translate(c.x, c.y);

      const crossColor = c.isLockedOn ? '#f43f5e' : '#00f0ff';
      ctx.strokeStyle = crossColor;
      ctx.shadowColor = crossColor;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;

      // Outer targeting brackets
      const retSize = c.isLockedOn ? 14 : 11;
      ctx.beginPath();
      // Top left
      ctx.moveTo(-retSize, -retSize + 5);
      ctx.lineTo(-retSize, -retSize);
      ctx.lineTo(-retSize + 5, -retSize);
      // Top right
      ctx.moveTo(retSize - 5, -retSize);
      ctx.lineTo(retSize, -retSize);
      ctx.lineTo(retSize, -retSize + 5);
      // Bottom left
      ctx.moveTo(-retSize, retSize - 5);
      ctx.lineTo(-retSize, retSize);
      ctx.lineTo(-retSize + 5, retSize);
      // Bottom right
      ctx.moveTo(retSize - 5, retSize);
      ctx.lineTo(retSize, retSize);
      ctx.lineTo(retSize, retSize - 5);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = crossColor;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Low Health Crimson Vignette Overlay
      if (p.hp <= 25) {
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
  }, [gameState, sensitivity, fireWeapon, handleGameOver, soundEnabled]);

  return (
    <div
      ref={containerRef}
      id="galaxy-commander-root"
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#030712] text-white select-none overflow-hidden font-sans"
    >
      {/* -------------------------------------------------------------
          1. FULLSCREEN CANVAS LAYER
          ------------------------------------------------------------- */}
      <canvas
        ref={canvasRef}
        id="galaxy-commander-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
        className="absolute inset-0 w-full h-full cursor-none object-cover"
      />

      {/* -------------------------------------------------------------
          2. TOP FUTURISTIC GLASS HUD
          ------------------------------------------------------------- */}
      {gameState === 'PLAYING' && (
        <header
          id="gc-top-hud"
          className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4 pointer-events-none"
        >
          {/* TOP LEFT: GALAXY COMMANDER • HP BAR • SHIELD BAR */}
          <div className="flex flex-col gap-1.5 pointer-events-auto bg-slate-950/70 border border-white/10 rounded-2xl p-2.5 sm:p-3 backdrop-blur-md shadow-xl min-w-[170px] sm:min-w-[210px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-cyan-400">
                GALAXY COMMANDER
              </span>
              <span className="text-[9px] font-mono text-slate-400">MK-IV</span>
            </div>

            {/* Health Bar */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-slate-400 font-bold">HP</span>
                <span className={health <= 25 ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-300'}>
                  {health}%
                </span>
              </div>
              <div className="w-full h-1.5 sm:h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-150 rounded-full ${
                    health > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                      : health > 25
                      ? 'bg-gradient-to-r from-amber-500 to-rose-400'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>

            {/* Shield Bar */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-cyan-400 font-bold">SHIELD</span>
                <span className="text-cyan-300">{shield}%</span>
              </div>
              <div className="w-full h-1.5 sm:h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all duration-150 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                  style={{ width: `${shield}%` }}
                />
              </div>
            </div>
          </div>

          {/* TOP CENTER: WAVE 01 • DESTROY ALL HOSTILES */}
          <div className="flex flex-col items-center pointer-events-auto bg-slate-950/70 border border-white/10 rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 backdrop-blur-md shadow-xl text-center">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-black tracking-widest text-white">
                WAVE 0{wave}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-cyan-300 tracking-wider">
              {activeHostiles > 0 ? `HOSTILES DETECTED: ${activeHostiles}` : 'DESTROY ALL HOSTILES'}
            </span>
          </div>

          {/* TOP RIGHT: SCORE • KILLS • SYSTEM BUTTONS */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-950/70 border border-white/10 rounded-2xl px-3 py-2 sm:px-3.5 sm:py-2.5 backdrop-blur-md shadow-xl flex items-center gap-3">
              <div className="text-right">
                <div className="text-[9px] font-mono text-slate-400">SCORE</div>
                <div className="text-xs sm:text-sm font-black font-mono text-cyan-400 tracking-wider">
                  {score.toString().padStart(6, '0')}
                </div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-right">
                <div className="text-[9px] font-mono text-slate-400">KILLS</div>
                <div className="text-xs sm:text-sm font-black font-mono text-rose-400 tracking-wider">
                  {kills.toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Audio Toggle */}
            <button
              id="gc-sound-btn"
              type="button"
              onClick={() => {
                const muted = sound.toggleMute();
                setSoundEnabled(!muted);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
              title="Sound Toggle"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Fullscreen Button */}
            <button
              id="gc-fullscreen-btn"
              type="button"
              onClick={toggleFullscreen}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Pause Button */}
            <button
              id="gc-pause-btn"
              type="button"
              onClick={() => setGameState('PAUSED')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
              title="Pause Game"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* -------------------------------------------------------------
          3. BOTTOM HUD: WEAPON, AMMO & ENERGY BLAST COOLDOWN
          ------------------------------------------------------------- */}
      {gameState === 'PLAYING' && (
        <footer
          id="gc-bottom-hud"
          className="absolute bottom-0 inset-x-0 z-20 flex items-end justify-between p-3 sm:p-5 pointer-events-none"
        >
          {/* BOTTOM LEFT: HINTS */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400/80 bg-slate-950/60 border border-white/5 rounded-xl px-3 py-1.5 backdrop-blur-sm">
            <span>[WASD] MOVE</span>
            <span>•</span>
            <span>[LMB] FIRE</span>
            <span>•</span>
            <span>[SPACE] BLAST</span>
            <span>•</span>
            <span>[R] RELOAD</span>
          </div>

          {/* BOTTOM RIGHT: WEAPON & ENERGY BLAST STATUS */}
          <div className="flex items-center gap-2 pointer-events-auto ml-auto bg-slate-950/70 border border-white/10 rounded-2xl p-2.5 sm:p-3 backdrop-blur-md shadow-xl">
            {/* Plasma Cannon Status */}
            <div className="text-right pr-2">
              <div className="text-[9px] font-mono text-slate-400">WEAPON</div>
              <div className="text-[11px] sm:text-xs font-bold text-cyan-400">PLASMA CANNON</div>
              <div className="text-[10px] font-mono text-slate-300 flex items-center justify-end gap-1.5 mt-0.5">
                {isReloading ? (
                  <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> RELOADING
                  </span>
                ) : (
                  <span>
                    AMMO <strong className="text-white">{ammo}</strong> / {maxAmmo}
                  </span>
                )}
              </div>
            </div>

            {/* Energy Blast Ability Cooldown Pip */}
            <div className="border-l border-white/10 pl-2 text-center min-w-[75px]">
              <div className="text-[9px] font-mono text-slate-400">SPECIAL</div>
              <div
                className={`text-[10px] font-bold font-mono mt-0.5 rounded-lg px-2 py-1 ${
                  energyBlastCooldown === 0
                    ? 'bg-purple-950/80 border border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                    : 'bg-slate-900 border border-white/5 text-slate-500'
                }`}
              >
                {energyBlastCooldown === 0 ? 'READY' : `${(energyBlastCooldown / 60).toFixed(1)}s`}
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* -------------------------------------------------------------
          4. WAVE TRANSITION BANNER
          ------------------------------------------------------------- */}
      {waveBanner && (
        <div className="absolute top-20 z-30 pointer-events-none px-6 py-2.5 rounded-2xl bg-slate-950/90 border border-cyan-400/40 text-cyan-300 text-xs sm:text-sm font-black font-mono tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-bounce backdrop-blur-md">
          {waveBanner}
        </div>
      )}

      {/* -------------------------------------------------------------
          5. MOBILE RESPONSIVE TOUCH CONTROLS
          ------------------------------------------------------------- */}
      {isTouchDevice && gameState === 'PLAYING' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end p-4 pb-16 sm:pb-20">
          <div className="flex items-end justify-between w-full">
            {/* Virtual Joystick */}
            <div
              className="pointer-events-auto relative w-24 h-24 rounded-full bg-slate-950/60 border border-cyan-400/30 backdrop-blur-sm flex items-center justify-center touch-none select-none shadow-lg"
              onTouchStart={handleJoystickTouchStart}
              onTouchMove={handleJoystickTouchMove}
              onTouchEnd={handleJoystickTouchEnd}
            >
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border border-cyan-200/50 shadow-[0_0_12px_rgba(0,240,255,0.6)] pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
                }}
              />
            </div>

            {/* Mobile Action Buttons: RELOAD • BLAST • FIRE */}
            <div className="pointer-events-auto flex items-end gap-3 select-none">
              {/* Manual Reload Button */}
              <button
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  triggerReload();
                }}
                className="w-12 h-12 rounded-2xl bg-slate-950/70 border border-white/10 active:border-cyan-400 text-slate-300 flex flex-col items-center justify-center backdrop-blur-md active:scale-95 shadow-lg"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span className="text-[8px] font-mono text-slate-400 mt-0.5">RELOAD</span>
              </button>

              {/* Special Ability: Energy Blast */}
              <button
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  fireEnergyBlast();
                }}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md active:scale-95 shadow-lg transition-all ${
                  energyBlastCooldown === 0
                    ? 'bg-purple-950/80 border border-purple-400/60 text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.5)]'
                    : 'bg-slate-950/60 border border-white/10 text-slate-500 opacity-60'
                }`}
              >
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-[8px] font-mono mt-0.5">BLAST</span>
              </button>

              {/* Primary Weapon: Fire */}
              <button
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  isMobileFiringRef.current = true;
                  fireWeapon();
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  isMobileFiringRef.current = false;
                }}
                className="w-16 h-16 rounded-3xl bg-cyan-950/80 border-2 border-cyan-400/80 active:bg-cyan-900 text-cyan-300 flex flex-col items-center justify-center backdrop-blur-md active:scale-95 shadow-[0_0_18px_rgba(0,240,255,0.4)]"
              >
                <CrosshairIcon className="w-6 h-6 text-cyan-400" />
                <span className="text-[9px] font-black font-mono tracking-wider text-cyan-200 mt-0.5">FIRE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. START MENU
          ------------------------------------------------------------- */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="w-full max-w-sm sm:max-w-md bg-slate-950/90 border border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-cyan-400 text-[10px] font-mono tracking-widest uppercase mb-3">
              <Sparkles className="w-3 h-3" /> Space Combat Survival
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-white font-sans uppercase">
              GALAXY
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                COMMANDER
              </span>
            </h1>

            <p className="text-xs sm:text-sm font-mono text-slate-400 mt-2 tracking-wide uppercase">
              DEFEND THE GALAXY
            </p>

            <div className="mt-6 space-y-2.5">
              <button
                id="gc-play-btn"
                type="button"
                onClick={startGame}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> PLAY MISSION
              </button>

              <button
                id="gc-howtoplay-btn"
                type="button"
                onClick={() => setShowHowToPlay(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white font-mono text-xs tracking-wider uppercase transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" /> HOW TO PLAY
              </button>

              <button
                id="gc-settings-btn"
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white font-mono text-xs tracking-wider uppercase transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" /> SETTINGS
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-xs font-mono tracking-wider transition-colors cursor-pointer"
                >
                  EXIT TO HUB
                </button>
              )}
            </div>

            {highScore > 0 && (
              <div className="mt-5 text-[11px] font-mono text-slate-400 flex items-center justify-center gap-1.5">
                <span>ALL-TIME RECORD:</span>
                <strong className="text-cyan-400">{highScore.toLocaleString()} PTS</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          7. HOW TO PLAY MODAL
          ------------------------------------------------------------- */}
      {showHowToPlay && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black tracking-wider text-cyan-400 font-sans uppercase text-center">
              HOW TO PLAY
            </h2>

            <div className="space-y-3 text-xs font-mono text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">MOVE</span>
                <span className="text-cyan-300 font-bold">WASD / ARROW KEYS</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">FIRE</span>
                <span className="text-cyan-300 font-bold">LEFT MOUSE BUTTON</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">ENERGY BLAST</span>
                <span className="text-purple-300 font-bold">SPACE / ABILITY BTN</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">RELOAD</span>
                <span className="text-cyan-300 font-bold">R KEY</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">MOBILE</span>
                <span className="text-cyan-300 font-bold">JOYSTICK + FIRE BTN</span>
              </div>
            </div>

            <p className="text-[11px] font-mono text-center text-slate-400 pt-1">
              SURVIVE THE WAVES AND DESTROY HOSTILE SHIPS.
            </p>

            <button
              type="button"
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
            >
              BACK
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          8. SETTINGS MODAL
          ------------------------------------------------------------- */}
      {showSettings && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black tracking-wider text-cyan-400 font-sans uppercase text-center">
              SYSTEM SETTINGS
            </h2>

            <div className="space-y-3 text-xs font-mono">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-300">SOUND EFFECTS</span>
                <button
                  type="button"
                  onClick={() => {
                    const muted = sound.toggleMute();
                    setSoundEnabled(!muted);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    soundEnabled ? 'bg-cyan-950 text-cyan-400 border border-cyan-400/40' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Ambient Synth Music Toggle */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-300">SPACE AMBIENCE</span>
                <button
                  type="button"
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    musicEnabled ? 'bg-purple-950 text-purple-400 border border-purple-400/40' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Sensitivity */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-300">THRUSTER SENSITIVITY</span>
                <div className="flex gap-1">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSensitivity(lvl)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sensitivity === lvl ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Graphics Quality */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-300">RENDER QUALITY</span>
                <div className="flex gap-1">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        quality === q ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
            >
              BACK
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          9. PAUSE MODAL
          ------------------------------------------------------------- */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-950/95 border border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                GALAXY COMMANDER
              </span>
              <h2 className="text-2xl font-black tracking-wider text-cyan-400 font-sans uppercase">
                MISSION PAUSED
              </h2>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setGameState('PLAYING')}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                RESUME
              </button>

              <button
                type="button"
                onClick={startGame}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                RESTART
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                SETTINGS
              </button>

              <button
                type="button"
                onClick={() => setGameState('START')}
                className="w-full py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200 font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                EXIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          10. GAME OVER / MISSION FAILED
          ------------------------------------------------------------- */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-sm sm:max-w-md bg-slate-950/95 border border-rose-500/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />

            <h2 className="text-3xl font-black tracking-wider text-rose-500 font-sans uppercase">
              MISSION FAILED
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1 uppercase">
              HULL INTEGRITY COMPROMISED
            </p>

            <div className="my-6 grid grid-cols-3 gap-2 bg-slate-900/60 border border-white/5 rounded-2xl p-3 text-center">
              <div>
                <div className="text-[9px] font-mono text-slate-400">WAVE REACHED</div>
                <div className="text-lg font-black font-mono text-cyan-400 mt-0.5">
                  0{wave}
                </div>
              </div>
              <div className="border-x border-white/10">
                <div className="text-[9px] font-mono text-slate-400">ENEMIES DESTROYED</div>
                <div className="text-lg font-black font-mono text-rose-400 mt-0.5">
                  {kills}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-slate-400">FINAL SCORE</div>
                <div className="text-lg font-black font-mono text-amber-400 mt-0.5">
                  {score.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                id="gc-retry-btn"
                type="button"
                onClick={startGame}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> RETRY MISSION
              </button>

              <button
                type="button"
                onClick={() => setGameState('START')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-mono text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
