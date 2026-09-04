import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Sparkles } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const SpaceMinerGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [minerals, setMinerals] = useState(0);
  const [cargo, setCargo] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_space-miner') || '0', 10);
  });

  const stateRef = useRef({
    ship: { x: 300, y: 240, vx: 0, vy: 0, angle: 0, isMining: false },
    asteroids: [] as { x: number; y: number; r: number; ore: number; maxOre: number; color: string }[],
    crystals: [] as { x: number; y: number; val: number }[],
    baseStation: { x: 80, y: 80, r: 40 },
    cargo: 0,
    maxCargo: 50,
    totalMinerals: 0,
    keys: { left: false, right: false, up: false, down: false, mine: false }
  });

  const startGame = useCallback(() => {
    sound.playClick();
    const asteroids = [
      { x: 220, y: 150, r: 35, ore: 30, maxOre: 30, color: '#38bdf8' },
      { x: 450, y: 180, r: 45, ore: 40, maxOre: 40, color: '#facc15' },
      { x: 380, y: 380, r: 40, ore: 35, maxOre: 35, color: '#ec4899' },
      { x: 180, y: 380, r: 30, ore: 25, maxOre: 25, color: '#4ade80' }
    ];

    stateRef.current = {
      ship: { x: 300, y: 240, vx: 0, vy: 0, angle: 0, isMining: false },
      asteroids,
      crystals: [],
      baseStation: { x: 80, y: 80, r: 40 },
      cargo: 0,
      maxCargo: 50,
      totalMinerals: 0,
      keys: { left: false, right: false, up: false, down: false, mine: false }
    };

    setCargo(0);
    setMinerals(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_space-miner', finalScore.toString());
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
      if (['Space', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        stateRef.current.keys.mine = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
      if (['Space', 'KeyJ'].includes(e.code)) stateRef.current.keys.mine = false;
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
      const sh = s.ship;
      const w = canvas.width;
      const h = canvas.height;

      // Ship Steering & Thrust
      if (s.keys.left) sh.angle -= 0.06;
      if (s.keys.right) sh.angle += 0.06;

      if (s.keys.up) {
        sh.vx += Math.cos(sh.angle) * 0.25;
        sh.vy += Math.sin(sh.angle) * 0.25;
      }
      sh.vx *= 0.96; // space inertia
      sh.vy *= 0.96;
      sh.x += sh.vx;
      sh.y += sh.vy;

      sh.x = Math.max(20, Math.min(w - 20, sh.x));
      sh.y = Math.max(20, Math.min(h - 20, sh.y));

      // Mining Laser
      sh.isMining = s.keys.mine;
      if (sh.isMining && s.cargo < s.maxCargo) {
        s.asteroids.forEach(ast => {
          if (Math.hypot(ast.x - sh.x, ast.y - sh.y) < ast.r + 90 && ast.ore > 0) {
            ast.ore -= 0.2;
            s.cargo = Math.min(s.maxCargo, s.cargo + 0.2);
            setCargo(Math.floor(s.cargo));
            sound.playLaser(450);
          }
        });
      }

      // Base Station Unloading
      if (Math.hypot(sh.x - s.baseStation.x, sh.y - s.baseStation.y) < s.baseStation.r + 20 && s.cargo > 0) {
        sound.playCoin();
        s.totalMinerals += Math.floor(s.cargo) * 10;
        s.cargo = 0;
        setCargo(0);
        setMinerals(s.totalMinerals);
      }

      // Respawn empty asteroids
      s.asteroids.forEach(ast => {
        if (ast.ore <= 0) {
          ast.ore = ast.maxOre;
          ast.x = 80 + Math.random() * (w - 160);
          ast.y = 80 + Math.random() * (h - 160);
        }
      });

      // RENDER
      ctx.fillStyle = '#050714';
      ctx.fillRect(0, 0, w, h);

      // Starfield
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 123) % w, (i * 97) % h, 2, 2);
      }

      // Base Station Drop-off
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(s.baseStation.x, s.baseStation.y, s.baseStation.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('DEPOT', s.baseStation.x - 18, s.baseStation.y + 4);

      // Asteroids with Crystal Veins
      s.asteroids.forEach(ast => {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.r, 0, Math.PI * 2);
        ctx.fill();

        // Glowing crystal vein
        ctx.fillStyle = ast.color;
        ctx.shadowColor = ast.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.r * (ast.ore / ast.maxOre) * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Mining Laser Beam
      if (sh.isMining) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x + Math.cos(sh.angle) * 110, sh.y + Math.sin(sh.angle) * 110);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Mining Ship
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.angle);

      // Cargo Container Glow
      if (s.cargo > 0) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-10, -8, 8, 16);
      }

      // Hull
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fill();

      // Thruster flash
      if (s.keys.up) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-20, -5);
        ctx.lineTo(-20, 5);
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#050714] rounded-2xl overflow-hidden select-none border border-sky-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-sky-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-sky-400 block uppercase">ORE REFINED</span>
            <span className="text-xl font-orbitron font-bold text-white">{minerals}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono text-slate-200">CARGO: {cargo} / 50</span>
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
          <h2 className="font-display font-black text-3xl text-white tracking-wide">SPACE MINER</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Steer ship with WASD. Hold Spacebar near glowing asteroids to drill ore. Unload full cargo at the DEPOT station!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(56,189,248,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START MINING</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-4xl text-white mt-1">EXPEDITION COMPLETE</h2>
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>TOTAL ORE</span>
              <span className="text-sky-400 font-bold font-orbitron text-base">{minerals}</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>MINE AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
