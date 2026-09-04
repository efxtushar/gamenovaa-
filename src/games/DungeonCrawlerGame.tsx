import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Key, Heart } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const DungeonCrawlerGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [keys, setKeys] = useState(0);
  const [hp, setHp] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_dungeon-crawler') || '0', 10);
  });

  const stateRef = useRef({
    player: { x: 80, y: 80, hp: 3, keys: 0 },
    chests: [] as { x: number; y: number; opened: boolean }[],
    keysList: [] as { x: number; y: number; collected: boolean }[],
    skeletons: [] as { x: number; y: number; vx: number; vy: number; alive: boolean }[],
    walls: [] as { x: number; y: number; w: number; h: number }[],
    score: 0,
    controlKeys: { left: false, right: false, up: false, down: false, attack: false }
  });

  const startGame = useCallback(() => {
    sound.playClick();
    const walls = [
      { x: 0, y: 0, w: 600, h: 20 },
      { x: 0, y: 440, w: 600, h: 20 },
      { x: 0, y: 0, w: 20, h: 460 },
      { x: 580, y: 0, w: 20, h: 460 },
      { x: 180, y: 80, w: 20, h: 200 },
      { x: 380, y: 180, w: 20, h: 200 },
      { x: 200, y: 280, w: 180, h: 20 },
    ];

    const chests = [
      { x: 500, y: 80, opened: false },
      { x: 80, y: 380, opened: false },
      { x: 500, y: 380, opened: false }
    ];

    const keysList = [
      { x: 280, y: 120, collected: false },
      { x: 280, y: 380, collected: false },
      { x: 500, y: 220, collected: false }
    ];

    const skeletons = [
      { x: 280, y: 200, vx: 2, vy: 0, alive: true },
      { x: 460, y: 300, vx: 0, vy: 2, alive: true },
      { x: 100, y: 240, vx: 0, vy: 2, alive: true }
    ];

    stateRef.current = {
      player: { x: 80, y: 80, hp: 3, keys: 0 },
      chests,
      keysList,
      skeletons,
      walls,
      score: 0,
      controlKeys: { left: false, right: false, up: false, down: false, attack: false }
    };

    setScore(0);
    setKeys(0);
    setHp(3);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_dungeon-crawler', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const attack = useCallback(() => {
    const s = stateRef.current;
    sound.playLaser(600);
    s.skeletons.forEach(sk => {
      if (sk.alive && Math.hypot(sk.x - s.player.x, sk.y - s.player.y) < 50) {
        sk.alive = false;
        sound.playHit();
        s.score += 200;
        setScore(s.score);
      }
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.controlKeys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.controlKeys.right = true;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.controlKeys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.controlKeys.down = true;
      if (['Space', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        attack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.controlKeys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.controlKeys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.controlKeys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.controlKeys.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [attack]);

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
      const speed = 4;
      let nextX = p.x;
      let nextY = p.y;

      if (s.controlKeys.left) nextX -= speed;
      if (s.controlKeys.right) nextX += speed;
      if (s.controlKeys.up) nextY -= speed;
      if (s.controlKeys.down) nextY += speed;

      // Wall collisions
      let collide = false;
      s.walls.forEach(wl => {
        if (
          nextX + 10 > wl.x &&
          nextX - 10 < wl.x + wl.w &&
          nextY + 10 > wl.y &&
          nextY - 10 < wl.y + wl.h
        ) {
          collide = true;
        }
      });

      if (!collide) {
        p.x = nextX;
        p.y = nextY;
      }

      // Collect Keys
      s.keysList.forEach(k => {
        if (!k.collected && Math.hypot(k.x - p.x, k.y - p.y) < 22) {
          k.collected = true;
          sound.playCoin();
          p.keys++;
          s.score += 100;
          setKeys(p.keys);
          setScore(s.score);
        }
      });

      // Unlock Chests
      s.chests.forEach(ch => {
        if (!ch.opened && Math.hypot(ch.x - p.x, ch.y - p.y) < 26 && p.keys > 0) {
          ch.opened = true;
          p.keys--;
          sound.playPowerUp();
          confetti({ particleCount: 40, spread: 50 });
          s.score += 500;
          setKeys(p.keys);
          setScore(s.score);
        }
      });

      // Update Skeletons
      s.skeletons.forEach(sk => {
        if (!sk.alive) return;
        sk.x += sk.vx;
        sk.y += sk.vy;

        if (sk.x < 60 || sk.x > w - 60) sk.vx *= -1;
        if (sk.y < 60 || sk.y > h - 60) sk.vy *= -1;

        // Touch player
        if (Math.hypot(sk.x - p.x, sk.y - p.y) < 20) {
          sound.playHit();
          p.hp--;
          setHp(p.hp);
          sk.x += sk.vx * -20;
          sk.y += sk.vy * -20;
          if (p.hp <= 0) {
            handleGameOver(s.score);
          }
        }
      });

      // RENDER
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Cobblestone dungeon floor
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Walls
      ctx.fillStyle = '#334155';
      s.walls.forEach(wl => {
        ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
      });

      // Keys
      s.keysList.forEach(k => {
        if (!k.collected) {
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(k.x, k.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Chests
      s.chests.forEach(ch => {
        ctx.fillStyle = ch.opened ? '#94a3b8' : '#eab308';
        ctx.fillRect(ch.x - 12, ch.y - 12, 24, 24);
        if (!ch.opened) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(ch.x - 12, ch.y - 4, 24, 4);
        }
      });

      // Skeletons
      s.skeletons.forEach(sk => {
        if (sk.alive) {
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(sk.x, sk.y, 10, 0, Math.PI * 2);
          ctx.fill();
          // Red eyes
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(sk.x - 4, sk.y - 3, 2, 2);
          ctx.fillRect(sk.x + 2, sk.y - 3, 2, 2);
        }
      });

      // Player Knight
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Sword
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + 8, p.y);
      ctx.lineTo(p.x + 20, p.y - 8);
      ctx.stroke();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#0f172a] rounded-2xl overflow-hidden select-none border border-cyan-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1 text-xs font-mono text-rose-400">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < hp ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`}
              />
            ))}
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Key className="w-3.5 h-3.5" />
            <span>KEYS: {keys}</span>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
          <Trophy className="w-3.5 h-3.5" />
          <span>BEST: {highScore}</span>
        </div>
      </div>

      <canvas ref={canvasRef} width={600} height={460} className="w-full max-w-xl h-auto aspect-15/11 object-contain" />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-3xl text-white tracking-wide">DUNGEON CRAWLER</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Move with WASD. Press Spacebar or J to swing your sword. Collect keys to unlock golden treasure chests!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-600 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(56,189,248,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ENTER DUNGEON</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-4xl text-white mt-1">DUNGEON CLEARED</h2>
          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>CRAWL AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
