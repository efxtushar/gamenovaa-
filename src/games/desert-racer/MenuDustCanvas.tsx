import React, { useRef, useEffect } from 'react';

export const MenuDustCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Subtle drifting dust motes & wind streaks
    interface DustMote {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      baseAlpha: number;
      color: string;
      phase: number;
    }

    const motes: DustMote[] = [];
    const numMotes = Math.min(60, Math.floor(window.innerWidth / 25));

    const colors = ['#fbbf24', '#f59e0b', '#fde68a', '#d97706', '#fef3c7'];

    for (let i = 0; i < numMotes; i++) {
      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0.8 + Math.random() * 2.2, // Left to right drift
        vy: (Math.random() - 0.4) * 0.6,
        size: 1.2 + Math.random() * 3.2,
        alpha: 0.15 + Math.random() * 0.45,
        baseAlpha: 0.15 + Math.random() * 0.45,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2
      });
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Subtle warm desert light flare on top-right
      const flare = ctx.createRadialGradient(
        width * 0.82,
        height * 0.22,
        0,
        width * 0.82,
        height * 0.22,
        width * 0.45
      );
      flare.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
      flare.addColorStop(0.5, 'rgba(245, 158, 11, 0.05)');
      flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = flare;
      ctx.fillRect(0, 0, width, height);

      // 2. Wind streaks
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.06)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 3; s++) {
        const sy = ((time * 40 + s * (height / 3)) % height);
        ctx.beginPath();
        ctx.moveTo(0, sy + Math.sin(time + s) * 15);
        ctx.bezierCurveTo(
          width * 0.3,
          sy + Math.cos(time) * 25,
          width * 0.7,
          sy - Math.sin(time) * 20,
          width,
          sy + Math.cos(time + 1) * 10
        );
        ctx.stroke();
      }

      // 3. Dust particles
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy + Math.sin(time + m.phase) * 0.4;

        if (m.x > width + 20) {
          m.x = -20;
          m.y = Math.random() * height;
        }
        if (m.y < -20) m.y = height + 20;
        if (m.y > height + 20) m.y = -20;

        ctx.fillStyle = m.color;
        ctx.globalAlpha = m.alpha * (0.8 + Math.sin(time * 2 + m.phase) * 0.2);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10 block"
    />
  );
};
