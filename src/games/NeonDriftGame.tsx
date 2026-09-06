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
  ArrowLeft,
  Flame,
  Sparkles,
  Shield,
  Compass,
  ChevronLeft,
  ChevronRight,
  Disc,
  Maximize2,
  Minimize2,
  HelpCircle,
  X,
  Settings,
  Crown
} from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
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
  type: 'smoke' | 'spark' | 'speedline' | 'nitro';
}

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

interface OpponentCar {
  id: number;
  x: number; // lane offset
  y: number; // distance down the track
  speed: number;
  color: string;
  accentColor: string;
  glowColor: string;
  width: number;
  height: number;
  model: 'supercar' | 'muscle' | 'cyber-truck' | 'hypercar';
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
  const [shield, setShield] = useState(100);
  const [speed, setSpeed] = useState(120);
  const [driftPoints, setDriftPoints] = useState(0);
  const [driftMultiplier, setDriftMultiplier] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [forceTouchControls, setForceTouchControls] = useState(false);
  const [finalStats, setFinalStats] = useState({
    distance: 0,
    maxSpeed: 0,
    driftScore: 0,
    isNewRecord: false
  });

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));
  }, []);

  // Listen to browser fullscreen changes
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
    sound.playClick();
    try {
      if (!document.fullscreenElement) {
        const target = containerRef.current || document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if ((target as any).webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
        } else if ((target as any).msRequestFullscreen) {
          await (target as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle not supported or blocked:', err);
    }
  };

  const stateRef = useRef({
    carX: 0,
    carSpeed: 5.5,
    topSpeed: 10.5,
    accelRate: 0.12,
    brakeRate: 0.22,
    steerSpeed: 6.2,
    driftAngle: 0,
    isDrifting: false,
    nitroActive: false,
    score: 0,
    nitro: 100,
    shield: 100,
    invulnTimer: 0,
    driftMultiplier: 1,
    driftAccumulator: 0,
    driftSoundTimer: 0,
    maxSpeed: 0,
    totalDriftScore: 0,

    // Smooth forward-facing camera
    cameraX: 0,
    cameraOffsetX: 0,
    cameraOffsetY: 0,
    isDraggingCam: false,
    lastDragPos: { x: 0, y: 0 },

    opponents: [] as OpponentCar[],
    particles: [] as Particle[],
    skidMarks: [] as SkidMark[],
    lastTirePos: null as { lX: number; lY: number; rX: number; rY: number } | null,
    roadOffset: 0,
    curve: 0,
    targetCurve: 0,
    screenShake: 0,
    wheelAngle: 0,
    keys: { left: false, right: false, up: false, down: false, space: false, nitro: false },

    // Performance frame throttling for React state updates
    frameCounter: 0
  });

  const initOpponents = (): OpponentCar[] => [
    {
      id: 1,
      x: -160,
      y: -650,
      speed: 4.2,
      color: '#f43f5e',
      accentColor: '#fb7185',
      glowColor: 'rgba(244, 63, 94, 0.7)',
      width: 44,
      height: 74,
      model: 'supercar'
    },
    {
      id: 2,
      x: 140,
      y: -1300,
      speed: 4.4,
      color: '#eab308',
      accentColor: '#fde047',
      glowColor: 'rgba(234, 179, 8, 0.7)',
      width: 46,
      height: 76,
      model: 'muscle'
    },
    {
      id: 3,
      x: -60,
      y: -1950,
      speed: 4.6,
      color: '#a855f7',
      accentColor: '#c084fc',
      glowColor: 'rgba(168, 85, 247, 0.7)',
      width: 44,
      height: 74,
      model: 'hypercar'
    },
    {
      id: 4,
      x: 200,
      y: -2600,
      speed: 4.0,
      color: '#06b6d4',
      accentColor: '#22d3ee',
      glowColor: 'rgba(6, 182, 212, 0.7)',
      width: 48,
      height: 80,
      model: 'cyber-truck'
    }
  ];

  const startGame = useCallback(() => {
    if (soundEnabled) sound.playClick();

    stateRef.current = {
      carX: 0,
      carSpeed: 5.5,
      topSpeed: 10.5,
      accelRate: 0.12,
      brakeRate: 0.22,
      steerSpeed: 6.2,
      driftAngle: 0,
      isDrifting: false,
      nitroActive: false,
      score: 0,
      nitro: 100,
      shield: 100,
      invulnTimer: 0,
      driftMultiplier: 1,
      driftAccumulator: 0,
      driftSoundTimer: 0,
      maxSpeed: 0,
      totalDriftScore: 0,

      cameraX: 0,
      cameraOffsetX: 0,
      cameraOffsetY: 0,
      isDraggingCam: false,
      lastDragPos: { x: 0, y: 0 },

      opponents: initOpponents(),
      particles: [],
      skidMarks: [],
      lastTirePos: null,
      roadOffset: 0,
      curve: 0,
      targetCurve: 0,
      screenShake: 0,
      wheelAngle: 0,
      keys: { left: false, right: false, up: false, down: false, space: false, nitro: false },
      frameCounter: 0
    };

    setScore(0);
    setNitro(100);
    setShield(100);
    setDriftPoints(0);
    setDriftMultiplier(1);
    setGameState('PLAYING');
  }, [soundEnabled]);

  const handleGameOver = useCallback((finalScore: number) => {
    if (soundEnabled) sound.playGameOver();
    const distance = Math.floor(finalScore * 1.2);
    const maxSpeed = Math.max(stateRef.current.maxSpeed, Math.floor(stateRef.current.carSpeed * 22));
    const driftScore = stateRef.current.totalDriftScore;
    const isNew = finalScore > highScore;
    setFinalStats({
      distance,
      maxSpeed,
      driftScore,
      isNewRecord: isNew
    });
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_neon-drift', finalScore.toString());
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver, soundEnabled]);

  // Responsive Dynamic Viewport Canvas Resizing
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const targetW = Math.max(320, Math.floor(rect.width));
      const targetH = Math.max(320, Math.floor(rect.height));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', updateSize);
    document.addEventListener('fullscreenchange', updateSize);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
      document.removeEventListener('fullscreenchange', updateSize);
    };
  }, []);

  // Desktop Keyboard Controls: W/S/A/D, Arrows, Space for Drift, Shift for Nitro
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          k.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          k.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          k.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          k.right = true;
          break;
        case 'Space':
          e.preventDefault();
          k.space = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          k.nitro = true;
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'KeyP':
        case 'Escape':
          setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          k.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          k.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          k.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          k.right = false;
          break;
        case 'Space':
          k.space = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          k.nitro = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Manual Camera Drag Adjustment (Non-inverted, natural 1:1 pan)
  const handleCamMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      stateRef.current.isDraggingCam = true;
      stateRef.current.lastDragPos = { x: e.clientX, y: e.clientY };
    }
  };

  const handleCamMouseMove = (e: React.MouseEvent) => {
    const s = stateRef.current;
    if (!s.isDraggingCam) return;
    const dx = e.clientX - s.lastDragPos.x;
    const dy = e.clientY - s.lastDragPos.y;
    s.lastDragPos = { x: e.clientX, y: e.clientY };

    // 1:1 Natural pan: Drag right -> pans right, drag left -> pans left
    s.cameraOffsetX = Math.max(-140, Math.min(140, s.cameraOffsetX + dx * 0.85));
    // Drag up -> pans up, drag down -> pans down
    s.cameraOffsetY = Math.max(-70, Math.min(70, s.cameraOffsetY + dy * 0.85));
  };

  const handleCamMouseUp = () => {
    stateRef.current.isDraggingCam = false;
  };

  const resetCamera = () => {
    stateRef.current.cameraOffsetX = 0;
    stateRef.current.cameraOffsetY = 0;
  };

  // Main 60 FPS Game Loop (Rock-solid, Optimized, High-Visibility Cyberpunk Engine)
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

      // -------------------------------------------------------------
      // 1. ACCELERATION & NITRO BOOST
      // -------------------------------------------------------------
      const minSpeed = 2.5;
      const cruiseSpeed = 5.5 + Math.min(3.5, s.score / 6000);
      const nitroMaxSpeed = 12.5;

      s.nitroActive = (s.keys.nitro || (s.keys.space && s.isDrifting && s.carSpeed > 6.0)) && s.nitro > 0;

      if (s.nitroActive) {
        s.nitro = Math.max(0, s.nitro - 0.45);
        s.carSpeed = Math.min(nitroMaxSpeed, s.carSpeed + s.accelRate * 2.2);
        s.screenShake = Math.min(2.0, s.screenShake + 0.25);

        // Spawn high-speed cyan nitro particles behind car
        if (Math.random() < 0.6 && s.particles.length < 35) {
          s.particles.push({
            x: w / 2 + s.carX + (Math.random() - 0.5) * 18,
            y: h - 50,
            vx: (Math.random() - 0.5) * 3,
            vy: 8 + Math.random() * 8,
            size: 3 + Math.random() * 3,
            color: '#00f5ff',
            alpha: 1,
            life: 14,
            maxLife: 14,
            type: 'nitro'
          });
        }
      } else {
        // Regenerate nitro gradually
        s.nitro = Math.min(100, s.nitro + 0.16);

        if (s.keys.up) {
          s.carSpeed = Math.min(s.topSpeed, s.carSpeed + s.accelRate);
        } else if (s.keys.down) {
          s.carSpeed = Math.max(minSpeed, s.carSpeed - s.brakeRate);
        } else {
          if (s.carSpeed > cruiseSpeed) {
            s.carSpeed = Math.max(cruiseSpeed, s.carSpeed - 0.05);
          } else if (s.carSpeed < cruiseSpeed) {
            s.carSpeed = Math.min(cruiseSpeed, s.carSpeed + 0.04);
          }
        }
      }

      // -------------------------------------------------------------
      // 2. STEERING & AUTHENTIC POWER-DRIFT PHYSICS
      // -------------------------------------------------------------
      const isSteeringLeft = s.keys.left;
      const isSteeringRight = s.keys.right;
      const isSteering = isSteeringLeft || isSteeringRight;
      const handbrakePressed = s.keys.space;

      s.isDrifting = (handbrakePressed && isSteering) || (isSteering && Math.abs(s.driftAngle) > 0.18);

      const steerFactor = s.isDrifting ? 1.35 : 1.0;
      const effectiveSteer = (s.steerSpeed * steerFactor * (s.carSpeed / 6.0));

      if (isSteeringLeft) {
        s.carX -= effectiveSteer;
        const targetAngle = s.isDrifting ? -0.42 : -0.20;
        s.driftAngle += (targetAngle - s.driftAngle) * 0.15;
        s.wheelAngle = -0.45;
      } else if (isSteeringRight) {
        s.carX += effectiveSteer;
        const targetAngle = s.isDrifting ? 0.42 : 0.20;
        s.driftAngle += (targetAngle - s.driftAngle) * 0.15;
        s.wheelAngle = 0.45;
      } else {
        s.driftAngle *= 0.82;
        s.wheelAngle *= 0.75;
      }

      // Drift scoring & audio screech
      if (Math.abs(s.driftAngle) > 0.15 && s.carSpeed > 4.5) {
        const anglePoints = Math.floor(Math.abs(s.driftAngle) * 45);
        s.driftAccumulator += anglePoints * s.driftMultiplier;
        s.totalDriftScore += anglePoints * s.driftMultiplier;

        if (s.driftAccumulator > 3000) {
          s.driftMultiplier = 4;
        } else if (s.driftAccumulator > 1500) {
          s.driftMultiplier = 3;
        } else if (s.driftAccumulator > 500) {
          s.driftMultiplier = 2;
        }

        s.driftSoundTimer++;
        if (s.driftSoundTimer % 22 === 0 && soundEnabled) {
          sound.playTireSkid();
        }

        // Spawn tire smoke & skid marks
        const carScreenX = w / 2 + s.carX + s.cameraX + s.cameraOffsetX;
        const carScreenY = h - Math.max(75, Math.min(105, Math.floor(h * 0.13))) + s.cameraOffsetY;
        const rearLeftX = carScreenX - 16;
        const rearRightX = carScreenX + 16;
        const rearY = carScreenY + 30;

        if (s.particles.length < 35) {
          for (let i = 0; i < 2; i++) {
            s.particles.push({
              x: (Math.random() > 0.5 ? rearLeftX : rearRightX) + (Math.random() - 0.5) * 8,
              y: rearY + (Math.random() - 0.5) * 4,
              vx: (Math.random() - 0.5) * 3 - s.driftAngle * 4,
              vy: 1 + Math.random() * 2,
              size: 5 + Math.random() * 5,
              color: s.nitroActive ? '#00f5ff' : '#e2e8f0',
              alpha: 0.65,
              life: 20,
              maxLife: 20,
              type: 'smoke'
            });
          }
        }

        s.skidMarks.push({
          x1: rearLeftX,
          y1: rearY,
          x2: rearRightX,
          y2: rearY,
          alpha: 0.55
        });
        if (s.skidMarks.length > 35) s.skidMarks.shift();
      } else {
        if (s.driftAccumulator > 0 && Math.abs(s.driftAngle) < 0.05) {
          s.score += s.driftAccumulator;
          s.driftAccumulator = 0;
          s.driftMultiplier = 1;
        }
      }

      // Responsive Highway bounds (wide 4 lanes)
      const roadWBottom = Math.min(Math.floor(w * 0.94), w - 24);
      const maxTrackX = (roadWBottom / 2) - 45;
      s.carX = Math.max(-maxTrackX, Math.min(maxTrackX, s.carX));

      // Guardrail barrier collision & spark FX
      if (Math.abs(s.carX) >= maxTrackX - 5) {
        s.screenShake = 3.0;
        if (soundEnabled && Math.random() < 0.2) sound.playHit();
        if (s.particles.length < 35) {
          for (let i = 0; i < 3; i++) {
            s.particles.push({
              x: w / 2 + s.carX + (s.carX > 0 ? 18 : -18) + s.cameraX + s.cameraOffsetX,
              y: h - Math.max(75, Math.min(105, Math.floor(h * 0.13))) + s.cameraOffsetY,
              vx: (s.carX > 0 ? -1 : 1) * (3 + Math.random() * 5),
              vy: (Math.random() - 0.5) * 5,
              size: 2.5,
              color: s.carX > 0 ? '#ff007f' : '#00f5ff',
              alpha: 1,
              life: 14,
              maxLife: 14,
              type: 'spark'
            });
          }
        }
      }

      // Score accumulation based on distance traveled
      s.score += Math.floor(s.carSpeed * 0.7);
      const curKmh = Math.floor(s.carSpeed * 22);
      if (curKmh > s.maxSpeed) {
        s.maxSpeed = curKmh;
      }

      // Smooth highway curvature (telegraphs upcoming turns clearly)
      if (Math.random() < 0.012) {
        s.targetCurve = (Math.random() - 0.5) * 140;
      }
      s.curve += (s.targetCurve - s.curve) * 0.025;
      s.roadOffset = (s.roadOffset + s.carSpeed) % 60;

      // -------------------------------------------------------------
      // 3. FORWARD-FACING CAMERA (SMOOTH HORIZONTAL FOLLOW, ZERO ROLL)
      // -------------------------------------------------------------
      const targetCamX = -s.carX * 0.18;
      s.cameraX += (targetCamX - s.cameraX) * 0.08;

      if (!s.isDraggingCam) {
        s.cameraOffsetX *= 0.98;
        s.cameraOffsetY *= 0.98;
      }

      if (s.invulnTimer > 0) s.invulnTimer--;

      // -------------------------------------------------------------
      // 4. PERFORMANCE-OPTIMIZED REACT STATE DISPATCH (15 Hz)
      // -------------------------------------------------------------
      s.frameCounter++;
      if (s.frameCounter % 4 === 0) {
        setScore(s.score);
        setSpeed(Math.floor(s.carSpeed * 22));
        setNitro(Math.floor(s.nitro));
        setShield(Math.floor(s.shield));
        setDriftPoints(s.driftAccumulator);
        setDriftMultiplier(s.driftMultiplier);
      }

      // -------------------------------------------------------------
      // 5. RENDERING PIPELINE (+30% VISIBILITY, HIGH-OCTANE CYBERPUNK)
      // -------------------------------------------------------------
      ctx.save();

      // Screen shake (subtle impact feedback)
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.2);
      }

      // Deep perspective horizon: starts at 28% from top, offering expansive view ahead
      const roadTop = Math.floor(h * 0.28);
      const roadBottom = h;
      const roadWTop = Math.max(90, Math.min(220, Math.floor(w * 0.16)));

      // A. Synthwave Cyber Sky (+30% Brightness & Atmosphere)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, roadTop);
      skyGrad.addColorStop(0, '#070514');
      skyGrad.addColorStop(0.5, '#160a2c');
      skyGrad.addColorStop(1, '#29124a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, roadTop);

      // Distant Cyber Sun at horizon
      const sunX = w / 2 + s.curve * 0.35 + s.cameraX * 0.3 + s.cameraOffsetX * 0.2;
      const sunY = roadTop - 18;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 140);
      sunGrad.addColorStop(0, '#ff007f');
      sunGrad.addColorStop(0.35, '#d946ef');
      sunGrad.addColorStop(0.7, '#8b5cf6');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, roadTop);

      // Sun scanlines
      ctx.fillStyle = '#160a2c';
      for (let sy = sunY - 45; sy < sunY + 45; sy += 6) {
        ctx.fillRect(sunX - 75, sy, 150, 2);
      }

      // Sweeping Laser Searchlight Beams in the sky
      const searchLightPhase = Date.now() * 0.001;
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.18)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(w * 0.25, roadTop);
      ctx.lineTo(w * 0.25 + Math.sin(searchLightPhase) * 120, 0);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 0, 127, 0.16)';
      ctx.beginPath();
      ctx.moveTo(w * 0.75, roadTop);
      ctx.lineTo(w * 0.75 + Math.cos(searchLightPhase) * 120, 0);
      ctx.stroke();

      // B. Cyber Skyscraper Skyline with lit neon windows
      for (let i = -120; i < w + 140; i += 44) {
        const bHeight = 55 + Math.sin(i * 1.6) * 35;
        const bX = i + s.curve * 0.15 + s.cameraX * 0.35 + s.cameraOffsetX * 0.3;
        ctx.fillStyle = '#0f0c22';
        ctx.fillRect(bX, roadTop - bHeight, 40, bHeight);

        // Neon Roof Antenna & Beacon
        ctx.fillStyle = i % 2 === 0 ? '#00f5ff' : '#ff007f';
        ctx.fillRect(bX + 19, roadTop - bHeight - 12, 2, 12);

        // Lit Neon Windows
        ctx.fillStyle = i % 3 === 0 ? 'rgba(0, 245, 255, 0.75)' : 'rgba(255, 183, 0, 0.7)';
        for (let wy = roadTop - bHeight + 8; wy < roadTop - 6; wy += 12) {
          ctx.fillRect(bX + 6, wy, 6, 6);
          ctx.fillRect(bX + 28, wy, 6, 6);
        }
      }

      // C. Synthwave Ground Grid outside the highway shoulders
      const groundGrad = ctx.createLinearGradient(0, roadTop, 0, roadBottom);
      groundGrad.addColorStop(0, '#130b2a');
      groundGrad.addColorStop(1, '#1e0f40');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, roadTop, w, roadBottom - roadTop);

      // Perspective ground grid lines
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.lineWidth = 1.2;
      for (let gx = -w; gx <= w * 2; gx += 65) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + (gx - w / 2) * 0.08 + s.curve * 0.35 + s.cameraX + s.cameraOffsetX, roadTop);
        ctx.lineTo(gx + s.cameraX + s.cameraOffsetX, roadBottom);
        ctx.stroke();
      }

      // D. High-Contrast Wet Asphalt Highway (+30% Visibility)
      const cCenterTop = w / 2 + s.curve * 0.35 + s.cameraX + s.cameraOffsetX;
      const cCenterBottom = w / 2 + s.cameraX + s.cameraOffsetX;

      // Road Surface
      const roadGrad = ctx.createLinearGradient(0, roadTop, 0, roadBottom);
      roadGrad.addColorStop(0, '#212340');
      roadGrad.addColorStop(0.4, '#1a1c35');
      roadGrad.addColorStop(1, '#141528');
      ctx.fillStyle = roadGrad;

      ctx.beginPath();
      ctx.moveTo(cCenterTop - roadWTop / 2, roadTop);
      ctx.lineTo(cCenterTop + roadWTop / 2, roadTop);
      ctx.lineTo(cCenterBottom + roadWBottom / 2, roadBottom);
      ctx.lineTo(cCenterBottom - roadWBottom / 2, roadBottom);
      ctx.closePath();
      ctx.fill();

      // Wet asphalt specular sheen reflections
      const sheenGrad = ctx.createLinearGradient(cCenterBottom - 80, 0, cCenterBottom + 80, 0);
      sheenGrad.addColorStop(0, 'transparent');
      sheenGrad.addColorStop(0.5, 'rgba(0, 245, 255, 0.08)');
      sheenGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sheenGrad;
      ctx.beginPath();
      ctx.moveTo(cCenterTop - 30, roadTop);
      ctx.lineTo(cCenterTop + 30, roadTop);
      ctx.lineTo(cCenterBottom + 120, roadBottom);
      ctx.lineTo(cCenterBottom - 120, roadBottom);
      ctx.closePath();
      ctx.fill();

      // E. Street Light Pools along the highway
      for (let sy = roadTop + 20; sy < roadBottom; sy += 70) {
        const p = (sy - roadTop) / (roadBottom - roadTop);
        const curY = sy + (s.roadOffset * p);
        if (curY > roadBottom) continue;
        const curW = roadWTop + (roadWBottom - roadWTop) * p;
        const curCenterX = w / 2 + (s.curve * 0.35 * (1 - p)) + s.cameraX + s.cameraOffsetX;

        // Glowing light pool on asphalt
        const poolGrad = ctx.createRadialGradient(curCenterX, curY, 5, curCenterX, curY, curW * 0.45);
        poolGrad.addColorStop(0, 'rgba(0, 245, 255, 0.12)');
        poolGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.05)');
        poolGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = poolGrad;
        ctx.fillRect(curCenterX - curW / 2, curY - 20, curW, 40);

        // Street light poles on left and right borders
        const poleHeight = 22 + p * 35;
        // Left pole
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5 + p * 1.5;
        ctx.beginPath();
        ctx.moveTo(curCenterX - curW / 2, curY);
        ctx.lineTo(curCenterX - curW / 2 - (6 + p * 10), curY - poleHeight);
        ctx.stroke();

        // Left lamp head
        ctx.fillStyle = '#00f5ff';
        ctx.fillRect(curCenterX - curW / 2 - (8 + p * 10), curY - poleHeight, 4 + p * 4, 3 + p * 3);

        // Right pole
        ctx.strokeStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(curCenterX + curW / 2, curY);
        ctx.lineTo(curCenterX + curW / 2 + (6 + p * 10), curY - poleHeight);
        ctx.stroke();

        // Right lamp head
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(curCenterX + curW / 2 + (4 + p * 10), curY - poleHeight, 4 + p * 4, 3 + p * 3);
      }

      // F. Double Neon Guardrails (Zero expensive blur, multi-pass hardware-accelerated strokes)
      // Left Guardrail (Vivid Electric Cyan)
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.25)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cCenterTop - roadWTop / 2, roadTop);
      ctx.lineTo(cCenterBottom - roadWBottom / 2, roadBottom);
      ctx.stroke();

      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cCenterTop - roadWTop / 2, roadTop);
      ctx.lineTo(cCenterBottom - roadWBottom / 2, roadBottom);
      ctx.stroke();

      // Inner Left Barrier Line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cCenterTop - roadWTop / 2 + 6, roadTop);
      ctx.lineTo(cCenterBottom - roadWBottom / 2 + 18, roadBottom);
      ctx.stroke();

      // Right Guardrail (Neon Hot Magenta)
      ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cCenterTop + roadWTop / 2, roadTop);
      ctx.lineTo(cCenterBottom + roadWBottom / 2, roadBottom);
      ctx.stroke();

      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cCenterTop + roadWTop / 2, roadTop);
      ctx.lineTo(cCenterBottom + roadWBottom / 2, roadBottom);
      ctx.stroke();

      // Inner Right Barrier Line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cCenterTop + roadWTop / 2 - 6, roadTop);
      ctx.lineTo(cCenterBottom + roadWBottom / 2 - 18, roadBottom);
      ctx.stroke();

      // G. 4-Lane Perspective Dashes & Road Markings
      for (let y = roadTop; y < roadBottom; y += 24) {
        const p = (y - roadTop) / (roadBottom - roadTop);
        const curY = y + (s.roadOffset * p);
        if (curY > roadBottom) continue;
        const curW = roadWTop + (roadWBottom - roadWTop) * p;
        const cOffset = (s.curve * 0.35 * (1 - p)) + s.cameraX + s.cameraOffsetX;
        const curCenterX = w / 2 + cOffset;

        // Center double cyan dashes
        ctx.strokeStyle = `rgba(0, 245, 255, ${0.45 + p * 0.55})`;
        ctx.lineWidth = 2.5 + p * 2.5;
        ctx.beginPath();
        ctx.moveTo(curCenterX - 4, curY);
        ctx.lineTo(curCenterX + 4, curY);
        ctx.stroke();

        // Left Inner Lane Line (Magenta)
        ctx.strokeStyle = `rgba(255, 0, 127, ${0.35 + p * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(curCenterX - curW * 0.25, curY);
        ctx.lineTo(curCenterX - curW * 0.25 + (6 + p * 12), curY);
        ctx.stroke();

        // Right Inner Lane Line (Magenta)
        ctx.beginPath();
        ctx.moveTo(curCenterX + curW * 0.25 - (6 + p * 12), curY);
        ctx.lineTo(curCenterX + curW * 0.25, curY);
        ctx.stroke();
      }

      // Upcoming Curve Holographic Warning Sign
      if (Math.abs(s.targetCurve) > 35) {
        const isLeftCurve = s.targetCurve < 0;
        ctx.fillStyle = 'rgba(0, 245, 255, 0.85)';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        const signText = isLeftCurve ? '◄◄ DRIFT LEFT' : 'DRIFT RIGHT ►►';
        ctx.fillText(signText, cCenterTop, roadTop - 25);
      }

      // H. Draw Skid Marks on Asphalt
      for (let i = s.skidMarks.length - 1; i >= 0; i--) {
        const sm = s.skidMarks[i];
        sm.alpha -= 0.008;
        if (sm.alpha <= 0) {
          s.skidMarks.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(0, 0, 0, ${sm.alpha * 0.7})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(sm.x1, sm.y1);
        ctx.lineTo(sm.x2, sm.y2);
        ctx.stroke();
      }

      // I. Particles (Tire Smoke, Sparks, Nitro)
      for (let pIdx = s.particles.length - 1; pIdx >= 0; pIdx--) {
        const p = s.particles[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;

        if (p.type === 'speedline' || p.type === 'nitro') {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 2, p.y + p.vy * 3);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        if (p.life <= 0) s.particles.splice(pIdx, 1);
      }
      ctx.globalAlpha = 1.0;

      // J. Opponent Sports Cars (Expanded Visibility & Deep Scaling)
      s.opponents.forEach(op => {
        op.y += s.carSpeed - op.speed;

        if (op.y > h + 100) {
          const spawnDist = s.score < 1000 ? 700 + Math.random() * 600 : 450 + Math.random() * 500;
          op.y = -spawnDist;
          op.x = (Math.random() - 0.5) * (maxTrackX * 1.5);
          op.speed = 3.8 + Math.min(3.2, s.score / 5000);
        }

        if (op.y > roadTop - 40 && op.y < h + 40) {
          const opScale = Math.max(0.22, (op.y - roadTop) / (roadBottom - roadTop));
          const opW = op.width * opScale * 1.35;
          const opH = op.height * opScale * 1.35;
          const roadCurX = w / 2 + s.cameraX + s.cameraOffsetX + (s.curve * 0.35 * (1 - opScale));
          const opScreenX = roadCurX + op.x * opScale;

          // Opponent Car Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(opScreenX - opW / 2 - 3, op.y + opH / 2 - 4, opW + 6, 8 * opScale);

          // Neon Underglow
          ctx.fillStyle = op.glowColor;
          ctx.fillRect(opScreenX - opW * 0.45, op.y - opH * 0.35, opW * 0.9, opH * 0.7);

          // Main Chassis
          ctx.fillStyle = '#0a0a14';
          ctx.beginPath();
          ctx.roundRect(opScreenX - opW / 2, op.y - opH / 2, opW, opH, 5 * opScale);
          ctx.fill();

          // Body Color
          ctx.fillStyle = op.color;
          ctx.beginPath();
          ctx.roundRect(opScreenX - opW * 0.45, op.y - opH * 0.45, opW * 0.9, opH * 0.9, 4 * opScale);
          ctx.fill();

          // Cockpit / Tinted Glass
          ctx.fillStyle = '#020617';
          ctx.fillRect(opScreenX - opW * 0.32, op.y - opH * 0.22, opW * 0.64, opH * 0.44);

          // Glowing Taillights
          ctx.fillStyle = '#ff0055';
          ctx.fillRect(opScreenX - opW / 2 + 2, op.y + opH / 2 - 5 * opScale, 7 * opScale, 4 * opScale);
          ctx.fillRect(opScreenX + opW / 2 - 9 * opScale, op.y + opH / 2 - 5 * opScale, 7 * opScale, 4 * opScale);

          // Collision Detection with Player Car
          const playerY = h - Math.max(75, Math.min(105, Math.floor(h * 0.13))) + s.cameraOffsetY;
          const playerW = 46;
          const playerH = 80;
          const playerScreenX = w / 2 + s.carX + s.cameraX + s.cameraOffsetX;

          if (
            Math.abs(playerScreenX - opScreenX) < (playerW + opW) / 2.2 &&
            Math.abs(playerY - op.y) < (playerH + opH) / 2.2
          ) {
            if (s.invulnTimer <= 0) {
              s.shield = Math.max(0, s.shield - 35);
              s.invulnTimer = 60; // 1 second invulnerability
              s.screenShake = 6.0;
              if (soundEnabled) sound.playHit();

              // Spawn impact sparks
              for (let sp = 0; sp < 10; sp++) {
                s.particles.push({
                  x: playerScreenX,
                  y: playerY,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  size: 3,
                  color: '#00f5ff',
                  alpha: 1,
                  life: 18,
                  maxLife: 18,
                  type: 'spark'
                });
              }

              op.y -= 160;

              if (s.shield <= 0) {
                if (soundEnabled) sound.playExplosion();
                handleGameOver(s.score);
              }
            }
          }
        }
      });

      // Slowly repair shield during clean driving
      if (s.shield > 0 && s.shield < 100 && Math.random() < 0.04) {
        s.shield = Math.min(100, s.shield + 0.4);
      }

      // -------------------------------------------------------------
      // 6. PLAYER CYBER SUPERCAR (HEADLIGHTS, STEERING, UNDERGLOW)
      // -------------------------------------------------------------
      const pX = w / 2 + s.carX + s.cameraX + s.cameraOffsetX;
      const pY = h - Math.max(75, Math.min(105, Math.floor(h * 0.13))) + s.cameraOffsetY;

      ctx.save();
      ctx.translate(pX, pY);

      // Flash during invulnerability
      if (s.invulnTimer > 0 && Math.floor(s.invulnTimer / 4) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Rotate player car body strictly based on drift angle
      ctx.rotate(s.driftAngle);

      // Headlight Beams illuminating the road ahead
      const headBeam = ctx.createLinearGradient(0, -38, 0, -260);
      headBeam.addColorStop(0, 'rgba(0, 245, 255, 0.55)');
      headBeam.addColorStop(0.5, 'rgba(0, 245, 255, 0.20)');
      headBeam.addColorStop(1, 'rgba(0, 245, 255, 0)');
      ctx.fillStyle = headBeam;
      ctx.beginPath();
      ctx.moveTo(-18, -38);
      ctx.lineTo(-65, -250);
      ctx.lineTo(65, -250);
      ctx.lineTo(18, -38);
      ctx.closePath();
      ctx.fill();

      // Nitro Flame Exhaust
      if (s.nitroActive) {
        ctx.fillStyle = '#00f5ff';
        ctx.beginPath();
        ctx.moveTo(-12, 42);
        ctx.lineTo(0, 80 + Math.random() * 25);
        ctx.lineTo(12, 42);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-6, 42);
        ctx.lineTo(0, 60);
        ctx.lineTo(6, 42);
        ctx.fill();
      }

      // Neon Underglow (Cyan or Magenta)
      ctx.fillStyle = s.nitroActive ? 'rgba(0, 245, 255, 0.85)' : 'rgba(255, 0, 127, 0.65)';
      ctx.fillRect(-28, -36, 56, 76);

      // Wheels
      ctx.fillStyle = '#0f172a';
      // Rear Left & Right
      ctx.fillRect(-28, 16, 7, 18);
      ctx.fillRect(21, 16, 7, 18);

      // Front Left & Right (Rotated with wheelAngle)
      ctx.save();
      ctx.translate(-24, -22);
      ctx.rotate(s.wheelAngle);
      ctx.fillRect(-4, -9, 7, 18);
      ctx.restore();

      ctx.save();
      ctx.translate(24, -22);
      ctx.rotate(s.wheelAngle);
      ctx.fillRect(-3, -9, 7, 18);
      ctx.restore();

      // Carbon Base Chassis
      ctx.fillStyle = '#050711';
      ctx.beginPath();
      ctx.roundRect(-24, -40, 48, 80, 7);
      ctx.fill();

      // Body Panels (Vibrant Cyber Blue / Cyan)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-22, -38, 44, 76, 6);
      ctx.fill();

      // Electric Racing Center Stripe
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(-4, -38, 8, 76);

      // Glass Cockpit / Windshield
      ctx.fillStyle = '#080d1a';
      ctx.beginPath();
      ctx.roundRect(-15, -20, 30, 32, 5);
      ctx.fill();

      // Cockpit reflections
      ctx.fillStyle = 'rgba(0, 245, 255, 0.45)';
      ctx.fillRect(-11, -16, 9, 24);

      // Aerodynamic Rear Wing / Spoiler
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(-24, 32, 48, 6);
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(-26, 30, 5, 11);
      ctx.fillRect(21, 30, 5, 11);

      // Glowing Neon Tail Light Bar (Intense Red under braking)
      ctx.fillStyle = s.keys.down ? '#ff0033' : '#ff007f';
      ctx.fillRect(-20, 36, 40, 4);

      ctx.restore(); // restore car transform
      ctx.restore(); // restore main canvas transform

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver, soundEnabled]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-screen bg-[#070714] text-white select-none overflow-hidden font-sans"
    >
      {/* -------------------------------------------------------------
          TRUE FULLSCREEN 100VW × 100VH RACING CANVAS
          ------------------------------------------------------------- */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleCamMouseDown}
        onMouseMove={handleCamMouseMove}
        onMouseUp={handleCamMouseUp}
        onMouseLeave={handleCamMouseUp}
        className="absolute inset-0 w-full h-full object-cover cursor-crosshair z-0"
      />

      {/* -------------------------------------------------------------
          1. TOP FLOATING HUD (DARK GLASSMORRHISM & AAA TELEMETRY)
          ------------------------------------------------------------- */}
      <header className="absolute top-0 inset-x-0 z-20 px-3 sm:px-6 pt-3 pb-6 pointer-events-none flex items-start justify-between gap-2 bg-gradient-to-b from-[#050711]/90 via-[#050711]/40 to-transparent">
        {/* LEFT: Exit button & Brand / Level Telemetry */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onBack && (
            <button
              id="neon-drift-exit-btn"
              type="button"
              onClick={onBack}
              className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono font-medium transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md"
              title="Exit Race (Esc)"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">EXIT</span>
            </button>
          )}

          <div
            id="neon-drift-brand-badge"
            className="flex flex-col justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md shadow-md"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f5ff]" />
              <span className="font-mono font-black text-[11px] sm:text-xs tracking-wider text-white">
                NEON DRIFT
              </span>
            </div>
            <span className="text-[9px] font-mono tracking-widest text-slate-400 hidden xs:inline">
              SHIBUYA // SEC 04
            </span>
          </div>
        </div>

        {/* CENTER: SPEEDOMETER & DRIFT CLUSTER */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div
            id="neon-drift-speedometer"
            className="relative px-3 sm:px-4 py-1.5 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex flex-col items-center"
          >
            {/* SVG Circular / Arc Tachometer Gauge */}
            <div className="relative flex items-center justify-center w-[74px] h-[50px] sm:w-[82px] sm:h-[54px] overflow-hidden">
              <svg className="absolute -top-1 w-20 h-20 -rotate-[120deg]" viewBox="0 0 100 100">
                {/* Background track arc (240 deg) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="4"
                  strokeDasharray="159.17 238.76"
                  strokeLinecap="round"
                />
                {/* Active speed arc with gradient */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="url(#speedGrad)"
                  strokeWidth="4"
                  strokeDasharray="159.17 238.76"
                  strokeDashoffset={159.17 - (Math.min(speed, 260) / 260) * 159.17}
                  strokeLinecap="round"
                  className="transition-all duration-150"
                />
                <defs>
                  <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f5ff" />
                    <stop offset="65%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Speed Readout */}
              <div className="flex flex-col items-center justify-center relative z-10 -mt-1">
                <span className="font-mono text-xl sm:text-2xl font-black text-white tabular-nums tracking-tight leading-none drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                  {speed}
                </span>
                <span className="font-mono text-[8px] sm:text-[9px] font-black text-cyan-400 tracking-widest mt-0.5 leading-none">
                  KM/H
                </span>
              </div>
            </div>

            {/* Micro Telemetry Bars: Armor Shield & Nitro Tank */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/5 w-full justify-between">
              {/* Shield Micro Bar */}
              <div className="flex items-center gap-1" title={`Armor Shield: ${shield}%`}>
                <Shield className="w-2.5 h-2.5 text-emerald-400" />
                <div className="w-8 sm:w-10 h-1.5 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, shield)}%` }}
                  />
                </div>
              </div>

              {/* Nitro Micro Bar */}
              <div className="flex items-center gap-1" title={`Nitro Boost: ${nitro}%`}>
                <Flame className="w-2.5 h-2.5 text-cyan-400 fill-current" />
                <div className="w-8 sm:w-10 h-1.5 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-100"
                    style={{ width: `${Math.max(0, nitro)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. DRIFT UI: Small, sharp drift indicator & combo */}
          {gameState === 'PLAYING' && driftPoints > 0 && (
            <div
              id="neon-drift-indicator"
              className="mt-2 px-3 py-1 rounded-full bg-slate-950/85 border border-cyan-400/60 shadow-[0_0_16px_rgba(0,245,255,0.3)] backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-cyan-400 fill-current animate-pulse" />
                <span className="font-mono text-[9px] font-black tracking-widest text-cyan-300 uppercase">
                  DRIFT
                </span>
              </div>
              <span className="w-px h-2.5 bg-white/20" />
              <span className="font-mono text-[11px] font-black text-white tracking-wider">
                +{driftPoints.toLocaleString()}
              </span>
              {driftMultiplier > 1 && (
                <span className="px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/70 font-mono text-[9px] font-black text-amber-300">
                  {driftMultiplier}X
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Score • Best Score • Utility Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* 5. SCORE UI */}
          <div
            id="neon-drift-score-box"
            className="flex flex-col items-end px-2.5 sm:px-3 py-1 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md shadow-md"
          >
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase leading-tight">
              SCORE
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-amber-300 tabular-nums leading-tight">
              {score.toLocaleString()}
            </span>
          </div>

          {/* BEST SCORE (Hidden on tiny screens < 400px) */}
          <div
            id="neon-drift-best-box"
            className="hidden sm:flex flex-col items-end px-2.5 sm:px-3 py-1 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md shadow-md"
          >
            <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase leading-tight">
              BEST
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-emerald-400 tabular-nums leading-tight">
              {highScore.toLocaleString()}
            </span>
          </div>

          {/* Sound Toggle Button */}
          <button
            id="neon-drift-audio-btn"
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.toggleMute();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            id="neon-drift-fullscreen-btn"
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Pause Button */}
          <button
            id="neon-drift-pause-btn"
            type="button"
            onClick={() => setGameState(prev => (prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev))}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title="Pause Race (P / Esc)"
          >
            {gameState === 'PAUSED' ? <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* CAMERA RESET PILL (Appears if user manually dragged view) */}
      {gameState === 'PLAYING' &&
        (Math.abs(stateRef.current.cameraOffsetX) > 8 || Math.abs(stateRef.current.cameraOffsetY) > 8) && (
          <button
            id="neon-drift-cam-reset"
            type="button"
            onClick={resetCamera}
            className="absolute top-16 left-4 z-20 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-white/10 hover:border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-400 hover:text-white flex items-center gap-1.5 cursor-pointer backdrop-blur-md shadow-md active:scale-95 transition-all"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>RESET CAM</span>
          </button>
        )}

      {/* -------------------------------------------------------------
          8. MOBILE ON-SCREEN TOUCH CONTROLS (TRANSPARENT & PREMIUM)
          ------------------------------------------------------------- */}
      {(isTouchDevice || forceTouchControls) && gameState === 'PLAYING' && (
        <div
          id="neon-drift-mobile-controls"
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20 pb-4 px-3 sm:px-6"
        >
          <div className="flex items-end justify-between w-full pointer-events-auto">
            {/* Left Corner: Steer Left & Steer Right */}
            <div className="flex items-center gap-2">
              <button
                id="btn-touch-steer-left"
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.left = true;
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.left = false;
                }}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/40 border border-cyan-500/30 active:bg-cyan-500/25 active:border-cyan-400 active:scale-95 flex items-center justify-center text-cyan-300 backdrop-blur-sm shadow-xl select-none transition-transform"
                aria-label="Steer Left"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>

              <button
                id="btn-touch-steer-right"
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.right = true;
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.right = false;
                }}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/40 border border-cyan-500/30 active:bg-cyan-500/25 active:border-cyan-400 active:scale-95 flex items-center justify-center text-cyan-300 backdrop-blur-sm shadow-xl select-none transition-transform"
                aria-label="Steer Right"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>

            {/* Right Corner: BRAKE, DRIFT & GAS */}
            <div className="flex items-center gap-2">
              {/* Brake Button */}
              <button
                id="btn-touch-brake"
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.down = true;
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.down = false;
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-950/40 border border-rose-500/30 active:bg-rose-500/25 active:border-rose-400 active:scale-95 flex flex-col items-center justify-center text-rose-300 text-[9px] font-mono font-bold backdrop-blur-sm shadow-xl select-none transition-transform"
                aria-label="Brake"
              >
                <Disc className="w-3.5 h-3.5 mb-0.5" />
                <span>BRAKE</span>
              </button>

              {/* Drift Button */}
              <button
                id="btn-touch-drift"
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.space = true;
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.space = false;
                }}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/40 border border-purple-500/40 active:bg-purple-500/30 active:border-purple-400 active:scale-95 flex flex-col items-center justify-center text-purple-300 text-[9px] font-mono font-black backdrop-blur-sm shadow-xl select-none transition-transform"
                aria-label="Drift"
              >
                <Flame className="w-4 h-4 mb-0.5 fill-current" />
                <span>DRIFT</span>
              </button>

              {/* Gas / Accelerate Button */}
              <button
                id="btn-touch-gas"
                type="button"
                onTouchStart={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.up = true;
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stateRef.current.keys.up = false;
                }}
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-950/40 border border-cyan-500/40 active:bg-cyan-500/30 active:border-cyan-400 active:scale-95 flex flex-col items-center justify-center text-[#00f5ff] text-[10px] font-mono font-black backdrop-blur-sm shadow-xl select-none transition-transform"
                aria-label="Gas / Accelerate"
              >
                <Gauge className="w-4 h-4 mb-0.5" />
                <span>GAS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          START SCREEN OVERLAY (PREMIUM RACING TITLE CARD)
          ------------------------------------------------------------- */}
      {gameState === 'START' && (
        <div
          id="neon-drift-start-screen"
          className="absolute inset-0 bg-[#050711]/92 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30 animate-in fade-in duration-200"
        >
          {/* Racing Badge */}
          <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(0,245,255,0.2)]">
            <Zap className="w-7 h-7" />
          </div>

          <h1 className="font-mono font-black text-3xl sm:text-5xl text-white tracking-[0.15em] mb-1">
            NEON DRIFT
          </h1>
          <p className="text-[10px] sm:text-xs text-cyan-400 font-mono tracking-widest uppercase mb-6">
            CYBERPUNK HIGHWAY GRAND PRIX
          </p>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg w-full mb-6 text-left">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                STEERING
              </span>
              <p className="text-xs font-mono font-bold text-white mt-0.5">A / D or ◄ / ►</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                THROTTLE / BRAKE
              </span>
              <p className="text-xs font-mono font-bold text-white mt-0.5">W (Gas) / S (Brake)</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md">
              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-wider font-bold">
                POWER DRIFT
              </span>
              <p className="text-xs font-mono font-bold text-white mt-0.5">Hold SPACEBAR</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="neon-drift-start-btn"
              type="button"
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>IGNITE ENGINES</span>
            </button>

            <button
              id="neon-drift-help-btn"
              type="button"
              onClick={() => setShowHowToPlay(true)}
              className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white cursor-pointer transition-all active:scale-[0.98]"
              title="How to play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HOW TO PLAY MODAL */}
      {showHowToPlay && (
        <div
          id="neon-drift-howto-modal"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-40 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0a0f1d] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <h2 className="text-sm font-mono font-black text-white tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                RACE BRIEFING
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
              <p>• <span className="text-cyan-400 font-bold">POWER DRIFT:</span> Hold Spacebar (or mobile DRIFT button) while steering to slide around highway curves.</p>
              <p>• <span className="text-amber-300 font-bold">COMBO MULTIPLIER:</span> Maintain continuous drifts to stack 2X, 3X, and 4X score multipliers.</p>
              <p>• <span className="text-purple-400 font-bold">NITRO BURST:</span> High speeds and tight power drifts engage your car's cyber nitro exhaust.</p>
              <p>• <span className="text-emerald-400 font-bold">SHIELD REPAIR:</span> Avoid guardrail scrapes and opposing vehicles to preserve your armor.</p>
              <p>• <span className="text-cyan-300 font-bold">FULLSCREEN:</span> Press F or click the top Fullscreen icon for true edge-to-edge immersion.</p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono font-bold text-white transition-all active:scale-95"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          6. PAUSE MENU OVERLAY (AAA RACING PAUSE INTERFACE)
          ------------------------------------------------------------- */}
      {gameState === 'PAUSED' && !showSettings && (
        <div
          id="neon-drift-pause-screen"
          className="fixed inset-0 bg-[#050711]/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30 animate-in fade-in duration-150"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-center text-cyan-400 mb-3 shadow-lg">
            <Pause className="w-6 h-6" />
          </div>

          <h2 className="font-mono font-black text-2xl sm:text-3xl text-white tracking-[0.25em]">
            PAUSED
          </h2>
          <p className="text-[10px] font-mono tracking-widest text-cyan-400 mt-0.5 mb-5">
            TELEMETRY SUSPENDED // HIGHWAY IDLE
          </p>

          {/* Current Race Telemetry Snapshot */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-xs mb-6 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">SPEED</span>
              <p className="text-xs font-mono font-black text-white mt-0.5">{speed}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">SCORE</span>
              <p className="text-xs font-mono font-black text-amber-300 mt-0.5">{score.toLocaleString()}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">SHIELD</span>
              <p className="text-xs font-mono font-black text-emerald-400 mt-0.5">{shield}%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10">
              <span className="text-[8px] font-mono text-slate-400 uppercase">NITRO</span>
              <p className="text-xs font-mono font-black text-cyan-400 mt-0.5">{nitro}%</p>
            </div>
          </div>

          {/* Buttons: RESUME, RESTART, SETTINGS, EXIT */}
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              id="pause-btn-resume"
              type="button"
              onClick={() => setGameState('PLAYING')}
              className="py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,245,255,0.25)] transition-all active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME</span>
            </button>

            <button
              id="pause-btn-restart"
              type="button"
              onClick={startGame}
              className="py-3 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-cyan-400/40 text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTART</span>
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
                <span>EXIT</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div
          id="neon-drift-settings-modal"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 z-40 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm p-5 rounded-2xl bg-[#0a0f1d] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <h2 className="text-sm font-mono font-black text-white tracking-widest flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" />
                RACE SETTINGS
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
                  <span>Fullscreen Mode</span>
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
                  <Gauge className="w-4 h-4 text-emerald-400" />
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
                RETURN TO PAUSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          7. GAME OVER SCREEN OVERLAY (RACE OVER // TELEMETRY SUMMARY)
          ------------------------------------------------------------- */}
      {gameState === 'GAMEOVER' && (
        <div
          id="neon-drift-gameover-screen"
          className="fixed inset-0 bg-[#050711]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 text-center z-30 animate-in fade-in duration-200"
        >
          {/* Header Icon Badge */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_24px_rgba(0,245,255,0.2)]">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>

          <h2 className="font-mono font-black text-3xl sm:text-4xl text-white tracking-[0.2em]">
            RACE OVER
          </h2>
          <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mt-0.5 mb-5">
            VEHICLE TELEMETRY SUMMARY
          </p>

          {/* New Record Banner if applicable */}
          {finalStats.isNewRecord && (
            <div className="mb-4 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-black tracking-wider flex items-center gap-1.5 animate-pulse">
              <Crown className="w-3.5 h-3.5" />
              <span>★ NEW BEST RECORD ★</span>
            </div>
          )}

          {/* Telemetry Summary Cards (Score, Best Score, Distance, Max Speed, Drift Score) */}
          <div className="w-full max-w-sm mb-6 flex flex-col gap-2.5">
            {/* Primary Highlight: Final Score */}
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 backdrop-blur-md flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                SCORE
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tabular-nums">
                {score.toLocaleString()}
              </span>
            </div>

            {/* Secondary 4-stat grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-left">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  BEST SCORE
                </span>
                <p className="font-mono text-sm font-black text-emerald-400 mt-0.5 tabular-nums">
                  {highScore.toLocaleString()}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-left">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  DISTANCE
                </span>
                <p className="font-mono text-sm font-black text-white mt-0.5 tabular-nums">
                  {finalStats.distance.toLocaleString()} M
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-left">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  MAX SPEED
                </span>
                <p className="font-mono text-sm font-black text-[#00f5ff] mt-0.5 tabular-nums">
                  {finalStats.maxSpeed} KM/H
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 text-left">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  DRIFT SCORE
                </span>
                <p className="font-mono text-sm font-black text-purple-300 mt-0.5 tabular-nums">
                  +{finalStats.driftScore.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: RETRY & MAIN MENU */}
          <div className="flex items-center gap-3 w-full max-w-sm justify-center">
            <button
              id="gameover-btn-retry"
              type="button"
              onClick={startGame}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(0,245,255,0.3)] transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RETRY</span>
            </button>

            {onBack && (
              <button
                id="gameover-btn-mainmenu"
                type="button"
                onClick={onBack}
                className="flex-1 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span>MAIN MENU</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
