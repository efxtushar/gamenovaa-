import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Shield, Zap, Swords } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const MonsterArenaGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_monster-arena') || '0', 10);
  });
  const [health, setHealth] = useState(100);
  const [level, setLevel] = useState(1);
  const [kills, setKills] = useState(0);

  const stateRef = useRef({
    hero: { x: 320, y: 240, speed: 4.2, hp: 100, attackTimer: 0, level: 1, xp: 0, nextXp: 80, angle: 0, isWhirlwind: false },
    monsters: [] as { x: number; y: number; hp: number; maxHp: number; speed: number; color: string; size: number; type: 'orc' | 'goblin' | 'golem'; angle: number }[],
    orbs: [] as { x: number; y: number; val: number }[],
    slashes: [] as { x: number; y: number; angle: number; range: number; life: number; color: string }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; color: string; life: number }[],
    torches: [] as { x: number; y: number; flicker: number }[],
    score: 0,
    kills: 0,
    spawnTimer: 0,
    keys: { left: false, right: false, up: false, down: false, attack: false }
  });

  const attack = useCallback(() => {
    const s = stateRef.current;
    if (s.hero.attackTimer <= 0) {
      sound.playLaser(600);
      s.hero.attackTimer = 16;
      const attackRange = 85 + s.hero.level * 5;

      // Add Slash Arc
      s.slashes.push({
        x: s.hero.x,
        y: s.hero.y,
        angle: s.hero.angle,
        range: attackRange,
        life: 8,
        color: '#f59e0b'
      });

      // Hit monsters
      s.monsters.forEach(m => {
        const d = Math.hypot(m.x - s.hero.x, m.y - s.hero.y);
        const angleToM = Math.atan2(m.y - s.hero.y, m.x - s.hero.x);
        let angleDiff = Math.abs(angleToM - s.hero.angle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (d < attackRange && angleDiff < 1.2) {
          const dmg = 40 + s.hero.level * 15;
          m.hp -= dmg;
          sound.playHit();

          // Pushback
          m.x += Math.cos(angleToM) * 35;
          m.y += Math.sin(angleToM) * 35;

          // Splatter particles
          for (let i = 0; i < 8; i++) {
            s.particles.push({
              x: m.x,
              y: m.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: m.color,
              life: 18
            });
          }
        }
      });
    }
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      hero: { x: 320, y: 240, speed: 4.2, hp: 100, attackTimer: 0, level: 1, xp: 0, nextXp: 80, angle: 0, isWhirlwind: false },
      monsters: [],
      orbs: [],
      slashes: [],
      particles: [],
      torches: [
        { x: 60, y: 60, flicker: 0 },
        { x: 580, y: 60, flicker: 0 },
        { x: 60, y: 420, flicker: 0 },
        { x: 580, y: 420, flicker: 0 }
      ],
      score: 0,
      kills: 0,
      spawnTimer: 0,
      keys: { left: false, right: false, up: false, down: false, attack: false }
    };
    setScore(0);
    setHealth(100);
    setLevel(1);
    setKills(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_monster-arena', finalScore.toString());
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['Space', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        attack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [attack]);

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

      // Hero Move
      let moveX = 0;
      let moveY = 0;
      if (s.keys.left) moveX -= 1;
      if (s.keys.right) moveX += 1;
      if (s.keys.up) moveY -= 1;
      if (s.keys.down) moveY += 1;

      if (moveX !== 0 || moveY !== 0) {
        s.hero.angle = Math.atan2(moveY, moveX);
        const len = Math.hypot(moveX, moveY);
        s.hero.x += (moveX / len) * s.hero.speed;
        s.hero.y += (moveY / len) * s.hero.speed;
      }

      s.hero.x = Math.max(45, Math.min(w - 45, s.hero.x));
      s.hero.y = Math.max(45, Math.min(h - 45, s.hero.y));

      if (s.hero.attackTimer > 0) s.hero.attackTimer--;

      // Spawn Monsters
      s.spawnTimer++;
      if (s.spawnTimer > 40) {
        s.spawnTimer = 0;
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 360;
        const spawnX = s.hero.x + Math.cos(angle) * spawnDist;
        const spawnY = s.hero.y + Math.sin(angle) * spawnDist;

        const rand = Math.random();
        let type: 'goblin' | 'orc' | 'golem' = 'goblin';
        let hp = 40;
        let speed = 2.4;
        let color = '#22c55e';
        let size = 16;

        if (rand < 0.2) {
          type = 'golem';
          hp = 160;
          speed = 1.2;
          color = '#9333ea';
          size = 26;
        } else if (rand < 0.6) {
          type = 'orc';
          hp = 80;
          speed = 1.8;
          color = '#dc2626';
          size = 20;
        }

        s.monsters.push({
          x: Math.max(30, Math.min(w - 30, spawnX)),
          y: Math.max(30, Math.min(h - 30, spawnY)),
          hp,
          maxHp: hp,
          speed,
          color,
          size,
          type,
          angle: 0
        });
      }

      // Update Monsters
      for (let i = s.monsters.length - 1; i >= 0; i--) {
        const m = s.monsters[i];
        const dist = Math.hypot(s.hero.x - m.x, s.hero.y - m.y);
        m.angle = Math.atan2(s.hero.y - m.y, s.hero.x - m.x);

        if (dist > 15) {
          m.x += Math.cos(m.angle) * m.speed;
          m.y += Math.sin(m.angle) * m.speed;
        }

        // Damage Player
        if (dist < m.size + 15) {
          s.hero.hp -= 0.4;
          setHealth(Math.max(0, Math.floor(s.hero.hp)));
          if (s.hero.hp <= 0) {
            handleGameOver(s.score);
            return;
          }
        }

        // Death
        if (m.hp <= 0) {
          s.monsters.splice(i, 1);
          sound.playCoin();
          s.score += m.type === 'golem' ? 350 : m.type === 'orc' ? 180 : 80;
          s.kills++;
          setScore(s.score);
          setKills(s.kills);

          // XP
          s.hero.xp += m.type === 'golem' ? 45 : 20;
          if (s.hero.xp >= s.hero.nextXp) {
            s.hero.level++;
            s.hero.xp = 0;
            s.hero.nextXp = Math.floor(s.hero.nextXp * 1.5);
            s.hero.hp = Math.min(100, s.hero.hp + 40);
            setLevel(s.hero.level);
            setHealth(Math.floor(s.hero.hp));
            sound.playPowerUp();
            confetti({ particleCount: 40, spread: 50 });
          }
        }
      }

      // Slashes
      for (let i = s.slashes.length - 1; i >= 0; i--) {
        const sl = s.slashes[i];
        sl.life--;
        if (sl.life <= 0) s.slashes.splice(i, 1);
      }

      // Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // RENDER
      // 1. Colosseum Stone Floor
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, w, h);

      // Stone Tile Grid
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;
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

      // Arena Outer Wall Border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Torches
      s.torches.forEach(t => {
        t.flicker += 0.1;
        const rad = 50 + Math.sin(t.flicker) * 8;
        const torchGlow = ctx.createRadialGradient(t.x, t.y, 5, t.x, t.y, rad);
        torchGlow.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
        torchGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = torchGlow;
        ctx.beginPath();
        ctx.arc(t.x, t.y, rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b45309';
        ctx.fillRect(t.x - 4, t.y - 4, 8, 14);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(t.x, t.y - 6, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Monsters
      s.monsters.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);

        // Monster Body
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(0, 0, m.size, 0, Math.PI * 2);
        ctx.fill();

        // Monster Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-m.size * 0.35, -m.size * 0.2, m.size * 0.25, 0, Math.PI * 2);
        ctx.arc(m.size * 0.35, -m.size * 0.2, m.size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-m.size * 0.35, -m.size * 0.2, m.size * 0.12, 0, Math.PI * 2);
        ctx.arc(m.size * 0.35, -m.size * 0.2, m.size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        // Monster Spikes / Horns for Golem/Orc
        if (m.type === 'golem') {
          ctx.fillStyle = '#581c87';
          ctx.beginPath();
          ctx.moveTo(-m.size * 0.6, -m.size * 0.8);
          ctx.lineTo(-m.size * 0.9, -m.size * 1.3);
          ctx.lineTo(-m.size * 0.3, -m.size * 0.8);
          ctx.moveTo(m.size * 0.6, -m.size * 0.8);
          ctx.lineTo(m.size * 0.9, -m.size * 1.3);
          ctx.lineTo(m.size * 0.3, -m.size * 0.8);
          ctx.fill();
        }

        // Health Bar above monster
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-m.size, -m.size - 10, m.size * 2, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-m.size, -m.size - 10, (m.hp / m.maxHp) * (m.size * 2), 4);

        ctx.restore();
      });

      // Render Gladiator Hero
      ctx.save();
      ctx.translate(s.hero.x, s.hero.y);

      // Hero Body / Golden Armor
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Plumed Helmet
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-4, -26, 8, 12);

      // Hero Shield (Facing Angle)
      ctx.save();
      ctx.rotate(s.hero.angle);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(14, 0, 8, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // Greatsword Blade
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, 8);
      ctx.lineTo(26, 8);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Render Slashes
      s.slashes.forEach(sl => {
        ctx.strokeStyle = sl.color;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(sl.x, sl.y, sl.range, sl.angle - 0.7, sl.angle + 0.7);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Render Particles
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#1c1917] rounded-2xl overflow-hidden select-none border border-amber-500/30 shadow-2xl">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-amber-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-amber-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5 text-xs font-orbitron font-bold text-emerald-300">
            <Zap className="w-3.5 h-3.5" />
            <span>LVL {level}</span>
          </div>
        </div>

        {/* Health & Record */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-400" />
            <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  health > 50 ? 'bg-emerald-400' : health > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>BEST: {highScore}</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        onClick={attack}
        className="w-full max-w-2xl h-auto aspect-4/3 object-contain cursor-crosshair"
      />

      {/* Mobile Touch Attack */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-4 right-4 z-20 md:hidden">
          <button
            onClick={attack}
            className="w-16 h-16 rounded-2xl bg-amber-500 text-black font-orbitron font-black flex flex-col items-center justify-center border border-amber-300 active:scale-95 shadow-xl"
          >
            <Swords className="w-6 h-6" />
            <span className="text-[10px]">SLASH</span>
          </button>
        </div>
      )}

      {/* Start Overlay */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <Swords className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wide">MONSTER ARENA</h2>
          <p className="text-slate-300 text-sm max-w-md mt-2 font-mono">
            Survive the gladiator colosseum. Move (<kbd className="px-1.5 py-0.5 bg-white/10 rounded">WASD / Arrows</kbd>) and Greatsword Slash (<kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space / Click</kbd>). Level up to gain bonus damage and healing!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.7)] hover:scale-105 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ENTER ARENA</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">OVERWHELMED</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">GLADIATOR SLAIN</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>ARENA SCORE</span>
              <span className="text-amber-400 font-bold font-orbitron text-base">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-1">
              <span>MONSTERS SLAIN</span>
              <span className="text-white font-bold font-orbitron">{kills}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-2 border-t border-white/5">
              <span>TOP RECORD</span>
              <span className="text-amber-400 font-bold font-orbitron text-base">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>FIGHT AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
