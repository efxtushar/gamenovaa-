import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Sparkles, Shield } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

const COLOR_MODES = [
  { id: 'cyan', color: '#00f0ff', label: 'CYAN' },
  { id: 'pink', color: '#ff007f', label: 'PINK' },
  { id: 'yellow', color: '#facc15', label: 'YELLOW' }
];

export const ColorRushGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [shields, setShields] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_color-rush') || '0', 10);
  });

  const stateRef = useRef({
    player: { x: 300, y: 380, lane: 1, colorIndex: 0, invulnerable: 0 },
    gates: [] as { y: number; colorIndex: number; passed: boolean }[],
    speed: 3.8,
    score: 0,
    shields: 3
  });

  const switchColor = useCallback(() => {
    const s = stateRef.current;
    sound.playLaser(1200);
    s.player.colorIndex = (s.player.colorIndex + 1) % COLOR_MODES.length;
    setColorIndex(s.player.colorIndex);
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const gates = [
      { y: -150, colorIndex: 0, passed: false },
      { y: -450, colorIndex: 1, passed: false },
      { y: -750, colorIndex: 2, passed: false },
      { y: -1050, colorIndex: 0, passed: false }
    ];

    stateRef.current = {
      player: { x: 300, y: 380, lane: 1, colorIndex: 0, invulnerable: 0 },
      gates,
      speed: 3.8,
      score: 0,
      shields: 3
    };

    setScore(0);
    setColorIndex(0);
    setShields(3);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_color-rush', finalScore.toString());
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'KeyW', 'ArrowUp', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        switchColor();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [switchColor]);

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

      // Smooth gradual speed ramp
      s.speed = 3.8 + Math.min(4.5, (s.score / 1500) * 3.5);
      if (p.invulnerable > 0) p.invulnerable--;

      // Update Gates
      s.gates.forEach(g => {
        g.y += s.speed;

        // Collision detection with player line
        if (!g.passed && g.y >= p.y - 18 && g.y <= p.y + 18) {
          if (p.colorIndex === g.colorIndex) {
            // Success! Passed through color gate
            g.passed = true;
            sound.playCoin();
            s.score += 100;
            setScore(s.score);
          } else if (p.invulnerable <= 0) {
            // Shield damage
            g.passed = true;
            sound.playExplosion();
            s.shields--;
            setShields(s.shields);
            p.invulnerable = 60; // 1 second safety
            if (s.shields <= 0) {
              handleGameOver(s.score);
              return;
            }
          }
        }
      });

      // Respawn passed gates with comfortable spacing
      s.gates.forEach(g => {
        if (g.y > h + 50) {
          g.y = -220 - Math.random() * 180;
          g.colorIndex = Math.floor(Math.random() * COLOR_MODES.length);
          g.passed = false;
        }
      });

      // RENDER
      ctx.fillStyle = '#060412';
      ctx.fillRect(0, 0, w, h);

      // Cyber Highway Perspective Tunnel Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(80, h);
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w - 80, h);
      ctx.stroke();

      // Color Gates
      s.gates.forEach(g => {
        const c = COLOR_MODES[g.colorIndex];
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(100, g.y, w - 200, 16);
        ctx.shadowBlur = 0;
      });

      // Player Energy Orb
      const curColor = COLOR_MODES[p.colorIndex];
      ctx.fillStyle = curColor.color;
      ctx.shadowColor = curColor.color;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(w / 2, p.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w / 2, p.y, 8, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#060412] rounded-2xl overflow-hidden select-none border border-cyan-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div
            className="px-3.5 py-1.5 rounded-xl bg-black/75 border backdrop-blur-md flex items-center gap-2"
            style={{ borderColor: COLOR_MODES[colorIndex].color }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: COLOR_MODES[colorIndex].color }} />
            <span className="text-xs font-orbitron font-bold text-white">
              {COLOR_MODES[colorIndex].label}
            </span>
          </div>

          {/* Shields */}
          <div className="px-3 py-1.5 rounded-xl bg-black/75 border border-cyan-500/30 backdrop-blur-md flex items-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <Shield
                key={i}
                className={`w-4 h-4 transition-all duration-200 ${
                  i < shields ? 'text-cyan-400 fill-cyan-400' : 'text-slate-600 fill-slate-800 opacity-40'
                }`}
              />
            ))}
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
        onClick={switchColor}
        className="w-full max-w-xl h-auto aspect-15/11 object-contain cursor-pointer"
      />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-3xl text-white tracking-wide">COLOR RUSH</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Tap screen, click, or press Spacebar to cycle your energy color. Match the color of incoming gates to pass through!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>RUSH NOW</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">COLOR MISMATCH</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">SHATTERED</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>SCORE</span>
              <span className="text-cyan-400 font-bold font-orbitron text-base">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-2 border-t border-white/5">
              <span>RECORD</span>
              <span className="text-amber-300 font-bold font-orbitron text-base">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
