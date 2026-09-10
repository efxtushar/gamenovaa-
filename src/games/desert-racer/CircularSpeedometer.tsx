import React from 'react';
import { Zap, Flame } from 'lucide-react';

interface CircularSpeedometerProps {
  speedKmh: number;
  topSpeed: number;
  gear: number;
  driftScore: number;
  isDrifting: boolean;
  currentDriftCombo: number;
  driftMultiplier: number;
  boostRemaining?: number; // 0 to 100
  isBoosting?: boolean;
}

export const CircularSpeedometer: React.FC<CircularSpeedometerProps> = ({
  speedKmh,
  topSpeed,
  gear,
  driftScore,
  isDrifting,
  currentDriftCombo,
  driftMultiplier,
  boostRemaining = 100,
  isBoosting = false
}) => {
  const maxDisplaySpeed = Math.max(220, topSpeed);
  const clampedSpeed = Math.max(0, Math.min(maxDisplaySpeed, speedKmh));
  const ratio = clampedSpeed / maxDisplaySpeed;

  // Arc math: 270 degree sweep from 135 deg to 405 deg
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (270 / 360) * circumference;
  const strokeDashoffset = arcLength - ratio * arcLength;

  // Generate radial tick marks
  const ticks = [];
  const totalTicks = 28;
  for (let i = 0; i <= totalTicks; i++) {
    const tickRatio = i / totalTicks;
    const angleDeg = 135 + tickRatio * 270;
    const angleRad = (angleDeg * Math.PI) / 180;
    const isMajor = i % 4 === 0;
    const isRedline = tickRatio >= 0.82;

    const rOuter = 63;
    const rInner = isMajor ? 55 : 58;

    const x1 = 75 + Math.cos(angleRad) * rInner;
    const y1 = 75 + Math.sin(angleRad) * rInner;
    const x2 = 75 + Math.cos(angleRad) * rOuter;
    const y2 = 75 + Math.sin(angleRad) * rOuter;

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isRedline ? '#ef4444' : isMajor ? '#a1a1aa' : '#3f3f46'}
        strokeWidth={isMajor ? (isRedline ? 2.5 : 2) : 1}
        strokeLinecap="round"
      />
    );
  }

  const isRedlining = ratio >= 0.82;

  return (
    <div className="flex flex-col items-end gap-1.5 pointer-events-auto select-none">
      {/* Circular Speedometer Gauge */}
      <div className="relative w-[136px] h-[136px] sm:w-[148px] sm:h-[148px] rounded-full bg-neutral-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl flex items-center justify-center">
        <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
          {/* Background Track Arc */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="#1c1d22"
            strokeWidth="7"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(135 75 75)"
          />

          {/* Redline zone background marker */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth="7"
            strokeOpacity="0.25"
            strokeDasharray={`${arcLength * 0.18} ${circumference}`}
            strokeDashoffset={`-${arcLength * 0.82}`}
            strokeLinecap="round"
            transform="rotate(135 75 75)"
          />

          {/* Active Speed Arc */}
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke={isBoosting ? '#06b6d4' : isRedlining ? '#ef4444' : '#f59e0b'}
            strokeWidth="7"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(135 75 75)"
            className="transition-all duration-75"
            style={{
              filter: isBoosting
                ? 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.9))'
                : isRedlining
                ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                : 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))'
            }}
          />

          {/* Render Ticks */}
          <g transform="rotate(90 75 75)">{ticks}</g>
        </svg>

        {/* Center Digital Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {/* Gear Indicator */}
          <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-white/10 text-amber-300 mb-0.5 border border-white/5">
            GEAR {gear}
          </span>

          {/* Large Speed Number */}
          <span
            className={`font-display font-black text-4xl sm:text-5xl italic tracking-tighter leading-none drop-shadow transition-colors ${
              isBoosting ? 'text-cyan-300' : 'text-white'
            }`}
          >
            {Math.round(clampedSpeed)}
          </span>

          {/* Small KM/H Label */}
          <span
            className={`text-[10px] font-mono font-black tracking-widest mt-0.5 ${
              isBoosting ? 'text-cyan-400' : 'text-amber-400'
            }`}
          >
            KM/H
          </span>
        </div>
      </div>

      {/* NITRO / BOOST METER (Compact Horizontal Gauge near Speedometer) */}
      <div
        className={`w-full max-w-[148px] px-2.5 py-1 rounded-xl border backdrop-blur-xl flex flex-col gap-0.5 shadow-lg transition-all ${
          isBoosting
            ? 'bg-cyan-950/80 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            : 'bg-neutral-950/90 border-white/15'
        }`}
      >
        <div className="flex items-center justify-between text-[8px] font-mono font-black tracking-wider">
          <span className={`flex items-center gap-1 ${isBoosting ? 'text-cyan-300' : 'text-neutral-400'}`}>
            <Flame className={`w-2.5 h-2.5 ${isBoosting ? 'text-cyan-400 fill-cyan-400 animate-pulse' : 'text-amber-400'}`} />
            BOOST
          </span>
          <span className={`font-mono font-bold ${isBoosting ? 'text-cyan-300' : 'text-amber-400'}`}>
            {Math.round(boostRemaining)}%
          </span>
        </div>
        {/* Boost Level Bar */}
        <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden border border-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              isBoosting
                ? 'bg-gradient-to-r from-cyan-500 to-teal-300 shadow-[0_0_8px_#06b6d4]'
                : 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, boostRemaining))}%` }}
          />
        </div>
      </div>

      {/* DRIFT + SCORE & COMBO PILL */}
      <div
        className={`w-full max-w-[148px] px-2.5 py-1.5 rounded-xl border backdrop-blur-xl flex items-center justify-between transition-all shadow-xl ${
          isDrifting
            ? 'bg-amber-500/25 border-amber-400 shadow-amber-500/30'
            : 'bg-neutral-950/85 border-white/10'
        }`}
      >
        <div className="flex items-center gap-1 text-[9px] font-mono font-black uppercase tracking-wider text-neutral-400">
          <Zap className={`w-3 h-3 ${isDrifting ? 'text-amber-400 fill-amber-400 animate-bounce' : 'text-neutral-500'}`} />
          <span>DRIFT</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-display font-black text-sm sm:text-base italic text-amber-400 leading-none">
            {isDrifting ? `+${currentDriftCombo}` : `+${driftScore.toLocaleString()}`}
          </span>
          {isDrifting && (
            <span className="text-[8px] font-mono font-black text-black bg-amber-400 px-1 py-0.2 rounded shadow-sm">
              x{driftMultiplier.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
