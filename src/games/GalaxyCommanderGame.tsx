import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import {
  Play,
  RotateCcw,
  Rocket,
  Trophy,
  Settings,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  HelpCircle,
  Radio
} from 'lucide-react';
import {
  GameModeState,
  ShipConfig,
  ShipId,
  EnemyType,
  Star,
  NebulaCloud,
  Planet,
  Asteroid,
  SpaceDebris,
  Projectile,
  Enemy,
  Particle,
  CrosshairState
} from './galaxy-commander/types';
import { PLAYABLE_SHIPS, drawPlayerShip, getShipConfig } from './galaxy-commander/ships';
import { GalaxyHUD } from './galaxy-commander/GalaxyHUD';
import { ShipSelectModal } from './galaxy-commander/ShipSelectModal';
import { WaveClearModal } from './galaxy-commander/WaveClearModal';
import { MissionsBriefingModal } from './galaxy-commander/MissionsBriefingModal';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

export const GalaxyCommanderGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Ship Selection (Persisted in localStorage)
  const [selectedShipId, setSelectedShipId] = useState<ShipId>(() => {
    return (localStorage.getItem('gamenova_gc_selected_ship') as ShipId) || 'valkyrie';
  });
  const currentShip = getShipConfig(selectedShipId);

  // High-Level Game State
  const [gameState, setGameState] = useState<GameModeState>('START');
  const [showMissionsModal, setShowMissionsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(!sound.getIsMuted());
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [quality, setQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');

  // Gameplay HUD state
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [shotsHit, setShotsHit] = useState(0);
  const [wave, setWave] = useState(1);
  const [activeHostiles, setActiveHostiles] = useState(0);
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [shield, setShield] = useState(100);
  const [maxShield, setMaxShield] = useState(100);
  const [ammo, setAmmo] = useState(24);
  const [maxAmmo, setMaxAmmo] = useState(24);
  const [isReloading, setIsReloading] = useState(false);
  const [energyBlastCooldown, setEnergyBlastCooldown] = useState(0);
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

  // Ambient Space Synth Audio Context
  const musicOscRef = useRef<{
    ctx: AudioContext | null;
    osc1: OscillatorNode | null;
    osc2: OscillatorNode | null;
    gainNode: GainNode | null;
  }>({ ctx: null, osc1: null, osc2: null, gainNode: null });

  // Core Simulation State
  const simRef = useRef({
    time: 0,
    width: 1280,
    height: 720,
    screenShake: 0,
    ship: currentShip,
    player: {
      x: 640,
      y: 520,
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
      maxReloadTime: 85,
      shootCooldown: 0,
      energyBlastCooldown: 0,
      maxBlastCooldown: 300,
      isBlasting: false,
      blastRadius: 0,
      hitFlash: 0,
      muzzleFlashTimer: 0
    },
    crosshair: {
      x: 640,
      y: 320,
      isLockedOn: false,
      hitMarkerTimer: 0
    } as CrosshairState,
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false
    },
    wave: 1,
    waveSpawned: 0,
    waveTargetKills: 3,
    spawnCooldown: 40,
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    asteroids: [] as Asteroid[],
    spaceDebris: [] as SpaceDebris[],
    stars: [] as Star[],
    nebulas: [] as NebulaCloud[],
    planets: [] as Planet[],
    nextProjId: 1,
    nextEnemyId: 1
  });

  // Detect Touch Capability
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Monitor Fullscreen
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
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

  // Ambient Space Synth Music
  const startSpaceMusic = useCallback(() => {
    if (!musicEnabled || sound.getIsMuted()) return;
    try {
      if (!musicOscRef.current.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          musicOscRef.current.ctx = new AudioCtx();
        }
      }
      const ctx = musicOscRef.current.ctx;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      if (musicOscRef.current.osc1) {
        try {
          musicOscRef.current.osc1.stop();
          musicOscRef.current.osc2?.stop();
        } catch {}
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(55, ctx.currentTime); // Deep A1
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110, ctx.currentTime); // Low A2

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

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
    return () => stopSpaceMusic();
  }, [gameState, musicEnabled, startSpaceMusic, stopSpaceMusic]);

  // Procedural Deep-Space Environment Generator (4-layer Parallax Stars, Nebulae, Planets, Asteroids, Debris)
  const initSpaceEnvironment = useCallback((w: number, h: number, q: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const starCount = q === 'HIGH' ? 160 : q === 'MEDIUM' ? 100 : 60;
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      const z = Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? 2 : Math.random() < 0.95 ? 3 : 4;
      const size = z === 4 ? 2.6 : z === 3 ? 1.9 : z === 2 ? 1.3 : 0.8;
      const color =
        z === 4 ? '#ffffff' : z === 3 ? '#bae6fd' : z === 2 ? '#38bdf8' : '#7dd3fc';
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z,
        size: size + Math.random() * 0.4,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.02 + Math.random() * 0.05,
        twinklePhase: Math.random() * Math.PI * 2,
        color
      });
    }

    // Rich Volumetric Nebulae (Cyan, Violet, Magenta)
    const nebulas: NebulaCloud[] = [
      { x: w * 0.2, y: h * 0.25, radius: 280, color: 'rgba(56, 189, 248, 0.08)', speed: 0.12 },
      { x: w * 0.78, y: h * 0.38, radius: 320, color: 'rgba(168, 85, 247, 0.09)', speed: 0.10 },
      { x: w * 0.45, y: h * 0.82, radius: 300, color: 'rgba(236, 72, 153, 0.07)', speed: 0.15 },
      { x: w * 0.85, y: h * 0.9, radius: 250, color: 'rgba(99, 102, 241, 0.07)', speed: 0.14 }
    ];

    // Distant Planets (Gas Giant with Ring + Volcanic/Ice Moon)
    const planets: Planet[] = [
      {
        x: w * 0.82,
        y: h * 0.22,
        radius: 54,
        baseColor: '#0284c7',
        glowColor: '#38bdf8',
        hasRing: true,
        ringColor: 'rgba(56, 189, 248, 0.45)',
        hasBands: true,
        speed: 0.04
      },
      {
        x: w * 0.14,
        y: h * 0.72,
        radius: 32,
        baseColor: '#6d28d9',
        glowColor: '#a855f7',
        hasRing: false,
        speed: 0.025
      }
    ];

    // Drifting Asteroids with polygon craters
    const asteroids: Asteroid[] = [];
    const numAst = q === 'HIGH' ? 7 : 4;
    for (let i = 0; i < numAst; i++) {
      const radius = 22 + Math.random() * 26;
      const numPts = 8 + Math.floor(Math.random() * 4);
      const vertices = [];
      for (let p = 0; p < numPts; p++) {
        const angle = (p / numPts) * Math.PI * 2;
        const rad = radius * (0.75 + Math.random() * 0.45);
        vertices.push({ x: Math.cos(angle) * rad, y: Math.sin(angle) * rad });
      }

      // Procedural surface craters
      const craters = [];
      const numCraters = 2 + Math.floor(Math.random() * 3);
      for (let c = 0; c < numCraters; c++) {
        craters.push({
          x: (Math.random() - 0.5) * radius * 0.8,
          y: (Math.random() - 0.5) * radius * 0.8,
          r: 3 + Math.random() * 6
        });
      }

      asteroids.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: 0.2 + Math.random() * 0.4,
        radius,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        hp: 45,
        maxHp: 45,
        color: '#1e293b',
        vertices,
        craters
      });
    }

    // Space Debris (Hull fragments, solar panel fragments drifting)
    const spaceDebris: SpaceDebris[] = [];
    for (let i = 0; i < 12; i++) {
      spaceDebris.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.4 + Math.random() * 0.5,
        size: 2 + Math.random() * 3.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        color: Math.random() < 0.6 ? '#64748b' : '#38bdf8',
        alpha: 0.4 + Math.random() * 0.4
      });
    }

    return { stars, nebulas, planets, asteroids, spaceDebris };
  }, []);

  // Primary Weapon Firing
  const fireWeapon = useCallback(() => {
    const s = simRef.current;
    const p = s.player;
    const ship = s.ship;

    if (p.isReloading || p.shootCooldown > 0 || p.ammo <= 0) {
      if (p.ammo <= 0 && !p.isReloading) triggerReload();
      return;
    }

    p.ammo--;
    setAmmo(p.ammo);
    p.shootCooldown = ship.fireRateCooldown;
    p.muzzleFlashTimer = 4;
    s.shotsFired++;
    setShotsFired(s.shotsFired);

    if (soundEnabled) sound.playLaser(1100);
    s.screenShake = 2.2;

    // Aim angle towards crosshair
    const dx = s.crosshair.x - p.x;
    const dy = s.crosshair.y - p.y;
    const aimAngle = Math.atan2(dy, dx);
    const perpAngle = aimAngle + Math.PI / 2;

    const projSpeed = ship.bulletSpeed;
    const pVx = Math.cos(aimAngle) * projSpeed;
    const pVy = Math.sin(aimAngle) * projSpeed;

    // Fire from each cannon mount defined on the active spacecraft
    ship.cannons.forEach(cPos => {
      const boltX = p.x + Math.cos(perpAngle) * cPos.x + Math.cos(aimAngle) * (18 + cPos.y);
      const boltY = p.y + Math.sin(perpAngle) * cPos.x + Math.sin(aimAngle) * (18 + cPos.y);

      s.projectiles.push({
        id: s.nextProjId++,
        x: boltX,
        y: boltY,
        vx: pVx,
        vy: pVy,
        radius: ship.bulletRadius,
        damage: ship.bulletDamage,
        color: ship.bulletColor,
        glowColor: ship.bulletGlow,
        isPlayer: true,
        life: 60,
        maxLife: 60,
        length: 18
      });

      // Muzzle sparks
      for (let m = 0; m < 3; m++) {
        const spAngle = aimAngle + (Math.random() - 0.5) * 0.6;
        const spd = 2 + Math.random() * 4;
        s.particles.push({
          x: boltX,
          y: boltY,
          vx: Math.cos(spAngle) * spd,
          vy: Math.sin(spAngle) * spd,
          color: ship.bulletColor,
          size: 2,
          alpha: 1,
          life: 9,
          maxLife: 9,
          type: 'spark'
        });
      }
    });

    if (p.ammo <= 0) triggerReload();
  }, [soundEnabled]);

  // Magazine Reload Trigger
  const triggerReload = useCallback(() => {
    const s = simRef.current;
    const p = s.player;
    if (p.isReloading || p.ammo >= p.maxAmmo) return;

    p.isReloading = true;
    p.reloadTimer = p.maxReloadTime;
    setIsReloading(true);
    if (soundEnabled) sound.playClick();
  }, [soundEnabled]);

  // Special Ability: EMP ENERGY BLAST (SPACE Bar)
  const fireEnergyBlast = useCallback(() => {
    const s = simRef.current;
    const p = s.player;
    if (p.energyBlastCooldown > 0) return;

    if (soundEnabled) sound.playPowerUp();
    p.energyBlastCooldown = p.maxBlastCooldown;
    setEnergyBlastCooldown(p.maxBlastCooldown);
    p.isBlasting = true;
    p.blastRadius = 15;
    s.screenShake = 8;

    // Expanding shockwave projectile
    s.projectiles.push({
      id: s.nextProjId++,
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      radius: 24,
      damage: 85,
      color: '#c084fc',
      glowColor: '#a855f7',
      isPlayer: true,
      life: 45,
      maxLife: 45,
      isEnergyBlast: true
    });

    // Radial shockwave particles
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const spd = 6 + Math.random() * 6;
      s.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: Math.random() < 0.5 ? '#c084fc' : '#38bdf8',
        size: 4,
        alpha: 1,
        life: 28,
        maxLife: 28,
        type: 'shockwave'
      });
    }

    // Damage, push back, and disrupt hostile projectiles
    s.projectiles = s.projectiles.filter(pr => pr.isPlayer);

    s.enemies.forEach(e => {
      if (!e.alive) return;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 380) {
        e.hp -= 80;
        e.hitFlash = 14;
        const pushAngle = Math.atan2(dy, dx);
        e.vx += Math.cos(pushAngle) * 9;
        e.vy += Math.sin(pushAngle) * 9;
      }
    });
  }, [soundEnabled]);

  // Start New Mission Run
  const startMission = useCallback(
    (initialWave = 1, currentScore = 0, currentKills = 0) => {
      sound.playClick();
      const canvas = canvasRef.current;
      const w = canvas ? canvas.width : 1280;
      const h = canvas ? canvas.height : 720;
      const env = initSpaceEnvironment(w, h, quality);
      const ship = getShipConfig(selectedShipId);

      // Target kills scale gradually
      const targetKills = initialWave === 1 ? 3 : initialWave === 2 ? 5 : 4 + initialWave * 2;

      simRef.current = {
        time: 0,
        width: w,
        height: h,
        screenShake: 0,
        ship,
        player: {
          x: w / 2,
          y: h * 0.78,
          vx: 0,
          vy: 0,
          angle: -Math.PI / 2,
          bankAngle: 0,
          hp: ship.baseHp,
          maxHp: ship.baseHp,
          shield: ship.baseShield,
          maxShield: ship.baseShield,
          shieldRechargeTimer: 0,
          ammo: ship.ammoCapacity,
          maxAmmo: ship.ammoCapacity,
          isReloading: false,
          reloadTimer: 0,
          maxReloadTime: 85,
          shootCooldown: 0,
          energyBlastCooldown: 0,
          maxBlastCooldown: 300,
          isBlasting: false,
          blastRadius: 0,
          hitFlash: 0,
          muzzleFlashTimer: 0
        },
        crosshair: {
          x: w / 2,
          y: h * 0.35,
          isLockedOn: false,
          hitMarkerTimer: 0
        },
        keys: {
          up: false,
          down: false,
          left: false,
          right: false,
          fire: false
        },
        wave: initialWave,
        waveSpawned: 0,
        waveTargetKills: targetKills,
        spawnCooldown: 40,
        score: currentScore,
        kills: currentKills,
        shotsFired: 0,
        shotsHit: 0,
        enemies: [],
        projectiles: [],
        particles: [],
        asteroids: env.asteroids,
        spaceDebris: env.spaceDebris,
        stars: env.stars,
        nebulas: env.nebulas,
        planets: env.planets,
        nextProjId: 1,
        nextEnemyId: 1
      };

      setScore(currentScore);
      setKills(currentKills);
      setWave(initialWave);
      setActiveHostiles(targetKills);
      setHealth(ship.baseHp);
      setMaxHealth(ship.baseHp);
      setShield(ship.baseShield);
      setMaxShield(ship.baseShield);
      setAmmo(ship.ammoCapacity);
      setMaxAmmo(ship.ammoCapacity);
      setIsReloading(false);
      setEnergyBlastCooldown(0);

      setWaveBanner(`WAVE ${initialWave.toString().padStart(2, '0')} // HOSTILES INCOMING`);
      setTimeout(() => setWaveBanner(null), 3200);
      setGameState('PLAYING');
    },
    [initSpaceEnvironment, quality, selectedShipId]
  );

  // Handle Mission Failure / Game Over
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

  // Handle Ship Select Confirmation
  const handleSelectShip = useCallback((ship: ShipConfig) => {
    setSelectedShipId(ship.id);
    localStorage.setItem('gamenova_gc_selected_ship', ship.id);
    simRef.current.ship = ship;
    setGameState('START');
  }, []);

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

  // Mouse Input Listeners
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    simRef.current.crosshair.x = e.clientX - rect.left;
    simRef.current.crosshair.y = e.clientY - rect.top;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 0) {
        simRef.current.keys.fire = true;
        fireWeapon();
      }
    },
    [fireWeapon]
  );

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      simRef.current.keys.fire = false;
    }
  }, []);

  // Mobile Virtual Joystick Touch Handlers
  const handleJoystickTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    joystickOriginRef.current = { x: touch.clientX, y: touch.clientY };
    setJoystickPos({ x: 0, y: 0, active: true });
  }, []);

  const handleJoystickTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickOriginRef.current.x;
        const dy = touch.clientY - joystickOriginRef.current.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 38;
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);
        const jx = Math.cos(angle) * clampedDist;
        const jy = Math.sin(angle) * clampedDist;

        setJoystickPos({ x: jx, y: jy, active: true });

        const s = simRef.current;
        const deadZone = 10;
        s.keys.left = jx < -deadZone;
        s.keys.right = jx > deadZone;
        s.keys.up = jy < -deadZone;
        s.keys.down = jy > deadZone;
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

  // Main Simulation & Rendering Loop (Runs for both START cinematic menu and PLAYING)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.floor(rect.width * dpr) ||
        canvas.height !== Math.floor(rect.height * dpr)
      ) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        simRef.current.width = rect.width;
        simRef.current.height = rect.height;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial background environment if empty
    if (simRef.current.stars.length === 0) {
      const rect = canvas.getBoundingClientRect();
      const env = initSpaceEnvironment(rect.width || 1280, rect.height || 720, quality);
      simRef.current.stars = env.stars;
      simRef.current.nebulas = env.nebulas;
      simRef.current.planets = env.planets;
      simRef.current.asteroids = env.asteroids;
      simRef.current.spaceDebris = env.spaceDebris;
    }

    const gameLoop = () => {
      const s = simRef.current;
      const p = s.player;
      const ship = s.ship;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewW = s.width || 1280;
      const viewH = s.height || 720;

      s.time += 0.016;

      // -------------------------------------------------------------
      // 1. UPDATE PHYSICS & MOVEMENT (ONLY IN PLAYING)
      // -------------------------------------------------------------
      if (gameState === 'PLAYING') {
        const speedMult =
          sensitivity === 'HIGH' ? ship.speed * 1.15 : sensitivity === 'LOW' ? ship.speed * 0.85 : ship.speed;

        let moveX = 0;
        let moveY = 0;
        if (s.keys.left) moveX -= 1;
        if (s.keys.right) moveX += 1;
        if (s.keys.up) moveY -= 1;
        if (s.keys.down) moveY += 1;

        if (moveX !== 0 && moveY !== 0) {
          moveX *= 0.7071;
          moveY *= 0.7071;
        }

        // Inertia interpolation
        p.vx += (moveX * speedMult - p.vx) * ship.turnSpeed;
        p.vy += (moveY * speedMult - p.vy) * ship.turnSpeed;

        p.x += p.vx;
        p.y += p.vy;

        // Banking rotation based on horizontal velocity
        const targetBank = (p.vx / speedMult) * 0.32;
        p.bankAngle += (targetBank - p.bankAngle) * 0.16;

        // Arena Boundaries
        const margin = 36;
        p.x = Math.max(margin, Math.min(viewW - margin, p.x));
        p.y = Math.max(margin, Math.min(viewH - margin, p.y));

        // Engine Thruster Particle Trails
        if (Math.random() < 0.85) {
          const trailColor = Math.random() < 0.6 ? ship.glowColor : '#ffffff';
          s.particles.push({
            x: p.x - Math.sin(p.bankAngle) * 8 + (Math.random() - 0.5) * 8,
            y: p.y + 24 + Math.random() * 4,
            vx: (Math.random() - 0.5) * 1.5,
            vy: 3.5 + Math.random() * 4,
            color: trailColor,
            size: 2.5 + Math.random() * 2,
            alpha: 0.9,
            life: 16,
            maxLife: 16,
            type: 'plasma'
          });
        }

        // Rapid Fire while holding LMB or Mobile Fire Button
        if ((s.keys.fire || isMobileFiringRef.current) && p.shootCooldown <= 0) {
          fireWeapon();
        }

        if (p.shootCooldown > 0) p.shootCooldown--;
        if (p.muzzleFlashTimer > 0) p.muzzleFlashTimer--;

        // Reload Timer
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

        // Passive Shield Regeneration
        p.shieldRechargeTimer++;
        if (p.shieldRechargeTimer > 120 && p.shield < p.maxShield) {
          p.shield = Math.min(p.maxShield, p.shield + 0.35);
          setShield(Math.floor(p.shield));
        }

        if (p.hitFlash > 0) p.hitFlash--;
        if (s.crosshair.hitMarkerTimer > 0) s.crosshair.hitMarkerTimer--;

        // Target Lock On Hover
        let lockedOnAny = false;
        for (const e of s.enemies) {
          if (!e.alive) continue;
          const distToCross = Math.hypot(e.x - s.crosshair.x, e.y - s.crosshair.y);
          if (distToCross < e.radius + 20) {
            lockedOnAny = true;
            break;
          }
        }
        s.crosshair.isLockedOn = lockedOnAny;

        // -------------------------------------------------------------
        // 2. WAVE PROGRESSION & PROGRESSIVE ENEMY SPAWNER
        // -------------------------------------------------------------
        const livingEnemies = s.enemies.filter(e => e.alive).length;
        const totalRemaining = s.waveTargetKills - s.kills;
        setActiveHostiles(Math.max(0, totalRemaining));

        // Wave Cleared Check -> Show WaveClearModal
        if (s.waveSpawned >= s.waveTargetKills && livingEnemies === 0) {
          const waveReward = s.wave * 500;
          s.score += waveReward;
          setScore(s.score);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
          setGameState('WAVE_CLEAR');
        }

        // Smooth progressive spawning
        if (s.waveSpawned < s.waveTargetKills) {
          s.spawnCooldown--;
          const spawnDelay = Math.max(65, 130 - s.wave * 7);
          const maxConcurrent = Math.min(6, 2 + Math.floor(s.wave / 2));

          if (s.spawnCooldown <= 0 && livingEnemies < maxConcurrent) {
            s.spawnCooldown = spawnDelay;
            s.waveSpawned++;

            // Wave-based archetype progression
            let eType: EnemyType = 'scout';
            const r = Math.random();
            if (s.wave >= 4 && r < 0.25) {
              eType = 'elite';
            } else if (s.wave >= 3 && r < 0.4) {
              eType = 'heavy';
            } else if (s.wave >= 2 && r < 0.55) {
              eType = 'fighter';
            } else {
              eType = 'scout';
            }

            const maxHp =
              eType === 'heavy' ? 120 : eType === 'elite' ? 70 : eType === 'fighter' ? 44 : 22;
            const speed =
              eType === 'scout'
                ? 1.7 + Math.min(0.8, s.wave * 0.05)
                : eType === 'fighter'
                ? 1.35
                : eType === 'elite'
                ? 1.85
                : 0.95;

            const shootInterval =
              eType === 'scout' ? 150 : eType === 'heavy' ? 115 : eType === 'elite' ? 80 : 100;

            s.enemies.push({
              id: `en_${s.nextEnemyId++}`,
              type: eType,
              x: 80 + Math.random() * (viewW - 160),
              y: -50,
              vx: (Math.random() - 0.5) * 1.5,
              vy: speed,
              angle: Math.PI / 2,
              targetAngle: Math.PI / 2,
              hp: maxHp,
              maxHp,
              shield: eType === 'elite' ? 35 : 0,
              maxShield: eType === 'elite' ? 35 : 0,
              speed,
              shootCooldown: Math.floor(Math.random() * 60) + 40,
              shootInterval,
              behaviorTimer: 0,
              hitFlash: 0,
              alive: true,
              deathAnim: 1,
              radius: eType === 'heavy' ? 32 : eType === 'elite' ? 24 : eType === 'fighter' ? 22 : 16,
              color:
                eType === 'heavy'
                  ? '#a855f7'
                  : eType === 'elite'
                  ? '#f43f5e'
                  : eType === 'fighter'
                  ? '#f59e0b'
                  : '#00f0ff',
              glowColor:
                eType === 'heavy'
                  ? '#c084fc'
                  : eType === 'elite'
                  ? '#fb7185'
                  : eType === 'fighter'
                  ? '#fbbf24'
                  : '#38bdf8'
            });
          }
        }

        // -------------------------------------------------------------
        // 3. UPDATE ENEMY AI & COMBAT PATTERNS
        // -------------------------------------------------------------
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const e = s.enemies[i];
          if (!e.alive) {
            e.deathAnim -= 0.06;
            if (e.deathAnim <= 0) s.enemies.splice(i, 1);
            continue;
          }

          if (e.hitFlash > 0) e.hitFlash--;
          e.behaviorTimer += 0.03;

          // Unique flight behavior per enemy type
          if (e.type === 'scout') {
            e.vy = e.speed;
            e.vx = Math.sin(e.behaviorTimer * 2.2 + e.y * 0.01) * 2.4;
            e.y += e.vy;
            e.x += e.vx;
            if (e.y > viewH + 40) e.y = -30;
          } else if (e.type === 'fighter') {
            if (e.y < viewH * 0.35) {
              e.y += e.speed;
            } else {
              e.x += Math.sin(e.behaviorTimer * 1.6) * 2.5;
              e.y += Math.cos(e.behaviorTimer * 0.8) * 0.8;
            }
          } else if (e.type === 'heavy') {
            if (e.y < viewH * 0.26) {
              e.y += e.speed * 0.7;
            } else {
              e.x += Math.sin(e.behaviorTimer * 0.7) * 1.3;
            }
          } else if (e.type === 'elite') {
            const dxToPlayer = p.x - e.x;
            e.vx += (Math.sign(dxToPlayer) * 1.6 - e.vx) * 0.1;
            e.x += e.vx;
            e.y += Math.sin(e.behaviorTimer * 2.2) * 1.5;
            if (e.y < 120) e.y += 1.2;
          }

          e.x = Math.max(e.radius + 15, Math.min(viewW - e.radius - 15, e.x));

          // Enemy Shooting
          e.shootCooldown--;
          if (e.shootCooldown <= 0 && e.y > 40 && e.y < viewH * 0.65) {
            e.shootCooldown = e.shootInterval;
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const angleToPlayer = Math.atan2(dy, dx);
            const enemyBulletSpeed = e.type === 'elite' ? 5.8 : 4.4;

            if (e.type === 'heavy') {
              // Triple spread salvo
              [-0.24, 0, 0.24].forEach(angOff => {
                const finalAngle = angleToPlayer + angOff;
                s.projectiles.push({
                  id: s.nextProjId++,
                  x: e.x,
                  y: e.y + e.radius,
                  vx: Math.cos(finalAngle) * enemyBulletSpeed,
                  vy: Math.sin(finalAngle) * enemyBulletSpeed,
                  radius: 4.5,
                  damage: 16,
                  color: '#ef4444',
                  glowColor: '#f97316',
                  isPlayer: false,
                  life: 140,
                  maxLife: 140
                });
              });
            } else if (e.type === 'fighter') {
              // Twin plasma bolts
              [-10, 10].forEach(xOff => {
                s.projectiles.push({
                  id: s.nextProjId++,
                  x: e.x + xOff,
                  y: e.y + e.radius,
                  vx: Math.cos(angleToPlayer) * enemyBulletSpeed,
                  vy: Math.sin(angleToPlayer) * enemyBulletSpeed,
                  radius: 3.5,
                  damage: 13,
                  color: '#f59e0b',
                  glowColor: '#fbbf24',
                  isPlayer: false,
                  life: 120,
                  maxLife: 120
                });
              });
            } else {
              // Directed fast laser
              s.projectiles.push({
                id: s.nextProjId++,
                x: e.x,
                y: e.y + e.radius,
                vx: Math.cos(angleToPlayer) * enemyBulletSpeed,
                vy: Math.sin(angleToPlayer) * enemyBulletSpeed,
                radius: 3,
                damage: 10,
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
        // 4. UPDATE PROJECTILES & COLLISION DETECTION
        // -------------------------------------------------------------
        for (let i = s.projectiles.length - 1; i >= 0; i--) {
          const pr = s.projectiles[i];
          pr.x += pr.vx;
          pr.y += pr.vy;
          pr.life--;

          if (
            pr.life <= 0 ||
            pr.x < -40 ||
            pr.x > viewW + 40 ||
            pr.y < -40 ||
            pr.y > viewH + 40
          ) {
            s.projectiles.splice(i, 1);
            continue;
          }

          // PLAYER PROJECTILE HITTING ENEMY
          if (pr.isPlayer) {
            // Check collision with Asteroids first
            for (let aIdx = 0; aIdx < s.asteroids.length; aIdx++) {
              const ast = s.asteroids[aIdx];
              const distToAst = Math.hypot(ast.x - pr.x, ast.y - pr.y);
              if (distToAst < ast.radius + pr.radius) {
                ast.hp -= pr.damage;
                if (!pr.isEnergyBlast) s.projectiles.splice(i, 1);

                // Asteroid hit sparks
                for (let sp = 0; sp < 4; sp++) {
                  const spAngle = Math.random() * Math.PI * 2;
                  s.particles.push({
                    x: pr.x,
                    y: pr.y,
                    vx: Math.cos(spAngle) * 3,
                    vy: Math.sin(spAngle) * 3,
                    color: '#94a3b8',
                    size: 2,
                    alpha: 1,
                    life: 10,
                    maxLife: 10,
                    type: 'spark'
                  });
                }

                if (ast.hp <= 0) {
                  // Asteroid shattered!
                  if (soundEnabled) sound.playExplosion();
                  for (let f = 0; f < 10; f++) {
                    const ang = Math.random() * Math.PI * 2;
                    s.particles.push({
                      x: ast.x,
                      y: ast.y,
                      vx: Math.cos(ang) * 3.5,
                      vy: Math.sin(ang) * 3.5,
                      color: '#475569',
                      size: 3,
                      alpha: 1,
                      life: 18,
                      maxLife: 18,
                      type: 'debris'
                    });
                  }
                  // Respawn asteroid above screen
                  ast.hp = ast.maxHp;
                  ast.y = -ast.radius - 20;
                  ast.x = Math.random() * viewW;
                }
                break;
              }
            }

            // Check collision with Enemies
            for (let eIdx = 0; eIdx < s.enemies.length; eIdx++) {
              const e = s.enemies[eIdx];
              if (!e.alive) continue;

              const dist = Math.hypot(e.x - pr.x, e.y - pr.y);
              if (dist < e.radius + pr.radius + 4) {
                // Register hit
                s.shotsHit++;
                setShotsHit(s.shotsHit);
                s.crosshair.hitMarkerTimer = 8; // Display hit marker feedback!

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

                // Kinetic hit sparks
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

                  const killPoints =
                    e.type === 'heavy'
                      ? 360
                      : e.type === 'elite'
                      ? 300
                      : e.type === 'fighter'
                      ? 180
                      : 100;
                  s.score += killPoints;
                  setScore(s.score);
                  s.screenShake = e.type === 'heavy' ? 6.5 : e.type === 'elite' ? 5 : 3.5;

                  // Multi-Phase Explosion Particles
                  for (let d = 0; d < (e.type === 'heavy' ? 26 : 16); d++) {
                    const dAngle = Math.random() * Math.PI * 2;
                    const dSpd = 1.5 + Math.random() * 6;
                    s.particles.push({
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(dAngle) * dSpd,
                      vy: Math.sin(dAngle) * dSpd,
                      color: Math.random() < 0.6 ? e.color : '#ffffff',
                      size: 2.5 + Math.random() * 3.5,
                      alpha: 1,
                      life: 24,
                      maxLife: 24,
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
              p.shieldRechargeTimer = 0;
              s.screenShake = 5.5;

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

              // Impact ripples on player shield / hull
              for (let sh = 0; sh < 10; sh++) {
                const ang = Math.random() * Math.PI * 2;
                s.particles.push({
                  x: pr.x,
                  y: pr.y,
                  vx: Math.cos(ang) * 3,
                  vy: Math.sin(ang) * 3,
                  color: p.shield > 0 ? ship.glowColor : '#ef4444',
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
      }

      // -------------------------------------------------------------
      // 5. UPDATE BACKGROUND & PARTICLES (BOTH START & PLAYING)
      // -------------------------------------------------------------
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        pt.alpha = pt.life / pt.maxLife;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // Asteroid Drifting
      s.asteroids.forEach(ast => {
        ast.x += ast.vx;
        ast.y += ast.vy;
        ast.rotation += ast.rotSpeed;
        if (ast.y > viewH + ast.radius) {
          ast.y = -ast.radius;
          ast.x = Math.random() * viewW;
        }
      });

      // Space Debris Drifting
      s.spaceDebris.forEach(deb => {
        deb.x += deb.vx;
        deb.y += deb.vy;
        deb.rotation += deb.rotSpeed;
        if (deb.y > viewH + 20) {
          deb.y = -10;
          deb.x = Math.random() * viewW;
        }
      });

      // 4-Layer Starfield Scroll with Depth Parallax
      s.stars.forEach(st => {
        st.y += st.z * 0.45;
        st.twinklePhase += st.twinkleSpeed;
        st.alpha = 0.4 + Math.sin(st.twinklePhase) * 0.35;
        if (st.y > viewH) {
          st.y = -5;
          st.x = Math.random() * viewW;
        }
      });

      // -------------------------------------------------------------
      // 6. HIGH-END PROCEDURAL CANVAS RENDERING PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      ctx.scale(dpr, dpr);

      // Camera Shake
      if (s.screenShake > 0) {
        ctx.translate(
          (Math.random() - 0.5) * s.screenShake * 2,
          (Math.random() - 0.5) * s.screenShake * 2
        );
        s.screenShake = Math.max(0, s.screenShake - 0.35);
      }

      // 6A. Deep Navy Space Background
      const spaceGrad = ctx.createLinearGradient(0, 0, 0, viewH);
      spaceGrad.addColorStop(0, '#030712');
      spaceGrad.addColorStop(0.5, '#070d1e');
      spaceGrad.addColorStop(1, '#050914');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, viewW, viewH);

      // 6B. Volumetric Glowing Nebulae
      s.nebulas.forEach(n => {
        const nGrad = ctx.createRadialGradient(n.x, n.y, 10, n.x, n.y, n.radius);
        nGrad.addColorStop(0, n.color);
        nGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nGrad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6C. Distant Planets
      s.planets.forEach(pl => {
        ctx.save();
        ctx.fillStyle = pl.baseColor;
        ctx.shadowColor = pl.glowColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Planetary Atmosphere Bands
        if (pl.hasBands) {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(pl.x, pl.y, pl.radius * 0.95, pl.radius * 0.25, 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Dark Shadow Terminator (Crescent 3D sphere illusion)
        const darkGrad = ctx.createRadialGradient(
          pl.x + pl.radius * 0.4,
          pl.y - pl.radius * 0.4,
          pl.radius * 0.3,
          pl.x,
          pl.y,
          pl.radius
        );
        darkGrad.addColorStop(0, 'rgba(0,0,0,0)');
        darkGrad.addColorStop(0.8, 'rgba(3,7,18,0.7)');
        darkGrad.addColorStop(1, 'rgba(3,7,18,0.95)');
        ctx.fillStyle = darkGrad;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.radius, 0, Math.PI * 2);
        ctx.fill();

        // Planetary Ring System
        if (pl.hasRing && pl.ringColor) {
          ctx.strokeStyle = pl.ringColor;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(pl.x, pl.y, pl.radius * 1.9, pl.radius * 0.45, -0.28, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });

      // 6D. Multi-Layer Parallax Starfield
      s.stars.forEach(st => {
        ctx.fillStyle = st.color;
        ctx.globalAlpha = st.alpha;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 6E. Space Debris
      s.spaceDebris.forEach(deb => {
        ctx.save();
        ctx.translate(deb.x, deb.y);
        ctx.rotate(deb.rotation);
        ctx.fillStyle = deb.color;
        ctx.globalAlpha = deb.alpha;
        ctx.fillRect(-deb.size / 2, -deb.size / 2, deb.size, deb.size * 1.5);
        ctx.restore();
      });
      ctx.globalAlpha = 1.0;

      // 6F. Shaded Drifting Asteroids with Craters
      s.asteroids.forEach(ast => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);

        // Body
        ctx.fillStyle = ast.color;
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

        // Craters
        ctx.fillStyle = '#0f172a';
        ast.craters.forEach(c => {
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      });

      // -------------------------------------------------------------
      // 6G. DRAW ENEMIES (ONLY IN PLAYING)
      // -------------------------------------------------------------
      if (gameState === 'PLAYING') {
        s.enemies.forEach(e => {
          ctx.save();
          ctx.translate(e.x, e.y);

          if (!e.alive) {
            ctx.globalAlpha = Math.max(0, e.deathAnim);
          }

          if (e.hitFlash > 0) {
            ctx.filter = 'brightness(3) drop-shadow(0 0 12px #ffffff)';
          }

          if (e.type === 'scout') {
            // SCOUT: Fast needle/arrow interceptor
            ctx.fillStyle = '#061325';
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = e.glowColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, 18);
            ctx.lineTo(-15, -14);
            ctx.lineTo(0, -6);
            ctx.lineTo(15, -14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Scout sensor core
            ctx.fillStyle = e.glowColor;
            ctx.beginPath();
            ctx.arc(0, 4, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (e.type === 'fighter') {
            // FIGHTER: Winged predator
            ctx.fillStyle = '#1c1917';
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2;
            ctx.shadowColor = e.glowColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, 22);
            ctx.lineTo(-22, -10);
            ctx.lineTo(-10, -20);
            ctx.lineTo(0, -12);
            ctx.lineTo(10, -20);
            ctx.lineTo(22, -10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Reactor core
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(0, 2, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (e.type === 'heavy') {
            // HEAVY: Massive armored dreadnought cruiser
            ctx.fillStyle = '#110b20';
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = e.glowColor;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.roundRect(-30, -26, 60, 52, 6);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Armor plating
            ctx.fillStyle = '#312e81';
            ctx.fillRect(-24, 10, 48, 8);

            // Fusion core
            ctx.fillStyle = '#c084fc';
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, -2, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (e.type === 'elite') {
            // ELITE: Geometric diamond command striker
            ctx.fillStyle = '#210515';
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = e.glowColor;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(0, 26);
            ctx.lineTo(-24, 0);
            ctx.lineTo(0, -26);
            ctx.lineTo(24, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Regenerative Shield Bubble
            if (e.shield && e.shield > 0) {
              ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
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
      }

      // -------------------------------------------------------------
      // 6H. DRAW PLAYER SPACESHIP
      // -------------------------------------------------------------
      if (gameState === 'PLAYING') {
        drawPlayerShip(
          ctx,
          ship,
          p.x,
          p.y,
          p.bankAngle,
          p.shield,
          p.maxShield,
          p.hitFlash,
          s.time,
          p.muzzleFlashTimer > 0,
          1
        );
      } else if (gameState === 'START') {
        // In Main Menu: Show selected ship cruising smoothly forward in the center
        const hoverY = Math.sin(s.time * 2) * 8;
        const cruiseBank = Math.sin(s.time * 0.8) * 0.12;
        drawPlayerShip(
          ctx,
          ship,
          viewW * 0.65,
          viewH * 0.52 + hoverY,
          cruiseBank,
          ship.baseShield,
          ship.baseShield,
          0,
          s.time,
          false,
          1.8
        );
      }

      // -------------------------------------------------------------
      // 6I. DRAW PROJECTILES & PARTICLES
      // -------------------------------------------------------------
      if (gameState === 'PLAYING') {
        s.projectiles.forEach(pr => {
          ctx.save();
          if (pr.isEnergyBlast) {
            const blastR = 25 + (1 - pr.life / pr.maxLife) * 360;
            ctx.strokeStyle = pr.color;
            ctx.shadowColor = pr.glowColor;
            ctx.shadowBlur = 24;
            ctx.lineWidth = 6 * (pr.life / pr.maxLife);
            ctx.beginPath();
            ctx.arc(pr.x, pr.y, blastR, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // High velocity laser bolt with glowing trail
            ctx.fillStyle = pr.color;
            ctx.shadowColor = pr.glowColor;
            ctx.shadowBlur = 14;

            // Elongated beam
            ctx.beginPath();
            ctx.ellipse(pr.x, pr.y, pr.radius, pr.radius * 2.4, Math.atan2(pr.vy, pr.vx) - Math.PI / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });
      }

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
      // 6J. FUTURISTIC RETICLE / CROSSHAIR WITH HIT FEEDBACK
      // -------------------------------------------------------------
      if (gameState === 'PLAYING') {
        const c = s.crosshair;
        ctx.save();
        ctx.translate(c.x, c.y);

        const crossColor = c.isLockedOn ? '#f43f5e' : '#00f0ff';
        ctx.strokeStyle = crossColor;
        ctx.shadowColor = crossColor;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;

        // Outer brackets
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

        // Animated Hit Marker Feedback (4 diagonal tick marks on impact!)
        if (c.hitMarkerTimer > 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2;
          const hm = 7;
          ctx.beginPath();
          ctx.moveTo(-hm, -hm);
          ctx.lineTo(-hm - 4, -hm - 4);
          ctx.moveTo(hm, -hm);
          ctx.lineTo(hm + 4, -hm - 4);
          ctx.moveTo(-hm, hm);
          ctx.lineTo(-hm - 4, hm + 4);
          ctx.moveTo(hm, hm);
          ctx.lineTo(hm + 4, hm + 4);
          ctx.stroke();
        }

        // Lock indicator label
        if (c.isLockedOn) {
          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = '#f43f5e';
          ctx.textAlign = 'center';
          ctx.fillText('TARGET LOCK', 0, retSize + 12);
        }

        ctx.restore();

        // Critical Low Health Crimson Vignette
        if (p.hp <= 25) {
          const pulse = (Math.sin(s.time * 8) + 1) * 0.5;
          ctx.fillStyle = `rgba(239, 68, 68, ${0.1 + pulse * 0.15})`;
          ctx.fillRect(0, 0, viewW, viewH);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameState, sensitivity, quality, fireWeapon, handleGameOver, soundEnabled]);

  const accuracy = shotsFired > 0 ? (shotsHit / shotsFired) * 100 : 85;

  return (
    <div
      ref={containerRef}
      id="galaxy-commander-root"
      className="relative w-full h-full flex flex-col items-center justify-center bg-[#030712] text-white select-none overflow-hidden font-mono"
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. FULLSCREEN DEEP-SPACE CANVAS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <canvas
        ref={canvasRef}
        id="galaxy-commander-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
        className={`absolute inset-0 w-full h-full object-cover ${
          gameState === 'PLAYING' ? 'cursor-none' : 'cursor-default'
        }`}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. PROFESSIONAL SCI-FI IN-GAME HUD
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'PLAYING' && (
        <GalaxyHUD
          ship={currentShip}
          health={health}
          maxHealth={maxHealth}
          shield={shield}
          maxShield={maxShield}
          wave={wave}
          activeHostiles={activeHostiles}
          score={score}
          kills={kills}
          ammo={ammo}
          maxAmmo={maxAmmo}
          isReloading={isReloading}
          energyBlastCooldown={energyBlastCooldown}
          isFullscreen={isFullscreen}
          soundEnabled={soundEnabled}
          isTouchDevice={isTouchDevice}
          joystickPos={joystickPos}
          onToggleFullscreen={toggleFullscreen}
          onToggleSound={() => {
            const muted = sound.toggleMute();
            setSoundEnabled(!muted);
          }}
          onPause={() => setGameState('PAUSED')}
          onTriggerReload={triggerReload}
          onFireEnergyBlast={fireEnergyBlast}
          onMobileFireStart={() => {
            isMobileFiringRef.current = true;
            fireWeapon();
          }}
          onMobileFireEnd={() => {
            isMobileFiringRef.current = false;
          }}
          onJoystickTouchStart={handleJoystickTouchStart}
          onJoystickTouchMove={handleJoystickTouchMove}
          onJoystickTouchEnd={handleJoystickTouchEnd}
        />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. CINEMATIC WAVE INCOMING BANNER
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {waveBanner && gameState === 'PLAYING' && (
        <div className="absolute top-20 z-30 pointer-events-none px-6 py-2.5 rounded-2xl bg-[#030712]/95 border border-cyan-400/50 text-cyan-300 text-xs sm:text-sm font-black tracking-widest shadow-[0_0_30px_rgba(0,240,255,0.4)] animate-bounce backdrop-blur-md flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          {waveBanner}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          4. CINEMATIC MAIN MENU
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 sm:p-12 pointer-events-none">
          {/* Top Bar: Fleet Tag & Utilities */}
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-400 text-[10px] tracking-widest uppercase">
                ACTIVE SHIP: {currentShip.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const muted = sound.toggleMute();
                  setSoundEnabled(!muted);
                }}
                className="w-9 h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Left Side: Brand Title & Navigation Buttons */}
          <div className="max-w-md pointer-events-auto space-y-6 my-auto">
            <div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-wider text-white font-sans uppercase leading-none">
                GALAXY
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mt-1">
                  COMMANDER
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-cyan-300/90 tracking-widest uppercase mt-2 font-bold">
                DEFEND THE GALAXY
              </p>
            </div>

            {/* Menu Buttons: START MISSION, SHIP SELECT, MISSIONS, SETTINGS */}
            <div className="space-y-2.5 max-w-xs">
              <button
                id="gc-play-btn"
                type="button"
                onClick={() => startMission(1, 0, 0)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(0,240,255,0.4)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <Play className="w-4 h-4 fill-current" /> START MISSION
              </button>

              <button
                id="gc-shipselect-btn"
                type="button"
                onClick={() => setGameState('SHIP_SELECT')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-white text-xs font-bold tracking-wider uppercase transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Rocket className="w-4 h-4 text-cyan-400" /> SHIP SELECT
              </button>

              <button
                id="gc-missions-btn"
                type="button"
                onClick={() => setShowMissionsModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-white text-xs font-bold tracking-wider uppercase transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" /> MISSIONS
              </button>

              <button
                id="gc-settings-btn"
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-400/40 text-slate-200 hover:text-white text-xs font-bold tracking-wider uppercase transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-purple-400" /> SETTINGS
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-2 px-4 text-slate-400 hover:text-slate-200 text-[11px] tracking-wider transition-colors cursor-pointer"
                >
                  EXIT TO HUB
                </button>
              )}
            </div>
          </div>

          {/* Bottom Record Footer */}
          <div className="pointer-events-auto flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4">
            <div>
              ALL-TIME RECORD: <strong className="text-cyan-400">{highScore.toLocaleString()} PTS</strong>
            </div>
            <div className="text-[10px] text-slate-500">SECTOR 7 DEFENSE PROTOCOL</div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          5. SHIP SELECTION MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'SHIP_SELECT' && (
        <ShipSelectModal
          currentShipId={selectedShipId}
          onSelectShip={handleSelectShip}
          onBack={() => setGameState('START')}
        />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          6. WAVE CLEARED / MISSION COMPLETE MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'WAVE_CLEAR' && (
        <WaveClearModal
          wave={wave}
          score={score}
          kills={kills}
          accuracy={accuracy}
          rewardPoints={wave * 500}
          onNextWave={() => startMission(wave + 1, score, kills)}
          onReplay={() => startMission(wave, score, kills)}
          onMainMenu={() => setGameState('START')}
        />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          7. MISSIONS INTEL MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showMissionsModal && (
        <MissionsBriefingModal onBack={() => setShowMissionsModal(false)} />
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          8. SETTINGS MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#030712] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black tracking-wider text-cyan-400 font-sans uppercase text-center">
              SYSTEM CONFIGURATION
            </h2>

            <div className="space-y-3 text-xs">
              {/* Sound */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-300">SOUND EFFECTS</span>
                <button
                  type="button"
                  onClick={() => {
                    const muted = sound.toggleMute();
                    setSoundEnabled(!muted);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    soundEnabled ? 'bg-cyan-950 text-cyan-400 border border-cyan-400/40' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Space Ambience */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-300">SPACE SYNTH AMBIENCE</span>
                <button
                  type="button"
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    musicEnabled ? 'bg-purple-950 text-purple-300 border border-purple-400/40' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {musicEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Sensitivity */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-slate-300">MANEUVER SENSITIVITY</span>
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
                <span className="text-slate-300">RENDER FIDELITY</span>
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
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              CONFIRM SETTINGS
            </button>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          9. MINIMAL CENTERED PAUSE OVERLAY
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#030712]/95 border border-white/15 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                TACTICAL PAUSE
              </span>
              <h2 className="text-2xl font-black tracking-wider text-white font-sans uppercase">
                PAUSED
              </h2>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setGameState('PLAYING')}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_16px_rgba(0,240,255,0.3)]"
              >
                RESUME
              </button>

              <button
                type="button"
                onClick={() => startMission(wave, 0, 0)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                RESTART
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                SETTINGS
              </button>

              <button
                type="button"
                onClick={() => setGameState('START')}
                className="w-full py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                EXIT MISSION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          10. GAME OVER / MISSION FAILED SCREEN
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-sm sm:max-w-md bg-[#030712]/95 border border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(244,63,94,0.2)] relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />

            <h2 className="text-3xl font-black tracking-wider text-rose-500 font-sans uppercase">
              MISSION FAILED
            </h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
              HULL INTEGRITY COMPROMISED
            </p>

            {/* Stats Breakdown: WAVE REACHED, FINAL SCORE, HOSTILES DESTROYED, BEST SCORE */}
            <div className="my-6 grid grid-cols-2 gap-2 bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center text-xs">
              <div className="p-2">
                <div className="text-[9px] text-slate-400">WAVE REACHED</div>
                <div className="text-base font-black text-cyan-400 mt-0.5">
                  WAVE {wave.toString().padStart(2, '0')}
                </div>
              </div>

              <div className="p-2 border-l border-white/10">
                <div className="text-[9px] text-slate-400">HOSTILES DESTROYED</div>
                <div className="text-base font-black text-rose-400 mt-0.5">
                  {kills}
                </div>
              </div>

              <div className="p-2 border-t border-white/10">
                <div className="text-[9px] text-slate-400">FINAL SCORE</div>
                <div className="text-base font-black text-amber-400 mt-0.5">
                  {score.toLocaleString()}
                </div>
              </div>

              <div className="p-2 border-t border-l border-white/10">
                <div className="text-[9px] text-slate-400">BEST SCORE</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">
                  {highScore.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Buttons: RETRY, SHIP SELECT, MAIN MENU */}
            <div className="space-y-2">
              <button
                id="gc-retry-btn"
                type="button"
                onClick={() => startMission(1, 0, 0)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(0,240,255,0.4)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <RotateCcw className="w-4 h-4 stroke-[3]" /> RETRY MISSION
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setGameState('SHIP_SELECT')}
                  className="py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Rocket className="w-3.5 h-3.5 text-cyan-400" /> SHIP SELECT
                </button>

                <button
                  type="button"
                  onClick={() => setGameState('START')}
                  className="py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
