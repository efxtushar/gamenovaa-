import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Sprout, Sun, Droplets, Trophy, ShoppingBag } from 'lucide-react';

interface Plot {
  id: number;
  x: number;
  y: number;
  crop: 'carrot' | 'strawberry' | 'pumpkin';
  state: 'empty' | 'planted' | 'watered' | 'ripe';
  progress: number;
  growthTime: number;
}

export const FarmFriendsGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [coins, setCoins] = useState(50);
  const [selectedCrop, setSelectedCrop] = useState<'carrot' | 'strawberry' | 'pumpkin'>('carrot');
  const [selectedTool, setSelectedTool] = useState<'plant' | 'water' | 'harvest'>('plant');
  const [day, setDay] = useState(1);
  const [harvestCount, setHarvestCount] = useState(0);

  const stateRef = useRef({
    coins: 50,
    harvestCount: 0,
    day: 1,
    dayTimer: 0,
    plots: [] as Plot[],
    selectedCrop: 'carrot' as 'carrot' | 'strawberry' | 'pumpkin',
    selectedTool: 'plant' as 'plant' | 'water' | 'harvest',
    particles: [] as { x: number; y: number; vx: number; vy: number; text: string; color: string; life: number }[]
  });

  const initGame = useCallback(() => {
    sound.playClick();
    const plots: Plot[] = [];
    const cols = 4;
    const rows = 3;
    const startX = 140;
    const startY = 110;
    const size = 95;
    const gap = 20;

    let id = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        plots.push({
          id: id++,
          x: startX + c * (size + gap),
          y: startY + r * (size + gap),
          crop: 'carrot',
          state: 'empty',
          progress: 0,
          growthTime: 120
        });
      }
    }

    stateRef.current.plots = plots;
    stateRef.current.coins = 50;
    stateRef.current.harvestCount = 0;
    stateRef.current.day = 1;
    stateRef.current.dayTimer = 0;
    stateRef.current.particles = [];

    setCoins(50);
    setHarvestCount(0);
    setDay(1);
    setGameState('playing');
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const s = stateRef.current;
    const size = 95;

    s.plots.forEach(plot => {
      if (mx >= plot.x && mx <= plot.x + size && my >= plot.y && my <= plot.y + size) {
        if (s.selectedTool === 'plant') {
          if (plot.state === 'empty') {
            const cost = s.selectedCrop === 'carrot' ? 5 : s.selectedCrop === 'strawberry' ? 12 : 25;
            if (s.coins >= cost) {
              s.coins -= cost;
              setCoins(s.coins);
              plot.crop = s.selectedCrop;
              plot.state = 'planted';
              plot.progress = 0;
              plot.growthTime = s.selectedCrop === 'carrot' ? 100 : s.selectedCrop === 'strawberry' ? 160 : 240;
              sound.playClick();
              s.particles.push({
                x: plot.x + size / 2,
                y: plot.y + size / 2,
                vx: 0,
                vy: -1.5,
                text: `-${cost}¢`,
                color: '#ef4444',
                life: 30
              });
            } else {
              sound.playHit();
            }
          }
        } else if (s.selectedTool === 'water') {
          if (plot.state === 'planted') {
            plot.state = 'watered';
            sound.playPowerUp();
            s.particles.push({
              x: plot.x + size / 2,
              y: plot.y + size / 2,
              vx: 0,
              vy: -1.5,
              text: '💧 WATERED',
              color: '#38bdf8',
              life: 30
            });
          }
        } else if (s.selectedTool === 'harvest') {
          if (plot.state === 'ripe') {
            const reward = plot.crop === 'carrot' ? 15 : plot.crop === 'strawberry' ? 35 : 80;
            s.coins += reward;
            s.harvestCount++;
            setCoins(s.coins);
            setHarvestCount(s.harvestCount);
            plot.state = 'empty';
            plot.progress = 0;
            sound.playCoin();
            confetti({ particleCount: 20, spread: 40, origin: { x: mx / canvas.width, y: my / canvas.height } });
            s.particles.push({
              x: plot.x + size / 2,
              y: plot.y + size / 2,
              vx: 0,
              vy: -2,
              text: `+${reward}¢ HARVEST!`,
              color: '#facc15',
              life: 40
            });
          }
        }
      }
    });
  };

  useEffect(() => {
    stateRef.current.selectedCrop = selectedCrop;
  }, [selectedCrop]);

  useEffect(() => {
    stateRef.current.selectedTool = selectedTool;
  }, [selectedTool]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      const s = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const size = 95;

      // Day cycle timer
      s.dayTimer++;
      if (s.dayTimer > 800) {
        s.dayTimer = 0;
        s.day++;
        setDay(s.day);
      }

      // Background Farm field
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, w, h);

      // Grass texture lines
      ctx.fillStyle = '#166534';
      for (let x = 0; x < w; x += 40) {
        ctx.fillRect(x, 0, 20, h);
      }

      // Red Barn in background
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(20, 25, 90, 60);
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(15, 25);
      ctx.lineTo(65, 5);
      ctx.lineTo(115, 25);
      ctx.fill();

      // White Barn Cross
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 45, 24, 28);
      ctx.beginPath();
      ctx.moveTo(40, 45);
      ctx.lineTo(64, 73);
      ctx.moveTo(64, 45);
      ctx.lineTo(40, 73);
      ctx.stroke();

      // Sun
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(w - 50, 45, 26, 0, Math.PI * 2);
      ctx.fill();

      // Update & Draw Plots
      s.plots.forEach(plot => {
        // Soil base
        ctx.fillStyle = plot.state === 'watered' ? '#451a03' : '#78350f';
        ctx.beginPath();
        ctx.roundRect(plot.x, plot.y, size, size, 14);
        ctx.fill();
        ctx.strokeStyle = plot.state === 'watered' ? '#0284c7' : '#92400e';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Growth logic
        if (plot.state === 'watered') {
          plot.progress += 1 / plot.growthTime;
          if (plot.progress >= 1) {
            plot.state = 'ripe';
            sound.playPowerUp();
          }
        }

        // Draw Crop state
        const cx = plot.x + size / 2;
        const cy = plot.y + size / 2;

        if (plot.state === 'planted' || (plot.state === 'watered' && plot.progress < 0.5)) {
          // Small Sprout
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(cx, cy + 8, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#15803d';
          ctx.fillRect(cx - 2, cy - 2, 4, 12);
        } else if (plot.state === 'watered' && plot.progress >= 0.5) {
          // Medium plant
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(cx - 6, cy, 12, 0, Math.PI * 2);
          ctx.arc(cx + 6, cy, 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (plot.state === 'ripe') {
          // Full ripe vegetables
          if (plot.crop === 'carrot') {
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 4, 12, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            // Green fronds
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.arc(cx, cy - 18, 9, 0, Math.PI * 2);
            ctx.fill();
          } else if (plot.crop === 'strawberry') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy + 2, 18, 0, Math.PI * 2);
            ctx.fill();
            // Seeds
            ctx.fillStyle = '#fde047';
            ctx.fillRect(cx - 6, cy, 3, 3);
            ctx.fillRect(cx + 4, cy - 4, 3, 3);
            ctx.fillRect(cx, cy + 8, 3, 3);
            // Cap
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(cx - 8, cy - 16, 16, 6);
          } else if (plot.crop === 'pumpkin') {
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2, 24, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Ribs
            ctx.strokeStyle = '#c2410c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 2, 12, 18, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Stem
            ctx.fillStyle = '#15803d';
            ctx.fillRect(cx - 3, cy - 18, 6, 8);
          }

          // Sparkle aura
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(plot.x + 4, plot.y + 4, size - 8, size - 8);
          ctx.setLineDash([]);
        }

        // Progress Bar
        if (plot.state === 'watered' && plot.progress < 1) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(plot.x + 10, plot.y + size - 14, size - 20, 6);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(plot.x + 10, plot.y + size - 14, (size - 20) * plot.progress, 6);
        }
      });

      // Render Floating Text Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.y += pt.vy;
        pt.life--;
        ctx.fillStyle = pt.color;
        ctx.font = 'bold 12px "Orbitron", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pt.text, pt.x, pt.y);
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center select-none">
      {/* Top HUD */}
      <div className="w-full mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-amber-500/40 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span className="font-orbitron font-bold text-amber-300 text-sm">{coins} COINS</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-emerald-500/40 flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span className="font-orbitron font-bold text-emerald-300 text-sm">DAY {day}</span>
          </div>
        </div>

        {/* Tool Selectors */}
        <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => { sound.playClick(); setSelectedTool('plant'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer ${
              selectedTool === 'plant' ? 'bg-emerald-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            🌱 PLANT
          </button>
          <button
            onClick={() => { sound.playClick(); setSelectedTool('water'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer ${
              selectedTool === 'water' ? 'bg-sky-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            💧 WATER
          </button>
          <button
            onClick={() => { sound.playClick(); setSelectedTool('harvest'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer ${
              selectedTool === 'harvest' ? 'bg-amber-500 text-black' : 'text-slate-300 hover:text-white'
            }`}
          >
            🧺 HARVEST
          </button>
        </div>

        {/* Crop Selectors */}
        {selectedTool === 'plant' && (
          <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setSelectedCrop('carrot')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                selectedCrop === 'carrot' ? 'bg-orange-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              🥕 Carrot (5¢)
            </button>
            <button
              onClick={() => setSelectedCrop('strawberry')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                selectedCrop === 'strawberry' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              🍓 Berry (12¢)
            </button>
            <button
              onClick={() => setSelectedCrop('pumpkin')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                selectedCrop === 'pumpkin' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              🎃 Pumpkin (25¢)
            </button>
          </div>
        )}
      </div>

      {/* Main Garden View */}
      <div className="relative w-full aspect-video max-h-[520px] rounded-2xl overflow-hidden bg-slate-950 border border-emerald-500/30 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          onClick={handleCanvasClick}
          className="w-full h-full object-contain cursor-pointer"
        />

        {gameState === 'start' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mb-4">
              <Sprout className="w-8 h-8" />
            </div>
            <h2 className="font-orbitron font-black text-3xl text-white">FARM FRIENDS</h2>
            <p className="text-sm font-mono text-slate-300 max-w-md mt-2">
              Cultivate soil, select seeds (Carrots, Berries, Pumpkins), water your crops, and harvest for market profits!
            </p>
            <button
              onClick={initGame}
              className="mt-6 px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-orbitron font-bold text-sm tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START FARMING</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
