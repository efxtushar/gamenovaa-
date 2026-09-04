import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Flame, Shield, Zap } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Pickup {
  x: number;
  y: number;
  type: 'health' | 'nitro' | 'points';
  pulse: number;
}

export const BattleCarsGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [kills, setKills] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_battle-cars') || '0', 10);
  });

  const stateRef = useRef({
    player: { x: 300, y: 240, vx: 0, vy: 0, angle: 0, hp: 100, speed: 0, invulnerable: 0 },
    enemies: [] as { x: number; y: number; vx: number; vy: number; angle: number; hp: number; maxHp: number; color: string; speed: number; aiTimer: number }[],
    pickups: [] as Pickup[],
    sparks: [] as Spark[],
    score: 0,
    kills: 0,
    time: 0,
    keys: { left: false, right: false, up: false, down: false, boost: false }
  });

  const spawnEnemies = (count: number) => {
    const colors = ['#f43f5e', '#eab308', '#a855f7', '#06b6d4'];
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      enemies.push({
        x: 300 + Math.cos(angle) * 190,
        y: 240 + Math.sin(angle) * 140,
        vx: 0,
        vy: 0,
        angle: angle + Math.PI,
        hp: 45,
        maxHp: 45,
        color: colors[i % colors.length],
        // Slow initial bot car speed for friendly start (1.8 speed)
        speed: 1.8 + Math.random() * 0.4,
        aiTimer: Math.random() * 60
      });
    }
    return enemies;
  };

  const startGame = useCallback(() => {
    sound.playClick();
    const enemies = spawnEnemies(3);
    const pickups: Pickup[] = [
      { x: 140, y: 140, type: 'health', pulse: 0 },
      { x: 460, y: 340, type: 'nitro', pulse: 1 }
    ];

    stateRef.current = {
      player: { x: 300, y: 240, vx: 0, vy: 0, angle: 0, hp: 100, speed: 0, invulnerable: 0 },
      enemies,
      pickups,
      sparks: [],
      score: 0,
      kills: 0,
      time: 0,
      keys: { left: false, right: false, up: false, down: false, boost: false }
    };

    setScore(0);
    setPlayerHp(100);
    setKills(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_battle-cars', finalScore.toString());
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
      if (['Space'].includes(e.code)) stateRef.current.keys.boost = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
      if (['Space'].includes(e.code)) stateRef.current.keys.boost = false;
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
      s.time += 0.016;

      // Steering
      if (s.keys.left) p.angle -= 0.06;
      if (s.keys.right) p.angle += 0.06;

      // Acceleration
      const maxSpd = s.keys.boost ? 7.5 : 5.0;
      if (s.keys.up) p.speed = Math.min(maxSpd, p.speed + 0.22);
      else if (s.keys.down) p.speed = Math.max(-2.5, p.speed - 0.18);
      else p.speed *= 0.95;

      p.x += Math.cos(p.angle) * p.speed;
      p.y += Math.sin(p.angle) * p.speed;

      // Arena walls bounce
      if (p.x < 45 || p.x > w - 45) { p.speed *= -0.6; sound.playHit(); }
      if (p.y < 45 || p.y > h - 45) { p.speed *= -0.6; sound.playHit(); }
      p.x = Math.max(45, Math.min(w - 45, p.x));
      p.y = Math.max(45, Math.min(h - 45, p.y));

      if (p.invulnerable > 0) p.invulnerable--;

      // Update Pickups
      s.pickups.forEach((pu, idx) => {
        pu.pulse += 0.08;
        if (Math.hypot(p.x - pu.x, p.y - pu.y) < 26) {
          sound.playPowerUp();
          if (pu.type === 'health') {
            p.hp = Math.min(100, p.hp + 35);
            setPlayerHp(p.hp);
          } else {
            s.score += 300;
            setScore(s.score);
          }
          s.pickups.splice(idx, 1);
        }
      });

      // Spawn pickups occasionally
      if (s.pickups.length < 2 && Math.random() < 0.008) {
        s.pickups.push({
          x: 70 + Math.random() * (w - 140),
          y: 70 + Math.random() * (h - 140),
          type: Math.random() > 0.5 ? 'health' : 'points',
          pulse: 0
        });
      }

      // AI Enemies (Slow with gentle turning at start)
      s.enemies.forEach((en, eIdx) => {
        en.aiTimer++;
        // Delayed turn targeting
        const targetAngle = Math.atan2(p.y - en.y, p.x - en.x);
        en.angle += (targetAngle - en.angle) * 0.035;

        en.x += Math.cos(en.angle) * en.speed;
        en.y += Math.sin(en.angle) * en.speed;

        en.x = Math.max(45, Math.min(w - 45, en.x));
        en.y = Math.max(45, Math.min(h - 45, en.y));

        // Collision: Ramming
        if (Math.hypot(p.x - en.x, p.y - en.y) < 32) {
          sound.playExplosion();

          // Spark FX
          for (let i = 0; i < 10; i++) {
            s.sparks.push({
              x: (p.x + en.x) / 2,
              y: (p.y + en.y) / 2,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 14,
              color: '#f59e0b'
            });
          }

          // If player rammed fast (speed > 3), deal massive damage to enemy!
          if (p.speed > 3.0) {
            en.hp -= 25;
            p.hp = Math.max(0, p.hp - 4); // Minimal self damage on successful ram
          } else if (p.invulnerable <= 0) {
            p.hp = Math.max(0, p.hp - 12);
            p.invulnerable = 30;
          }

          setPlayerHp(p.hp);

          // Push apart
          const pushAngle = Math.atan2(en.y - p.y, en.x - p.x);
          en.x += Math.cos(pushAngle) * 20;
          en.y += Math.sin(pushAngle) * 20;
          p.x -= Math.cos(pushAngle) * 10;
          p.y -= Math.sin(pushAngle) * 10;

          if (en.hp <= 0) {
            sound.playPowerUp();
            s.kills++;
            setKills(s.kills);
            s.score += 500;
            setScore(s.score);
            s.enemies.splice(eIdx, 1);

            // Respawn with gradual difficulty
            setTimeout(() => {
              if (stateRef.current.enemies.length < 3) {
                stateRef.current.enemies.push({
                  x: Math.random() < 0.5 ? 80 : w - 80,
                  y: Math.random() < 0.5 ? 80 : h - 80,
                  vx: 0,
                  vy: 0,
                  angle: 0,
                  hp: 50,
                  maxHp: 50,
                  color: ['#f43f5e', '#eab308', '#a855f7', '#06b6d4'][Math.floor(Math.random() * 4)],
                  speed: 2.0 + Math.min(1.5, s.kills * 0.2),
                  aiTimer: 0
                });
              }
            }, 2000);
          }

          if (p.hp <= 0) {
            handleGameOver(s.score);
            return;
          }
        }
      });

      // Update Sparks
      for (let i = s.sparks.length - 1; i >= 0; i--) {
        const sp = s.sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life--;
        if (sp.life <= 0) s.sparks.splice(i, 1);
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, w, h);

      // Arena Floor
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, w, h);

      // Arena Dirt Track Details
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      for (let x = 45; x < w - 45; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 45);
        ctx.lineTo(x, h - 45);
        ctx.stroke();
      }

      // Danger Border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.strokeRect(45, 45, w - 90, h - 90);

      // Draw Pickups
      s.pickups.forEach(pu => {
        ctx.save();
        ctx.shadowColor = pu.type === 'health' ? '#22c55e' : '#eab308';
        ctx.shadowBlur = 14;
        ctx.fillStyle = pu.type === 'health' ? '#22c55e' : '#eab308';
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 10 + Math.sin(pu.pulse) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Sparks
      s.sparks.forEach(sp => {
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Enemy Cars
      s.enemies.forEach(en => {
        ctx.save();
        ctx.translate(en.x, en.y);
        ctx.rotate(en.angle);

        // Body
        ctx.fillStyle = en.color;
        ctx.beginPath();
        ctx.roundRect(-16, -10, 32, 20, 4);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#09090b';
        ctx.fillRect(-14, -13, 8, 4);
        ctx.fillRect(6, -13, 8, 4);
        ctx.fillRect(-14, 9, 8, 4);
        ctx.fillRect(6, 9, 8, 4);

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-4, -6, 12, 12);

        ctx.restore();

        // HP Bar
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(en.x - 14, en.y - 18, 28, 4);
        ctx.fillStyle = en.color;
        ctx.fillRect(en.x - 14, en.y - 18, (en.hp / en.maxHp) * 28, 4);
      });

      // Draw Player Battle Car
      if (p.invulnerable % 4 < 2) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Player Blue/Cyan Body
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(-18, -11, 36, 22, 5);
        ctx.fill();

        // Armor Bumper Spikes
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(18, -6);
        ctx.lineTo(24, 0);
        ctx.lineTo(18, 6);
        ctx.closePath();
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#09090b';
        ctx.fillRect(-15, -14, 9, 4);
        ctx.fillRect(6, -14, 9, 4);
        ctx.fillRect(-15, 10, 9, 4);
        ctx.fillRect(6, 10, 9, 4);

        // Cockpit
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-6, -7, 14, 14);

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center border border-rose-500/20 shadow-2xl select-none">
      <canvas ref={canvasRef} width={600} height={480} className="w-full h-full object-contain" />

      {/* Top HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xl">
              <Shield className="w-4 h-4 text-cyan-400" />
              <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${playerHp}%` }} />
              </div>
              <span className="text-xs font-bold font-mono text-cyan-200">{playerHp}%</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-3 py-1.5 rounded-xl">
              <Flame className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold font-mono text-rose-300">Kills: {kills}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-3.5 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-rose-400/80 block uppercase tracking-wider">Score</span>
            <span className="text-sm font-black font-mono text-rose-300">{score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-xl shadow-rose-500/20">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">BATTLE CARS</h2>
          <p className="text-xs text-rose-200/80 max-w-md mt-2 leading-relaxed font-mono">
            Demolition Arena combat! Ram enemy battle cars with front bumper spikes at high speeds to smash them to pieces and collect health repair kits.
          </p>

          <div className="flex items-center gap-3 mt-4 text-xs text-slate-300 font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">W A S D = Drive</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">SPACE = Nitro Boost</span>
          </div>

          <button
            onClick={startGame}
            className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START DEMOLITION</span>
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">VEHICLE TOTALED</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">Your armor was demolished in the arena.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Final Arena Score</span>
            <span className="text-2xl font-black font-mono text-rose-300 mt-0.5 block">{score.toLocaleString()}</span>
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ENTER ARENA AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
