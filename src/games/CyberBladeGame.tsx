import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Zap, Heart } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const CyberBladeGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_cyber-blade') || '0', 10);
  });

  const stateRef = useRef({
    orbs: [] as { x: number; y: number; vx: number; vy: number; r: number; color: string; isBomb: boolean; sliced: boolean }[],
    bladeTrail: [] as { x: number; y: number; life: number }[],
    isMouseDown: false,
    score: 0,
    combo: 0,
    lives: 3
  });

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      orbs: [],
      bladeTrail: [],
      isMouseDown: false,
      score: 0,
      combo: 0,
      lives: 3
    };
    setScore(0);
    setCombo(0);
    setLives(3);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_cyber-blade', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0, clientY = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const mx = (clientX - rect.left) * (canvas.width / rect.width);
    const my = (clientY - rect.top) * (canvas.height / rect.height);

    const s = stateRef.current;
    s.bladeTrail.push({ x: mx, y: my, life: 10 });

    // Check sliced orbs
    s.orbs.forEach(orb => {
      if (!orb.sliced && Math.hypot(orb.x - mx, orb.y - my) < orb.r + 15) {
        orb.sliced = true;
        if (orb.isBomb) {
          sound.playExplosion();
          s.lives--;
          setLives(s.lives);
          // Clear active bombs on hit
          s.orbs = s.orbs.filter(o => !o.isBomb);
          if (s.lives <= 0) {
            handleGameOver(s.score);
          }
        } else {
          sound.playLaser(1400);
          s.combo++;
          s.score += 100 * Math.min(5, s.combo);
          setScore(s.score);
          setCombo(s.combo);
        }
      }
    });
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
      const w = canvas.width;
      const h = canvas.height;

      // Spawn orbs / bombs from bottom (gradual progression)
      if (Math.random() < 0.04) {
        const isBomb = s.score > 400 && Math.random() < Math.min(0.22, (s.score / 3000) * 0.22);
        const colors = ['#00f0ff', '#ff007f', '#39ff14', '#facc15'];
        s.orbs.push({
          x: 100 + Math.random() * (w - 200),
          y: h + 20,
          vx: (Math.random() - 0.5) * 5,
          vy: -12 - Math.random() * 3.5,
          r: isBomb ? 24 : 20,
          color: isBomb ? '#ef4444' : colors[Math.floor(Math.random() * colors.length)],
          isBomb,
          sliced: false
        });
      }

      // Update Orbs
      s.orbs.forEach(orb => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        orb.vy += 0.35; // gravity
      });

      // Filter orbs that fell off screen
      s.orbs.forEach(orb => {
        if (orb.y > h + 50 && !orb.sliced && !orb.isBomb) {
          s.combo = 0;
          setCombo(0);
        }
      });
      s.orbs = s.orbs.filter(orb => orb.y < h + 60);

      // Update Blade Trail
      s.bladeTrail.forEach((pt, idx) => {
        pt.life--;
        if (pt.life <= 0) s.bladeTrail.splice(idx, 1);
      });

      // RENDER
      ctx.fillStyle = '#050210';
      ctx.fillRect(0, 0, w, h);

      // Background Cyber Matrix Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Draw Orbs
      s.orbs.forEach(orb => {
        if (orb.sliced) return;

        ctx.fillStyle = orb.color;
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (orb.isBomb) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('💣', orb.x - 9, orb.y + 6);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(orb.x - 5, orb.y - 5, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Blade Trail
      if (s.bladeTrail.length > 1) {
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.bladeTrail[0].x, s.bladeTrail[0].y);
        for (let i = 1; i < s.bladeTrail.length; i++) {
          ctx.lineTo(s.bladeTrail[i].x, s.bladeTrail[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#050210] rounded-2xl overflow-hidden select-none border border-cyan-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          {/* Hearts / Shields */}
          <div className="px-3 py-1.5 rounded-xl bg-black/75 border border-rose-500/40 backdrop-blur-md flex items-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition-all duration-200 ${
                  i < lives ? 'text-rose-500 fill-rose-500' : 'text-slate-600 fill-slate-800 opacity-40'
                }`}
              />
            ))}
          </div>

          {combo >= 3 && (
            <div className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400 backdrop-blur-md flex items-center gap-1 text-xs font-orbitron font-bold text-cyan-300 animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>COMBO x{combo}</span>
            </div>
          )}
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
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        className="w-full max-w-xl h-auto aspect-15/11 object-contain cursor-crosshair"
      />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-3xl text-white tracking-wide">CYBER BLADE</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Swipe your neon katana across floating energy cores to slice them! Beware of explosive red cyber bombs.
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(0,240,255,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>UNSHEATHE BLADE</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">DETONATION</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">BLADE SHATTERED</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>SCORE</span>
              <span className="text-cyan-400 font-bold font-orbitron text-base">{score}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>SLASH AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
