import React, { useRef, useEffect, useState } from 'react';
import { CarModel } from './types';
import { RotateCcw, Lightbulb } from 'lucide-react';

interface GarageShowcaseProps {
  car: CarModel;
  onColorChange?: (color: string) => void;
}

export const GarageShowcaseCanvas: React.FC<GarageShowcaseProps> = ({ car, onColorChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(-0.4);
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);

  // Available custom paint liveries
  const PAINT_LIVERIES = [
    { name: 'Desert Amber', hex: '#f59e0b' },
    { name: 'Cyan Spark', hex: '#06b6d4' },
    { name: 'Crimson Red', hex: '#ef4444' },
    { name: 'Titanium Violet', hex: '#8b5cf6' },
    { name: 'Emerald Carbon', hex: '#10b981' },
    { name: 'Stealth Shadow', hex: '#1e293b' }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.02;

      if (autoRotate && !isDraggingRef.current) {
        setRotation(prev => prev + 0.005);
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const width = rect.width;
      const height = rect.height;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height * 0.58;

      // 1. Showroom Circular Lighting Podium
      const podiumRadiusX = Math.min(width * 0.38, 240);
      const podiumRadiusY = podiumRadiusX * 0.32;

      // Outer radial glow
      const podiumGlow = ctx.createRadialGradient(
        centerX,
        centerY + 10,
        podiumRadiusX * 0.2,
        centerX,
        centerY + 10,
        podiumRadiusX * 1.4
      );
      podiumGlow.addColorStop(0, `${car.accentColor}25`);
      podiumGlow.addColorStop(0.6, 'rgba(0,0,0,0.4)');
      podiumGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = podiumGlow;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 12, podiumRadiusX * 1.35, podiumRadiusY * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Podium Rim Pedestal
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 10, podiumRadiusX, podiumRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Edge Ring on Podium
      ctx.strokeStyle = car.accentColor;
      ctx.shadowColor = car.accentColor;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 8, podiumRadiusX * 0.94, podiumRadiusY * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2. Car Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, podiumRadiusX * 0.65, podiumRadiusY * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. 3D Car Model Projection
      ctx.save();
      ctx.translate(centerX, centerY - 15);

      // Angle transformation
      const angle = rotation;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Underglow
      ctx.shadowColor = car.accentColor;
      ctx.shadowBlur = 25;
      ctx.fillStyle = car.accentColor;
      ctx.globalAlpha = 0.35 + Math.sin(time * 3) * 0.1;
      ctx.beginPath();
      ctx.ellipse(0, 18, 90, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      // Headlight Beams (if headlights on)
      if (headlightsOn) {
        ctx.save();
        const beamDir = sinA;
        if (beamDir > -0.3) {
          const beamGrad = ctx.createRadialGradient(cosA * 65, sinA * 35, 10, cosA * 140, sinA * 80 + 30, 90);
          beamGrad.addColorStop(0, 'rgba(255, 245, 180, 0.55)');
          beamGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.15)');
          beamGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(cosA * 45 - 20, sinA * 20);
          ctx.lineTo(cosA * 150 - 55, sinA * 70 + 40);
          ctx.lineTo(cosA * 150 + 55, sinA * 70 + 40);
          ctx.lineTo(cosA * 45 + 20, sinA * 20);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw 3D Wheels
      const wheelOffsets = [
        { x: -68, y: -26, r: 20 },
        { x: 68, y: -26, r: 20 },
        { x: -74, y: 26, r: 24 },
        { x: 74, y: 26, r: 24 }
      ];

      wheelOffsets.forEach(w => {
        // Rotate 2D coordinates in 3D ground plane
        const wx = w.x * cosA - w.y * sinA;
        const wy = (w.x * sinA + w.y * cosA) * 0.35;
        const wSize = w.r;

        // Tire
        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(wx, wy + 4, wSize * 0.55, wSize * 0.95, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rim
        ctx.fillStyle = car.accentColor;
        ctx.beginPath();
        ctx.ellipse(wx, wy + 4, wSize * 0.28, wSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Car Main Body Chassis
      const bodyWidth = 145;
      const bodyHeight = 56;

      ctx.save();
      ctx.rotate(sinA * 0.08); // subtle dynamic roll

      // Lower Armor Skirt
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-bodyWidth * 0.55, -bodyHeight * 0.15, bodyWidth * 1.1, bodyHeight * 0.45, [6, 6, 12, 12]);
      ctx.fill();

      // Main Painted Body Shell
      const bodyGrad = ctx.createLinearGradient(
        -bodyWidth * 0.5,
        -bodyHeight * 0.8,
        bodyWidth * 0.5,
        bodyHeight * 0.4
      );
      bodyGrad.addColorStop(0, car.accentColor);
      bodyGrad.addColorStop(0.4, car.color);
      bodyGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(-bodyWidth * 0.52, 6);
      ctx.lineTo(-bodyWidth * 0.45, -bodyHeight * 0.45);
      ctx.lineTo(-bodyWidth * 0.22, -bodyHeight * 0.85);
      ctx.lineTo(bodyWidth * 0.2, -bodyHeight * 0.85);
      ctx.lineTo(bodyWidth * 0.48, -bodyHeight * 0.4);
      ctx.lineTo(bodyWidth * 0.54, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Carbon-Fiber Roof & Tinted Windshield Glass
      const glassGrad = ctx.createLinearGradient(0, -bodyHeight * 0.85, 0, -bodyHeight * 0.35);
      glassGrad.addColorStop(0, '#0f172a');
      glassGrad.addColorStop(0.7, '#1e293b');
      glassGrad.addColorStop(1, '#38bdf844');
      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.moveTo(-bodyWidth * 0.2, -bodyHeight * 0.82);
      ctx.lineTo(-bodyWidth * 0.14, -bodyHeight * 0.42);
      ctx.lineTo(bodyWidth * 0.16, -bodyHeight * 0.42);
      ctx.lineTo(bodyWidth * 0.18, -bodyHeight * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();

      // Racing Livery Center Stripe
      ctx.fillStyle = car.stripeColor;
      ctx.fillRect(-10, -bodyHeight * 0.85, 20, bodyHeight * 0.95);

      // Aerodynamic Tubular Roll Cage / Spoilers
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-bodyWidth * 0.4, -bodyHeight * 0.5);
      ctx.lineTo(-bodyWidth * 0.24, -bodyHeight * 0.88);
      ctx.lineTo(bodyWidth * 0.2, -bodyHeight * 0.88);
      ctx.lineTo(bodyWidth * 0.38, -bodyHeight * 0.5);
      ctx.stroke();

      // LED Headlights / Taillights
      if (headlightsOn) {
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 10;
        ctx.fillRect(-bodyWidth * 0.48, -bodyHeight * 0.25, 14, 8);
        ctx.fillRect(bodyWidth * 0.48 - 14, -bodyHeight * 0.25, 14, 8);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      ctx.restore();

      // Floating dust / showroom motes
      ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
      for (let p = 0; p < 12; p++) {
        const px = (centerX - 160 + (p * 32 + time * 12) % 320);
        const py = (centerY - 80 + Math.sin(time + p) * 45);
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [car, rotation, headlightsOn, autoRotate]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    setAutoRotate(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    setRotation(prev => prev + deltaX * 0.015);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none">
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
        title="Drag to rotate 360°"
      />

      {/* Interactive Controls Overlay at top/bottom of preview */}
      <div className="absolute top-3 inset-x-4 flex items-center justify-between pointer-events-auto">
        <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold text-amber-400 flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>3D SHOWROOM • DRAG TO ROTATE</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setHeadlightsOn(!headlightsOn)}
            className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
              headlightsOn
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-black/60 border-white/10 text-white/50 hover:text-white'
            }`}
            title="Toggle Headlights"
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
              autoRotate
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-black/60 border-white/10 text-white/50 hover:text-white'
            }`}
            title="Toggle Turntable Rotation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paint Livery Swatches at bottom of preview */}
      <div className="absolute bottom-3 inset-x-4 flex items-center justify-center gap-2 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-xl">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/60">LIVERY</span>
          <div className="flex items-center gap-1.5">
            {PAINT_LIVERIES.map(paint => (
              <button
                key={paint.hex}
                onClick={() => {
                  if (onColorChange) onColorChange(paint.hex);
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform transform hover:scale-110 cursor-pointer ${
                  car.color.toLowerCase() === paint.hex.toLowerCase()
                    ? 'border-white scale-110 shadow-md shadow-white/30'
                    : 'border-transparent opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: paint.hex }}
                title={paint.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
