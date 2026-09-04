import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Ghost, Flame, Key, Trophy, Shield, Sparkles } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface SpectralGhost {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  wobble: number;
  speed: number;
  glow: string;
}

interface Candle {
  x: number;
  y: number;
  lit: boolean;
  pulse: number;
}

export const HauntedHouseGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [score, setScore] = useState(0);
  const [candlesLit, setCandlesLit] = useState(0);
  const [sanity, setSanity] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_haunted-house') || '0', 10);
  });

  const stateRef = useRef({
    investigator: {
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      radius: 16,
      angle: 0,
      flashlightAngle: 0,
      flashlightRadius: 130
    },
    ghosts: [] as SpectralGhost[],
    candles: [] as Candle[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; alpha: number; life: number }[],
    keys: { left: false, right: false, up: false, down: false },
    sanity: 100,
    score: 0,
    candlesLit: 0,
    time: 0
  });

  const handleGameOver = useCallback((won: boolean) => {
    const s = stateRef.current;
    if (won) {
      sound.playPowerUp();
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      setGameState('victory');
      s.score += 2000;
    } else {
      sound.playGameOver();
      setGameState('gameover');
    }

    if (s.score > highScore) {
      setHighScore(s.score);
      localStorage.setItem('gamenova_hs_haunted-house', s.score.toString());
    }
    if (onGameOver) onGameOver(s.score);
  }, [highScore, onGameOver]);

  const startGame = useCallback(() => {
    sound.playClick();
    // 5 Sacred candles placed around the manor
    const candles: Candle[] = [
      { x: 120, y: 110, lit: false, pulse: 0 },
      { x: 680, y: 110, lit: false, pulse: 1 },
      { x: 400, y: 90, lit: false, pulse: 2 },
      { x: 130, y: 440, lit: false, pulse: 3 },
      { x: 670, y: 440, lit: false, pulse: 4 }
    ];

    // Slow starting ghosts (speed 0.8 - 1.2 for plenty of reaction time)
    const ghosts: SpectralGhost[] = [
      { id: 1, x: 140, y: 160, vx: 0.8, vy: 0.6, hp: 100, maxHp: 100, radius: 22, wobble: 0, speed: 0.9, glow: '#c084fc' },
      { id: 2, x: 660, y: 380, vx: -0.7, vy: 0.7, hp: 100, maxHp: 100, radius: 22, wobble: 2, speed: 0.85, glow: '#38bdf8' },
      { id: 3, x: 400, y: 180, vx: 0.5, vy: -0.8, hp: 100, maxHp: 100, radius: 22, wobble: 4, speed: 0.95, glow: '#f43f5e' }
    ];

    stateRef.current = {
      investigator: {
        x: 400,
        y: 320,
        vx: 0,
        vy: 0,
        radius: 16,
        angle: 0,
        flashlightAngle: 0,
        flashlightRadius: 130
      },
      ghosts,
      candles,
      particles: [],
      keys: { left: false, right: false, up: false, down: false },
      sanity: 100,
      score: 0,
      candlesLit: 0,
      time: 0
    };

    setScore(0);
    setCandlesLit(0);
    setSanity(100);
    setGameState('playing');
  }, []);

  // Keyboard controls
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

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      const inv = stateRef.current.investigator;
      inv.flashlightAngle = Math.atan2(my - inv.y, mx - inv.x);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;
      const inv = s.investigator;
      const w = canvas.width;
      const h = canvas.height;
      s.time += 0.016;

      // Investigator Movement
      let moveX = 0;
      let moveY = 0;
      if (s.keys.left) moveX -= 1;
      if (s.keys.right) moveX += 1;
      if (s.keys.up) moveY -= 1;
      if (s.keys.down) moveY += 1;

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        inv.x += (moveX / len) * 3.5;
        inv.y += (moveY / len) * 3.5;
      }

      // Keep within manor walls
      inv.x = Math.max(50, Math.min(w - 50, inv.x));
      inv.y = Math.max(50, Math.min(h - 50, inv.y));

      // Light Candles near investigator
      s.candles.forEach(c => {
        if (!c.lit && Math.hypot(inv.x - c.x, inv.y - c.y) < 36) {
          c.lit = true;
          sound.playPowerUp();
          s.candlesLit++;
          setCandlesLit(s.candlesLit);
          s.score += 500;
          setScore(s.score);

          // Candle sparks
          for (let p = 0; p < 16; p++) {
            s.particles.push({
              x: c.x,
              y: c.y - 10,
              vx: (Math.random() - 0.5) * 5,
              vy: -Math.random() * 4 - 1,
              color: '#facc15',
              alpha: 1,
              life: 30
            });
          }

          // Check Victory
          if (s.candlesLit >= s.candles.length) {
            handleGameOver(true);
            return;
          }
        }
      });

      // Update Ghosts
      s.ghosts.forEach(gh => {
        gh.wobble += 0.04;
        gh.x += gh.vx + Math.sin(gh.wobble) * 0.4;
        gh.y += gh.vy + Math.cos(gh.wobble) * 0.4;

        if (gh.x < 70 || gh.x > w - 70) gh.vx *= -1;
        if (gh.y < 70 || gh.y > h - 70) gh.vy *= -1;

        // Check if Illuminated by Flashlight Beam
        const dist = Math.hypot(gh.x - inv.x, gh.y - inv.y);
        const angleToGhost = Math.atan2(gh.y - inv.y, gh.x - inv.x);
        let angleDiff = Math.abs(angleToGhost - inv.flashlightAngle);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

        const inBeam = dist < inv.flashlightRadius && angleDiff < 0.45;

        if (inBeam) {
          // Banish ghost
          gh.hp -= 1.8;
          if (gh.hp <= 0) {
            sound.playExplosion();
            gh.x = Math.random() < 0.5 ? 80 : w - 80;
            gh.y = Math.random() < 0.5 ? 80 : h - 80;
            gh.hp = 100;
            s.score += 350;
            setScore(s.score);

            for (let p = 0; p < 20; p++) {
              s.particles.push({
                x: gh.x,
                y: gh.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: gh.glow,
                alpha: 1,
                life: 35
              });
            }
          }
        }

        // Proximity sanity drain if ghost touches player
        if (dist < inv.radius + gh.radius) {
          s.sanity = Math.max(0, s.sanity - 0.6);
          setSanity(Math.floor(s.sanity));
          if (s.sanity <= 0) {
            handleGameOver(false);
            return;
          }
        }
      });

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = p.life / 30;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, w, h);

      // 1. Manor Floor Pattern
      ctx.fillStyle = '#060409';
      ctx.fillRect(0, 0, w, h);

      // Floor tiles
      ctx.strokeStyle = '#171124';
      ctx.lineWidth = 1;
      for (let x = 40; x < w - 40; x += 40) {
        for (let y = 40; y < h - 40; y += 40) {
          ctx.strokeRect(x, y, 40, 40);
        }
      }

      // Manor outer walls & architraves
      ctx.strokeStyle = '#2e1065';
      ctx.lineWidth = 8;
      ctx.strokeRect(40, 40, w - 80, h - 80);

      // 2. Draw Candles
      s.candles.forEach(c => {
        c.pulse += 0.08;
        // Candlestick base
        ctx.fillStyle = '#78350f';
        ctx.fillRect(c.x - 4, c.y - 12, 8, 16);

        if (c.lit) {
          // Flame glow
          const flameGrad = ctx.createRadialGradient(c.x, c.y - 16, 2, c.x, c.y - 16, 60);
          flameGrad.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
          flameGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.arc(c.x, c.y - 16, 60, 0, Math.PI * 2);
          ctx.fill();

          // Animated Flame core
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(c.x + Math.sin(c.pulse) * 1.5, c.y - 18, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Unlit marker
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.arc(c.x, c.y - 16, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 3. Draw Ghosts
      s.ghosts.forEach(gh => {
        ctx.save();
        ctx.shadowColor = gh.glow;
        ctx.shadowBlur = 18;
        ctx.fillStyle = `rgba(241, 245, 249, ${Math.max(0.25, gh.hp / 100)})`;

        // Ghost body contour
        ctx.beginPath();
        ctx.arc(gh.x, gh.y - 6, gh.radius, Math.PI, 0);
        ctx.lineTo(gh.x + gh.radius, gh.y + 14);
        ctx.lineTo(gh.x + gh.radius * 0.4, gh.y + 8);
        ctx.lineTo(gh.x, gh.y + 14);
        ctx.lineTo(gh.x - gh.radius * 0.4, gh.y + 8);
        ctx.lineTo(gh.x - gh.radius, gh.y + 14);
        ctx.closePath();
        ctx.fill();

        // Ghost eyes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(gh.x - 6, gh.y - 6, 3, 0, Math.PI * 2);
        ctx.arc(gh.x + 6, gh.y - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 4. Darkness & Flashlight Mask
      const darkMask = ctx.createRadialGradient(
        inv.x, inv.y, 25,
        inv.x, inv.y, inv.flashlightRadius
      );
      darkMask.addColorStop(0, 'rgba(0, 0, 0, 0)');
      darkMask.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
      darkMask.addColorStop(1, 'rgba(0, 0, 0, 0.92)');

      ctx.fillStyle = darkMask;
      ctx.fillRect(0, 0, w, h);

      // Flashlight Cone
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(inv.x, inv.y);
      ctx.arc(inv.x, inv.y, inv.flashlightRadius + 20, inv.flashlightAngle - 0.45, inv.flashlightAngle + 0.45);
      ctx.closePath();

      const coneGrad = ctx.createRadialGradient(inv.x, inv.y, 10, inv.x, inv.y, inv.flashlightRadius);
      coneGrad.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
      coneGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = coneGrad;
      ctx.fill();
      ctx.restore();

      // 5. Draw Investigator
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(inv.x, inv.y, inv.radius, 0, Math.PI * 2);
      ctx.fill();

      // Investigator Hat / Coat
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Flashlight in hand
      const fx = inv.x + Math.cos(inv.flashlightAngle) * 16;
      const fy = inv.y + Math.sin(inv.flashlightAngle) * 16;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();

      // 6. Draw Particles
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center border border-purple-900/40 shadow-2xl select-none">
      <canvas ref={canvasRef} width={800} height={550} className="w-full h-full object-contain cursor-crosshair" />

      {/* Top HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-3">
            {/* Sanity Bar */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xl">
              <Shield className="w-4 h-4 text-cyan-400" />
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${sanity}%` }} />
              </div>
              <span className="text-xs font-bold font-mono text-cyan-200">{sanity}%</span>
            </div>

            {/* Candles Lit Count */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold font-mono text-amber-300">
                Candles: {candlesLit} / 5
              </span>
            </div>
          </div>

          {/* Score */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-purple-500/30 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-purple-400/80 block uppercase tracking-wider">Score</span>
            <span className="text-sm font-black font-mono text-purple-300">{score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl shadow-amber-500/20">
            <Ghost className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">HAUNTED HOUSE</h2>
          <p className="text-xs text-purple-200/80 max-w-md mt-2 leading-relaxed font-mono">
            Explore the haunted manor corridors! Aim your UV flashlight to banish roaming spectral ghosts and light all 5 sacred candles to cleanse the mansion.
          </p>

          <div className="flex items-center gap-3 mt-4 text-xs text-slate-300 font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">W A S D = Move</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">Mouse = Aim Flashlight</span>
          </div>

          <button
            onClick={startGame}
            className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ENTER MANOR</span>
          </button>
        </div>
      )}

      {/* Victory Screen */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/20">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">MANOR CLEANSED!</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">All 5 sacred candles have been ignited.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Final Score</span>
            <span className="text-2xl font-black font-mono text-amber-300 mt-0.5 block">{score.toLocaleString()}</span>
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
            <Ghost className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">SANITY DEPLETED</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">The spirits overtook your flashlight.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Score</span>
            <span className="text-2xl font-black font-mono text-purple-300 mt-0.5 block">{score.toLocaleString()}</span>
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
