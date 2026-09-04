import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Zap, Moon, Heart, ArrowLeft } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Enemy {
  x: number;
  y: number;
  hp: number;
  alive: boolean;
}

interface Shuriken {
  x: number;
  y: number;
  vx: number;
  rot: number;
}

interface ScrollPickup {
  x: number;
  y: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export const NinjaDashGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [scrolls, setScrolls] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_ninja-dash') || '0', 10);
  });

  const stateRef = useRef({
    ninja: {
      x: 120,
      y: 280,
      vy: 0,
      jumpCount: 0,
      isDashing: false,
      dashTimer: 0,
      runFrame: 0,
      invulnTimer: 0,
      hearts: 3
    },
    platforms: [] as Platform[],
    enemies: [] as Enemy[],
    shurikens: [] as Shuriken[],
    pickups: [] as ScrollPickup[],
    petals: [] as { x: number; y: number; vx: number; vy: number; rot: number }[],
    particles: [] as Particle[],
    speed: 3.8, // Comfortable beginner starting speed
    distance: 0,
    scrolls: 0,
    score: 0
  });

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.ninja.jumpCount < 2) {
      sound.playJump();
      s.ninja.vy = -11.8;
      s.ninja.jumpCount++;

      // Smoke puff
      for (let i = 0; i < 6; i++) {
        s.particles.push({
          x: s.ninja.x,
          y: s.ninja.y + 20,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2,
          color: '#94a3b8',
          size: 3,
          life: 14
        });
      }
    }
  }, []);

  const throwShuriken = useCallback(() => {
    const s = stateRef.current;
    sound.playLaser(1400);
    s.shurikens.push({
      x: s.ninja.x + 20,
      y: s.ninja.y,
      vx: 15,
      rot: 0
    });
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const platforms: Platform[] = [
      { x: 0, y: 360, w: 480, h: 120 },
      { x: 530, y: 350, w: 420, h: 130 },
      { x: 1000, y: 330, w: 450, h: 150 },
      { x: 1500, y: 340, w: 480, h: 140 },
    ];

    const pickups: ScrollPickup[] = [
      { x: 300, y: 300, collected: false },
      { x: 750, y: 290, collected: false },
      { x: 1200, y: 270, collected: false },
      { x: 1700, y: 280, collected: false },
    ];

    const petals = Array.from({ length: 25 }, () => ({
      x: Math.random() * 700,
      y: Math.random() * 480,
      vx: -1.2 - Math.random() * 0.8,
      vy: 0.8 + Math.random() * 0.8,
      rot: Math.random() * Math.PI
    }));

    stateRef.current = {
      ninja: {
        x: 120,
        y: 280,
        vy: 0,
        jumpCount: 0,
        isDashing: false,
        dashTimer: 0,
        runFrame: 0,
        invulnTimer: 0,
        hearts: 3
      },
      platforms,
      enemies: [], // No enemies at start for beginner friendly ease
      shurikens: [],
      pickups,
      petals,
      particles: [],
      speed: 3.8,
      distance: 0,
      scrolls: 0,
      score: 0
    };

    setScore(0);
    setScrolls(0);
    setHearts(3);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_ninja-dash', finalScore.toString());
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        jump();
      }
      if (['KeyJ', 'KeyZ', 'KeyE', 'KeyF'].includes(e.code)) {
        e.preventDefault();
        throwShuriken();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, jump, throwShuriken]);

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
      const n = s.ninja;
      const w = canvas.width;
      const h = canvas.height;

      // Speed & distance scaling: Gentle start (3.8), slowly accelerating up to 8.5
      s.distance += Math.floor(s.speed * 0.35);
      s.speed = Math.min(8.5, 3.8 + s.distance * 0.0006);
      s.score = s.distance + s.scrolls * 250;
      setScore(s.score);

      n.runFrame += 0.22;
      if (n.invulnTimer > 0) n.invulnTimer--;

      // Physics: Gravity
      n.vy += 0.58;
      n.y += n.vy;

      // Move Platforms
      s.platforms.forEach(p => {
        p.x -= s.speed;
      });

      // Platform Collisions (Landing)
      let onGround = false;
      s.platforms.forEach(p => {
        if (
          n.x >= p.x - 14 &&
          n.x <= p.x + p.w + 14 &&
          n.y + 20 >= p.y &&
          n.y + 20 <= p.y + 26 &&
          n.vy >= 0
        ) {
          n.y = p.y - 20;
          n.vy = 0;
          n.jumpCount = 0;
          onGround = true;
        }
      });

      // Recycle Platforms with beginner-friendly gaps early on
      const lastPlat = s.platforms[s.platforms.length - 1];
      if (lastPlat && lastPlat.x < w + 250) {
        const gapScaling = Math.min(1.5, 0.7 + s.distance * 0.0003);
        const gap = (50 + Math.random() * 50) * gapScaling;
        const platW = 340 + Math.random() * 180;
        const platY = 320 + Math.random() * 60;
        s.platforms.push({ x: lastPlat.x + lastPlat.w + gap, y: platY, w: platW, h: 140 });

        // Scroll pickup
        if (Math.random() < 0.7) {
          s.pickups.push({
            x: lastPlat.x + lastPlat.w + gap + platW / 2,
            y: platY - 40,
            collected: false
          });
        }
        
        // Spawn enemies only after distance > 350 (gives player safe learning start)
        if (s.distance > 350 && Math.random() < Math.min(0.4, 0.2 + s.distance * 0.0001)) {
          s.enemies.push({
            x: lastPlat.x + lastPlat.w + gap + platW * 0.75,
            y: platY - 20,
            hp: 1,
            alive: true
          });
        }
      }
      s.platforms = s.platforms.filter(p => p.x + p.w > -100);

      // Fell in pit
      if (n.y > h + 50) {
        sound.playGameOver();
        handleGameOver(s.score);
        return;
      }

      // Update Shurikens
      for (let i = s.shurikens.length - 1; i >= 0; i--) {
        const sh = s.shurikens[i];
        sh.x += sh.vx;
        sh.rot += 0.3;

        // Check enemy hit
        s.enemies.forEach(e => {
          if (e.alive && Math.hypot(sh.x - e.x, sh.y - e.y) < 32) {
            e.alive = false;
            sound.playHit();
            s.score += 200;
            for (let k = 0; k < 8; k++) {
              s.particles.push({
                x: e.x,
                y: e.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#ef4444',
                size: 3,
                life: 18
              });
            }
          }
        });

        if (sh.x > w + 50) s.shurikens.splice(i, 1);
      }

      // Move Enemies & check player collision with hearts/invulnerability
      s.enemies.forEach(e => {
        e.x -= s.speed;
        if (e.alive && Math.hypot(n.x - e.x, n.y - e.y) < 26) {
          if (n.invulnTimer <= 0) {
            n.hearts--;
            setHearts(n.hearts);
            n.invulnTimer = 60; // 1 second invulnerability
            sound.playHit();
            e.alive = false; // Defeat colliding enemy

            if (n.hearts <= 0) {
              handleGameOver(s.score);
              return;
            }
          }
        }
      });
      s.enemies = s.enemies.filter(e => e.x > -100);

      // Move & Collect Scrolls
      s.pickups.forEach(p => {
        p.x -= s.speed;
        if (!p.collected && Math.hypot(n.x - p.x, n.y - p.y) < 36) {
          p.collected = true;
          sound.playCoin();
          s.scrolls++;
          setScrolls(s.scrolls);
          
          // Heal 1 heart every 5 scrolls
          if (s.scrolls % 5 === 0 && n.hearts < 3) {
            n.hearts++;
            setHearts(n.hearts);
            sound.playPowerUp();
          }

          for (let k = 0; k < 6; k++) {
            s.particles.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 4,
              vy: -Math.random() * 4,
              color: '#facc15',
              size: 3.5,
              life: 16
            });
          }
        }
      });
      s.pickups = s.pickups.filter(p => p.x > -100);

      // Update Petals
      s.petals.forEach(pt => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.rot += 0.05;
        if (pt.y > h) {
          pt.y = -10;
          pt.x = Math.random() * w;
        }
      });

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // -------------------------------------------------------------
      // RENDER
      // -------------------------------------------------------------
      // Night Moonlit Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Full Giant Moon
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(248, 250, 252, 0.4)';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(w - 140, 100, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Cherry Blossom Petals
      ctx.fillStyle = '#f472b6';
      s.petals.forEach(pt => {
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Traditional Japanese Pagoda Roof Platforms
      s.platforms.forEach(p => {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Tile Roof Edge
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(p.x, p.y, p.w, 8);
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, 8);
      });

      // Draw Scrolls
      s.pickups.forEach(p => {
        if (p.collected) return;
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.fillRect(p.x - 8, p.y - 12, 16, 24);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(p.x - 6, p.y - 8, 12, 16);
      });

      // Draw Enemies (Shadow Shinobi)
      s.enemies.forEach(e => {
        if (!e.alive) return;
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(e.x - 10, e.y - 30, 20, 30);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - 6, e.y - 26, 6, 3);
      });

      // Draw Shurikens
      s.shurikens.forEach(sh => {
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(sh.rot);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // Draw Ninja Player
      ctx.save();
      ctx.translate(n.x, n.y);
      if (n.invulnTimer > 0 && Math.floor(n.invulnTimer / 4) % 2 === 0) {
        ctx.globalAlpha = 0.4;
      }

      // Scarf trailing
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, -14);
      ctx.lineTo(-24 - Math.random() * 4, -18 + Math.sin(n.runFrame) * 4);
      ctx.stroke();

      // Ninja Robe
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -26, 20, 26);

      // Headband / Visor
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(2, -22, 6, 3);

      ctx.restore();

      // Draw Particles
      s.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#05070d] overflow-hidden select-none">
      {/* TOP HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-rose-500/40 backdrop-blur-md">
            <span className="text-[9px] font-mono text-rose-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          {/* Hearts */}
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition-all ${
                  i < hearts ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Zap className="w-3.5 h-3.5" />
            <span>SCROLLS: {scrolls}</span>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
          <Trophy className="w-3.5 h-3.5" />
          <span>BEST: {highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        onClick={jump}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* START MODAL */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_25px_rgba(244,63,94,0.4)]">
            <Moon className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">NINJA DASH</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-sm mt-2 font-mono leading-relaxed">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space / Up / Click</kbd> Double Jump.<br />
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">J / Z / E / F</kbd> Throw Shuriken.
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(244,63,94,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>COMMENCE RUN</span>
          </button>
        </div>
      )}

      {/* GAMEOVER MODAL */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-xs tracking-widest uppercase">
            RUN COMPLETE
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white mt-1">MISSION DEBRIEF</h2>

          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>FINAL SCORE</span>
              <span className="text-rose-400 font-bold font-orbitron text-sm">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-2 border-t border-white/10">
              <span>RECORD SCORE</span>
              <span className="text-yellow-300 font-bold font-orbitron">{highScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-orbitron font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>DASH AGAIN</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-orbitron font-bold text-xs cursor-pointer"
              >
                <span>EXIT</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
