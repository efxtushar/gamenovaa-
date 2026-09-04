import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Swords, Shield, Zap, Flame } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

interface PopupBadge {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export const RobotBrawlGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('START');
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [playerHeat, setPlayerHeat] = useState(0);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_robot-brawl') || '0', 10);
  });

  const stateRef = useRef({
    player: {
      x: 180,
      y: 330,
      hp: 100,
      maxHp: 100,
      heat: 0,
      isPunching: false,
      punchType: 'jab' as 'jab' | 'uppercut' | 'slam',
      isGuarding: false,
      punchTimer: 0,
      frame: 0
    },
    enemy: {
      x: 460,
      y: 330,
      hp: 100,
      maxHp: 100,
      isPunching: false,
      isGuarding: false,
      punchTimer: 0,
      aiTimer: 0,
      frame: 0
    },
    particles: [] as Particle[],
    badges: [] as PopupBadge[],
    round: 1,
    score: 0
  });

  const punch = useCallback((type: 'jab' | 'uppercut' | 'slam') => {
    const s = stateRef.current;
    const p = s.player;
    const e = s.enemy;

    if (p.punchTimer <= 0 && !p.isGuarding) {
      p.isPunching = true;
      p.punchType = type;
      p.punchTimer = type === 'slam' ? 22 : type === 'uppercut' ? 16 : 10;
      sound.playLaser(type === 'slam' ? 450 : type === 'uppercut' ? 750 : 1100);

      // Hit range
      if (Math.abs(p.x - e.x) < 220) {
        let dmg = type === 'slam' ? 32 : type === 'uppercut' ? 20 : 12;

        if (e.isGuarding) {
          sound.playHit();
          dmg = Math.floor(dmg * 0.25);
          s.badges.push({ x: e.x, y: e.y - 70, text: 'BLOCKED!', color: '#94a3b8', life: 25 });
        } else {
          sound.playExplosion();
          p.heat = Math.min(100, p.heat + (type === 'slam' ? 35 : 15));
          setPlayerHeat(p.heat);

          const isCrit = Math.random() < 0.25;
          if (isCrit) {
            dmg = Math.floor(dmg * 1.5);
            s.badges.push({ x: e.x, y: e.y - 70, text: 'CRITICAL HIT!', color: '#f59e0b', life: 30 });
          }

          // Sparks
          for (let i = 0; i < 12; i++) {
            s.particles.push({
              x: e.x - 20,
              y: e.y - 35,
              vx: (Math.random() - 0.2) * 9,
              vy: (Math.random() - 0.5) * 8,
              color: '#facc15',
              size: 3.5,
              life: 20
            });
          }
        }

        e.hp = Math.max(0, e.hp - dmg);
        setEnemyHp(e.hp);
        s.score += dmg * 20;
        setScore(s.score);
      }
    }
  }, []);

  const guard = (active: boolean) => {
    stateRef.current.player.isGuarding = active;
  };

  const specialOverdrive = useCallback(() => {
    const s = stateRef.current;
    if (s.player.heat < 100) return;

    sound.playPowerUp();
    s.player.heat = 0;
    setPlayerHeat(0);

    punch('slam');
    confetti({ particleCount: 60, spread: 70 });
  }, [punch]);

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      player: {
        x: 180,
        y: 330,
        hp: 100,
        maxHp: 100,
        heat: 0,
        isPunching: false,
        punchType: 'jab',
        isGuarding: false,
        punchTimer: 0,
        frame: 0
      },
      enemy: {
        x: 460,
        y: 330,
        hp: 100,
        maxHp: 100,
        isPunching: false,
        isGuarding: false,
        punchTimer: 0,
        aiTimer: 0,
        frame: 0
      },
      particles: [],
      badges: [],
      round: 1,
      score: 0
    };

    setPlayerHp(100);
    setEnemyHp(100);
    setPlayerHeat(0);
    setRound(1);
    setScore(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((won: boolean) => {
    const s = stateRef.current;
    if (won) {
      sound.playPowerUp();
      confetti({ particleCount: 100, spread: 80 });
      setGameState('VICTORY');
      s.score += 2500;
    } else {
      sound.playGameOver();
      setGameState('GAMEOVER');
    }

    if (s.score > highScore) {
      setHighScore(s.score);
      localStorage.setItem('gamenova_hs_robot-brawl', s.score.toString());
    }
    if (onGameOver) onGameOver(s.score);
  }, [highScore, onGameOver]);

  // Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (['KeyJ', 'KeyZ', 'Digit1'].includes(e.code)) punch('jab');
      if (['KeyK', 'KeyX', 'Digit2'].includes(e.code)) punch('uppercut');
      if (['KeyL', 'KeyC', 'Digit3'].includes(e.code)) punch('slam');
      if (['Space', 'ShiftLeft', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        guard(true);
      }
      if (['KeyE', 'KeyV'].includes(e.code)) specialOverdrive();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Space', 'ShiftLeft', 'KeyS'].includes(e.code)) guard(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, punch, specialOverdrive]);

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
      const e = s.enemy;
      const w = canvas.width;
      const h = canvas.height;

      // Timers
      if (p.punchTimer > 0) {
        p.punchTimer--;
        if (p.punchTimer <= 0) p.isPunching = false;
      }
      if (e.punchTimer > 0) {
        e.punchTimer--;
        if (e.punchTimer <= 0) e.isPunching = false;
      }

      p.frame += 0.2;
      e.frame += 0.2;

      // Enemy AI (Slow, generous beginner reaction cadence in Round 1: 70 frames ~ 1.2s)
      e.aiTimer++;
      const aiCadence = 70 - s.round * 10;
      if (e.aiTimer >= Math.max(35, aiCadence)) {
        e.aiTimer = 0;
        const roll = Math.random();

        if (roll < 0.35) {
          // Guard
          e.isGuarding = true;
          setTimeout(() => {
            e.isGuarding = false;
          }, 600);
        } else {
          // Punch Player (with clear telegraph animation)
          e.isPunching = true;
          e.punchTimer = 16;
          sound.playLaser(600);

          let dmg = 12;
          if (p.isGuarding) {
            sound.playHit();
            dmg = 2;
            s.badges.push({ x: p.x, y: p.y - 70, text: 'PARRIED!', color: '#38bdf8', life: 25 });
          } else {
            sound.playExplosion();
            for (let i = 0; i < 8; i++) {
              s.particles.push({
                x: p.x + 20,
                y: p.y - 35,
                vx: (Math.random() - 0.8) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: '#ef4444',
                size: 3.5,
                life: 20
              });
            }
          }

          p.hp = Math.max(0, p.hp - dmg);
          setPlayerHp(p.hp);

          if (p.hp <= 0) {
            handleGameOver(false);
            return;
          }
        }
      }

      // Check Enemy Defeated (Next Round / Victory)
      if (e.hp <= 0) {
        if (s.round < 3) {
          sound.playPowerUp();
          s.round++;
          setRound(s.round);
          e.hp = 100 + s.round * 20;
          e.maxHp = e.hp;
          setEnemyHp(e.hp);
          p.hp = Math.min(100, p.hp + 40);
          setPlayerHp(p.hp);
          s.score += 1500;
          setScore(s.score);
        } else {
          handleGameOver(true);
          return;
        }
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // Update Badges
      for (let i = s.badges.length - 1; i >= 0; i--) {
        const bg = s.badges[i];
        bg.y -= 0.8;
        bg.life--;
        if (bg.life <= 0) s.badges.splice(i, 1);
      }

      // --- RENDER ---
      ctx.clearRect(0, 0, w, h);

      // Cyber Steel Arena Floor
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.6, '#111827');
      bgGrad.addColorStop(1, '#050811');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Arena Grid & Neon Ring Borders
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 260);
        ctx.lineTo(x + (x - w / 2) * 0.4, h);
        ctx.stroke();
      }

      // Ring ropes
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(40, 260);
      ctx.lineTo(w - 40, 260);
      ctx.stroke();

      ctx.strokeStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(40, 290);
      ctx.lineTo(w - 40, 290);
      ctx.stroke();

      // Draw Badges
      s.badges.forEach(bg => {
        ctx.fillStyle = bg.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bg.text, bg.x, bg.y);
      });

      // Draw Particles
      s.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Player Robot (Blue / Silver Mech)
      ctx.save();
      ctx.translate(p.x, p.y);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 45, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-18, 15, 12, 28);
      ctx.fillRect(6, 15, 12, 28);

      // Torso
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-24, -30, 48, 48, 8);
      ctx.fill();

      // Core Reactor
      ctx.fillStyle = p.heat >= 100 ? '#f59e0b' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -6, 8, 0, Math.PI * 2);
      ctx.fill();

      // Head / Visor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-14, -48, 28, 16);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-10, -42, 20, 5);

      // Arm / Fist
      if (p.isPunching) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(42, -10, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (p.isGuarding) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(10, -32, 10, 36);
        ctx.strokeStyle = '#7dd3fc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, -32, 10, 36);
      } else {
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(20, -6, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Draw Enemy Robot (Crimson Mech)
      ctx.save();
      ctx.translate(e.x, e.y);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 45, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-18, 15, 12, 28);
      ctx.fillRect(6, 15, 12, 28);

      // Torso
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.roundRect(-24, -30, 48, 48, 8);
      ctx.fill();

      // Core
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -6, 8, 0, Math.PI * 2);
      ctx.fill();

      // Head / Visor
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-14, -48, 28, 16);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-10, -42, 20, 5);

      // Enemy Fist
      if (e.isPunching) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-42, -10, 14, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.isGuarding) {
        ctx.fillStyle = '#f87171';
        ctx.fillRect(-20, -32, 10, 36);
      } else {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.arc(-20, -6, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center border border-cyan-500/20 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-contain" />

      {/* Top HUD */}
      {gameState === 'PLAYING' && (
        <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          {/* Player HP & Overdrive Heat */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-cyan-400 block uppercase">Player Mech</span>
              <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div className="h-full bg-cyan-400 transition-all duration-200" style={{ width: `${playerHp}%` }} />
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] font-bold text-amber-400 block uppercase">Overdrive Heat</span>
              <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div className="h-full bg-amber-500 transition-all duration-200" style={{ width: `${playerHeat}%` }} />
              </div>
            </div>
          </div>

          {/* Round Marker */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-xl text-center">
            <span className="text-xs font-black font-mono text-white tracking-widest uppercase">Round {round} / 3</span>
          </div>

          {/* Enemy HP */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-rose-500/30 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-rose-400 block uppercase">Enemy Mech</span>
            <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
              <div className="h-full bg-rose-500 transition-all duration-200" style={{ width: `${(enemyHp / 100) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Start Screen */}
      {gameState === 'START' && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 shadow-xl shadow-cyan-500/20">
            <Swords className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">ROBOT BRAWL</h2>
          <p className="text-xs text-cyan-200/80 max-w-md mt-2 leading-relaxed font-mono">
            Heavy steel boxing arena! Jab, Uppercut, and Slam the opponent robot. Hold Space / Shift to parry incoming strikes and trigger Overdrive with E.
          </p>

          <div className="flex items-center gap-2 mt-4 text-xs text-slate-300 font-mono">
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">J / 1 = Jab</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">K / 2 = Uppercut</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">L / 3 = Slam</span>
            <span className="px-2 py-1 rounded-lg bg-slate-800 border border-white/10">SPACE = Block</span>
          </div>

          <button
            onClick={startGame}
            className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ENTER THE RING</span>
          </button>
        </div>
      )}

      {/* Victory Screen */}
      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/20">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">CHAMPION!</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">You dominated all 3 rounds of robot combat.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Championship Score</span>
            <span className="text-2xl font-black font-mono text-amber-300 mt-0.5 block">{score.toLocaleString()}</span>
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>FIGHT AGAIN</span>
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
            <Swords className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-tight">KNOCKOUT!</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">Your circuits overloaded in the ring.</p>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 my-5 w-64 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Score</span>
            <span className="text-2xl font-black font-mono text-rose-300 mt-0.5 block">{score.toLocaleString()}</span>
          </div>

          <button
            onClick={startGame}
            className="px-7 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RETRY BRAWL</span>
          </button>
        </div>
      )}
    </div>
  );
};
