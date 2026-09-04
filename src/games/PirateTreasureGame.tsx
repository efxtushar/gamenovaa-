import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/soundEffects';
import { Play, RotateCcw, Compass } from 'lucide-react';

export const PirateTreasureGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'victory'>('start');
  const [score, setScore] = useState(0);
  const [chestsLeft, setChestsLeft] = useState(5);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let currentScore = 0;
    let remainingChests = 5;

    // Pirate Ship / Captain
    const ship = {
      x: 100,
      y: 100,
      radius: 18,
      angle: 0,
      speed: 0,
      maxSpeed: 4.5,
      accel: 0.15,
      turnSpeed: 0.06
    };

    const keys: Record<string, boolean> = {};

    // Islands / Coral Reefs
    const islands = [
      { x: 250, y: 180, r: 45, name: 'Skull Isle' },
      { x: 550, y: 320, r: 60, name: 'Kraken Atoll' },
      { x: 620, y: 130, r: 40, name: 'Gold Cay' },
      { x: 180, y: 360, r: 35, name: 'Dead Reef' },
    ];

    // Gold Chests
    const chests = [
      { x: 280, y: 140, collected: false },
      { x: 500, y: 300, collected: false },
      { x: 650, y: 170, collected: false },
      { x: 210, y: 390, collected: false },
      { x: 420, y: 80, collected: false }
    ];

    // Enemy Kraken Tentacles & Royal Patrol Frigates
    const enemies = [
      { x: 400, y: 220, vx: 1.5, vy: 1, r: 16, type: 'frigate' },
      { x: 300, y: 300, vx: -1.2, vy: 1.2, r: 16, type: 'frigate' }
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = true;
      keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
      keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Tropical Ocean Water
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Wave ripple details
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let y = 30; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.arc(200 + Math.sin(Date.now() * 0.002 + y) * 20, y, 15, 0, Math.PI);
        ctx.stroke();
      }

      // 2. Draw Islands
      islands.forEach(isl => {
        // Sand beach
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(isl.x, isl.y, isl.r, 0, Math.PI * 2);
        ctx.fill();
        // Palm jungle center
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(isl.x, isl.y, isl.r * 0.65, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Update Ship Controls
      if (keys['ArrowUp'] || keys['KeyW']) {
        ship.speed = Math.min(ship.speed + ship.accel, ship.maxSpeed);
      } else if (keys['ArrowDown'] || keys['KeyS']) {
        ship.speed = Math.max(ship.speed - ship.accel * 1.5, -ship.maxSpeed * 0.5);
      } else {
        ship.speed *= 0.96; // friction
      }

      if (keys['ArrowLeft'] || keys['KeyA']) {
        ship.angle -= ship.turnSpeed;
      }
      if (keys['ArrowRight'] || keys['KeyD']) {
        ship.angle += ship.turnSpeed;
      }

      ship.x += Math.cos(ship.angle) * ship.speed;
      ship.y += Math.sin(ship.angle) * ship.speed;

      // Wrap or clamp edges
      if (ship.x < 20) ship.x = 20;
      if (ship.x > canvas.width - 20) ship.x = canvas.width - 20;
      if (ship.y < 20) ship.y = 20;
      if (ship.y > canvas.height - 20) ship.y = canvas.height - 20;

      // Island collision
      islands.forEach(isl => {
        const dist = Math.hypot(ship.x - isl.x, ship.y - isl.y);
        if (dist < ship.radius + isl.r * 0.6) {
          ship.speed = -ship.speed * 0.6;
          sound.playHit();
        }
      });

      // 4. Draw Gold Chests
      chests.forEach(chest => {
        if (!chest.collected) {
          ctx.fillStyle = '#eab308';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.fillRect(chest.x - 8, chest.y - 6, 16, 12);
          ctx.strokeRect(chest.x - 8, chest.y - 6, 16, 12);

          // Check pickup
          if (Math.hypot(ship.x - chest.x, ship.y - chest.y) < ship.radius + 12) {
            chest.collected = true;
            remainingChests--;
            setChestsLeft(remainingChests);
            currentScore += 500;
            setScore(currentScore);
            sound.playCoin();

            if (remainingChests <= 0) {
              sound.playPowerUp();
              setGameState('victory');
            }
          }
        }
      });

      // 5. Draw Enemies (Frigates)
      enemies.forEach(en => {
        en.x += en.vx;
        en.y += en.vy;
        if (en.x < 50 || en.x > canvas.width - 50) en.vx *= -1;
        if (en.y < 50 || en.y > canvas.height - 50) en.vy *= -1;

        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2);
        ctx.fill();

        // Check pirate ship hit
        if (Math.hypot(ship.x - en.x, ship.y - en.y) < ship.radius + en.r) {
          sound.playExplosion();
          setGameState('gameover');
        }
      });

      // 6. Draw Pirate Galleon
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      // Wooden Hull
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // White Sails & Jolly Roger
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-6, -16, 12, 32);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-2, -4, 4, 8); // skull cross

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  return (
    <div className="relative w-full aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-white/10 shadow-2xl">
      <canvas ref={canvasRef} width={800} height={450} className="w-full h-full object-contain" />

      {gameState === 'start' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="font-orbitron font-black text-3xl text-white">PIRATE TREASURE</h2>
          <p className="text-sm font-mono text-slate-300 max-w-md mt-2">
            Sail your pirate sloop across dangerous tropical archipelagoes. Collect all 5 sunken gold chests and dodge royal patrol fleets!
          </p>
          <button
            onClick={() => { sound.playPowerUp(); setGameState('playing'); setChestsLeft(5); setScore(0); }}
            className="mt-6 px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 cursor-pointer transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>SET SAIL</span>
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <h2 className="font-orbitron font-black text-3xl text-rose-500 mb-2">SHIP SUNK!</h2>
          <p className="text-xs font-mono text-slate-400">Score: {score}</p>
          <button
            onClick={() => { sound.playPowerUp(); setGameState('playing'); setChestsLeft(5); setScore(0); }}
            className="mt-6 px-8 py-3.5 rounded-xl bg-amber-400 text-black font-orbitron font-black text-sm flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}

      {gameState === 'victory' && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <h2 className="font-orbitron font-black text-3xl text-emerald-400 mb-2">TREASURE SECURED!</h2>
          <p className="text-sm font-mono text-slate-200">You claimed all pirate gold chests! Total: {score} PTS</p>
          <button
            onClick={() => { sound.playPowerUp(); setGameState('playing'); setChestsLeft(5); setScore(0); }}
            className="mt-6 px-8 py-3.5 rounded-xl bg-emerald-400 text-black font-orbitron font-black text-sm flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3 pointer-events-none">
          <div className="px-3 py-1 rounded-xl bg-black/60 border border-white/15 text-white font-orbitron font-bold text-xs">
            CHESTS LEFT: <span className="text-amber-400">{chestsLeft}</span>
          </div>
          <div className="px-3 py-1 rounded-xl bg-black/60 border border-white/15 text-white font-orbitron font-bold text-xs">
            SCORE: <span className="text-cyan-400">{score}</span>
          </div>
        </div>
      )}
    </div>
  );
};
