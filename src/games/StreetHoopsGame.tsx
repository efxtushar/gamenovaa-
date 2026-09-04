import React, { useRef, useEffect, useState, useCallback } from 'react';
import { sound } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, Trophy, Flame, Zap, Timer } from 'lucide-react';

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

interface ScoreBadge {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export const StreetHoopsGame: React.FC<GameProps> = ({ onGameOver, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('gamenova_hs_street-hoops') || '0', 10);
  });

  const stateRef = useRef({
    ball: {
      x: 130,
      y: 350,
      vx: 0,
      vy: 0,
      r: 16,
      rot: 0,
      isShot: false,
      scored: false
    },
    hoop: {
      x: 520,
      y: 190,
      rimLeft: 495,
      rimRight: 545,
      netSway: 0
    },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },
    particles: [] as Particle[],
    badges: [] as ScoreBadge[],
    score: 0,
    streak: 0,
    timeLeft: 60,
    timerInterval: null as NodeJS.Timeout | null
  });

  const resetBall = useCallback(() => {
    const s = stateRef.current;
    s.ball = {
      x: 110 + Math.random() * 90,
      y: 340 + Math.random() * 35,
      vx: 0,
      vy: 0,
      r: 16,
      rot: 0,
      isShot: false,
      scored: false
    };
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    sound.playGameOver();
    if (stateRef.current.timerInterval) clearInterval(stateRef.current.timerInterval);
    setGameState('GAMEOVER');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('gamenova_hs_street-hoops', finalScore.toString());
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
    if (onGameOver) onGameOver(finalScore);
  }, [highScore, onGameOver]);

  const startGame = useCallback(() => {
    sound.playClick();
    if (stateRef.current.timerInterval) clearInterval(stateRef.current.timerInterval);

    stateRef.current = {
      ball: {
        x: 130,
        y: 350,
        vx: 0,
        vy: 0,
        r: 16,
        rot: 0,
        isShot: false,
        scored: false
      },
      hoop: {
        x: 520,
        y: 190,
        rimLeft: 495,
        rimRight: 545,
        netSway: 0
      },
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 },
      particles: [],
      badges: [],
      score: 0,
      streak: 0,
      timeLeft: 60,
      timerInterval: null
    };

    setScore(0);
    setStreak(0);
    setTimeLeft(60);
    setGameState('PLAYING');

    stateRef.current.timerInterval = setInterval(() => {
      stateRef.current.timeLeft--;
      setTimeLeft(stateRef.current.timeLeft);
      if (stateRef.current.timeLeft <= 0) {
        if (stateRef.current.timerInterval) clearInterval(stateRef.current.timerInterval);
        handleGameOver(stateRef.current.score);
      }
    }, 1000);
  }, [handleGameOver]);

  // Drag aiming
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (stateRef.current.ball.isShot || gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (Math.hypot(mx - stateRef.current.ball.x, my - stateRef.current.ball.y) < 55) {
      stateRef.current.isDragging = true;
      stateRef.current.dragStart = { x: mx, y: my };
      stateRef.current.dragCurrent = { x: mx, y: my };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    stateRef.current.dragCurrent = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleMouseUp = () => {
    if (!stateRef.current.isDragging) return;
    const s = stateRef.current;
    s.isDragging = false;

    const dx = s.dragStart.x - s.dragCurrent.x;
    const dy = s.dragStart.y - s.dragCurrent.y;

    if (Math.hypot(dx, dy) > 12) {
      sound.playJump();
      s.ball.vx = Math.min(22, Math.max(6, dx * 0.16));
      s.ball.vy = Math.min(-7, Math.max(-23, dy * 0.16));
      s.ball.isShot = true;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (stateRef.current.ball.isShot || gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const mx = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const my = (touch.clientY - rect.top) * (canvas.height / rect.height);

    if (Math.hypot(mx - stateRef.current.ball.x, my - stateRef.current.ball.y) < 70) {
      stateRef.current.isDragging = true;
      stateRef.current.dragStart = { x: mx, y: my };
      stateRef.current.dragCurrent = { x: mx, y: my };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!stateRef.current.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    stateRef.current.dragCurrent = {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  useEffect(() => {
    return () => {
      if (stateRef.current.timerInterval) {
        clearInterval(stateRef.current.timerInterval);
      }
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
      const b = s.ball;
      const h = s.hoop;
      const cw = canvas.width;
      const ch = canvas.height;

      // Net sway decay
      if (Math.abs(h.netSway) > 0.1) h.netSway *= 0.94;

      if (b.isShot) {
        b.vy += 0.58; // gravity
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vx * 0.05;

        // Bounce Floor
        if (b.y > ch - 40) {
          b.y = ch - 40;
          b.vy *= -0.65;
          b.vx *= 0.8;
          sound.playClick();

          // Reset after floor rolls
          if (Math.abs(b.vy) < 1.2) {
            setTimeout(resetBall, 400);
          }
        }

        // Backboard Collision (x=550, y in [100, 210])
        if (b.x + b.r >= 548 && b.x - b.r <= 555 && b.y >= 100 && b.y <= 210) {
          b.vx = -Math.abs(b.vx) * 0.65;
          sound.playHit();
        }

        // Rim Left & Right Collisions
        const distRimL = Math.hypot(b.x - h.rimLeft, b.y - h.y);
        const distRimR = Math.hypot(b.x - h.rimRight, b.y - h.y);

        if (distRimL < b.r + 4) {
          b.vx = Math.abs(b.vx) * 0.6;
          b.vy = -Math.abs(b.vy) * 0.5;
          sound.playHit();
        }
        if (distRimR < b.r + 4) {
          b.vx = -Math.abs(b.vx) * 0.6;
          b.vy = -Math.abs(b.vy) * 0.5;
          sound.playHit();
        }

        // Goal Score Check (Passing downward through hoop center between [rimLeft, rimRight])
        if (
          !b.scored &&
          b.vy > 0 &&
          b.x > h.rimLeft + 6 &&
          b.x < h.rimRight - 6 &&
          b.y >= h.y &&
          b.y <= h.y + 16
        ) {
          b.scored = true;
          sound.playPowerUp();
          h.netSway = 14;

          s.streak++;
          setStreak(s.streak);

          const isSwish = distRimL > b.r + 8 && distRimR > b.r + 8;
          const points = (isSwish ? 300 : 200) * Math.min(4, s.streak);
          s.score += points;
          setScore(s.score);

          // Confetti & badge
          confetti({ particleCount: 35, spread: 60 });
          s.badges.push({
            x: h.x,
            y: h.y - 30,
            text: isSwish ? `SWISH! +${points}` : `BUCKET! +${points}`,
            color: isSwish ? '#38bdf8' : '#facc15',
            life: 40
          });

          // Basket particles
          for (let k = 0; k < 12; k++) {
            s.particles.push({
              x: h.x,
              y: h.y + 10,
              vx: (Math.random() - 0.5) * 6,
              vy: Math.random() * 4,
              color: '#f97316',
              size: 3.5,
              life: 20
            });
          }

          setTimeout(resetBall, 600);
        }

        // Out of bounds reset
        if (b.x > cw + 60 || b.x < -60) {
          resetBall();
        }
      }

      // Update Badges
      for (let i = s.badges.length - 1; i >= 0; i--) {
        const bg = s.badges[i];
        bg.y -= 0.8;
        bg.life--;
        if (bg.life <= 0) s.badges.splice(i, 1);
      }

      // Update Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const pt = s.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) s.particles.splice(i, 1);
      }

      // -------------------------------------------------------------
      // RENDER
      // -------------------------------------------------------------
      // Sunset Urban City Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, ch);
      skyGrad.addColorStop(0, '#18181b');
      skyGrad.addColorStop(0.5, '#7c2d12');
      skyGrad.addColorStop(0.8, '#c2410c');
      skyGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, cw, ch);

      // Urban Graffiti Brick Wall
      ctx.fillStyle = '#27272a';
      ctx.fillRect(0, 240, cw, ch - 240);

      // Asphalt Court Floor
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, ch - 40, cw, 40);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, ch - 40, cw, 40);

      // Backboard Pole & Board
      ctx.fillStyle = '#475569';
      ctx.fillRect(560, 100, 10, ch - 140);

      // Glass Backboard
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(548, 100, 8, 110);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(548, 130, 8, 50);

      // Steel Rim
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(h.rimLeft, h.y);
      ctx.lineTo(h.rimRight, h.y);
      ctx.stroke();

      // Net with ripple physics
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(h.rimLeft, h.y);
      ctx.quadraticCurveTo(h.x + h.netSway, h.y + 40, h.rimLeft + 12, h.y + 45);
      ctx.lineTo(h.rimRight - 12, h.y + 45);
      ctx.quadraticCurveTo(h.x + h.netSway, h.y + 40, h.rimRight, h.y);
      ctx.stroke();

      // Aiming Trajectory Dots
      if (s.isDragging) {
        const dx = s.dragStart.x - s.dragCurrent.x;
        const dy = s.dragStart.y - s.dragCurrent.y;
        const testVx = Math.min(22, Math.max(6, dx * 0.16));
        const testVy = Math.min(-7, Math.max(-23, dy * 0.16));

        let simX = b.x;
        let simY = b.y;
        let simVy = testVy;

        ctx.fillStyle = '#facc15';
        for (let i = 0; i < 22; i++) {
          simX += testVx;
          simVy += 0.58;
          simY += simVy;

          ctx.beginPath();
          ctx.arc(simX, simY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw Basketball
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);

      // Ball body
      ctx.fillStyle = '#ea580c';
      ctx.shadowColor = s.streak >= 3 ? '#f59e0b' : 'transparent';
      ctx.shadowBlur = s.streak >= 3 ? 15 : 0;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ball Ribs
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-b.r, 0);
      ctx.lineTo(b.r, 0);
      ctx.moveTo(0, -b.r);
      ctx.lineTo(0, b.r);
      ctx.stroke();

      ctx.restore();

      // Draw Score Badges
      s.badges.forEach(bg => {
        ctx.fillStyle = bg.color;
        ctx.shadowColor = bg.color;
        ctx.shadowBlur = 12;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bg.text, bg.x, bg.y);
        ctx.shadowBlur = 0;
      });

      // Draw Particles
      s.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, handleGameOver, resetBall]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#101014] overflow-hidden select-none">
      {/* TOP HUD */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-amber-500/40 backdrop-blur-md">
            <span className="text-[9px] font-mono text-amber-400 block uppercase">SCORE</span>
            <span className="text-xl font-orbitron font-bold text-white">{score}</span>
          </div>

          {streak > 1 && (
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/40 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono font-bold text-orange-400 animate-pulse">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>STREAK x{streak}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Shot Clock */}
          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-rose-500/40 backdrop-blur-md flex items-center gap-2">
            <Timer className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-orbitron font-bold text-rose-300">{timeLeft}s</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-black/80 border border-white/10 backdrop-blur-md flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span>BEST: {highScore}</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={540}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
      />

      {/* START MODAL */}
      {gameState === 'START' && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            <Flame className="w-8 h-8" />
          </div>
          <h2 className="font-display font-black text-3xl text-white tracking-wide">STREET HOOPS</h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-sm mt-2 font-mono leading-relaxed">
            Click and drag the ball backwards to aim arc trajectory. Release to shoot! Chain swish shots to activate ON FIRE mode!
          </p>

          <button
            onClick={startGame}
            className="mt-6 px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-orbitron font-black text-sm tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.7)] cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>TAKE THE COURT</span>
          </button>
        </div>
      )}

      {/* GAMEOVER MODAL */}
      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <span className="text-rose-500 font-orbitron font-bold text-xs tracking-widest uppercase">
            BUZZER SOUNDED
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white mt-1">TIME IS UP!</h2>

          <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/10 w-64 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>FINAL POINTS</span>
              <span className="text-amber-400 font-bold font-orbitron text-sm">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-2 border-t border-white/10">
              <span>RECORD POINTS</span>
              <span className="text-yellow-300 font-bold font-orbitron">{highScore}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-orbitron font-black text-xs tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>SHOOT AGAIN</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-orbitron font-bold text-xs cursor-pointer"
              >
                <span>EXIT</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
