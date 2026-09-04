import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Orbit, Shield } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const SpaceSurvivorGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_space-survivor') || '0', 10);
  });

  const stateRef = useRef({
    player: { x: 300, y: 240, hp: 100, maxHp: 100, speed: 3.5, orbsCount: 3 },
    swarms: [] as { x: number; y: number; hp: number; speed: number }[],
    orbsAngle: 0,
    score: 0,
    timeSurvived: 0,
    keys: { left: false, right: false, up: false, down: false }
  });

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      player: { x: 300, y: 240, hp: 100, maxHp: 100, speed: 3.5, orbsCount: 3 },
      swarms: [],
      orbsAngle: 0,
      score: 0,
      timeSurvived: 0,
      keys: { left: false, right: false, up: false, down: false }
    };
    setScore(0);
    setLevel(1);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_space-survivor', finalScore.toString());
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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
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
      if (s.keys.left) p.x -= p.speed;
      if (s.keys.right) p.x += p.speed;
      if (s.keys.up) p.y -= p.speed;
      if (s.keys.down) p.y += p.speed;

      p.x = Math.max(20, Math.min(w - 20, p.x));
      p.y = Math.max(20, Math.min(h - 20, p.y));

      s.timeSurvived++;
      s.orbsAngle += 0.07;
      s.score = Math.floor(s.timeSurvived / 10);
      setScore(s.score);

      // Level progression
      const currentLvl = 1 + Math.floor(s.timeSurvived / 600);
      if (currentLvl !== level) {
        setLevel(currentLvl);
        if (currentLvl === 2 && p.orbsCount === 3) p.orbsCount = 4;
        if (currentLvl === 3 && p.orbsCount === 4) p.orbsCount = 5;
      }

      // Spawn Swarms (Gradual scaling from gentle 0.018 to max 0.06)
      const spawnChance = Math.min(0.065, 0.018 + (s.timeSurvived / 3600) * 0.045);
      if (Math.random() < spawnChance) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 320;
        s.swarms.push({
          x: p.x + Math.cos(angle) * dist,
          y: p.y + Math.sin(angle) * dist,
          hp: 12 + Math.floor(s.timeSurvived / 800) * 4,
          speed: 1.1 + Math.random() * 0.5 + Math.min(0.8, s.timeSurvived * 0.0001)
        });
      }

      // Calculate Orbital Lasers positions
      const orbRadius = 48;
      const orbPositions = Array.from({ length: p.orbsCount }).map((_, i) => {
        const a = s.orbsAngle + (i * Math.PI * 2) / p.orbsCount;
        return { x: p.x + Math.cos(a) * orbRadius, y: p.y + Math.sin(a) * orbRadius };
      });

      // Update Swarms & check orb collisions
      s.swarms.forEach((en, eIdx) => {
        const a = Math.atan2(p.y - en.y, p.x - en.x);
        en.x += Math.cos(a) * en.speed;
        en.y += Math.sin(a) * en.speed;

        // Hit by rotating plasma orbs
        orbPositions.forEach(orb => {
          if (Math.hypot(orb.x - en.x, orb.y - en.y) < 24) {
            en.hp -= 6;
            sound.playLaser(1000);
            if (en.hp <= 0) {
              s.swarms.splice(eIdx, 1);
              sound.playHit();
              s.score += 50;
              setScore(s.score);
            }
          }
        });

        // Alien touches survivor (gentle damage tick)
        if (Math.hypot(en.x - p.x, en.y - p.y) < 20) {
          p.hp -= 0.3;
          if (p.hp <= 0) {
            handleGameOver(s.score);
          }
        }
      });

      // RENDER
      ctx.fillStyle = '#060611';
      ctx.fillRect(0, 0, w, h);

      // Neon Grid Floor
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Rotating Plasma Orbs
      orbPositions.forEach(orb => {
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Swarm Aliens
      s.swarms.forEach(en => {
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(en.x, en.y, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      // Player Space Survivor
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner Core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#060611] rounded-2xl overflow-hidden select-none border border-purple-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-purple-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-purple-400 block uppercase">SURVIVED</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}s</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-cyan-300">
            <Orbit className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            <span>ORBIT SHIELD: ACTIVE</span>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
          <Trophy className="w-3.5 h-3.5" />
          <span>BEST: {highScore}s</span>
        </div>
      </div>

      <canvas ref={canvasRef} width={600} height={460} className="w-full max-w-xl h-auto aspect-15/11 object-contain" />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-3xl text-white tracking-wide">SPACE SURVIVOR</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Use WASD or Arrow Keys to maneuver. Your rotating auto-plasma shield vaporizes incoming insectoid swarms!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(168,85,247,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ENTER ORBIT</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">OVERRUN</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">SHIELD COLLAPSED</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>TIME SURVIVED</span>
              <span className="text-purple-400 font-bold font-orbitron text-base">{score}s</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
