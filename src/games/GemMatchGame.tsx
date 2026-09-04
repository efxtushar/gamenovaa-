import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Sparkles, Zap, Timer } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

const GRID_SIZE = 8;
const GEM_COLORS = [
  '#ef4444', // Ruby
  '#38bdf8', // Sapphire
  '#22c55e', // Emerald
  '#facc15', // Topaz
  '#a855f7', // Amethyst
  '#f97316', // Amber
];

interface Gem {
  color: string;
  type: number;
  special?: 'bomb' | 'laser';
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

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export const GemMatchGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_gem-match') || '0', 10);
  });

  const stateRef = useRef({
    grid: [] as (Gem | null)[][],
    selected: null as { r: number; c: number } | null,
    particles: [] as Particle[],
    popups: [] as ScorePopup[],
    score: 0,
    combo: 0,
    timeLeft: 60,
    timerInterval: null as NodeJS.Timeout | null
  });

  const createInitialGrid = (): (Gem | null)[][] => {
    const grid: (Gem | null)[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        let type = Math.floor(Math.random() * GEM_COLORS.length);
        // Avoid initial 3-matches
        while (
          (r >= 2 && grid[r - 1][c]?.type === type && grid[r - 2][c]?.type === type) ||
          (c >= 2 && grid[r][c - 1]?.type === type && grid[r][c - 2]?.type === type)
        ) {
          type = Math.floor(Math.random() * GEM_COLORS.length);
        }
        grid[r][c] = { type, color: GEM_COLORS[type] };
      }
    }
    return grid;
  };

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    if (stateRef.current.timerInterval) clearInterval(stateRef.current.timerInterval);
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_gem-match', finalScore.toString());
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const startGame = useCallback(() => {
    sound.playClick();
    if (stateRef.current.timerInterval) clearInterval(stateRef.current.timerInterval);

    stateRef.current = {
      grid: createInitialGrid(),
      selected: null,
      particles: [],
      popups: [],
      score: 0,
      combo: 0,
      timeLeft: 60,
      timerInterval: null
    };

    setScore(0);
    setCombo(0);
    setTimeLeft(60);
    setGameState('PLAYING');

    stateRef.current.timerInterval = setInterval(() => {
      stateRef.current.timeLeft--;
      setTimeLeft(stateRef.current.timeLeft);
      if (stateRef.current.timeLeft <= 0) {
        if (stateRef.current.timerInterval) clearInterval(stateRef.current.timerInterval);
        handleGameOver(stateRef.current.score);
      }
    }, 1000);
  }, [handleGameOver]);

  // Match check & resolving cascades
  const checkMatches = (grid: (Gem | null)[][]): { r: number; c: number }[] => {
    const matched = new Set<string>();

    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        const g1 = grid[r][c];
        const g2 = grid[r][c + 1];
        const g3 = grid[r][c + 2];
        if (g1 && g2 && g3 && g1.type === g2.type && g2.type === g3.type) {
          matched.add(`${r},${c}`);
          matched.add(`${r},${c + 1}`);
          matched.add(`${r},${c + 2}`);
        }
      }
    }

    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        const g1 = grid[r][c];
        const g2 = grid[r + 1][c];
        const g3 = grid[r + 2][c];
        if (g1 && g2 && g3 && g1.type === g2.type && g2.type === g3.type) {
          matched.add(`${r},${c}`);
          matched.add(`${r + 1},${c}`);
          matched.add(`${r + 2},${c}`);
        }
      }
    }

    return Array.from(matched).map(coord => {
      const [r, c] = coord.split(',').map(Number);
      return { r, c };
    });
  };

  const processCascades = useCallback(() => {
    const s = stateRef.current;
    let matches = checkMatches(s.grid);
    let cascadeCount = 0;

    while (matches.length > 0) {
      cascadeCount++;
      sound.playPowerUp();
      s.combo++;
      setCombo(s.combo);

      const points = matches.length * 100 * s.combo;
      s.score += points;
      setScore(s.score);

      // Particles & Popups
      matches.forEach(m => {
        const gem = s.grid[m.r][m.c];
        if (gem) {
          for (let i = 0; i < 6; i++) {
            s.particles.push({
              x: 40 + m.c * 50 + 25,
              y: 40 + m.r * 50 + 25,
              vx: (Math.random() - 0.5) * 7,
              vy: (Math.random() - 0.5) * 7,
              color: gem.color,
              size: 3.5,
              life: 20
            });
          }
        }
        s.grid[m.r][m.c] = null;
      });

      s.popups.push({
        x: 240,
        y: 200,
        text: `+${points}${s.combo > 1 ? ` (x${s.combo})` : ''}`,
        color: '#facc15',
        life: 30
      });

      // Drop gems down
      for (let c = 0; c < GRID_SIZE; c++) {
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          if (s.grid[r][c] === null) {
            for (let above = r - 1; above >= 0; above--) {
              if (s.grid[above][c] !== null) {
                s.grid[r][c] = s.grid[above][c];
                s.grid[above][c] = null;
                break;
              }
            }
          }
        }
      }

      // Fill empty top slots
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (s.grid[r][c] === null) {
            const type = Math.floor(Math.random() * GEM_COLORS.length);
            s.grid[r][c] = { type, color: GEM_COLORS[type] };
          }
        }
      }

      matches = checkMatches(s.grid);
    }
  }, []);

  const selectGem = (mx: number, my: number) => {
    const c = Math.floor((mx - 40) / 50);
    const r = Math.floor((my - 40) / 50);

    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;

    const s = stateRef.current;
    if (!s.selected) {
      sound.playClick();
      s.selected = { r, c };
    } else {
      const isNeighbor = Math.abs(s.selected.r - r) + Math.abs(s.selected.c - c) === 1;

      if (isNeighbor) {
        const temp = s.grid[s.selected.r][s.selected.c];
        s.grid[s.selected.r][s.selected.c] = s.grid[r][c];
        s.grid[r][c] = temp;

        const matches = checkMatches(s.grid);
        if (matches.length > 0) {
          processCascades();
        } else {
          sound.playHit();
          s.grid[r][c] = s.grid[s.selected.r][s.selected.c];
          s.grid[s.selected.r][s.selected.c] = temp;
        }
        s.selected = null;
      } else {
        sound.playClick();
        s.selected = { r, c };
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    selectGem(mx, my);
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
    selectGem(mx, my);
  };

  useEffect(() => {
    return () => {
      if (stateRef.current.timerInterval) {
        clearInterval(stateRef.current.timerInterval);
      }
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
      const w = canvas.width;
      const h = canvas.height;

      // Update Popups
      for (let i = s.popups.length - 1; i >= 0; i--) {
        const pop = s.popups[i];
        pop.y -= 0.8;
        pop.life--;
        if (pop.life <= 0) s.popups.splice(i, 1);
      }

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
      ctx.fillStyle = '#090a16';
      ctx.fillRect(0, 0, w, h);

      // Grid background
      ctx.fillStyle = '#121629';
      ctx.beginPath();
      ctx.roundRect(35, 35, 410, 410, 16);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Grid Tiles & Gems
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const gx = 40 + c * 50;
          const gy = 40 + r * 50;
          const gem = s.grid[r][c];

          // Slot tile
          ctx.fillStyle = (r + c) % 2 === 0 ? '#182038' : '#141a2e';
          ctx.beginPath();
          ctx.roundRect(gx + 2, gy + 2, 46, 46, 8);
          ctx.fill();

          // Selected Outline
          if (s.selected && s.selected.r === r && s.selected.c === c) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.strokeRect(gx + 2, gy + 2, 46, 46);
          }

          if (gem) {
            ctx.save();
            ctx.translate(gx + 25, gy + 25);

            // Gem Shape based on Type
            ctx.fillStyle = gem.color;
            ctx.shadowColor = gem.color;
            ctx.shadowBlur = 8;

            if (gem.type === 0) {
              // Ruby (Diamond)
              ctx.beginPath();
              ctx.moveTo(0, -18);
              ctx.lineTo(18, 0);
              ctx.lineTo(0, 18);
              ctx.lineTo(-18, 0);
              ctx.closePath();
              ctx.fill();
            } else if (gem.type === 1) {
              // Sapphire (Hexagon)
              ctx.beginPath();
              for (let a = 0; a < 6; a++) {
                const angle = (a * Math.PI) / 3;
                const hx = Math.cos(angle) * 18;
                const hy = Math.sin(angle) * 18;
                if (a === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
              }
              ctx.closePath();
              ctx.fill();
            } else if (gem.type === 2) {
              // Emerald (Octagon / Square)
              ctx.beginPath();
              ctx.roundRect(-16, -16, 32, 32, 6);
              ctx.fill();
            } else if (gem.type === 3) {
              // Topaz (Triangle)
              ctx.beginPath();
              ctx.moveTo(0, -18);
              ctx.lineTo(18, 14);
              ctx.lineTo(-18, 14);
              ctx.closePath();
              ctx.fill();
            } else if (gem.type === 4) {
              // Amethyst (Circle Jewel)
              ctx.beginPath();
              ctx.arc(0, 0, 16, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Amber (Star / Pill)
              ctx.beginPath();
              ctx.ellipse(0, 0, 18, 12, Math.PI / 4, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.shadowBlur = 0;

            // Highlight Glint
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.arc(-4, -4, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        }
      }

      // Draw Popups
      s.popups.forEach(pop => {
        ctx.fillStyle = pop.color;
        ctx.shadowColor = pop.color;
        ctx.shadowBlur = 12;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.shadowBlur = 0;
      });

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
  }, [gameState]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#090a16] overflow-hidden select-none">
      {/* TOP HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-purple-500/40 backdrop-blur-md">
            <span className="text-[9px] font-mono text-purple-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          {combo > 1 && (
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>COMBO x{combo}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-rose-500/40 backdrop-blur-md flex items-center gap-2">
            <Timer className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-orbitron font-bold text-rose-300">{timeLeft}s</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>BEST: {highScore}</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={560}
        height={560}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasTouch}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* START MODAL */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_25px_rgba(168,85,247,0.4)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">GEM MATCH</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xs mt-2 font-mono leading-relaxed">
            Click two adjacent gems to swap and match 3 or more of the same gem. Trigger cascade combos to multiply points!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START MATCHING</span>
          </button>
        </div>
      )}

      {/* GAMEOVER MODAL */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-xs tracking-widest uppercase">
            TIME EXPIRED
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white mt-1">ROUND FINISHED!</h2>

          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>FINAL SCORE</span>
              <span className="text-purple-400 font-bold font-orbitron text-sm">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-2 border-t border-white/10">
              <span>RECORD SCORE</span>
              <span className="text-yellow-300 font-bold font-orbitron">{highScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-orbitron font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
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
