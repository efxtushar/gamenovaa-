import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Snowflake, Trophy, Zap, Wind, Shield } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface SlopeObstacle {
  id: number;
  x: number;
  y: number;
  type: 'tree' | 'rock' | 'ramp' | 'gate' | 'snowflake';
  collected?: boolean;
  radius: number;
}

export const SnowboardHeroGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [speedMph, setSpeedMph] = useState(25);
  const [combo, setCombo] = useState(1);
  const [shields, setShields] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_snowboard-hero') || '0', 10);
  });

  const stateRef = useRef({
    rider: {
      x: 400,
      y: 180,
      vx: 0,
      tilt: 0,
      isAirborne: false,
      airTimer: 0,
      spinAngle: 0,
      invulnerable: 0
    },
    obstacles: [] as SlopeObstacle[],
    snowParticles: [] as { x: number; y: number; vy: number; r: number; alpha: number }[],
    carveParticles: [] as { x: number; y: number; alpha: number; size: number }[],
    keys: { left: false, right: false, jump: false },
    score: 0,
    combo: 1,
    speed: 3.5, // Gentle starting slope speed
    shields: 3,
    idCounter: 1,
    distance: 0,
    time: 0
  });

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('gameover');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_snowboard-hero', finalScore.toString());
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const jumpRamp = useCallback(() => {
    const s = stateRef.current;
    if (!s.rider.isAirborne) {
      s.rider.isAirborne = true;
      s.rider.airTimer = 35;
      s.rider.spinAngle = 0;
      sound.playJump();
    }
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const snowParticles = Array.from({ length: 60 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 550,
      vy: 1.5 + Math.random() * 2,
      r: 1.5 + Math.random() * 2,
      alpha: 0.4 + Math.random() * 0.5
    }));

    stateRef.current = {
      rider: {
        x: 400,
        y: 180,
        vx: 0,
        tilt: 0,
        isAirborne: false,
        airTimer: 0,
        spinAngle: 0,
        invulnerable: 0
      },
      obstacles: [],
      snowParticles,
      carveParticles: [],
      keys: { left: false, right: false, jump: false },
      score: 0,
      combo: 1,
      speed: 3.5,
      shields: 3,
      idCounter: 1,
      distance: 0,
      time: 0
    };

    setScore(0);
    setCombo(1);
    setShields(3);
    setSpeedMph(25);
    setGameState('playing');
  }, []);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        jumpRamp();
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
  }, [jumpRamp]);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;
      const r = s.rider;
      const w = canvas.width;
      const h = canvas.height;
      s.time += 0.016;

      // Gradual slope acceleration (starts slow at 3.5, max 7.5 after 2000 points)
      s.speed = 3.5 + Math.min(4.0, (s.score / 2500) * 3.5);
      setSpeedMph(Math.round(s.speed * 8));

      s.distance += s.speed;
      s.score += Math.floor(s.speed * 0.4);
      setScore(s.score);

      if (r.invulnerable > 0) r.invulnerable--;

      // Steering
      if (s.keys.left) {
        r.vx = Math.max(-5.5, r.vx - 0.5);
        r.tilt = -0.35;
      } else if (s.keys.right) {
        r.vx = Math.min(5.5, r.vx + 0.5);
        r.tilt = 0.35;
      } else {
        r.vx *= 0.88;
        r.tilt *= 0.85;
      }

      r.x += r.vx;
      r.x = Math.max(60, Math.min(w - 60, r.x));

      // Carving snow spray
      if (!r.isAirborne && Math.abs(r.vx) > 1.5) {
        s.carveParticles.push({
          x: r.x + (r.vx > 0 ? -12 : 12),
          y: r.y + 12,
          alpha: 0.8,
          size: 4 + Math.random() * 4
        });
      }

      // Air Trick Physics
      if (r.isAirborne) {
        r.airTimer--;
        r.spinAngle += 0.18; // 360 Spin
        if (r.airTimer <= 0) {
          // Landing
          r.isAirborne = false;
          r.spinAngle = 0;
          sound.playPowerUp();
          s.score += 300 * s.combo;
          s.combo = Math.min(5, s.combo + 1);
          setCombo(s.combo);
        }
      }

      // Spawn Obstacles (Gentle spacing at start)
      const spawnInterval = Math.max(35, 75 - Math.floor(s.score / 600) * 8);
      if (Math.floor(s.time * 60) % spawnInterval === 0) {
        const rand = Math.random();
        const obsX = 70 + Math.random() * (w - 140);
        let obsType: SlopeObstacle['type'] = 'tree';

        if (rand < 0.22) obsType = 'ramp';
        else if (rand < 0.40) obsType = 'snowflake';
        else if (rand < 0.55) obsType = 'gate';
        else if (rand < 0.80) obsType = 'tree';
        else obsType = 'rock';

        s.obstacles.push({
          id: s.idCounter++,
          x: obsX,
          y: h + 40,
          type: obsType,
          radius: obsType === 'tree' ? 22 : obsType === 'rock' ? 18 : 25
        });
      }

      // Update Obstacles (Moving Upward as player descends)
      for (let i = s.obstacles.length - 1; i >= 0; i--) {
        const obs = s.obstacles[i];
        obs.y -= s.speed;

        // Collision Check
        const dist = Math.hypot(r.x - obs.x, r.y - obs.y);

        if (!obs.collected && dist < obs.radius + 16) {
          if (obs.type === 'snowflake') {
            obs.collected = true;
            sound.playCoin();
            s.score += 250;
            setScore(s.score);
          } else if (obs.type === 'ramp') {
            obs.collected = true;
            jumpRamp();
          } else if (obs.type === 'gate') {
            obs.collected = true;
            sound.playPowerUp();
            s.score += 400;
            setScore(s.score);
          } else if (!r.isAirborne && r.invulnerable <= 0) {
            // Hit Tree or Rock
            obs.collected = true;
            sound.playExplosion();
            s.shields--;
            setShields(s.shields);
            s.combo = 1;
            setCombo(1);
            r.invulnerable = 60; // 1s safety invulnerability

            if (s.shields <= 0) {
              handleGameOver(s.score);
              return;
            }
          }
        }

        if (obs.y < -50) {
          s.obstacles.splice(i, 1);
        }
      }

      // Update Snow Particles
      s.snowParticles.forEach(p => {
        p.y += p.vy + s.speed * 0.3;
        if (p.y > h) {
          p.y = -10;
          p.x = Math.random() * w;
        }
      });

      // Update Carve Particles
      for (let i = s.carveParticles.length - 1; i >= 0; i--) {
        const cp = s.carveParticles[i];
        cp.y -= s.speed;
        cp.alpha -= 0.03;
        if (cp.alpha <= 0 || cp.y < 0) s.carveParticles.splice(i, 1);
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, w, h);

      // 1. Alpine Mountain Backdrop
      const snowGrad = ctx.createLinearGradient(0, 0, 0, h);
      snowGrad.addColorStop(0, '#e0f2fe');
      snowGrad.addColorStop(0.5, '#f8fafc');
      snowGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = snowGrad;
      ctx.fillRect(0, 0, w, h);

      // Mountain Piste Slope Track Borders
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, 40, h);
      ctx.fillRect(w - 40, 0, 40, h);

      // Piste boundary orange flags
      ctx.fillStyle = '#f97316';
      for (let y = (s.distance % 80); y < h; y += 80) {
        ctx.fillRect(38, y, 4, 12);
        ctx.fillRect(w - 42, y, 4, 12);
      }

      // Carve trails
      s.carveParticles.forEach(cp => {
        ctx.fillStyle = `rgba(203, 213, 225, ${cp.alpha})`;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, cp.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Obstacles
      s.obstacles.forEach(obs => {
        if (obs.type === 'tree') {
          // Pine Tree
          ctx.fillStyle = '#065f46';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y - 28);
          ctx.lineTo(obs.x - 18, obs.y + 14);
          ctx.lineTo(obs.x + 18, obs.y + 14);
          ctx.closePath();
          ctx.fill();

          // Snow on top of tree
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y - 28);
          ctx.lineTo(obs.x - 8, obs.y - 12);
          ctx.lineTo(obs.x + 8, obs.y - 12);
          ctx.closePath();
          ctx.fill();

          // Trunk
          ctx.fillStyle = '#78350f';
          ctx.fillRect(obs.x - 4, obs.y + 14, 8, 10);
        } else if (obs.type === 'rock') {
          // Alpine Boulder
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.ellipse(obs.x, obs.y, 18, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          // Snow crest
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(obs.x, obs.y - 4, 12, 6, 0, 0, Math.PI);
          ctx.fill();
        } else if (obs.type === 'ramp') {
          // Kick Jump Ramp
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(obs.x - 22, obs.y - 8, 44, 16);
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(obs.x - 22, obs.y + 8);
          ctx.lineTo(obs.x + 22, obs.y + 8);
          ctx.lineTo(obs.x + 22, obs.y - 8);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('JUMP', obs.x - 12, obs.y + 4);
        } else if (obs.type === 'snowflake') {
          // Collectible Golden Star / Snowflake
          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#fde047';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (obs.type === 'gate') {
          // Slalom Flags
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(obs.x - 25, obs.y - 12, 6, 24);
          ctx.fillRect(obs.x + 19, obs.y - 12, 6, 24);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fillRect(obs.x - 25, obs.y - 4, 50, 8);
        }
      });

      // 3. Draw Snowboarder
      ctx.save();
      ctx.translate(r.x, r.y);
      if (r.isAirborne) {
        ctx.rotate(r.spinAngle);
        ctx.scale(1.25, 1.25); // Pop up towards camera
      } else {
        ctx.rotate(r.tilt);
      }

      // Snowboard
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-10, -26, 20, 52, 6);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-8, -8, 16, 16);

      // Rider Jacket & Helmet
      if (r.invulnerable % 4 < 2) {
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();

        // Goggles
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-6, 2, 12, 4);
      }

      ctx.restore();

      // 4. Falling Powder Snow
      s.snowParticles.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver, jumpRamp]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-900 flex items-center justify-center border border-cyan-500/20 shadow-2xl select-none">
      <canvas ref={canvasRef} width={800} height={550} className="w-full h-full object-contain" />

      {/* Top HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-3">
            {/* Speed & Shields */}
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xl">
              <Wind className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold font-mono text-cyan-200">{speedMph} MPH</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-3 py-1.5 rounded-xl">
              <Shield className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold font-mono text-rose-300">{shields} SHIELDS</span>
            </div>

            {combo > 1 && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-xl animate-pulse">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-black font-mono text-amber-300">{combo}X TRICK COMBO</span>
              </div>
            )}
          </div>

          {/* Score */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-cyan-400/80 block uppercase tracking-wider">Score</span>
            <span className="text-sm font-black font-mono text-cyan-300">{score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 shadow-xl shadow-cyan-500/20">
            <Snowflake className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">SNOWBOARD HERO</h2>
          <p className="text-xs text-cyan-200/80 max-w-md mt-2 leading-relaxed font-mono">
            Shred down the alpine mountain! Carve powder, jump off snow ramps with Space to perform 360 aerial tricks, and dodge pine trees and rocks.
          </p>

          <div className="flex items-center gap-3 mt-4 text-xs text-slate-300 font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">A / D = Steer</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">SPACE = Jump / Trick</span>
          </div>

          <button
            onClick={startGame}
            className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>HIT THE SLOPES</span>
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
            <Snowflake className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">WIPEOUT!</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">You caught an edge on the mountain.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Final Slope Score</span>
            <span className="text-2xl font-black font-mono text-cyan-300 mt-0.5 block">{score.toLocaleString()}</span>
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
