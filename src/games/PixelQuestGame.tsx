import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Sparkles } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const PixelQuestGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_pixel-quest') || '0', 10);
  });

  const stateRef = useRef({
    player: { x: 50, y: 300, vx: 0, vy: 0, w: 20, h: 26, isGrounded: false },
    coins: [] as { x: number; y: number; collected: boolean }[],
    slimes: [] as { x: number; y: number; vx: number; alive: boolean }[],
    blocks: [] as { x: number; y: number; w: number; h: number }[],
    keys: { left: false, right: false, up: false },
    score: 0,
    coinsCount: 0,
    scrollX: 0
  });

  const startGame = useCallback(() => {
    sound.playClick();
    const blocks = [
      { x: 0, y: 380, w: 500, h: 60 },
      { x: 180, y: 300, w: 100, h: 20 },
      { x: 340, y: 240, w: 120, h: 20 },
      { x: 540, y: 380, w: 600, h: 60 },
      { x: 620, y: 300, w: 120, h: 20 },
      { x: 800, y: 230, w: 140, h: 20 },
      { x: 1000, y: 320, w: 100, h: 20 },
      { x: 1200, y: 380, w: 600, h: 60 }
    ];

    const coinsList = [
      { x: 220, y: 260, collected: false },
      { x: 380, y: 200, collected: false },
      { x: 420, y: 200, collected: false },
      { x: 660, y: 260, collected: false },
      { x: 850, y: 190, collected: false },
      { x: 900, y: 190, collected: false },
      { x: 1300, y: 340, collected: false },
      { x: 1400, y: 340, collected: false }
    ];

    const slimesList = [
      { x: 300, y: 360, vx: 1.5, alive: true },
      { x: 700, y: 360, vx: -1.5, alive: true },
      { x: 860, y: 210, vx: 1, alive: true },
      { x: 1400, y: 360, vx: 2, alive: true }
    ];

    stateRef.current = {
      player: { x: 60, y: 300, vx: 0, vy: 0, w: 20, h: 26, isGrounded: false },
      coins: coinsList,
      slimes: slimesList,
      blocks,
      keys: { left: false, right: false, up: false },
      score: 0,
      coinsCount: 0,
      scrollX: 0
    };

    setScore(0);
    setCoins(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_pixel-quest', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        const p = stateRef.current.player;
        if (p.isGrounded) {
          p.vy = -12;
          p.isGrounded = false;
          sound.playJump();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
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
      const p = s.player;
      const w = canvas.width;
      const h = canvas.height;

      // Player Movement
      if (s.keys.left) p.vx = -4;
      else if (s.keys.right) p.vx = 4;
      else p.vx = 0;

      p.vy += 0.65; // gravity
      p.x += p.vx;
      p.y += p.vy;

      // Platform Collisions
      p.isGrounded = false;
      s.blocks.forEach(b => {
        if (
          p.x + p.w > b.x &&
          p.x < b.x + b.w &&
          p.y + p.h >= b.y &&
          p.y + p.h <= b.y + 16 &&
          p.vy >= 0
        ) {
          p.y = b.y - p.h;
          p.vy = 0;
          p.isGrounded = true;
        }
      });

      // Camera Follow
      s.scrollX = p.x - 160;

      // Collect Coins
      s.coins.forEach(c => {
        if (!c.collected && Math.hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y) < 22) {
          c.collected = true;
          sound.playCoin();
          s.coinsCount++;
          s.score += 200;
          setCoins(s.coinsCount);
          setScore(s.score);
        }
      });

      // Update Slimes
      s.slimes.forEach(sl => {
        if (!sl.alive) return;
        sl.x += sl.vx;
        if (sl.x < 100 || sl.x > 1700) sl.vx *= -1;

        // Player stomp on slime vs damage
        if (
          p.x + p.w > sl.x - 14 &&
          p.x < sl.x + 14 &&
          p.y + p.h >= sl.y - 12 &&
          p.y + p.h <= sl.y + 10
        ) {
          if (p.vy > 0) {
            // Stomp!
            sl.alive = false;
            p.vy = -9;
            sound.playHit();
            s.score += 300;
            setScore(s.score);
          } else {
            // Hit!
            handleGameOver(s.score);
          }
        }
      });

      // Fall in pit
      if (p.y > h + 50) {
        handleGameOver(s.score);
      }

      // RENDER
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, w, h);

      // Pixel Clouds
      ctx.fillStyle = '#1e3a5f';
      for (let cx = 0; cx < 1800; cx += 250) {
        ctx.fillRect(cx - s.scrollX * 0.3, 80, 80, 24);
        ctx.fillRect(cx + 20 - s.scrollX * 0.3, 60, 40, 24);
      }

      // Draw Blocks
      s.blocks.forEach(b => {
        const sx = b.x - s.scrollX;
        ctx.fillStyle = '#166534';
        ctx.fillRect(sx, b.y, b.w, 6); // Grass top
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx, b.y + 6, b.w, b.h - 6); // Dirt
      });

      // Draw Coins
      s.coins.forEach(c => {
        if (!c.collected) {
          const sx = c.x - s.scrollX;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(sx, c.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Slimes
      s.slimes.forEach(sl => {
        if (sl.alive) {
          const sx = sl.x - s.scrollX;
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(sx, sl.y, 14, Math.PI, 0);
          ctx.fill();
          // Slime Eyes
          ctx.fillStyle = '#000000';
          ctx.fillRect(sx - 5, sl.y - 8, 3, 4);
          ctx.fillRect(sx + 2, sl.y - 8, 3, 4);
        }
      });

      // Draw Player Knight
      const px = p.x - s.scrollX;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px, p.y, p.w, p.h);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(px + 4, p.y + 4, 12, 6); // Red Visor
      ctx.fillStyle = '#facc15';
      ctx.fillRect(px + 14, p.y + 8, 8, 3); // Golden Sword

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#061325] rounded-2xl overflow-hidden select-none border border-emerald-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-emerald-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-emerald-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COINS: {coins}</span>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
          <Trophy className="w-3.5 h-3.5" />
          <span>BEST: {highScore}</span>
        </div>
      </div>

      <canvas ref={canvasRef} width={600} height={440} className="w-full max-w-xl h-auto aspect-15/11 object-contain" />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wide">PIXEL QUEST</h2>
          <p className="text-slate-300 text-sm max-w-md mt-2">
            A / D or Arrow Keys to run. Spacebar / W to jump. Bounce on slimes and collect shiny gold coins!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(52,211,153,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START QUEST</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">QUEST OVER</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">TRY AGAIN</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>SCORE</span>
              <span className="text-emerald-400 font-bold font-orbitron text-base">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-2 border-t border-white/5">
              <span>RECORD</span>
              <span className="text-amber-400 font-bold font-orbitron text-base">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(52,211,153,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>RESTART</span>
          </button>
        </div>
      )}
    </div>
  );
};
