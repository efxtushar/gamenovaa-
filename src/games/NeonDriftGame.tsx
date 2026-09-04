import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Gauge, Zap, Volume2, VolumeX, Pause, ArrowLeft, Flame, Sparkles, Shield } from 'lucide-react';

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
  type: 'smoke' | 'spark' | 'rain' | 'speedline';
}

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

export const NeonDriftGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_neon-drift') || '0', 10);
  });
  const [nitro, setNitro] = useState(100);
  const [shield, setShield] = useState(100);
  const [speed, setSpeed] = useState(110);
  const [driftPoints, setDriftPoints] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const stateRef = useRef({
    carX: 0,
    carSpeed: 4.8,
    driftAngle: 0,
    isDrifting: false,
    nitroActive: false,
    score: 0,
    nitro: 100,
    shield: 100,
    invulnTimer: 0,
    driftMultiplier: 1,
    driftAccumulator: 0,
    opponents: [] as {
      x: number;
      y: number;
      speed: number;
      color: string;
      accentColor: string;
      width: number;
      height: number;
      model: 'coupe' | 'supercar' | 'muscle';
    }[],
    particles: [] as Particle[],
    skidMarks: [] as SkidMark[],
    rainDrops: [] as { x: number; y: number; speed: number; len: number }[],
    roadOffset: 0,
    curve: 0,
    targetCurve: 0,
    screenShake: 0,
    wheelAngle: 0,
    keys: { left: false, right: false, up: false, down: false, space: false }
  });

  const initOpponents = () => [
    { x: -90, y: -750, speed: 3.8, color: '#f43f5e', accentColor: '#fb7185', width: 38, height: 70, model: 'supercar' as const },
    { x: 90, y: -1500, speed: 4.0, color: '#eab308', accentColor: '#fde047', width: 42, height: 72, model: 'muscle' as const },
  ];

  const startGame = useCallback(() => {
    sound.playClick();
    const rain = [];
    for (let i = 0; i < 80; i++) {
      rain.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        speed: 15 + Math.random() * 10,
        len: 12 + Math.random() * 16
      });
    }

    stateRef.current = {
      carX: 0,
      carSpeed: 4.8,
      driftAngle: 0,
      isDrifting: false,
      nitroActive: false,
      score: 0,
      nitro: 100,
      shield: 100,
      invulnTimer: 0,
      driftMultiplier: 1,
      driftAccumulator: 0,
      opponents: initOpponents(),
      particles: [],
      skidMarks: [],
      rainDrops: rain,
      roadOffset: 0,
      curve: 0,
      targetCurve: 0,
      screenShake: 0,
      wheelAngle: 0,
      keys: { left: false, right: false, up: false, down: false, space: false }
    };
    setScore(0);
    setNitro(100);
    setShield(100);
    setDriftPoints(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_neon-drift', finalScore.toString());
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['Space'].includes(e.code)) {
        e.preventDefault();
        stateRef.current.keys.space = true;
      }
      if (['KeyP', 'Escape'].includes(e.code)) {
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
      if (['Space'].includes(e.code)) stateRef.current.keys.space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Render Loop
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

      // Speed Scaling: Gentle starter speed, smooth gradual scaling
      const difficultyBonus = Math.min(4.5, s.score / 5000);
      const baseCruise = 4.8 + difficultyBonus;

      if (s.invulnTimer > 0) s.invulnTimer--;

      // Nitro & Acceleration
      s.nitroActive = s.keys.space && s.nitro > 0;
      if (s.nitroActive) {
        s.nitro = Math.max(0, s.nitro - 0.4);
        s.carSpeed = baseCruise + 4.5;
        s.screenShake = 1.2;
      } else {
        s.nitro = Math.min(100, s.nitro + 0.2);
        s.carSpeed = s.keys.up ? baseCruise + 2.2 : s.keys.down ? baseCruise - 1.8 : baseCruise;
      }

      setNitro(Math.floor(s.nitro));
      setSpeed(Math.floor(s.carSpeed * 20));

      // Steering & Drift Physics
      const isSteering = s.keys.left || s.keys.right;
      s.isDrifting = isSteering && (Math.abs(s.driftAngle) > 0.1 || s.nitroActive);

      if (s.keys.left) {
        s.carX -= 4.8;
        s.driftAngle = Math.max(-0.35, s.driftAngle - 0.04);
        s.wheelAngle = -0.4;
      } else if (s.keys.right) {
        s.carX += 4.8;
        s.driftAngle = Math.min(0.35, s.driftAngle + 0.04);
        s.wheelAngle = 0.4;
      } else {
        s.driftAngle *= 0.86;
        s.wheelAngle *= 0.8;
      }

      // Drift scoring
      if (Math.abs(s.driftAngle) > 0.12) {
        s.driftAccumulator += Math.floor(Math.abs(s.driftAngle) * 35);
        setDriftPoints(s.driftAccumulator);
      }

      // Keep car on track bounds
      s.carX = Math.max(-230, Math.min(230, s.carX));

      // Barrier collision spark & shake
      if (Math.abs(s.carX) >= 225) {
        s.screenShake = 3.5;
        for (let i = 0; i < 4; i++) {
          s.particles.push({
            x: w / 2 + s.carX + (s.carX > 0 ? 20 : -20),
            y: h - 90,
            vx: (s.carX > 0 ? -1 : 1) * (2 + Math.random() * 4),
            vy: (Math.random() - 0.5) * 4,
            size: 2.5,
            color: '#00f0ff',
            alpha: 1,
            life: 15,
            maxLife: 15,
            type: 'spark'
          });
        }
      }

      // Score accumulation
      s.score += Math.floor(s.carSpeed * 0.55);
      setScore(s.score);

      // Procedural highway curvature
      if (Math.random() < 0.015) {
        s.targetCurve = (Math.random() - 0.5) * 110;
      }
      s.curve += (s.targetCurve - s.curve) * 0.035;
      s.roadOffset = (s.roadOffset + s.carSpeed) % 60;

      // Tire Smoke & Skid Marks when drifting
      if (Math.abs(s.driftAngle) > 0.15) {
        const pX = w / 2 + s.carX;
        const pY = h - 70;
        for (let i = 0; i < 2; i++) {
          s.particles.push({
            x: pX + (Math.random() - 0.5) * 30,
            y: pY + 20,
            vx: (Math.random() - 0.5) * 2 - s.driftAngle * 3,
            vy: 1 + Math.random() * 2,
            size: 6 + Math.random() * 8,
            color: s.nitroActive ? '#00f0ff' : '#e2e8f0',
            alpha: 0.6,
            life: 25,
            maxLife: 25,
            type: 'smoke'
          });
        }
      }

      // Speedlines when Nitro active
      if (s.nitroActive && Math.random() < 0.8) {
        s.particles.push({
          x: Math.random() * w,
          y: -20,
          vx: (Math.random() - 0.5) * 2,
          vy: 25 + Math.random() * 15,
          size: 2,
          color: '#00f0ff',
          alpha: 0.8,
          life: 20,
          maxLife: 20,
          type: 'speedline'
        });
      }

      // -------------------------------------------------------------
      // AAA CYBERPUNK HIGHWAY RENDER PIPELINE
      // -------------------------------------------------------------
      ctx.save();
      if (s.screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * s.screenShake * 2, (Math.random() - 0.5) * s.screenShake * 2);
        s.screenShake = Math.max(0, s.screenShake - 0.3);
      }

      // 1. Cyber Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 240);
      skyGrad.addColorStop(0, '#06040e');
      skyGrad.addColorStop(0.6, '#130c2c');
      skyGrad.addColorStop(1, '#2d124d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, 240);

      // 2. Distant Cyber Sun
      const sunGrad = ctx.createRadialGradient(w / 2 + s.curve * 0.4, 150, 10, w / 2 + s.curve * 0.4, 150, 120);
      sunGrad.addColorStop(0, '#ff007f');
      sunGrad.addColorStop(0.4, '#a855f7');
      sunGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, 240);

      // 3. Cyber Skyscraper Skyline (Parallax layers with neon windows)
      for (let i = 0; i < w + 60; i += 45) {
        const bHeight = 70 + Math.sin(i * 1.3) * 45;
        const bX = i - 30 + s.curve * 0.2;
        ctx.fillStyle = '#0a0818';
        ctx.fillRect(bX, 230 - bHeight, 40, bHeight);

        // Neon window lights
        ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 127, 0.4)';
        for (let wy = 230 - bHeight + 10; wy < 225; wy += 14) {
          ctx.fillRect(bX + 8, wy, 6, 6);
          ctx.fillRect(bX + 26, wy, 6, 6);
        }
      }

      // 4. Perspective Wet Highway Road
      const roadTop = 230;
      const roadBottom = h;
      const roadWTop = 110;
      const roadWBottom = 620;

      // Wet asphalt surface
      const roadGrad = ctx.createLinearGradient(0, roadTop, 0, roadBottom);
      roadGrad.addColorStop(0, '#0d0d1a');
      roadGrad.addColorStop(1, '#06070f');
      ctx.fillStyle = roadGrad;

      ctx.beginPath();
      ctx.moveTo(w / 2 - roadWTop / 2 + s.curve * 0.35, roadTop);
      ctx.lineTo(w / 2 + roadWTop / 2 + s.curve * 0.35, roadTop);
      ctx.lineTo(w / 2 + roadWBottom / 2, roadBottom);
      ctx.lineTo(w / 2 - roadWBottom / 2, roadBottom);
      ctx.closePath();
      ctx.fill();

      // Neon Guardrail Barriers
      // Left Barrier (Cyan Glow)
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(w / 2 - roadWTop / 2 + s.curve * 0.35, roadTop);
      ctx.lineTo(w / 2 - roadWBottom / 2, roadBottom);
      ctx.stroke();

      // Right Barrier (Neon Magenta Glow)
      ctx.strokeStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.beginPath();
      ctx.moveTo(w / 2 + roadWTop / 2 + s.curve * 0.35, roadTop);
      ctx.lineTo(w / 2 + roadWBottom / 2, roadBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Road Grid Lines & Perspective Lane Markings
      for (let y = roadTop; y < roadBottom; y += 26) {
        const p = (y - roadTop) / (roadBottom - roadTop);
        const curY = y + (s.roadOffset * p);
        if (curY > roadBottom) continue;
        const curW = roadWTop + (roadWBottom - roadWTop) * p;
        const cOffset = s.curve * 0.35 * (1 - p);

        // Center dashes
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 + p * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(w / 2 + cOffset - 5, curY);
        ctx.lineTo(w / 2 + cOffset + 5, curY);
        ctx.stroke();

        // Outer lane dashes
        ctx.strokeStyle = `rgba(255, 0, 127, ${0.15 + p * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(w / 2 - curW * 0.25 + cOffset, curY);
        ctx.lineTo(w / 2 - curW * 0.25 + cOffset + 8, curY);
        ctx.moveTo(w / 2 + curW * 0.25 + cOffset - 8, curY);
        ctx.lineTo(w / 2 + curW * 0.25 + cOffset, curY);
        ctx.stroke();
      }

      // 5. Rain Drops with Reflections
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1.2;
      s.rainDrops.forEach(r => {
        r.y += r.speed;
        if (r.y > h) {
          r.y = -20;
          r.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x + s.curve * 0.05, r.y + r.len);
        ctx.stroke();
      });

      // 6. Particles (Tire Smoke, Sparks, Speedlines)
      for (let pIdx = s.particles.length - 1; pIdx >= 0; pIdx--) {
        const p = s.particles[pIdx];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / p.maxLife;

        if (p.type === 'speedline') {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + 40);
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

      // 7. Opponents (Realistic perspective sports cars)
      s.opponents.forEach(op => {
        op.y += s.carSpeed - op.speed;

        if (op.y > h + 80) {
          // Generous vertical spacing for early game
          const spawnDelay = s.score < 800 ? 600 + Math.random() * 500 : 350 + Math.random() * 400;
          op.y = -spawnDelay;
          op.x = (Math.random() - 0.5) * 300;
          op.speed = 3.6 + Math.min(2.8, s.score / 4500);
        }

        if (op.y > 100 && op.y < h + 20) {
          const opScale = Math.max(0.3, (op.y - roadTop) / (roadBottom - roadTop));
          const opW = op.width * opScale * 1.3;
          const opH = op.height * opScale * 1.3;
          const opScreenX = w / 2 + op.x * opScale;

          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(opScreenX - opW / 2 - 2, op.y + opH / 2 - 4, opW + 4, 8);

          // Body
          ctx.fillStyle = op.color;
          ctx.beginPath();
          ctx.roundRect(opScreenX - opW / 2, op.y - opH / 2, opW, opH, 4 * opScale);
          ctx.fill();

          // Roof / Windshield
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(opScreenX - opW * 0.35, op.y - opH * 0.25, opW * 0.7, opH * 0.45);

          // Glowing Taillights
          ctx.fillStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.shadowBlur = 8 * opScale;
          ctx.fillRect(opScreenX - opW / 2 + 2, op.y + opH / 2 - 4 * opScale, 6 * opScale, 4 * opScale);
          ctx.fillRect(opScreenX + opW / 2 - 8 * opScale, op.y + opH / 2 - 4 * opScale, 6 * opScale, 4 * opScale);
          ctx.shadowBlur = 0;

          // Collision Detection with Shield Absorption
          const playerY = h - 90;
          const playerW = 40;
          const playerH = 75;
          const playerScreenX = w / 2 + s.carX;

          if (
            Math.abs(playerScreenX - opScreenX) < (playerW + opW) / 2.2 &&
            Math.abs(playerY - op.y) < (playerH + opH) / 2.2
          ) {
            if (s.invulnTimer <= 0) {
              s.shield = Math.max(0, s.shield - 34);
              setShield(Math.floor(s.shield));
              s.invulnTimer = 60; // 1s invulnerability
              s.screenShake = 6;
              sound.playHit();

              // Spawn impact sparks
              for (let sp = 0; sp < 10; sp++) {
                s.particles.push({
                  x: playerScreenX,
                  y: playerY,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  size: 3,
                  color: '#00f0ff',
                  alpha: 1,
                  life: 20,
                  maxLife: 20,
                  type: 'spark'
                });
              }

              // Bump opponent away
              op.y -= 150;

              if (s.shield <= 0) {
                sound.playExplosion();
                handleGameOver(s.score);
              }
            }
          }
        }
      });

      // Slowly repair shield during clean driving
      if (s.shield > 0 && s.shield < 100 && Math.random() < 0.05) {
        s.shield = Math.min(100, s.shield + 0.5);
        setShield(Math.floor(s.shield));
      }

      // 8. Player Supercar (High detail rendering)
      const pX = w / 2 + s.carX;
      const pY = h - 90;

      ctx.save();
      ctx.translate(pX, pY);
      if (s.invulnTimer > 0 && Math.floor(s.invulnTimer / 4) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }
      ctx.rotate(s.driftAngle);

      // Headlight Beams illuminating the wet asphalt ahead
      const headBeam = ctx.createLinearGradient(0, -35, 0, -220);
      headBeam.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
      headBeam.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = headBeam;
      ctx.beginPath();
      ctx.moveTo(-16, -35);
      ctx.lineTo(-45, -200);
      ctx.lineTo(45, -200);
      ctx.lineTo(16, -35);
      ctx.closePath();
      ctx.fill();

      // Nitro Flame Exhaust
      if (s.nitroActive) {
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.moveTo(-10, 38);
        ctx.lineTo(0, 75 + Math.random() * 25);
        ctx.lineTo(10, 38);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-5, 38);
        ctx.lineTo(0, 55);
        ctx.lineTo(5, 38);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Neon Underglow
      ctx.fillStyle = s.nitroActive ? 'rgba(0, 240, 255, 0.8)' : 'rgba(255, 0, 127, 0.6)';
      ctx.shadowColor = s.nitroActive ? '#00f0ff' : '#ff007f';
      ctx.shadowBlur = 20;
      ctx.fillRect(-24, -34, 48, 70);
      ctx.shadowBlur = 0;

      // Realistic Supercar Chassis
      ctx.fillStyle = '#090a14'; // Carbon base
      ctx.beginPath();
      ctx.roundRect(-22, -38, 44, 76, 6);
      ctx.fill();

      // Body Panels (Cyber Blue / Matte Black)
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-20, -36, 40, 72, 5);
      ctx.fill();

      // Cyber Racing Stripes
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-4, -36, 8, 72);

      // Glass Cockpit / Windshield
      ctx.fillStyle = '#0c1222';
      ctx.beginPath();
      ctx.roundRect(-14, -18, 28, 30, 4);
      ctx.fill();

      // Cockpit reflection
      ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.fillRect(-10, -14, 8, 22);

      // Aerodynamic Rear Wing / Spoiler
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(-22, 30, 44, 6);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-24, 28, 4, 10);
      ctx.fillRect(20, 28, 4, 10);

      // Glowing Tail Bar
      ctx.fillStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 12;
      ctx.fillRect(-18, 34, 36, 3.5);
      ctx.shadowBlur = 0;

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#05070d] text-white select-none overflow-hidden font-sans">
      {/* PROFESSIONAL RACING HUD */}
      <div className="w-full max-w-4xl px-4 py-3 flex items-center justify-between z-20 border-b border-[#1e293b] bg-[#0c101c]/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onBack ? onBack() : setGameState('START')}
            className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-display font-black text-sm text-white tracking-wider">NEON DRIFT</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-[#00f0ff] font-mono text-[10px] font-bold">
                TOKYO NIGHTS
              </span>
            </div>
          </div>
        </div>

        {/* METERS & GAUGES */}
        <div className="flex items-center gap-6">
          {/* Speedometer */}
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[#00f0ff]" />
            <span className="font-mono text-sm font-black text-white">{speed}</span>
            <span className="font-mono text-[10px] text-slate-400">KM/H</span>
          </div>

          {/* Shield / Armor */}
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150"
                style={{ width: `${Math.max(0, shield)}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-emerald-300 w-7">{shield}%</span>
          </div>

          {/* Nitro Tank */}
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-cyan-400 fill-current" />
            <div className="w-20 h-2.5 rounded-full bg-[#1e293b] overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-[#00f0ff] transition-all duration-100"
                style={{ width: `${Math.max(0, nitro)}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-cyan-300 w-7">{nitro}%</span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-black text-sm text-amber-300">{score.toLocaleString()}</span>
          </div>

          {/* Audio & Pause */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev)}
              className="p-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-slate-400 hover:text-white cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RACING CANVAS STAGE */}
      <div className="relative w-full max-w-4xl aspect-[4/3] max-h-[600px] border border-[#1e293b] bg-black shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain"
        />

        {/* DRIFT MULTIPLIER POPUP */}
        {gameState === 'PLAYING' && driftPoints > 0 && (
          <div className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 backdrop-blur-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00f0ff] animate-spin" />
            <span className="font-mono font-black text-sm text-[#00f0ff]">+{driftPoints} DRIFT PTS</span>
          </div>
        )}

        {/* START SCREEN */}
        {gameState === 'START' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-950/50">
              <Zap className="w-8 h-8" />
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wider mb-2">
              NEON DRIFT
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 font-mono">
              High-octane cyberpunk highway racing. Drift tight corners, weave between traffic, and ignite nitro boost.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md w-full mb-6 text-left">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Steering</span>
                <p className="text-xs font-bold text-white mt-0.5">A / D or Left / Right Arrows</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Throttle / Brake</span>
                <p className="text-xs font-bold text-white mt-0.5">W / S or Up / Down</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800 col-span-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Nitro Boost</span>
                <p className="text-xs font-bold text-cyan-400 mt-0.5">Hold SPACEBAR for Maximum Velocity</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-xl shadow-cyan-950/50 transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>IGNITE ENGINES</span>
            </button>
          </div>
        )}

        {/* PAUSE SCREEN */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-[#080b12]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="font-display font-black text-2xl text-white tracking-wide mb-4">RACE PAUSED</h2>
            <div className="flex flex-col gap-3 w-48">
              <button
                onClick={() => setGameState('PLAYING')}
                className="py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                RESUME RACE
              </button>
              <button
                onClick={startGame}
                className="py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs cursor-pointer"
              >
                RESTART RACE
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-3">
              <Trophy className="w-7 h-7" />
            </div>
            <h2 className="font-display font-black text-3xl text-white tracking-wide">VEHICLE CRASH</h2>
            <p className="text-xs text-slate-400 font-mono mt-1 mb-6">Highway Run Ended</p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Distance</span>
                <p className="text-sm font-black text-amber-300 mt-0.5">{score.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Drift Score</span>
                <p className="text-sm font-black text-cyan-400 mt-0.5">+{driftPoints}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#131826] border border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Best Record</span>
                <p className="text-sm font-black text-emerald-400 mt-0.5">{highScore.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RACE AGAIN</span>
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-6 py-3 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white font-bold text-xs cursor-pointer"
                >
                  EXIT TO HUB
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
