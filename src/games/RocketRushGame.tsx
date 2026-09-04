import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Rocket, Shield, Sparkles } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface CosmicOrb {
  x: number;
  y: number;
  r: number;
  vy: number;
  pulse: number;
}

export const RocketRushGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_rocket-rush') || '0', 10);
  });

  const stateRef = useRef({
    rocket: { x: 300, y: 380, vx: 0, vy: 0, invulnerable: 0 },
    asteroids: [] as { x: number; y: number; r: number; vy: number; rot: number; rotSpeed: number }[],
    orbs: [] as CosmicOrb[],
    stars: [] as Star[],
    thrustParticles: [] as { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[],
    score: 0,
    shields: 3,
    keys: { left: false, right: false, up: false, down: false },
    time: 0
  });

  const startGame = useCallback(() => {
    sound.playClick();
    const stars: Star[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * 600,
      y: Math.random() * 500,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 2 + 1,
      alpha: Math.random() * 0.7 + 0.3
    }));

    stateRef.current = {
      rocket: { x: 300, y: 380, vx: 0, vy: 0, invulnerable: 0 },
      asteroids: [],
      orbs: [],
      stars,
      thrustParticles: [],
      score: 0,
      shields: 3,
      keys: { left: false, right: false, up: false, down: false },
      time: 0
    };
    setScore(0);
    setShields(3);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_rocket-rush', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;
      const r = s.rocket;
      const w = canvas.width;
      const h = canvas.height;
      s.time += 0.016;

      // Rocket Controls with smooth acceleration
      if (s.keys.left) r.vx = Math.max(-6, r.vx - 0.6);
      else if (s.keys.right) r.vx = Math.min(6, r.vx + 0.6);
      else r.vx *= 0.88;

      if (s.keys.up) r.vy = Math.max(-5, r.vy - 0.5);
      else if (s.keys.down) r.vy = Math.min(5, r.vy + 0.5);
      else r.vy *= 0.88;

      r.x += r.vx;
      r.y += r.vy;
      r.x = Math.max(25, Math.min(w - 25, r.x));
      r.y = Math.max(40, Math.min(h - 40, r.y));

      s.score += 1;
      setScore(s.score);

      if (r.invulnerable > 0) r.invulnerable--;

      // Thrust Flame Particles
      s.thrustParticles.push({
        x: r.x + (Math.random() - 0.5) * 6,
        y: r.y + 18,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 3 + Math.random() * 3,
        size: 3 + Math.random() * 3,
        alpha: 0.9,
        color: Math.random() > 0.4 ? '#f97316' : '#38bdf8'
      });

      // Spawn Energy Orbs
      if (Math.random() < 0.02) {
        s.orbs.push({
          x: 30 + Math.random() * (w - 60),
          y: -20,
          r: 10,
          vy: 2.0,
          pulse: 0
        });
      }

      // Update Energy Orbs
      for (let i = s.orbs.length - 1; i >= 0; i--) {
        const orb = s.orbs[i];
        orb.y += orb.vy;
        orb.pulse += 0.08;

        if (Math.hypot(orb.x - r.x, orb.y - r.y) < orb.r + 16) {
          sound.playCoin();
          s.score += 200;
          setScore(s.score);
          s.orbs.splice(i, 1);
          continue;
        }

        if (orb.y > h + 30) s.orbs.splice(i, 1);
      }

      // Spawn Asteroids (Gentle start: slow speed and comfortable spacing for first 30s)
      const spawnRate = Math.min(0.04, 0.012 + (s.score / 3500) * 0.028);
      if (Math.random() < spawnRate) {
        s.asteroids.push({
          x: 25 + Math.random() * (w - 50),
          y: -40,
          r: 14 + Math.random() * 18,
          vy: 1.3 + Math.random() * 1.2 + Math.min(2.0, (s.score / 2500) * 1.5),
          rot: 0,
          rotSpeed: (Math.random() - 0.5) * 0.05
        });
      }

      // Update Asteroids
      for (let aIdx = s.asteroids.length - 1; aIdx >= 0; aIdx--) {
        const ast = s.asteroids[aIdx];
        ast.y += ast.vy;
        ast.rot += ast.rotSpeed;

        // Collision detection
        if (r.invulnerable <= 0 && Math.hypot(ast.x - r.x, ast.y - r.y) < ast.r + 14) {
          s.asteroids.splice(aIdx, 1);
          sound.playExplosion();
          s.shields--;
          setShields(s.shields);
          r.invulnerable = 60; // 1s safety
          if (s.shields <= 0) {
            handleGameOver(s.score);
            return;
          }
          continue;
        }

        if (ast.y > h + 50) s.asteroids.splice(aIdx, 1);
      }

      // Update Thrust Particles
      for (let i = s.thrustParticles.length - 1; i >= 0; i--) {
        const tp = s.thrustParticles[i];
        tp.x += tp.vx;
        tp.y += tp.vy;
        tp.alpha -= 0.04;
        if (tp.alpha <= 0) s.thrustParticles.splice(i, 1);
      }

      // Update Stars
      s.stars.forEach(st => {
        st.y += st.speed;
        if (st.y > h) {
          st.y = 0;
          st.x = Math.random() * w;
        }
      });

      // --- RENDER ---
      ctx.clearRect(0, 0, w, h);

      // Deep Space Canvas
      const spaceGrad = ctx.createLinearGradient(0, 0, 0, h);
      spaceGrad.addColorStop(0, '#04010a');
      spaceGrad.addColorStop(0.5, '#0b041a');
      spaceGrad.addColorStop(1, '#060210');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      s.stars.forEach(st => {
        ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha})`;
        ctx.fillRect(st.x, st.y, st.size, st.size);
      });

      // Thrust Particles
      s.thrustParticles.forEach(tp => {
        ctx.fillStyle = tp.color;
        ctx.globalAlpha = tp.alpha;
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Energy Orbs
      s.orbs.forEach(orb => {
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r + Math.sin(orb.pulse) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Asteroids
      s.asteroids.forEach(ast => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rot);
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ast.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Crater detail
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(ast.r * 0.3, ast.r * 0.3, ast.r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Rocket Ship
      if (r.invulnerable % 4 < 2) {
        ctx.save();
        ctx.translate(r.x, r.y);

        // Wings
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.moveTo(-16, 12);
        ctx.lineTo(-24, 20);
        ctx.lineTo(-12, 18);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(16, 12);
        ctx.lineTo(24, 20);
        ctx.lineTo(12, 18);
        ctx.closePath();
        ctx.fill();

        // Hull
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(14, 16);
        ctx.lineTo(-14, 16);
        ctx.closePath();
        ctx.fill();

        // Cockpit Glass
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(0, -4, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center border border-indigo-500/20 shadow-2xl select-none">
      <canvas ref={canvasRef} width={600} height={500} className="w-full h-full object-contain" />

      {/* Top HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-3 py-1.5 rounded-xl">
            <Shield className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold font-mono text-rose-300">{shields} SHIELDS</span>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-indigo-400/80 block uppercase tracking-wider">Score</span>
            <span className="text-sm font-black font-mono text-indigo-300">{score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-500/20">
            <Rocket className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">ROCKET RUSH</h2>
          <p className="text-xs text-indigo-200/80 max-w-md mt-2 leading-relaxed font-mono">
            Pilot your spaceship through deep space! Dodge slow drifting asteroids and collect glowing cosmic orbs.
          </p>

          <div className="flex items-center gap-3 mt-4 text-xs text-slate-300 font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">W A S D / Arrows = Fly</span>
          </div>

          <button
            onClick={startGame}
            className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>LAUNCH MISSION</span>
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
            <Rocket className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">SHIP DESTROYED</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">Hull integrity failed.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Final Flight Distance</span>
            <span className="text-2xl font-black font-mono text-indigo-300 mt-0.5 block">{score.toLocaleString()}</span>
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RETRY MISSION</span>
          </button>
        </div>
      )}
    </div>
  );
};
