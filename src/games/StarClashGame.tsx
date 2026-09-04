import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Globe, Rocket, Shield } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const StarClashGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_star-clash') || '0', 10);
  });

  const stateRef = useRef({
    planets: [
      { id: 1, x: 120, y: 230, r: 35, owner: 'player', ships: 25, maxShips: 50 },
      { id: 2, x: 300, y: 130, r: 25, owner: 'neutral', ships: 10, maxShips: 40 },
      { id: 3, x: 300, y: 330, r: 25, owner: 'neutral', ships: 10, maxShips: 40 },
      { id: 4, x: 480, y: 230, r: 35, owner: 'enemy', ships: 25, maxShips: 50 }
    ],
    fleets: [] as {
      fromId: number;
      toId: number;
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      count: number;
      owner: string;
      color: string;
    }[],
    selectedPlanet: null as number | null,
    score: 0,
    tick: 0
  });

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      planets: [
        { id: 1, x: 120, y: 230, r: 35, owner: 'player', ships: 25, maxShips: 50 },
        { id: 2, x: 300, y: 130, r: 25, owner: 'neutral', ships: 10, maxShips: 40 },
        { id: 3, x: 300, y: 330, r: 25, owner: 'neutral', ships: 10, maxShips: 40 },
        { id: 4, x: 480, y: 230, r: 35, owner: 'enemy', ships: 25, maxShips: 50 }
      ],
      fleets: [],
      selectedPlanet: null,
      score: 0,
      tick: 0
    };

    setScore(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((won: boolean) => {
    if (won) {
      sound.playPowerUp();
      confetti({ particleCount: 80, spread: 70 });
      stateRef.current.score += 2000;
      setScore(stateRef.current.score);
      if (stateRef.current.score > highScore) {
        setHighScore(stateRef.current.score);
        localStorage.setItem('gamenova_hs_star-clash', stateRef.current.score.toString());
      }
    } else {
      sound.playGameOver();
    }
    setGameState('GAMEOVER');
    if (onGameOver) onGameOver(stateRef.current.score);
  }, [highScore, onGameOver]);

  const handlePlanetClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const s = stateRef.current;
    const clicked = s.planets.find(p => Math.hypot(p.x - mx, p.y - my) < p.r + 10);

    if (clicked) {
      if (s.selectedPlanet === null) {
        if (clicked.owner === 'player') {
          sound.playClick();
          s.selectedPlanet = clicked.id;
        }
      } else {
        if (s.selectedPlanet !== clicked.id) {
          const fromP = s.planets.find(p => p.id === s.selectedPlanet);
          if (fromP && fromP.ships > 1) {
            sound.playLaser(1100);
            const sendCount = Math.floor(fromP.ships / 2);
            fromP.ships -= sendCount;
            s.fleets.push({
              fromId: fromP.id,
              toId: clicked.id,
              x: fromP.x,
              y: fromP.y,
              targetX: clicked.x,
              targetY: clicked.y,
              count: sendCount,
              owner: 'player',
              color: '#00f0ff'
            });
          }
        }
        s.selectedPlanet = null;
      }
    } else {
      s.selectedPlanet = null;
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
      const w = canvas.width;
      const h = canvas.height;

      s.tick++;

      // Ship generation on planets every second
      if (s.tick % 60 === 0) {
        s.planets.forEach(p => {
          if (p.owner !== 'neutral' && p.ships < p.maxShips) {
            p.ships++;
          }
        });

        // Simple Enemy AI
        const enemyPlanets = s.planets.filter(p => p.owner === 'enemy');
        if (enemyPlanets.length > 0 && Math.random() < 0.4) {
          const fromP = enemyPlanets[Math.floor(Math.random() * enemyPlanets.length)];
          const others = s.planets.filter(p => p.id !== fromP.id);
          const toP = others[Math.floor(Math.random() * others.length)];
          if (fromP.ships > 5) {
            const sendCount = Math.floor(fromP.ships / 2);
            fromP.ships -= sendCount;
            s.fleets.push({
              fromId: fromP.id,
              toId: toP.id,
              x: fromP.x,
              y: fromP.y,
              targetX: toP.x,
              targetY: toP.y,
              count: sendCount,
              owner: 'enemy',
              color: '#ef4444'
            });
          }
        }
      }

      // Update Fleets
      s.fleets.forEach((fl, fIdx) => {
        const angle = Math.atan2(fl.targetY - fl.y, fl.targetX - fl.x);
        const spd = 3.5;
        fl.x += Math.cos(angle) * spd;
        fl.y += Math.sin(angle) * spd;

        // Fleet arrived at destination
        if (Math.hypot(fl.targetX - fl.x, fl.targetY - fl.y) < 15) {
          const dest = s.planets.find(p => p.id === fl.toId);
          if (dest) {
            if (dest.owner === fl.owner) {
              dest.ships += fl.count;
            } else {
              dest.ships -= fl.count;
              if (dest.ships < 0) {
                dest.owner = fl.owner;
                dest.ships = Math.abs(dest.ships);
                sound.playPowerUp();
                if (fl.owner === 'player') {
                  s.score += 500;
                  setScore(s.score);
                }
              }
            }
          }
          s.fleets.splice(fIdx, 1);
        }
      });

      // Check Victory / Defeat
      const playerPlanets = s.planets.filter(p => p.owner === 'player');
      const enemyPlanets = s.planets.filter(p => p.owner === 'enemy');
      if (enemyPlanets.length === 0 && s.fleets.filter(f => f.owner === 'enemy').length === 0) {
        handleGameOver(true);
      } else if (playerPlanets.length === 0 && s.fleets.filter(f => f.owner === 'player').length === 0) {
        handleGameOver(false);
      }

      // RENDER
      ctx.fillStyle = '#05030f';
      ctx.fillRect(0, 0, w, h);

      // Deep space stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 149) % w, (i * 113) % h, 2, 2);
      }

      // Planets
      s.planets.forEach(p => {
        const color = p.owner === 'player' ? '#00f0ff' : p.owner === 'enemy' ? '#ef4444' : '#64748b';

        // Selected ring
        if (s.selectedPlanet === p.id) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Atmosphere glow
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ships count inside planet
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.ships.toString(), p.x, p.y);
      });

      // Fleets
      s.fleets.forEach(fl => {
        ctx.fillStyle = fl.color;
        ctx.shadowColor = fl.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText(fl.count.toString(), fl.x, fl.y - 10);
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#05030f] rounded-2xl overflow-hidden select-none border border-cyan-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-cyan-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-cyan-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-cyan-300">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>GALACTIC DOMINION</span>
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
        onClick={handlePlanetClick}
        className="w-full max-w-xl h-auto aspect-15/11 object-contain cursor-pointer"
      />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            <Rocket className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">STAR CLASH</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Click your cyan planet to select it, then click a neutral or enemy star to dispatch half your fleet to conquer it!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-600 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>LAUNCH FLEET</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-display font-black text-4xl text-white mt-1">WAR CONCLUDED</h2>
          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
