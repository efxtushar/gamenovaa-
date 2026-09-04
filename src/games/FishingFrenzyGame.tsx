import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Waves } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const FishingFrenzyGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [fishCount, setFishCount] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_fishing-frenzy') || '0', 10);
  });

  const stateRef = useRef({
    hook: { x: 300, y: 100, vy: 0, maxDepth: 420, isDropping: false, isReeling: false },
    fishes: [] as { x: number; y: number; vx: number; val: number; color: string; size: number; caught: boolean }[],
    score: 0,
    fishCount: 0
  });

  const dropHook = useCallback(() => {
    const s = stateRef.current;
    if (!s.hook.isDropping && !s.hook.isReeling) {
      sound.playJump();
      s.hook.isDropping = true;
      s.hook.vy = 5;
    }
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const fishes = [
      { x: 100, y: 180, vx: 2, val: 50, color: '#38bdf8', size: 14, caught: false },
      { x: 450, y: 240, vx: -2.5, val: 100, color: '#facc15', size: 16, caught: false },
      { x: 200, y: 320, vx: 1.8, val: 150, color: '#f43f5e', size: 18, caught: false },
      { x: 380, y: 400, vx: -3, val: 300, color: '#c084fc', size: 24, caught: false },
    ];

    stateRef.current = {
      hook: { x: 300, y: 100, vy: 0, maxDepth: 420, isDropping: false, isReeling: false },
      fishes,
      score: 0,
      fishCount: 0
    };

    setScore(0);
    setFishCount(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_fishing-frenzy', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Steer Hook left / right with mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    stateRef.current.hook.x = Math.max(60, Math.min(canvas.width - 60, mx));
  };

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
      const h = s.hook;
      const w = canvas.width;
      const ch = canvas.height;

      // Update Hook State
      if (h.isDropping) {
        h.y += h.vy;
        if (h.y >= h.maxDepth) {
          h.isDropping = false;
          h.isReeling = true;
          h.vy = -4.5;
        }
      } else if (h.isReeling) {
        h.y += h.vy;

        // Catch fish on way back up
        s.fishes.forEach(f => {
          if (!f.caught && Math.hypot(f.x - h.x, f.y - h.y) < f.size + 10) {
            f.caught = true;
            sound.playCoin();
            s.score += f.val;
            s.fishCount++;
            setScore(s.score);
            setFishCount(s.fishCount);
          }
        });

        // Reached boat at top
        if (h.y <= 100) {
          h.y = 100;
          h.isReeling = false;
          h.vy = 0;
          // Respawn caught fish
          s.fishes.forEach(f => {
            if (f.caught) {
              f.caught = false;
              f.x = Math.random() * w;
            }
          });
        }
      }

      // Update Fishes
      s.fishes.forEach(f => {
        if (f.caught) {
          f.x = h.x;
          f.y = h.y;
        } else {
          f.x += f.vx;
          if (f.x < 30 || f.x > w - 30) f.vx *= -1;
        }
      });

      // RENDER
      // Sky & Boat
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, 0, w, 100);

      // Boat
      ctx.fillStyle = '#78350f';
      ctx.fillRect(h.x - 30, 80, 60, 20);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(h.x + 30, 80);
      ctx.lineTo(h.x + 45, 80);
      ctx.lineTo(h.x + 30, 100);
      ctx.closePath();
      ctx.fill();

      // Deep Ocean Water
      const water = ctx.createLinearGradient(0, 100, 0, ch);
      water.addColorStop(0, '#0284c7');
      water.addColorStop(0.5, '#0369a1');
      water.addColorStop(1, '#082f49');
      ctx.fillStyle = water;
      ctx.fillRect(0, 100, w, ch - 100);

      // Fishing Line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(h.x, 90);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();

      // Hook
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, 6, 0, Math.PI);
      ctx.stroke();

      // Fishes
      s.fishes.forEach(f => {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, f.size, f.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.beginPath();
        const dir = f.vx > 0 ? -1 : 1;
        ctx.moveTo(f.x + dir * f.size, f.y);
        ctx.lineTo(f.x + dir * (f.size + 8), f.y - 6);
        ctx.lineTo(f.x + dir * (f.size + 8), f.y + 6);
        ctx.closePath();
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#0284c7] rounded-2xl overflow-hidden select-none border border-sky-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-sky-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-sky-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-300">
            <Waves className="w-3.5 h-3.5" />
            <span>CAUGHT: {fishCount}</span>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
          <Trophy className="w-3.5 h-3.5" />
          <span>BEST: {highScore}</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={460}
        onMouseMove={handleMouseMove}
        onClick={dropHook}
        className="w-full max-w-xl h-auto aspect-15/11 object-contain cursor-crosshair"
      />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-3xl text-white tracking-wide">FISHING FRENZY</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Move mouse to position your boat. Click or tap to drop your line into the deep reef and hook monster fish!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(56,189,248,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>CAST LINE</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-4xl text-white mt-1">FISHING EXPEDITION OVER</h2>
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>SCORE</span>
              <span className="text-sky-400 font-bold font-orbitron text-base">{score}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>FISH AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
