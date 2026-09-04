import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Sparkles, RefreshCw, Zap, ArrowLeft } from 'lucide-react';

interface GameProps {
  onGameOver?: (score: number) => void;
  onBack?: () => void;
}

const BUBBLE_COLORS = ['#ef4444', '#38bdf8', '#4ade80', '#facc15', '#a855f7', '#fb923c'];
const RADIUS = 20;
const ROWS_COUNT = 9;
const COLS_COUNT = 12;
const ROW_HEIGHT = Math.round(RADIUS * Math.sqrt(3));

interface Bubble {
  row: number;
  col: number;
  color: string;
  x: number;
  y: number;
  popping?: boolean;
  scale?: number;
}

interface FallingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  r: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
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

export const BubbleBlastGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('START');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_bubble-blast') || '0', 10);
  });

  const stateRef = useRef({
    grid: [] as Bubble[],
    cannon: {
      x: 400,
      y: 530,
      angle: -Math.PI / 2,
      currentColor: BUBBLE_COLORS[0],
      nextColor: BUBBLE_COLORS[1]
    },
    flyingBubble: null as { x: number; y: number; vx: number; vy: number; color: string } | null,
    fallingBubbles: [] as FallingBubble[],
    particles: [] as Particle[],
    popups: [] as ScorePopup[],
    aimTrajectory: [] as { x: number; y: number }[],
    shotsFired: 0,
    bubblesPopped: 0,
    ceilingDropCounter: 0,
    score: 0,
    combo: 0,
    comboTimer: 0
  });

  const getGridCoords = (row: number, col: number) => {
    const isOdd = row % 2 === 1;
    const xOffset = isOdd ? 400 - (COLS_COUNT * RADIUS) + RADIUS : 400 - (COLS_COUNT * RADIUS);
    const x = xOffset + col * (RADIUS * 2) + RADIUS;
    const y = 40 + row * ROW_HEIGHT;
    return { x, y };
  };

  const initGrid = () => {
    const bubbles: Bubble[] = [];
    for (let r = 0; r < 5; r++) {
      const cols = r % 2 === 1 ? COLS_COUNT - 1 : COLS_COUNT;
      for (let c = 0; c < cols; c++) {
        const { x, y } = getGridCoords(r, c);
        const color = BUBBLE_COLORS[Math.floor(Math.random() * 4)];
        bubbles.push({ row: r, col: c, color, x, y });
      }
    }
    return bubbles;
  };

  const swapBubbles = useCallback(() => {
    const s = stateRef.current;
    if (s.flyingBubble) return;
    sound.playClick();
    const temp = s.cannon.currentColor;
    s.cannon.currentColor = s.cannon.nextColor;
    s.cannon.nextColor = temp;
  }, []);

  const startGame = useCallback(() => {
    sound.playClick();
    const grid = initGrid();
    const c1 = BUBBLE_COLORS[Math.floor(Math.random() * 4)];
    const c2 = BUBBLE_COLORS[Math.floor(Math.random() * 4)];

    stateRef.current = {
      grid,
      cannon: {
        x: 400,
        y: 530,
        angle: -Math.PI / 2,
        currentColor: c1,
        nextColor: c2
      },
      flyingBubble: null,
      fallingBubbles: [],
      particles: [],
      popups: [],
      aimTrajectory: [],
      shotsFired: 0,
      bubblesPopped: 0,
      ceilingDropCounter: 0,
      score: 0,
      combo: 0,
      comboTimer: 0
    };

    setScore(0);
    setCombo(0);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((finalScore: number, victory: boolean = false) => {
    if (victory) {
      sound.playPowerUp();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setGameState('VICTORY');
    } else {
      sound.playGameOver();
      setGameState('GAMEOVER');
    }

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_bubble-blast', finalScore.toString());
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const shootBubble = useCallback(() => {
    const s = stateRef.current;
    if (s.flyingBubble || gameState !== 'PLAYING') return;

    sound.playLaser(1100);
    const speed = 15;
    s.flyingBubble = {
      x: s.cannon.x,
      y: s.cannon.y,
      vx: Math.cos(s.cannon.angle) * speed,
      vy: Math.sin(s.cannon.angle) * speed,
      color: s.cannon.currentColor
    };

    s.shotsFired++;
    s.cannon.currentColor = s.cannon.nextColor;

    const availableColors = Array.from(new Set(s.grid.map(b => b.color)));
    if (availableColors.length > 0) {
      s.cannon.nextColor = availableColors[Math.floor(Math.random() * availableColors.length)];
    } else {
      s.cannon.nextColor = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
    }
  }, [gameState]);

  const updateTrajectory = (angle: number) => {
    const s = stateRef.current;
    const points: { x: number; y: number }[] = [];
    let curX = s.cannon.x;
    let curY = s.cannon.y;
    let dirX = Math.cos(angle);
    let dirY = Math.sin(angle);
    const step = 8;
    const maxSteps = 100;

    const playAreaLeft = 400 - (COLS_COUNT * RADIUS);
    const playAreaRight = 400 + (COLS_COUNT * RADIUS);

    for (let i = 0; i < maxSteps; i++) {
      curX += dirX * step;
      curY += dirY * step;

      // Bounce off walls
      if (curX <= playAreaLeft + RADIUS) {
        curX = playAreaLeft + RADIUS;
        dirX = -dirX;
      } else if (curX >= playAreaRight - RADIUS) {
        curX = playAreaRight - RADIUS;
        dirX = -dirX;
      }

      points.push({ x: curX, y: curY });

      if (curY <= 40 + RADIUS) break;

      let hit = false;
      for (const b of s.grid) {
        const dx = curX - b.x;
        const dy = curY - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < RADIUS * 1.85) {
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    s.aimTrajectory = points;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const s = stateRef.current;
    let angle = Math.atan2(mouseY - s.cannon.y, mouseX - s.cannon.x);
    if (angle > -0.15) angle = -0.15;
    if (angle < -Math.PI + 0.15) angle = -Math.PI + 0.15;

    s.cannon.angle = angle;
    updateTrajectory(angle);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.code === 'Space') {
        e.preventDefault();
        swapBubbles();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        const s = stateRef.current;
        s.cannon.angle = Math.max(-Math.PI + 0.15, s.cannon.angle - 0.05);
        updateTrajectory(s.cannon.angle);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        const s = stateRef.current;
        s.cannon.angle = Math.min(-0.15, s.cannon.angle + 0.05);
        updateTrajectory(s.cannon.angle);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        shootBubble();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, shootBubble, swapBubbles]);

  const snapAndPop = (flyX: number, flyY: number, color: string) => {
    const s = stateRef.current;
    let closestRow = 0;
    let closestCol = 0;
    let minDist = Infinity;

    for (let r = 0; r < ROWS_COUNT; r++) {
      const cols = r % 2 === 1 ? COLS_COUNT - 1 : COLS_COUNT;
      for (let c = 0; c < cols; c++) {
        const occ = s.grid.some(b => b.row === r && b.col === c);
        if (!occ) {
          const { x, y } = getGridCoords(r, c);
          const dist = Math.hypot(flyX - x, flyY - y);
          if (dist < minDist) {
            minDist = dist;
            closestRow = r;
            closestCol = c;
          }
        }
      }
    }

    const { x, y } = getGridCoords(closestRow, closestCol);
    const newBubble: Bubble = { row: closestRow, col: closestCol, color, x, y };
    s.grid.push(newBubble);

    // Find connected matching cluster (BFS)
    const matches: Bubble[] = [];
    const queue: Bubble[] = [newBubble];
    const visited = new Set<string>();
    visited.add(`${closestRow},${closestCol}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      matches.push(curr);

      const isOdd = curr.row % 2 === 1;
      const neighbors = [
        { r: curr.row, c: curr.col - 1 },
        { r: curr.row, c: curr.col + 1 },
        { r: curr.row - 1, c: isOdd ? curr.col : curr.col - 1 },
        { r: curr.row - 1, c: isOdd ? curr.col + 1 : curr.col },
        { r: curr.row + 1, c: isOdd ? curr.col : curr.col - 1 },
        { r: curr.row + 1, c: isOdd ? curr.col + 1 : curr.col },
      ];

      for (const n of neighbors) {
        const key = `${n.r},${n.c}`;
        if (!visited.has(key)) {
          const neighborBubble = s.grid.find(b => b.row === n.r && b.col === n.c && b.color === color);
          if (neighborBubble) {
            visited.add(key);
            queue.push(neighborBubble);
          }
        }
      }
    }

    if (matches.length >= 3) {
      sound.playCoin();
      s.combo++;
      s.comboTimer = 180;
      setCombo(s.combo);

      const pts = matches.length * 100 * s.combo;
      s.score += pts;
      s.bubblesPopped += matches.length;
      setScore(s.score);

      s.popups.push({
        x: newBubble.x,
        y: newBubble.y,
        text: `+${pts} (${matches.length}x)`,
        color: color,
        life: 40
      });

      // Spawn particles
      matches.forEach(m => {
        for (let i = 0; i < 8; i++) {
          s.particles.push({
            x: m.x,
            y: m.y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            color: m.color,
            size: Math.random() * 4 + 2,
            life: 25
          });
        }
      });

      s.grid = s.grid.filter(b => !matches.includes(b));

      // Check floating unattached bubbles
      const rootVisited = new Set<string>();
      const rootQueue: Bubble[] = s.grid.filter(b => b.row === 0);
      rootQueue.forEach(b => rootVisited.add(`${b.row},${b.col}`));

      while (rootQueue.length > 0) {
        const curr = rootQueue.shift()!;
        const isOdd = curr.row % 2 === 1;
        const neighbors = [
          { r: curr.row, c: curr.col - 1 },
          { r: curr.row, c: curr.col + 1 },
          { r: curr.row - 1, c: isOdd ? curr.col : curr.col - 1 },
          { r: curr.row - 1, c: isOdd ? curr.col + 1 : curr.col },
          { r: curr.row + 1, c: isOdd ? curr.col : curr.col - 1 },
          { r: curr.row + 1, c: isOdd ? curr.col + 1 : curr.col },
        ];

        for (const n of neighbors) {
          const key = `${n.r},${n.c}`;
          if (!rootVisited.has(key)) {
            const nb = s.grid.find(b => b.row === n.r && b.col === n.c);
            if (nb) {
              rootVisited.add(key);
              rootQueue.push(nb);
            }
          }
        }
      }

      const detached = s.grid.filter(b => !rootVisited.has(`${b.row},${b.col}`));
      if (detached.length > 0) {
        sound.playPowerUp();
        const dropPts = detached.length * 250;
        s.score += dropPts;
        setScore(s.score);

        s.popups.push({
          x: 400,
          y: 300,
          text: `AVALANCHE! +${dropPts}`,
          color: '#facc15',
          life: 50
        });

        detached.forEach(d => {
          s.fallingBubbles.push({
            x: d.x,
            y: d.y,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 3 - 2,
            color: d.color,
            r: RADIUS
          });
        });

        s.grid = s.grid.filter(b => rootVisited.has(`${b.row},${b.col}`));
      }

      if (s.grid.length === 0) {
        handleGameOver(s.score, true);
        return;
      }
    } else {
      s.combo = 0;
      setCombo(0);
    }

    // Check game over condition
    const lowest = s.grid.reduce((max, b) => Math.max(max, b.row), 0);
    if (lowest >= ROWS_COUNT - 1) {
      handleGameOver(s.score, false);
    }
  };

  // Main game loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const s = stateRef.current;
      const playAreaLeft = 400 - (COLS_COUNT * RADIUS);
      const playAreaRight = 400 + (COLS_COUNT * RADIUS);

      if (gameState === 'PLAYING') {
        if (s.comboTimer > 0) {
          s.comboTimer--;
          if (s.comboTimer === 0) {
            s.combo = 0;
            setCombo(0);
          }
        }

        // Update flying bubble
        if (s.flyingBubble) {
          s.flyingBubble.x += s.flyingBubble.vx;
          s.flyingBubble.y += s.flyingBubble.vy;

          if (s.flyingBubble.x <= playAreaLeft + RADIUS) {
            s.flyingBubble.x = playAreaLeft + RADIUS;
            s.flyingBubble.vx = -s.flyingBubble.vx;
            sound.playHit();
          } else if (s.flyingBubble.x >= playAreaRight - RADIUS) {
            s.flyingBubble.x = playAreaRight - RADIUS;
            s.flyingBubble.vx = -s.flyingBubble.vx;
            sound.playHit();
          }

          let collided = false;
          if (s.flyingBubble.y <= 40 + RADIUS) {
            collided = true;
          } else {
            for (const b of s.grid) {
              const dist = Math.hypot(s.flyingBubble.x - b.x, s.flyingBubble.y - b.y);
              if (dist < RADIUS * 1.85) {
                collided = true;
                break;
              }
            }
          }

          if (collided) {
            snapAndPop(s.flyingBubble.x, s.flyingBubble.y, s.flyingBubble.color);
            s.flyingBubble = null;
          }
        }

        // Update falling detached bubbles
        for (let i = s.fallingBubbles.length - 1; i >= 0; i--) {
          const fb = s.fallingBubbles[i];
          fb.x += fb.vx;
          fb.y += fb.vy;
          fb.vy += 0.45;
          if (fb.y > 600) {
            s.fallingBubbles.splice(i, 1);
          }
        }

        // Update particles
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life--;
          if (p.life <= 0) s.particles.splice(i, 1);
        }

        // Update popups
        for (let i = s.popups.length - 1; i >= 0; i--) {
          const pop = s.popups[i];
          pop.y -= 0.8;
          pop.life--;
          if (pop.life <= 0) s.popups.splice(i, 1);
        }
      }

      // -------------------------------------------------------------
      // DRAW SCENE
      // -------------------------------------------------------------
      ctx.clearRect(0, 0, 800, 600);

      // Deep space atmospheric background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 600);
      bgGrad.addColorStop(0, '#060812');
      bgGrad.addColorStop(0.5, '#0b0f1d');
      bgGrad.addColorStop(1, '#05070c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 600);

      // Side ambient energy conduits
      ctx.fillStyle = 'rgba(236, 72, 153, 0.04)';
      ctx.fillRect(0, 0, playAreaLeft, 600);
      ctx.fillRect(playAreaRight, 0, 800 - playAreaRight, 600);

      // Play area boundary frame
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.strokeRect(playAreaLeft, 20, playAreaRight - playAreaLeft, 560);

      // Ceiling bar
      ctx.fillStyle = '#334155';
      ctx.fillRect(playAreaLeft, 20, playAreaRight - playAreaLeft, 10);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(playAreaLeft, 28, playAreaRight - playAreaLeft, 2);

      // Danger line at bottom
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playAreaLeft, 40 + (ROWS_COUNT - 1) * ROW_HEIGHT);
      ctx.lineTo(playAreaRight, 40 + (ROWS_COUNT - 1) * ROW_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Grid Bubbles
      s.grid.forEach(b => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, RADIUS - 1, 0, Math.PI * 2);
        
        // 3D sphere gradient
        const sphereGrad = ctx.createRadialGradient(
          b.x - RADIUS * 0.35,
          b.y - RADIUS * 0.35,
          RADIUS * 0.1,
          b.x,
          b.y,
          RADIUS
        );
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.35, b.color);
        sphereGrad.addColorStop(1, '#05070c');
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      // Draw Falling Bubbles
      s.fallingBubbles.forEach(fb => {
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fb.r, 0, Math.PI * 2);
        ctx.fillStyle = fb.color;
        ctx.fill();
      });

      // Draw Aim Trajectory
      if (gameState === 'PLAYING' && !s.flyingBubble && s.aimTrajectory.length > 0) {
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.cannon.x, s.cannon.y);
        s.aimTrajectory.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // Draw Flying Bubble
      if (s.flyingBubble) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(s.flyingBubble.x, s.flyingBubble.y, RADIUS, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          s.flyingBubble.x - 6,
          s.flyingBubble.y - 6,
          2,
          s.flyingBubble.x,
          s.flyingBubble.y,
          RADIUS
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, s.flyingBubble.color);
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // Draw Cannon Base & Barrel
      ctx.save();
      ctx.translate(s.cannon.x, s.cannon.y);
      
      // Cannon Base Ring
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Rotating Barrel
      ctx.rotate(s.cannon.angle + Math.PI / 2);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10, -50, 20, 45);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-10, -50, 20, 45);

      // Current loaded bubble inside cannon
      ctx.beginPath();
      ctx.arc(0, 0, RADIUS - 2, 0, Math.PI * 2);
      ctx.fillStyle = s.cannon.currentColor;
      ctx.fill();
      ctx.restore();

      // Next Bubble Preview
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(playAreaLeft + 40, s.cannon.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(playAreaLeft + 40, s.cannon.y, RADIUS * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = s.cannon.nextColor;
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT', playAreaLeft + 40, s.cannon.y + 36);
      ctx.restore();

      // Draw Particles
      s.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // Draw Popups
      s.popups.forEach(pop => {
        ctx.save();
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = pop.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = pop.color;
        ctx.shadowBlur = 10;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#05070d] overflow-hidden select-none">
      {/* Top Floating HUD */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-black/80 border border-pink-500/30 backdrop-blur-md flex items-center gap-2 text-sm font-mono text-white shadow-[0_0_20px_rgba(236,72,153,0.25)]">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-slate-400">SCORE:</span>
            <span className="text-pink-400 font-bold text-base">{score}</span>
          </div>

          {combo > 1 && (
            <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/30 to-rose-500/30 border border-amber-500/50 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 animate-pulse">
              <Zap className="w-4 h-4 text-amber-400 fill-current" />
              <span>{combo}x COMBO!</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={swapBubbles}
            className="pointer-events-auto px-3.5 py-2 rounded-xl bg-black/80 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Swap Bubble (Spacebar)"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span>SWAP [SPACE]</span>
          </button>

          <div className="px-3.5 py-2 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Trophy className="w-4 h-4" />
            <span>BEST: {highScore}</span>
          </div>
        </div>
      </div>

      {/* Main Responsive Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseMove={handleMouseMove}
        onClick={shootBubble}
        onTouchStart={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const touch = e.touches[0];
          if (touch) {
            const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
            const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
            const s = stateRef.current;
            s.cannonAngle = Math.max(-Math.PI * 0.85, Math.min(-Math.PI * 0.15, Math.atan2(my - s.shooterY, mx - s.shooterX)));
            shootBubble();
          }
        }}
        onTouchMove={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const touch = e.touches[0];
          if (touch) {
            const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
            const my = (touch.clientY - rect.top) * (canvas.height / rect.height);
            const s = stateRef.current;
            s.cannonAngle = Math.max(-Math.PI * 0.85, Math.min(-Math.PI * 0.15, Math.atan2(my - s.shooterY, mx - s.shooterX)));
          }
        }}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* START MODAL */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-pink-400 mb-4 shadow-[0_0_25px_rgba(236,72,153,0.4)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wide">BUBBLE BLAST</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-md mt-2 font-mono leading-relaxed">
            Aim laser and launch bubbles. Match 3 or more of the same color to pop clusters and trigger avalanches!
          </p>

          <div className="mt-4 flex flex-wrap gap-2 justify-center text-[11px] font-mono text-slate-400">
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10">Mouse Aim & Click to Shoot</span>
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10">Space: Swap Bubble</span>
          </div>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-sm tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(236,72,153,0.7)] cursor-pointer transform hover:scale-105 transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START GAME</span>
          </button>
        </div>
      )}

      {/* GAME OVER / VICTORY MODAL */}
      {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <span className={`font-mono font-bold text-xs tracking-widest uppercase ${gameState === 'VICTORY' ? 'text-emerald-400' : 'text-rose-500'}`}>
            {gameState === 'VICTORY' ? 'BOARD CLEARED!' : 'BOARD OVERFLOW'}
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white mt-1">
            {gameState === 'VICTORY' ? 'VICTORY!' : 'GAME OVER'}
          </h2>

          <div className="my-5 p-5 rounded-2xl bg-white/5 border border-white/10 w-72 space-y-2.5 font-mono text-xs shadow-xl">
            <div className="flex justify-between text-slate-400">
              <span>FINAL SCORE</span>
              <span className="text-pink-400 font-bold text-sm">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>BUBBLES POPPED</span>
              <span className="text-white font-semibold">{stateRef.current.bubblesPopped}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-2 border-t border-white/5">
              <span>HIGH SCORE</span>
              <span className="text-amber-400 font-bold">{highScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(236,72,153,0.6)] cursor-pointer transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RETRY</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs cursor-pointer transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>EXIT GAME</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
