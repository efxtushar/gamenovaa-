import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Shield, Crosshair, Zap } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

export const SkyWarriorGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_sky-warrior') || '0', 10);
  });
  const [health, setHealth] = useState(100);
  const [missiles, setMissiles] = useState(3);
  const [bossHp, setBossHp] = useState<number | null>(null);

  const stateRef = useRef({
    player: { x: 300, y: 400, speed: 6, health: 100, shootCooldown: 0, missiles: 3, roll: 0 },
    bullets: [] as { x: number; y: number; vy: number; vx?: number; isEnemy?: boolean; isMissile?: boolean }[],
    enemies: [] as { x: number; y: number; vx: number; vy: number; hp: number; maxHp: number; type: number; shootTimer: number }[],
    boss: null as { x: number; y: number; vx: number; hp: number; maxHp: number; shootTimer: number } | null,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[],
    clouds: [] as { x: number; y: number; speed: number; size: number; alpha: number }[],
    score: 0,
    wave: 1,
    spawnTimer: 0,
    keys: { left: false, right: false, up: false, down: false, fire: false }
  });

  const launchMissile = useCallback(() => {
    const s = stateRef.current;
    if (s.player.missiles > 0) {
      s.player.missiles--;
      setMissiles(s.player.missiles);
      sound.playLaser(450);

      // Launch 2 homing missiles
      s.bullets.push({ x: s.player.x - 20, y: s.player.y - 10, vy: -12, isMissile: true });
      s.bullets.push({ x: s.player.x + 20, y: s.player.y - 10, vy: -12, isMissile: true });

      // Smoke trail
      for (let i = 0; i < 8; i++) {
        s.particles.push({
          x: s.player.x,
          y: s.player.y + 10,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 4 + 2,
          life: 20,
          color: '#cbd5e1',
          size: 4
        });
      }
    }
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    stateRef.current = {
      player: { x: 300, y: 400, speed: 6, health: 100, shootCooldown: 0, missiles: 3, roll: 0 },
      bullets: [],
      enemies: [],
      boss: null,
      particles: [],
      clouds: Array.from({ length: 12 }, () => ({
        x: Math.random() * 640,
        y: Math.random() * 500,
        speed: 1.5 + Math.random() * 3,
        size: 35 + Math.random() * 60,
        alpha: 0.08 + Math.random() * 0.15
      })),
      score: 0,
      wave: 1,
      spawnTimer: 0,
      keys: { left: false, right: false, up: false, down: false, fire: false }
    };
    setScore(0);
    setHealth(100);
    setMissiles(3);
    setBossHp(null);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_sky-warrior', finalScore.toString());
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  // Keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = true;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = true;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = true;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = true;
      if (['Space', 'KeyJ'].includes(e.code)) {
        e.preventDefault();
        stateRef.current.keys.fire = true;
      }
      if (['KeyK', 'KeyX'].includes(e.code)) {
        e.preventDefault();
        launchMissile();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) stateRef.current.keys.up = false;
      if (['ArrowDown', 'KeyS'].includes(e.code)) stateRef.current.keys.down = false;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) stateRef.current.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) stateRef.current.keys.right = false;
      if (['Space', 'KeyJ'].includes(e.code)) stateRef.current.keys.fire = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [launchMissile]);

  // Main Game Loop
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

      // Player Movement & Roll Banking
      if (s.keys.left) {
        s.player.x -= s.player.speed;
        s.player.roll = Math.max(-0.35, s.player.roll - 0.08);
      } else if (s.keys.right) {
        s.player.x += s.player.speed;
        s.player.roll = Math.min(0.35, s.player.roll + 0.08);
      } else {
        s.player.roll *= 0.8;
      }

      if (s.keys.up) s.player.y -= s.player.speed;
      if (s.keys.down) s.player.y += s.player.speed;

      s.player.x = Math.max(30, Math.min(w - 30, s.player.x));
      s.player.y = Math.max(40, Math.min(h - 40, s.player.y));

      // Player Dual Vulcan Fire
      s.player.shootCooldown--;
      if (s.keys.fire && s.player.shootCooldown <= 0) {
        sound.playLaser(850);
        s.bullets.push({ x: s.player.x - 14, y: s.player.y - 20, vy: -12 });
        s.bullets.push({ x: s.player.x + 14, y: s.player.y - 20, vy: -12 });
        s.player.shootCooldown = 9;
      }

      // Update Clouds (Parallax Speed)
      s.clouds.forEach(c => {
        c.y += c.speed;
        if (c.y > h + 70) {
          c.y = -80;
          c.x = Math.random() * w;
        }
      });

      // Spawn Boss every 1200 points
      if (s.score >= 1000 && !s.boss && Math.floor(s.score / 1000) % 2 === 1) {
        s.boss = {
          x: w / 2,
          y: 90,
          vx: 2.5,
          hp: 80,
          maxHp: 80,
          shootTimer: 0
        };
        sound.playPowerUp();
      }

      // Spawn Regular Enemy Jets (Gradual difficulty curve)
      if (!s.boss) {
        s.spawnTimer++;
        const spawnGap = Math.max(40, 75 - Math.floor(s.score / 200) * 5);
        if (s.spawnTimer > spawnGap) {
          s.spawnTimer = 0;
          const isHeavy = s.score > 400 && Math.random() < 0.25;
          s.enemies.push({
            x: 50 + Math.random() * (w - 100),
            y: -40,
            vx: (Math.random() - 0.5) * (s.score > 500 ? 2.5 : 1.2),
            vy: isHeavy ? 1.5 : (s.score > 400 ? 2.8 : 1.9),
            hp: isHeavy ? 5 : 2,
            maxHp: isHeavy ? 5 : 2,
            type: isHeavy ? 2 : 1,
            shootTimer: Math.floor(Math.random() * 30)
          });
        }
      }

      // Update Boss
      if (s.boss) {
        setBossHp(s.boss.hp);
        s.boss.x += s.boss.vx;
        if (s.boss.x < 100 || s.boss.x > w - 100) s.boss.vx *= -1;

        s.boss.shootTimer++;
        if (s.boss.shootTimer > 25) {
          s.boss.shootTimer = 0;
          sound.playLaser(500);
          s.bullets.push({ x: s.boss.x - 30, y: s.boss.y + 35, vy: 5, vx: -1.5, isEnemy: true });
          s.bullets.push({ x: s.boss.x + 30, y: s.boss.y + 35, vy: 5, vx: 1.5, isEnemy: true });
          s.bullets.push({ x: s.boss.x, y: s.boss.y + 40, vy: 6, vx: 0, isEnemy: true });
        }
      } else {
        setBossHp(null);
      }

      // Update Bullets
      s.bullets.forEach((b, i) => {
        b.y += b.vy;
        if (b.vx) b.x += b.vx;

        // Missile smoke
        if (b.isMissile) {
          s.particles.push({
            x: b.x,
            y: b.y + 8,
            vx: (Math.random() - 0.5) * 2,
            vy: 2,
            life: 12,
            color: '#f97316',
            size: 3
          });
        }

        if (b.y < -30 || b.y > h + 30 || b.x < -30 || b.x > w + 30) s.bullets.splice(i, 1);
      });

      // Update Enemies
      s.enemies.forEach((enemy, eIdx) => {
        enemy.y += enemy.vy;
        enemy.x += enemy.vx;
        if (enemy.x < 30 || enemy.x > w - 30) enemy.vx *= -1;

        // Enemy shooting
        enemy.shootTimer++;
        if (enemy.shootTimer > 60) {
          enemy.shootTimer = 0;
          s.bullets.push({ x: enemy.x, y: enemy.y + 18, vy: 5.5, isEnemy: true });
        }

        // Bullet collisions with enemies
        s.bullets.forEach((bullet, bIdx) => {
          if (!bullet.isEnemy && Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < 26) {
            s.bullets.splice(bIdx, 1);
            enemy.hp -= bullet.isMissile ? 5 : 1;
            sound.playHit();

            if (enemy.hp <= 0) {
              s.enemies.splice(eIdx, 1);
              sound.playExplosion();
              s.score += enemy.type === 2 ? 300 : 120;
              setScore(s.score);

              // Explosion particles
              for (let p = 0; p < 16; p++) {
                s.particles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8,
                  life: 25,
                  color: p % 2 === 0 ? '#f97316' : '#facc15',
                  size: 4
                });
              }
            }
          }
        });

        // Player Ram Collision
        if (Math.hypot(s.player.x - enemy.x, s.player.y - enemy.y) < 32) {
          s.enemies.splice(eIdx, 1);
          s.player.health -= 25;
          sound.playExplosion();
          setHealth(Math.max(0, s.player.health));
          if (s.player.health <= 0) handleGameOver(s.score);
        }

        if (enemy.y > h + 50) s.enemies.splice(eIdx, 1);
      });

      // Boss Collision
      if (s.boss) {
        s.bullets.forEach((bullet, bIdx) => {
          if (s.boss && !bullet.isEnemy && Math.hypot(bullet.x - s.boss.x, bullet.y - s.boss.y) < 55) {
            s.bullets.splice(bIdx, 1);
            s.boss.hp -= bullet.isMissile ? 6 : 1;
            sound.playHit();

            if (s.boss.hp <= 0) {
              sound.playExplosion();
              confetti({ particleCount: 50, origin: { x: s.boss.x / w, y: s.boss.y / h } });
              s.score += 1500;
              setScore(s.score);
              s.boss = null;
              setBossHp(null);
            }
          }
        });
      }

      // Enemy Bullets hitting Player
      s.bullets.forEach((bullet, bIdx) => {
        if (bullet.isEnemy && Math.hypot(bullet.x - s.player.x, bullet.y - s.player.y) < 22) {
          s.bullets.splice(bIdx, 1);
          s.player.health -= 15;
          sound.playHit();
          setHealth(Math.max(0, s.player.health));
          if (s.player.health <= 0) handleGameOver(s.score);
        }
      });

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      // RENDER
      // 1. High Atmosphere Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#030d24');
      skyGrad.addColorStop(0.5, '#0b2958');
      skyGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Clouds
      s.clouds.forEach(c => {
        ctx.fillStyle = `rgba(255, 255, 255, ${c.alpha})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.arc(c.x + c.size * 0.6, c.y - 8, c.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Boss Dreadnought
      if (s.boss) {
        ctx.save();
        ctx.translate(s.boss.x, s.boss.y);

        // Boss Hull
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, 45);
        ctx.lineTo(-65, -25);
        ctx.lineTo(-40, -45);
        ctx.lineTo(40, -45);
        ctx.lineTo(65, -25);
        ctx.closePath();
        ctx.fill();

        // Neon Armor Plating
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Dual Core Cannons
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-35, 15, 12, 20);
        ctx.fillRect(23, 15, 12, 20);

        // Bridge Glow
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, -15, 10, 0, Math.PI * 2);
        ctx.fill();

        // Boss HP Bar
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-50, -60, 100, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-50, -60, (s.boss.hp / s.boss.maxHp) * 100, 8);

        ctx.restore();
      }

      // Render Bullets
      s.bullets.forEach(b => {
        if (b.isMissile) {
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 10;
          ctx.fillRect(b.x - 3, b.y - 12, 6, 20);
        } else if (b.isEnemy) {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.fillRect(b.x - 2, b.y - 10, 4, 16);
        }
        ctx.shadowBlur = 0;
      });

      // Render Enemies
      s.enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);

        if (e.type === 2) {
          // Heavy Fighter
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.moveTo(0, 24);
          ctx.lineTo(-28, -18);
          ctx.lineTo(0, -8);
          ctx.lineTo(28, -18);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f43f5e';
          ctx.fillRect(-6, 2, 12, 6);
        } else {
          // Swift Interceptor
          ctx.fillStyle = '#e11d48';
          ctx.beginPath();
          ctx.moveTo(0, 20);
          ctx.lineTo(-18, -14);
          ctx.lineTo(0, -5);
          ctx.lineTo(18, -14);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      // Render Player Jet (F-22 Raptor Inspired)
      ctx.save();
      ctx.translate(s.player.x, s.player.y);
      ctx.rotate(s.player.roll);

      // Jet Thruster Afterburners
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-10, 18);
      ctx.lineTo(-6, 36 + Math.random() * 8);
      ctx.lineTo(-2, 18);
      ctx.moveTo(2, 18);
      ctx.lineTo(6, 36 + Math.random() * 8);
      ctx.lineTo(10, 18);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Delta Wings & Stealth Fuselage
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(26, 18);
      ctx.lineTo(12, 18);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, 18);
      ctx.lineTo(-26, 18);
      ctx.closePath();
      ctx.fill();

      // Wing Edge Details
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Canopy Glass Cockpit
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.ellipse(0, -8, 5, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wingtip Navigation Lights
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(24, 14, 3, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-27, 14, 3, 4);

      ctx.restore();

      // Render Particles
      s.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#030d24] rounded-2xl overflow-hidden select-none border border-sky-500/30 shadow-2xl">
      {/* Top HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-sky-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-sky-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>BEST: {highScore}</span>
          </div>
        </div>

        {/* Health & Missiles */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  health > 50 ? 'bg-emerald-400' : health > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-amber-500/40 backdrop-blur-md flex items-center gap-1.5 text-xs font-orbitron font-bold text-amber-300">
            <Zap className="w-3.5 h-3.5" />
            <span>MISSILES: {missiles}</span>
          </div>
        </div>
      </div>

      {/* Boss Health Bar Overlay */}
      {bossHp !== null && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
          <span className="text-xs font-orbitron font-black text-rose-400 uppercase tracking-widest animate-pulse">
            ⚠️ WARNING: MOTHERSHIP DREADNOUGHT ⚠️
          </span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full max-w-2xl h-auto aspect-4/3 object-contain"
      />

      {/* Mobile Controls */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 md:hidden">
          <button
            onClick={launchMissile}
            className="w-14 h-14 rounded-2xl bg-amber-500/90 text-black font-orbitron font-black text-[10px] flex flex-col items-center justify-center border border-amber-300 active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>MISSILE</span>
          </button>
        </div>
      )}

      {/* Start Overlay */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-400 mb-4 shadow-[0_0_25px_rgba(56,189,248,0.4)]">
            <Crosshair className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wide">SKY WARRIOR</h2>
          <p className="text-slate-300 text-sm max-w-md mt-2 font-mono">
            Engage hostile interceptors. Move (<kbd className="px-1.5 py-0.5 bg-white/10 rounded">WASD / Arrows</kbd>), Dual Cannons (<kbd className="px-1.5 py-0.5 bg-white/10 rounded">Space</kbd>), and Launch Missiles (<kbd className="px-1.5 py-0.5 bg-white/10 rounded">K / X</kbd>).
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(56,189,248,0.7)] hover:scale-105 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>TAKE FLIGHT</span>
          </button>
        </div>
      )}

      {/* Game Over */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-sm tracking-widest uppercase">SHOT DOWN</span>
          <h2 className="font-display font-black text-4xl text-white mt-1">MISSION FAILED</h2>
          
          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-2 font-mono">
            <div className="flex justify-between text-slate-400 text-sm">
              <span>FINAL SCORE</span>
              <span className="text-sky-400 font-bold font-orbitron text-base">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm pt-2 border-t border-white/5">
              <span>PILOT RECORD</span>
              <span className="text-amber-400 font-bold font-orbitron text-base">{highScore}</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(56,189,248,0.6)] cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>RETRY MISSION</span>
          </button>
        </div>
      )}
    </div>
  );
};
