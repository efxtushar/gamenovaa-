import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Box, Sparkles } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
}

const BLOCK_TYPES = [
  { id: 'grass', top: '#22c55e', left: '#15803d', right: '#166534', label: 'GRASS' },
  { id: 'stone', top: '#94a3b8', left: '#64748b', right: '#475569', label: 'STONE' },
  { id: 'gold', top: '#facc15', left: '#eab308', right: '#ca8a04', label: 'GOLD' },
  { id: 'ruby', top: '#f43f5e', left: '#e11d48', right: '#be123c', label: 'RUBY' },
  { id: 'cyan', top: '#00f0ff', left: '#0284c7', right: '#0369a1', label: 'CYBER' },
];

export const VoxelCraftGame: React.FC<GameProps> = ({ onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('START');
  const [activeBlock, setActiveBlock] = useState(0);
  const [blockCount, setBlockCount] = useState(0);

  const stateRef = useRef({
    blocks: [] as { isoX: number; isoY: number; isoZ: number; type: number }[],
    cursor: { isoX: 0, isoY: 0, isoZ: 0 },
    activeBlock: 0
  });

  const startGame = useCallback(() => {
    sound.playClick();
    const baseBlocks: { isoX: number; isoY: number; isoZ: number; type: number }[] = [];

    // Base 6x6 floor
    for (let x = -3; x <= 3; x++) {
      for (let y = -3; y <= 3; y++) {
        baseBlocks.push({ isoX: x, isoY: y, isoZ: 0, type: 0 });
      }
    }

    stateRef.current = {
      blocks: baseBlocks,
      cursor: { isoX: 0, isoY: 0, isoZ: 1 },
      activeBlock: 0
    };

    setBlockCount(baseBlocks.length);
    setGameState('PLAYING');
  }, []);

  const placeBlock = (isoX: number, isoY: number, isoZ: number) => {
    const s = stateRef.current;
    sound.playClick();
    s.blocks.push({ isoX, isoY, isoZ, type: s.activeBlock });
    setBlockCount(s.blocks.length);
    if (s.blocks.length % 20 === 0) {
      confetti({ particleCount: 40, spread: 60 });
    }
  };

  const removeBlock = (isoX: number, isoY: number, isoZ: number) => {
    const s = stateRef.current;
    const idx = s.blocks.findIndex(b => b.isoX === isoX && b.isoY === isoY && b.isoZ === isoZ);
    if (idx !== -1 && s.blocks[idx].isoZ > 0) {
      sound.playHit();
      s.blocks.splice(idx, 1);
      setBlockCount(s.blocks.length);
    }
  };

  // Convert Iso Coordinates to 2D Screen Canvas
  const isoToScreen = (isoX: number, isoY: number, isoZ: number, centerX: number, centerY: number) => {
    const tileW = 44;
    const tileH = 22;
    const screenX = centerX + (isoX - isoY) * (tileW / 2);
    const screenY = centerY + (isoX + isoY) * (tileH / 2) - isoZ * 20;
    return { screenX, screenY };
  };

  // Canvas Click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const s = stateRef.current;
    // Find closest block surface or place on top
    const clicked = s.blocks.find(b => {
      const pos = isoToScreen(b.isoX, b.isoY, b.isoZ, canvas.width / 2, canvas.height / 2 + 30);
      return Math.hypot(mx - pos.screenX, my - pos.screenY) < 20;
    });

    if (clicked) {
      if (e.shiftKey) {
        removeBlock(clicked.isoX, clicked.isoY, clicked.isoZ);
      } else {
        placeBlock(clicked.isoX, clicked.isoY, clicked.isoZ + 1);
      }
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
      const centerX = w / 2;
      const centerY = h / 2 + 40;

      // RENDER
      ctx.fillStyle = '#0a0a16';
      ctx.fillRect(0, 0, w, h);

      // Cyber Voxel Grid Base Glow
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }

      // Sort isometric blocks by depth (Z then X+Y)
      const sorted = [...s.blocks].sort((a, b) => {
        return a.isoX + a.isoY + a.isoZ * 10 - (b.isoX + b.isoY + b.isoZ * 10);
      });

      const tileW = 44;
      const tileH = 22;
      const blockH = 20;

      sorted.forEach(b => {
        const { screenX, screenY } = isoToScreen(b.isoX, b.isoY, b.isoZ, centerX, centerY);
        const block = BLOCK_TYPES[b.type % BLOCK_TYPES.length];

        // TOP FACE
        ctx.fillStyle = block.top;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - blockH);
        ctx.lineTo(screenX + tileW / 2, screenY - blockH + tileH / 2);
        ctx.lineTo(screenX, screenY - blockH + tileH);
        ctx.lineTo(screenX - tileW / 2, screenY - blockH + tileH / 2);
        ctx.closePath();
        ctx.fill();

        // LEFT FACE
        ctx.fillStyle = block.left;
        ctx.beginPath();
        ctx.moveTo(screenX - tileW / 2, screenY - blockH + tileH / 2);
        ctx.lineTo(screenX, screenY - blockH + tileH);
        ctx.lineTo(screenX, screenY + tileH);
        ctx.lineTo(screenX - tileW / 2, screenY + tileH / 2);
        ctx.closePath();
        ctx.fill();

        // RIGHT FACE
        ctx.fillStyle = block.right;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - blockH + tileH);
        ctx.lineTo(screenX + tileW / 2, screenY - blockH + tileH / 2);
        ctx.lineTo(screenX + tileW / 2, screenY + tileH / 2);
        ctx.lineTo(screenX, screenY + tileH);
        ctx.closePath();
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-[#0a0a16] rounded-2xl overflow-hidden select-none border border-emerald-500/20">
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/75 border border-emerald-500/40 backdrop-blur-md">
            <span className="text-[10px] font-mono text-emerald-400 block uppercase">VOXELS</span>
            <span className="text-xl font-orbitron font-bold text-white">{blockCount}</span>
          </div>

          <div className="flex items-center gap-1 bg-black/75 p-1 rounded-xl border border-white/10 backdrop-blur-md pointer-events-auto">
            {BLOCK_TYPES.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => {
                  stateRef.current.activeBlock = idx;
                  setActiveBlock(idx);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  activeBlock === idx ? 'bg-white text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startGame}
          className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-black/75 border border-white/10 hover:border-emerald-500/40 text-xs font-mono text-emerald-400 flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET WORLD</span>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={460}
        onClick={handleCanvasClick}
        className="w-full max-w-xl h-auto aspect-15/11 object-contain cursor-crosshair"
      />

      {/* Start */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
            <Box className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">VOXEL CRAFT</h2>
          <p className="text-slate-300 text-sm max-w-xs mt-2">
            Click on isometric blocks to place new voxels on top. Shift+Click to remove blocks. Build 3D voxel masterpieces!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-orbitron font-black text-base tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>CREATE WORLD</span>
          </button>
        </div>
      )}
    </div>
  );
};
