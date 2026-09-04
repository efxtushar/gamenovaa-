import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Flag } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const MiniGolfWorldGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [strokes, setStrokes] = useState(0);
  const [hole, setHole] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_mini-golf') || '1000', 10);
  });

  const stateRef = useRef({
    ball: { x: 100, y: 380, vx: 0, vy: 0, r: 8, isMoving: false },
    holeTarget: { x: 480, y: 150, r: 14 },
    obstacles: [
      { x: 250, y: 180, w: 20, h: 180 },
      { x: 360, y: 80, w: 20, h: 180 }
    ],
    isAiming: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    strokes: 0,
    holeNum: 1,
    totalScore: 0
  });

  const nextHole = useCallback(() => {
    const s = stateRef.current;
    sound.playPowerUp();
    confetti({ particleCount: 50, spread: 60 });
    s.totalScore += Math.max(100, 1000 - s.strokes * 150);
    setTotalScore(s.totalScore);

    if (s.holeNum >= 3) {
      sound.playCoin();
      setGameState('GAMEOVER');
      if (s.totalScore > highScore) {
        setHighScore(s.totalScore);
        localStorage.setItem('gamenova_hs_mini-golf', s.totalScore.toString());
      }
      if (onGameOver) onGameOver(s.totalScore);
      return;
    }

    s.holeNum++;
    s.strokes = 0;
    setHole(s.holeNum);
    setStrokes(0);

    // Setup hole layout
    s.ball = { x: 90, y: 360, vx: 0, vy: 0, r: 8, isMoving: false };
    if (s.holeNum === 2) {
      s.holeTarget = { x: 500, y: 120, r: 14 };
      s.obstacles = [
        { x: 200, y: 120, w: 20, h: 220 },
        { x: 350, y: 220, w: 120, h: 20 }
      ];
    } else {
      s.holeTarget = { x: 300, y: 80, r: 14 };
      s.obstacles = [
        { x: 180, y: 160, w: 100, h: 20 },
        { x: 320, y: 260, w: 120, h: 20 }
      ];
    }
  }, [highScore, onGameOver]);

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      ball: { x: 100, y: 380, vx: 0, vy: 0, r: 8, isMoving: false },
      holeTarget: { x: 480, y: 150, r: 14 },
      obstacles: [
        { x: 250, y: 180, w: 20, h: 180 },
        { x: 360, y: 80, w: 20, h: 180 }
      ],
      isAiming: false,
      dragStart: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 },
      strokes: 0,
      holeNum: 1,
      totalScore: 0
    };
    setStrokes(0);
    setHole(1);
    setTotalScore(0);
    setGameState('PLAYING');
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (s.ball.isMoving || gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (Math.hypot(mx - s.ball.x, my - s.ball.y) < 40) {
      s.isAiming = true;
      s.dragStart = { x: mx, y: my };
      s.dragCurrent = { x: mx, y: my };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s.isAiming) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    s.dragCurrent = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleMouseUp = () => {
    const s = stateRef.current;
    if (!s.isAiming) return;
    s.isAiming = false;

    const dx = s.dragStart.x - s.dragCurrent.x;
    const dy = s.dragStart.y - s.dragCurrent.y;

    if (Math.hypot(dx, dy) > 8) {
      sound.playClick();
      s.ball.vx = dx * 0.12;
      s.ball.vy = dy * 0.12;
      s.ball.isMoving = true;
      s.strokes++;
      setStrokes(s.strokes);
    }
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
      const b = s.ball;
      const h = s.holeTarget;
      const w = canvas.width;
      const ch = canvas.height;

      if (b.isMoving) {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.975; // green friction
        b.vy *= 0.975;

        // Stop ball if slow enough
        if (Math.hypot(b.vx, b.vy) < 0.1) {
          b.vx = 0;
          b.vy = 0;
          b.isMoving = false;
        }

        // Wall Bounces
        if (b.x - b.r < 30) { b.x = 30 + b.r; b.vx *= -0.8; sound.playHit(); }
        if (b.x + b.r > w - 30) { b.x = w - 30 - b.r; b.vx *= -0.8; sound.playHit(); }
        if (b.y - b.r < 30) { b.y = 30 + b.r; b.vy *= -0.8; sound.playHit(); }
        if (b.y + b.r > ch - 30) { b.y = ch - 30 - b.r; b.vy *= -0.8; sound.playHit(); }

        // Obstacle Collisions
        s.obstacles.forEach(ob => {
          if (
            b.x + b.r > ob.x &&
            b.x - b.r < ob.x + ob.w &&
            b.y + b.r > ob.y &&
            b.y - b.r < ob.y + ob.h
          ) {
            b.vx *= -0.8;
            b.vy *= -0.8;
            sound.playHit();
          }
        });

        // Check if ball sunk into hole
        if (Math.hypot(b.x - h.x, b.y - h.y) < h.r && Math.hypot(b.vx, b.vy) < 3.5) {
          b.isMoving = false;
          nextHole();
        }
      }

      // RENDER
      ctx.fillStyle = '#061a14';
      ctx.fillRect(0, 0, w, ch);

      // Course Border & Green Turf
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(20, 20, w - 40, ch - 40);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, w - 40, ch - 40);

      // Obstacles
      ctx.fillStyle = '#78350f';
      s.obstacles.forEach(ob => {
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      });

      // Hole Cup & Flag
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      ctx.fill();

      // Flagstick
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(h.x - 1, h.y - 30, 3, 30);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(h.x + 2, h.y - 30);
      ctx.lineTo(h.x + 18, h.y - 22);
      ctx.lineTo(h.x + 2, h.y - 14);
      ctx.closePath();
      ctx.fill();

      // Aim Arrow
      if (s.isAiming) {
        const dx = s.dragStart.x - s.dragCurrent.x;
        const dy = s.dragStart.y - s.dragCurrent.y;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + dx, b.y + dy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Golf Ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, nextHole]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#061a14] rounded-2xl overflow-hidden select-none border border-emerald-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-emerald-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-emerald-400 block uppercase">HOLE {hole} / 3</span>
            <span className="text-xl font-orbitron font-bold text-white">{strokes} Strokes</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-cyan-300">
            <span>SCORE: {totalScore}</span>
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full max-w-xl h-auto aspect-15/11 object-contain cursor-crosshair"
      />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
            <Flag className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">MINI GOLF WORLD</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Click on the ball and pull back to set putt power and angle. Sink the ball into the cup in as few strokes as possible!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>TEE OFF</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-emerald-400 font-orbitron font-bold text-sm tracking-widest uppercase">COURSE COMPLETE</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">ROUND FINISHED</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>TOTAL SCORE</span>
              <span className="text-emerald-400 font-bold font-orbitron text-base">{totalScore}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-2 border-t border-white/5">
              <span>RECORD</span>
              <span className="text-amber-400 font-bold font-orbitron text-base">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
