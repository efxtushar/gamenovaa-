import React, { useEffect, useRef, useState } from 'react';
import { ShipConfig, ShipId } from './types';
import { PLAYABLE_SHIPS, drawPlayerShip } from './ships';
import { ArrowLeft, Check, Gauge, Shield, Zap, Compass } from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface ShipSelectModalProps {
  currentShipId: ShipId;
  onSelectShip: (ship: ShipConfig) => void;
  onBack: () => void;
}

export const ShipSelectModal: React.FC<ShipSelectModalProps> = ({
  currentShipId,
  onSelectShip,
  onBack
}) => {
  const [selectedId, setSelectedId] = useState<ShipId>(currentShipId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeShip = PLAYABLE_SHIPS.find(s => s.id === selectedId) || PLAYABLE_SHIPS[0];

  // 3D-style animated rotating preview in Canvas
  useEffect(() => {
    let animId: number;
    let time = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderPreview = () => {
      time += 0.02;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Radial pedestal glow
      const pedGrad = ctx.createRadialGradient(w / 2, h / 2 + 30, 10, w / 2, h / 2 + 30, 140);
      pedGrad.addColorStop(0, `${activeShip.glowColor}25`);
      pedGrad.addColorStop(0.6, `${activeShip.primaryColor}10`);
      pedGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pedGrad;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 40, 130, 45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Holographic grid ring under ship
      ctx.strokeStyle = `${activeShip.accentColor}40`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 40, 110, 32, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Turntable banking angle
      const bankAngle = Math.sin(time) * 0.22;
      const hoverY = Math.sin(time * 1.5) * 6;

      drawPlayerShip(
        ctx,
        activeShip,
        w / 2,
        h / 2 - 10 + hoverY,
        bankAngle,
        activeShip.baseShield,
        activeShip.baseShield,
        0,
        time,
        false,
        2.2 // 2.2x scale for showcase preview
      );

      animId = requestAnimationFrame(renderPreview);
    };

    animId = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(animId);
  }, [activeShip]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-lg select-none font-mono">
      <div className="w-full max-w-4xl bg-[#030712]/95 border border-cyan-500/25 rounded-3xl p-5 sm:p-8 shadow-[0_0_50px_rgba(0,240,255,0.15)] flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div>
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
              FLEET HEADQUARTERS
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-wide uppercase mt-0.5">
              SPACECRAFT SELECTION
            </h2>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK
          </button>
        </div>

        {/* Ship Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          {PLAYABLE_SHIPS.map(ship => {
            const isSelected = ship.id === selectedId;
            return (
              <button
                key={ship.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedId(ship.id);
                }}
                className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                    : 'bg-slate-950/60 border-white/10 hover:border-white/25 hover:bg-slate-900/40 text-slate-400'
                }`}
              >
                {isSelected && (
                  <div
                    className="absolute top-0 right-0 w-12 h-12 pointer-events-none opacity-20"
                    style={{ background: `radial-gradient(circle, ${ship.glowColor}, transparent)` }}
                  />
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold tracking-wider text-slate-400">
                    {ship.class.split('•')[0].trim()}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <div className="text-xs sm:text-sm font-black text-white tracking-wide font-sans truncate">
                  {ship.name}
                </div>
              </button>
            );
          })}
        </div>

        {/* Center: Showcase Preview & Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center flex-1">
          {/* Left: 3D Hologram Preview Canvas */}
          <div className="relative w-full aspect-square max-w-[340px] mx-auto bg-slate-950/80 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-2 shadow-inner">
            <div className="absolute top-3 left-3 text-[9px] text-cyan-400 font-bold tracking-wider">
              ROTATING HOLO-VIEW • 360°
            </div>
            <div className="absolute top-3 right-3 text-[9px] text-slate-400 font-bold">
              MK-IV PROTOTYPE
            </div>

            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>

          {/* Right: Telemetry & Combat Statistics */}
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                {activeShip.class}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-sans tracking-wide uppercase mt-0.5">
                {activeShip.name}
              </h3>
              <p className="text-xs text-slate-300 font-sans mt-1.5 leading-relaxed">
                {activeShip.tagline}
              </p>
            </div>

            {/* Weapon & Capacity Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
                <div className="text-[9px] text-slate-400">PRIMARY ARMAMENT</div>
                <div className="font-bold text-cyan-300 mt-0.5">{activeShip.weaponName}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10">
                <div className="text-[9px] text-slate-400">MAGAZINE CAPACITY</div>
                <div className="font-bold text-white mt-0.5">{activeShip.ammoCapacity} ROUNDS</div>
              </div>
            </div>

            {/* 4 Core Stat Meters */}
            <div className="space-y-2.5 pt-1">
              {/* SPEED */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" /> SPEED
                  </span>
                  <span className="text-cyan-400 font-bold">{activeShip.speedRating}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-sm overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300"
                    style={{ width: `${activeShip.speedRating}%` }}
                  />
                </div>
              </div>

              {/* FIREPOWER */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Zap className="w-3.5 h-3.5 text-rose-400" /> FIREPOWER
                  </span>
                  <span className="text-rose-400 font-bold">{activeShip.firepowerRating}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-sm overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-amber-400 transition-all duration-300"
                    style={{ width: `${activeShip.firepowerRating}%` }}
                  />
                </div>
              </div>

              {/* SHIELD */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Shield className="w-3.5 h-3.5 text-purple-400" /> SHIELD INTEGRITY
                  </span>
                  <span className="text-purple-300 font-bold">{activeShip.shieldRating}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-sm overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 transition-all duration-300"
                    style={{ width: `${activeShip.shieldRating}%` }}
                  />
                </div>
              </div>

              {/* MANEUVERABILITY */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" /> MANEUVERABILITY
                  </span>
                  <span className="text-emerald-400 font-bold">{activeShip.maneuverabilityRating}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-sm overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300"
                    style={{ width: `${activeShip.maneuverabilityRating}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Selection Action Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onSelectShip(activeShip);
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(0,240,255,0.4)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <Check className="w-4 h-4 stroke-[3]" /> ASSIGN & PILOT {activeShip.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
