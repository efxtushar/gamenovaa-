import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Shield, Flame, Zap } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const CastleDefenderGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [wallHp, setWallHp] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_castle-defender') || '0', 10);
  });

  const stateRef = useRef({
    wallHp: 100,
    arrows: [] as { x: number; y: number; vx: number; vy: number }[],
    enemies: [] as { x: number; y: number; hp: number; maxHp: number; speed: number; type: string }[],
    spells: [] as { x: number; y: number; r: number; life: number; color: string }[],
    score: 0,
    spawnTimer: 0
  });

  const shootArrow = useCallback((targetX: number, targetY: number) => {
    const s = stateRef.current;
    sound.playLaser(850);
    const startX = 80;
    const startY = 240;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speed = 15;
    s.arrows.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed
    });
  }, []);

  const castFireMeteor = useCallback(() => {
    const s = stateRef.current;
    sound.playExplosion();
    confetti({ particleCount: 40, spread: 50 });
    s.spells.push({ x: 380, y: 260, r: 90, life: 30, color: '#f97316' });
    s.enemies.forEach(e => {
      e.hp -= 80;
    });
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      wallHp: 100,
      arrows: [],
      enemies: [],
      spells: [],
      score: 0,
      spawnTimer: 0
    };
    setScore(0);
    setWallHp(100);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_castle-defender', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    shootArrow(mx, my);
  };

  // Keyboard spells
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Digit1', 'KeyF'].includes(e.code)) castFireMeteor();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [castFireMeteor]);

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

      // Spawn Goblins & Orcs
      s.spawnTimer++;
      if (s.spawnTimer > 45) {
        s.spawnTimer = 0;
        const isOrc = Math.random() < 0.25;
        s.enemies.push({
          x: w + 20,
          y: 200 + Math.random() * 180,
          hp: isOrc ? 60 : 20,
          maxHp: isOrc ? 60 : 20,
          speed: isOrc ? 1.0 : 2.0,
          type: isOrc ? 'orc' : 'goblin'
        });
      }

      // Update Arrows
      s.arrows.forEach((arr, arrIdx) => {
        arr.x += arr.vx;
        arr.y += arr.vy;

        s.enemies.forEach((enemy, eIdx) => {
          if (Math.hypot(arr.x - enemy.x, arr.y - enemy.y) < 22) {
            enemy.hp -= 25;
            s.arrows.splice(arrIdx, 1);
            sound.playHit();

            if (enemy.hp <= 0) {
              s.enemies.splice(eIdx, 1);
              sound.playCoin();
              s.score += enemy.type === 'orc' ? 250 : 100;
              setScore(s.score);
            }
          }
        });
      });
      s.arrows = s.arrows.filter(a => a.x < w + 30 && a.y < h + 30);

      // Update Spells
      s.spells.forEach((sp, spIdx) => {
        sp.life--;
        if (sp.life <= 0) s.spells.splice(spIdx, 1);
      });

      // Update Enemies (Marching toward Castle Wall)
      s.enemies.forEach((enemy, eIdx) => {
        enemy.x -= enemy.speed;

        // Damage castle wall
        if (enemy.x <= 95) {
          s.wallHp -= enemy.type === 'orc' ? 0.3 : 0.1;
          setWallHp(Math.max(0, Math.floor(s.wallHp)));
          if (s.wallHp <= 0) {
            handleGameOver(s.score);
          }
        }
      });

      // RENDER
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, w, h);

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, 200);
      sky.addColorStop(0, '#450a0a');
      sky.addColorStop(1, '#78350f');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, 200);

      // Battlefield Ground
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, 200, w, h - 200);

      // Royal Castle Wall
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 100, 85, h - 100);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 80, 85, 20); // Battlements
      for (let bx = 0; bx < 85; bx += 20) {
        ctx.fillRect(bx, 65, 12, 20);
      }

      // Spells Meteor explosions
      s.spells.forEach(sp => {
        ctx.fillStyle = sp.color;
        ctx.shadowColor = sp.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Arrows
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      s.arrows.forEach(arr => {
        ctx.beginPath();
        ctx.moveTo(arr.x, arr.y);
        ctx.lineTo(arr.x - arr.vx * 0.8, arr.y - arr.vy * 0.8);
        ctx.stroke();
      });

      // Enemies
      s.enemies.forEach(e => {
        ctx.fillStyle = e.type === 'orc' ? '#15803d' : '#84cc16';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.type === 'orc' ? 18 : 12, 0, Math.PI * 2);
        ctx.fill();

        // Enemy HP Bar
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - 12, e.y - 20, 24 * (e.hp / e.maxHp), 3);
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#1c1917] rounded-2xl overflow-hidden select-none border border-amber-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-amber-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-amber-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  wallHp > 50 ? 'bg-emerald-400' : wallHp > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${wallHp}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={castFireMeteor}
          className="pointer-events-auto px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-orbitron font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.5)] cursor-pointer"
        >
          <Flame className="w-4 h-4 text-yellow-300" />
          <span>FIRE METEOR (1)</span>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={460}
        onClick={handleClick}
        className="w-full max-w-xl h-auto aspect-15/11 object-contain cursor-crosshair"
      />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">CASTLE DEFENDER</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Click to fire ballista arrows at incoming goblin hordes. Press 1 to cast Fire Meteors and defend the kingdom walls!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>DEFEND WALLS</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">BREACHED</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">CASTLE HAS FALLEN</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>FINAL SCORE</span>
              <span className="text-amber-400 font-bold font-orbitron text-base">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-2 border-t border-white/5">
              <span>RECORD</span>
              <span className="text-amber-300 font-bold font-orbitron text-base">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
