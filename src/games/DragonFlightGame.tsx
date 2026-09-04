import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Flame, Trophy, Shield, Heart } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const DragonFlightGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_dragon-flight') || '0', 10);
  });

  const stateRef = useRef({
    dragon: {
      x: 120,
      y: 220,
      vy: 0,
      radius: 20,
      flap: -6.2,
      gravity: 0.28,
      wingAngle: 0,
      fireTimer: 0,
      invulnerable: 0
    },
    pillars: [] as { x: number; top: number; bottom: number; passed: boolean; color: string }[],
    fireballs: [] as { x: number; y: number; vx: number; radius: number }[],
    enemies: [] as { x: number; y: number; vx: number; radius: number; hp: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number }[],
    stars: [] as { x: number; y: number; size: number; alpha: number }[],
    score: 0,
    hearts: 3,
    frame: 0
  });

  const flap = useCallback(() => {
    const s = stateRef.current;
    s.dragon.vy = s.dragon.flap;
    sound.playJump();

    // Wing embers
    for (let i = 0; i < 6; i++) {
      s.particles.push({
        x: s.dragon.x - 20,
        y: s.dragon.y + 6,
        vx: -Math.random() * 4 - 2,
        vy: (Math.random() - 0.5) * 4,
        color: '#f97316',
        life: 20,
        size: 3.5
      });
    }
  }, []);

  const breatheFire = useCallback(() => {
    const s = stateRef.current;
    sound.playLaser(700);
    s.dragon.fireTimer = 15;
    s.fireballs.push({
      x: s.dragon.x + 30,
      y: s.dragon.y - 2,
      vx: 12,
      radius: 10
    });
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const stars = Array.from({ length: 40 }, () => ({
      x: Math.random() * 640,
      y: Math.random() * 480,
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.7
    }));

    stateRef.current = {
      dragon: {
        x: 120,
        y: 220,
        vy: 0,
        radius: 20,
        flap: -6.2,
        gravity: 0.28,
        wingAngle: 0,
        fireTimer: 0,
        invulnerable: 0
      },
      pillars: [],
      fireballs: [],
      enemies: [],
      particles: [],
      stars,
      score: 0,
      hearts: 3,
      frame: 0
    };

    setScore(0);
    setHearts(3);
    setGameState('playing');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('gameover');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_dragon-flight', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        flap();
      }
      if (['KeyF', 'KeyJ', 'KeyX'].includes(e.code)) {
        e.preventDefault();
        breatheFire();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, flap, breatheFire]);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const s = stateRef.current;
      const d = s.dragon;
      const w = canvas.width;
      const h = canvas.height;
      s.frame++;

      // Dragon Physics
      d.vy += d.gravity;
      d.y += d.vy;
      d.wingAngle += 0.25;

      if (d.fireTimer > 0) d.fireTimer--;

      // Check Bounds
      if (d.y - d.radius < 0) {
        d.y = d.radius;
        d.vy = 0;
      }
      if (d.y + d.radius > h) {
        if (d.invulnerable <= 0) {
          s.hearts--;
          setHearts(s.hearts);
          sound.playHit();
          d.vy = -7;
          d.invulnerable = 60;
          if (s.hearts <= 0) {
            handleGameOver(s.score);
            return;
          }
        } else {
          d.y = h - d.radius;
          d.vy = -4;
        }
      }

      if (d.invulnerable > 0) d.invulnerable--;

      // Spawn Pillars (Gradual difficulty: generous 190 gap at start, tapering to 155)
      if (s.frame % Math.max(90, 125 - Math.floor(s.score / 600) * 6) === 0) {
        const gap = Math.max(155, 195 - Math.floor(s.score / 500) * 8);
        const minH = 50;
        const maxH = h - gap - minH;
        const top = Math.random() * (maxH - minH) + minH;
        s.pillars.push({
          x: w,
          top,
          bottom: h - top - gap,
          passed: false,
          color: Math.random() > 0.5 ? '#7e22ce' : '#0369a1'
        });
      }

      // Spawn Wyvern Enemies (after score > 400)
      if (s.score > 400 && s.frame % 180 === 0) {
        s.enemies.push({
          x: w + 20,
          y: 60 + Math.random() * (h - 120),
          vx: -(2.2 + Math.random() * 1.5),
          radius: 16,
          hp: 1
        });
      }

      // Update Pillars
      const scrollSpeed = 2.4 + Math.min(1.2, (s.score / 2000) * 1.0);
      for (let i = s.pillars.length - 1; i >= 0; i--) {
        const p = s.pillars[i];
        p.x -= scrollSpeed;

        // Score
        if (!p.passed && p.x + 50 < d.x) {
          p.passed = true;
          s.score += 100;
          setScore(s.score);
          sound.playCoin();
        }

        // Collision with Pillars
        if (
          d.invulnerable <= 0 &&
          d.x + d.radius > p.x &&
          d.x - d.radius < p.x + 50 &&
          (d.y - d.radius < p.top || d.y + d.radius > h - p.bottom)
        ) {
          s.hearts--;
          setHearts(s.hearts);
          sound.playExplosion();
          d.invulnerable = 70; // 1.1s invulnerability
          d.vy = -4;
          if (s.hearts <= 0) {
            handleGameOver(s.score);
            return;
          }
        }

        if (p.x < -60) s.pillars.splice(i, 1);
      }

      // Update Fireballs
      for (let i = s.fireballs.length - 1; i >= 0; i--) {
        const fb = s.fireballs[i];
        fb.x += fb.vx;

        // Trail
        s.particles.push({
          x: fb.x,
          y: fb.y,
          vx: -2,
          vy: (Math.random() - 0.5) * 2,
          color: '#fbbf24',
          life: 12,
          size: 3
        });

        // Hit Enemies
        s.enemies.forEach((enemy, eIdx) => {
          if (Math.hypot(fb.x - enemy.x, fb.y - enemy.y) < fb.radius + enemy.radius) {
            enemy.hp--;
            s.fireballs.splice(i, 1);
            sound.playExplosion();
            if (enemy.hp <= 0) {
              s.enemies.splice(eIdx, 1);
              s.score += 250;
              setScore(s.score);
            }
          }
        });

        if (fb.x > w + 40) s.fireballs.splice(i, 1);
      }

      // Update Enemies
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const enemy = s.enemies[i];
        enemy.x += enemy.vx;
        enemy.y += Math.sin(s.frame * 0.08) * 1.5;

        // Collision with Dragon
        if (d.invulnerable <= 0 && Math.hypot(d.x - enemy.x, d.y - enemy.y) < d.radius + enemy.radius) {
          s.enemies.splice(i, 1);
          s.hearts--;
          setHearts(s.hearts);
          sound.playHit();
          d.invulnerable = 60;
          if (s.hearts <= 0) {
            handleGameOver(s.score);
            return;
          }
          continue;
        }

        if (enemy.x < -40) s.enemies.splice(i, 1);
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // RENDER
      // 1. Twilight Mountain Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0f051d');
      skyGrad.addColorStop(0.5, '#2e1065');
      skyGrad.addColorStop(1, '#c2410c');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      s.stars.forEach(st => {
        ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha})`;
        ctx.fillRect(st.x, st.y, st.size, st.size);
      });

      // Distant Volcanoes
      ctx.fillStyle = '#1e0524';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(80, 260);
      ctx.lineTo(180, h);
      ctx.lineTo(260, 240);
      ctx.lineTo(380, h);
      ctx.lineTo(520, 210);
      ctx.lineTo(640, h);
      ctx.fill();

      // Pillars (Crystal Spandrels)
      s.pillars.forEach(p => {
        ctx.fillStyle = p.color;
        // Top Pillar
        ctx.fillRect(p.x, 0, 50, p.top);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x, 0, 50, p.top);

        // Bottom Pillar
        ctx.fillRect(p.x, h - p.bottom, 50, p.bottom);
        ctx.strokeRect(p.x, h - p.bottom, 50, p.bottom);

        // Crystal Runes
        ctx.fillStyle = '#fde047';
        ctx.fillRect(p.x + 20, p.top - 20, 10, 10);
        ctx.fillRect(p.x + 20, h - p.bottom + 10, 10, 10);
      });

      // Render Enemies (Flying Dark Wyverns)
      s.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-6, -4, 4, 4);

        // Bat Wings
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, -e.radius);
        ctx.lineTo(-15, -e.radius - 12);
        ctx.lineTo(0, 0);
        ctx.fill();

        ctx.restore();
      });

      // Render Fireballs
      s.fireballs.forEach(fb => {
        ctx.fillStyle = '#f97316';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Render Legendary Red Dragon
      ctx.save();
      ctx.translate(d.x, d.y);

      // Dragon Tail
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.quadraticCurveTo(-30, Math.sin(s.frame * 0.2) * 10, -42, -4);
      ctx.stroke();

      // Dragon Body
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Scaled Underbelly
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(2, 6, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dragon Head
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.lineTo(28, -2);
      ctx.lineTo(24, 8);
      ctx.lineTo(10, 8);
      ctx.closePath();
      ctx.fill();

      // Dragon Horns
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(12, -6);
      ctx.lineTo(4, -18);
      ctx.lineTo(8, -4);
      ctx.fill();

      // Glowing Eye
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(18, -1, 3, 0, Math.PI * 2);
      ctx.fill();

      // Dragon Wings (Flapping Motion)
      const wingFlap = Math.sin(d.wingAngle) * 20;
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(10, -28 + wingFlap);
      ctx.lineTo(-20, -18 + wingFlap * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Render Particles
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#0f051d] rounded-2xl overflow-hidden select-none border border-orange-500/30 shadow-2xl">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-orange-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-orange-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          {/* Dragon Scale Hearts */}
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-rose-500/40 backdrop-blur-md flex items-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition-all duration-200 ${
                  i < hearts ? 'text-rose-500 fill-rose-500' : 'text-slate-600 fill-slate-800 opacity-40'
                }`}
              />
            ))}
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>BEST: {highScore}</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        onClick={flap}
        className="w-full max-w-2xl h-auto aspect-4/3 object-contain cursor-pointer"
      />

      {/* Mobile Controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 md:hidden">
          <button
            onClick={breatheFire}
            className="w-14 h-14 rounded-2xl bg-orange-600/90 text-white font-orbitron font-black text-[10px] flex flex-col items-center justify-center border border-orange-300 active:scale-95"
          >
            <Flame className="w-5 h-5 fill-current" />
            <span>FIRE</span>
          </button>
          <button
            onClick={flap}
            className="w-14 h-14 rounded-2xl bg-amber-500/90 text-black font-orbitron font-black text-xs flex flex-col items-center justify-center border border-amber-300 active:scale-95"
          >
            <span>FLAP</span>
          </button>
        </div>
      )}

      {/* Start Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 mb-4 shadow-[0_0_25px_rgba(249,115,22,0.4)]">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wide">DRAGON FLIGHT</h2>
          <p className="text-slate-300 text-sm max-w-md mt-2 font-mono">
            Soar through mythical peaks. Flap wings (<kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space / Click</kbd>) and breathe fireballs (<kbd className="px-1.5 py-0.5 bg-white/10 rounded">F / J</kbd>) to blast crystal spires and wyverns.
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(249,115,22,0.7)] hover:scale-105 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>FLY DRAGON</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-orange-500 font-orbitron font-bold text-sm tracking-widest uppercase">FALLEN</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">DRAGON GROUNDED</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>FLIGHT SCORE</span>
              <span className="text-orange-400 font-bold font-orbitron text-base">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-2 border-t border-white/5">
              <span>BEST RECORD</span>
              <span className="text-amber-400 font-bold font-orbitron text-base">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(249,115,22,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>FLY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
