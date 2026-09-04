import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Compass, Sparkles, Anchor } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Fish {
  x: number;
  y: number;
  vx: number;
  color: string;
  size: number;
  tail: number;
}

interface Treasure {
  x: number;
  y: number;
  type: 'chest' | 'pearl' | 'artifact';
  collected: boolean;
}

interface Jellyfish {
  x: number;
  y: number;
  vy: number;
  pulse: number;
}

interface Bubble {
  x: number;
  y: number;
  vy: number;
  r: number;
}

export const DeepSeaAdventureGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [depth, setDepth] = useState(10);
  const [oxygen, setOxygen] = useState(100);
  const [treasuresFound, setTreasuresFound] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_deep-sea') || '0', 10);
  });

  const stateRef = useRef({
    sub: {
      x: 320,
      y: 120,
      vx: 0,
      vy: 0,
      rot: 0,
      sonarActive: false,
      sonarRadius: 0
    },
    fishes: [] as Fish[],
    jellies: [] as Jellyfish[],
    treasures: [] as Treasure[],
    bubbles: [] as Bubble[],
    seaweeds: [] as { x: number; h: number; sway: number }[],
    keys: { left: false, right: false, up: false, down: false, sonar: false },
    oxygen: 100,
    depth: 10,
    treasuresCount: 0,
    score: 0
  });

  const triggerSonar = useCallback(() => {
    const s = stateRef.current;
    if (s.sub.sonarActive) return;
    sound.playLaser(400);
    s.sub.sonarActive = true;
    s.sub.sonarRadius = 10;
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const fishes: Fish[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * 640,
      y: 100 + Math.random() * 320,
      vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5),
      color: ['#38bdf8', '#facc15', '#f43f5e', '#a855f7'][Math.floor(Math.random() * 4)],
      size: 8 + Math.random() * 6,
      tail: 0
    }));

    const jellies: Jellyfish[] = [
      { x: 160, y: 220, vy: -0.4, pulse: 0 },
      { x: 480, y: 340, vy: -0.5, pulse: 2 },
      { x: 300, y: 400, vy: -0.3, pulse: 4 }
    ];

    const treasures: Treasure[] = [
      { x: 120, y: 430, type: 'chest', collected: false },
      { x: 320, y: 440, type: 'artifact', collected: false },
      { x: 520, y: 430, type: 'pearl', collected: false }
    ];

    const seaweeds = Array.from({ length: 14 }, (_, i) => ({
      x: 30 + i * 45,
      h: 60 + Math.random() * 60,
      sway: Math.random() * Math.PI
    }));

    const bubbles: Bubble[] = Array.from({ length: 20 }, () => ({
      x: Math.random() * 640,
      y: Math.random() * 480,
      vy: -1 - Math.random() * 2,
      r: 2 + Math.random() * 4
    }));

    stateRef.current = {
      sub: {
        x: 320,
        y: 120,
        vx: 0,
        vy: 0,
        rot: 0,
        sonarActive: false,
        sonarRadius: 0
      },
      fishes,
      jellies,
      treasures,
      bubbles,
      seaweeds,
      keys: { left: false, right: false, up: false, down: false, sonar: false },
      oxygen: 100,
      depth: 10,
      treasuresCount: 0,
      score: 0
    };

    setDepth(10);
    setOxygen(100);
    setTreasuresFound(0);
    setScore(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_deep-sea', finalScore.toString());
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) s.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) s.keys.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) s.keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) s.keys.down = true;
      if (['Space', 'KeyE'].includes(e.code)) triggerSonar();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) s.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) s.keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) s.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) s.keys.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerSonar]);

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
      const sub = s.sub;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Controls & Submarine Physics (Hydrodynamics)
      if (s.keys.left) sub.vx = Math.max(-4.5, sub.vx - 0.2);
      if (s.keys.right) sub.vx = Math.min(4.5, sub.vx + 0.2);
      if (s.keys.up) sub.vy = Math.max(-4, sub.vy - 0.2);
      if (s.keys.down) sub.vy = Math.min(4, sub.vy + 0.2);

      // Water drag
      sub.vx *= 0.95;
      sub.vy *= 0.95;

      sub.x += sub.vx;
      sub.y += sub.vy;

      // Boundary limits
      sub.x = Math.max(30, Math.min(w - 30, sub.x));
      sub.y = Math.max(60, Math.min(h - 55, sub.y));

      // Calculate depth
      s.depth = Math.floor(sub.y * 1.8);
      setDepth(s.depth);

      // Oxygen Depletion / Surface replenishment
      if (sub.y <= 70) {
        s.oxygen = Math.min(100, s.oxygen + 0.6);
      } else {
        s.oxygen = Math.max(0, s.oxygen - 0.08);
      }
      setOxygen(Math.floor(s.oxygen));

      if (s.oxygen <= 0) {
        handleGameOver(s.score);
        return;
      }

      // Propeller Bubbles
      if (Math.abs(sub.vx) > 0.5 || Math.abs(sub.vy) > 0.5) {
        if (Math.random() < 0.3) {
          s.bubbles.push({
            x: sub.x + (sub.vx < 0 ? 25 : -25),
            y: sub.y,
            vy: -1.5,
            r: 2 + Math.random() * 3
          });
        }
      }

      // Update Sonar Pulse
      if (sub.sonarActive) {
        sub.sonarRadius += 6;
        if (sub.sonarRadius > 240) {
          sub.sonarActive = false;
          sub.sonarRadius = 0;
        }
      }

      // Update Bubbles
      s.bubbles.forEach(b => {
        b.y += b.vy;
        if (b.y < 30) {
          b.y = h;
          b.x = Math.random() * w;
        }
      });

      // Update Fishes
      s.fishes.forEach(f => {
        f.x += f.vx;
        f.tail += 0.2;
        if (f.x > w + 40) f.x = -40;
        if (f.x < -40) f.x = w + 40;
      });

      // Update Jellyfishes
      s.jellies.forEach(j => {
        j.pulse += 0.05;
        j.y += Math.sin(j.pulse) * 0.8;

        // Collision check
        if (Math.hypot(sub.x - j.x, sub.y - j.y) < 32) {
          sound.playHit();
          s.oxygen = Math.max(0, s.oxygen - 12);
        }
      });

      // Update Treasures
      s.treasures.forEach(t => {
        if (!t.collected && Math.hypot(sub.x - t.x, sub.y - t.y) < 36) {
          t.collected = true;
          sound.playCoin();
          s.treasuresCount++;
          const pts = t.type === 'artifact' ? 600 : t.type === 'chest' ? 400 : 250;
          s.score += pts;
          setScore(s.score);
          setTreasuresFound(s.treasuresCount);
          confetti({ particleCount: 35, spread: 60 });
        }
      });

      // Respawn treasures
      if (s.treasures.every(t => t.collected)) {
        sound.playPowerUp();
        s.treasures.forEach(t => {
          t.x = 60 + Math.random() * (w - 120);
          t.collected = false;
        });
      }

      // -------------------------------------------------------------
      // RENDER
      // -------------------------------------------------------------
      // Ocean Water Depth Gradient
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#0284c7');
      oceanGrad.addColorStop(0.3, '#0369a1');
      oceanGrad.addColorStop(0.7, '#0f172a');
      oceanGrad.addColorStop(1, '#020617');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);

      // Light Caustic Rays
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let rx = 50; rx < w; rx += 140) {
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 60, h);
        ctx.lineTo(rx + 110, h);
        ctx.lineTo(rx + 30, 0);
        ctx.closePath();
        ctx.fill();
      }

      // Sea floor with ancient stone ruins & coral
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, h - 45, w, 45);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(0, h - 45, w, 4);

      // Swaying Seaweed
      s.seaweeds.forEach(sw => {
        sw.sway += 0.03;
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sw.x, h - 40);
        ctx.quadraticCurveTo(sw.x + Math.sin(sw.sway) * 16, h - 40 - sw.h / 2, sw.x, h - 40 - sw.h);
        ctx.stroke();
      });

      // Draw Bubbles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      s.bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Fishes
      s.fishes.forEach(f => {
        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.vx < 0) ctx.scale(-1, 1);

        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fish Tail
        const tailY = Math.sin(f.tail) * 3;
        ctx.beginPath();
        ctx.moveTo(-f.size, 0);
        ctx.lineTo(-f.size - 6, -4 + tailY);
        ctx.lineTo(-f.size - 6, 4 - tailY);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      });

      // Draw Jellyfishes (Hazard)
      s.jellies.forEach(j => {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.7)';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 14, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Tentacles
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1.5;
        for (let t = -8; t <= 8; t += 4) {
          ctx.beginPath();
          ctx.moveTo(j.x + t, j.y);
          ctx.lineTo(j.x + t + Math.sin(j.pulse + t) * 4, j.y + 16);
          ctx.stroke();
        }
      });

      // Draw Treasures
      s.treasures.forEach(t => {
        if (t.collected) return;
        ctx.save();
        ctx.translate(t.x, t.y);

        if (t.type === 'chest') {
          // Golden Treasure Chest
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-14, -10, 28, 20);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-12, -4, 24, 6);
        } else if (t.type === 'pearl') {
          // Glowing Oyster Pearl
          ctx.fillStyle = '#bae6fd';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Ancient Relic Artifact
          ctx.fillStyle = '#10b981';
          ctx.fillRect(-10, -12, 20, 24);
        }

        ctx.restore();
      });

      // Sonar Pulse Ripple
      if (sub.sonarActive) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sub.x, sub.y, sub.sonarRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Yellow Submarine
      ctx.save();
      ctx.translate(sub.x, sub.y);

      // Chassis
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Conning Tower
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-6, -20, 12, 8);
      // Periscope
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, -26, 8, 6);

      // Porthole Window
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(6, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Spotlight Beam
      ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(120, -35);
      ctx.lineTo(120, 35);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#02182b] overflow-hidden select-none">
      {/* TOP HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-cyan-500/40 backdrop-blur-md">
            <span className="text-[9px] font-mono text-cyan-400 block uppercase">DEPTH</span>
            <span className="text-xl font-orbitron font-bold text-white">{depth}m</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RELICS: {treasuresFound}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Oxygen Gauge */}
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-cyan-500/40 backdrop-blur-md flex items-center gap-2">
            <Anchor className="w-4 h-4 text-cyan-400" />
            <div className="w-18 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-75 ${oxygen < 30 ? 'bg-rose-500 animate-pulse' : 'bg-cyan-400'}`} style={{ width: `${oxygen}%` }} />
            </div>
            <span className="text-xs font-mono font-bold text-white">{oxygen}% O2</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>BEST: {highScore}</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={540}
        onClick={triggerSonar}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* START MODAL */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">DEEP SEA ADVENTURE</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-sm mt-2 font-mono leading-relaxed">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">WASD / Arrows</kbd> Pilot Submarine.<br />
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space / Click</kbd> Sonar Pulse.<br />
            Collect treasure on the ocean floor and surface near the top to refill Oxygen!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>DIVE SUBMARINE</span>
          </button>
        </div>
      )}

      {/* GAMEOVER MODAL */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-xs tracking-widest uppercase">
            OXYGEN DEPLETED
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white mt-1">DIVE FINISHED</h2>

          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>EXPLORATION SCORE</span>
              <span className="text-cyan-400 font-bold font-orbitron text-sm">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-2 border-t border-white/10">
              <span>RECORD SCORE</span>
              <span className="text-yellow-300 font-bold font-orbitron">{highScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>DIVE AGAIN</span>
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
