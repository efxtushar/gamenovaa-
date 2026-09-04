import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, EyeOff, ShieldAlert } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const StealthAssassinGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [intel, setIntel] = useState(0);
  const [alertLevel, setAlertLevel] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_stealth-assassin') || '0', 10);
  });

  const stateRef = useRef({
    player: { x: 60, y: 380, speed: 3.5, crouched: false },
    guards: [] as { x: number; y: number; minX: number; maxX: number; vx: number; angle: number }[],
    terminals: [] as { x: number; y: number; hacked: boolean }[],
    walls: [] as { x: number; y: number; w: number; h: number }[],
    alertLevel: 0,
    score: 0,
    intel: 0,
    keys: { left: false, right: false, up: false, down: false, crouch: false }
  });

  const startGame = useCallback(() => {
    sound.playClick();
    const walls = [
      { x: 180, y: 120, w: 20, h: 200 },
      { x: 380, y: 160, w: 20, h: 200 }
    ];

    const guards = [
      { x: 120, y: 180, minX: 60, maxX: 160, vx: 1.5, angle: 0 },
      { x: 280, y: 240, minX: 220, maxX: 340, vx: -1.5, angle: Math.PI },
      { x: 480, y: 180, minX: 420, maxX: 540, vx: 2, angle: 0 }
    ];

    const terminals = [
      { x: 120, y: 80, hacked: false },
      { x: 280, y: 80, hacked: false },
      { x: 500, y: 80, hacked: false }
    ];

    stateRef.current = {
      player: { x: 60, y: 380, speed: 3.5, crouched: false },
      guards,
      terminals,
      walls,
      alertLevel: 0,
      score: 0,
      intel: 0,
      keys: { left: false, right: false, up: false, down: false, crouch: false }
    };

    setScore(0);
    setIntel(0);
    setAlertLevel(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_stealth-assassin', finalScore.toString());
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
      if (['KeyC', 'ShiftLeft'].includes(e.code)) stateRef.current.keys.crouch = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
      if (['KeyC', 'ShiftLeft'].includes(e.code)) stateRef.current.keys.crouch = false;
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

      const spd = s.keys.crouch ? 1.8 : 3.5;
      if (s.keys.left) p.x -= spd;
      if (s.keys.right) p.x += spd;
      if (s.keys.up) p.y -= spd;
      if (s.keys.down) p.y += spd;

      p.x = Math.max(30, Math.min(w - 30, p.x));
      p.y = Math.max(30, Math.min(h - 30, p.y));

      // Update Guards Patrol & Vision Cones
      s.guards.forEach(g => {
        g.x += g.vx;
        if (g.x > g.maxX) { g.x = g.maxX; g.vx *= -1; g.angle = Math.PI; }
        if (g.x < g.minX) { g.x = g.minX; g.vx *= -1; g.angle = 0; }

        // Vision Cone Detection
        const angleToPlayer = Math.atan2(p.y - g.y, p.x - g.x);
        const diff = Math.abs(angleToPlayer - g.angle);
        const dist = Math.hypot(p.x - g.x, p.y - g.y);

        if (dist < 140 && (diff < 0.6 || diff > Math.PI * 2 - 0.6)) {
          // Detected!
          s.alertLevel += s.keys.crouch ? 1.5 : 4.0;
          setAlertLevel(Math.min(100, Math.floor(s.alertLevel)));
          if (s.alertLevel >= 100) {
            handleGameOver(s.score);
          }
        } else {
          s.alertLevel = Math.max(0, s.alertLevel - 0.3);
          setAlertLevel(Math.floor(s.alertLevel));
        }
      });

      // Hack Terminals
      s.terminals.forEach(t => {
        if (!t.hacked && Math.hypot(t.x - p.x, t.y - p.y) < 28) {
          t.hacked = true;
          sound.playPowerUp();
          confetti({ particleCount: 30, spread: 50 });
          s.intel++;
          s.score += 500;
          setIntel(s.intel);
          setScore(s.score);
        }
      });

      // RENDER
      ctx.fillStyle = '#080812';
      ctx.fillRect(0, 0, w, h);

      // Facility Grid Floor
      ctx.strokeStyle = '#1e1e2e';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Walls
      ctx.fillStyle = '#313244';
      s.walls.forEach(wl => {
        ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
      });

      // Terminals
      s.terminals.forEach(t => {
        ctx.fillStyle = t.hacked ? '#00f0ff' : '#a6e3a1';
        ctx.fillRect(t.x - 12, t.y - 12, 24, 24);
        ctx.fillStyle = '#11111b';
        ctx.fillRect(t.x - 8, t.y - 8, 16, 16);
      });

      // Guards & Flashlight Vision Cones
      s.guards.forEach(g => {
        // Vision cone
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.angle);
        const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 140);
        coneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
        ctx.fillStyle = coneGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 140, -0.5, 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Guard Body
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      // Player Assassin
      ctx.fillStyle = s.keys.crouch ? '#6b7280' : '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = s.keys.crouch ? 0 : 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.keys.crouch ? 8 : 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#080812] rounded-2xl overflow-hidden select-none border border-cyan-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-mono text-rose-400">ALERT: {alertLevel}%</span>
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
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <EyeOff className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">STEALTH ASSASSIN</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            WASD to move. Hold Shift or C to Crouch in shadows. Avoid patrol flashlights and hack high-security terminals!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-600 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>INFILTRATE</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">ALARM TRIGGERED</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">COMPROMISED</h2>
          
          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>RETRY INFILTRATION</span>
          </button>
        </div>
      )}
    </div>
  );
};
