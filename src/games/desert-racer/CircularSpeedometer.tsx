import React from 'react';
import { Zap } from 'lucide-react';

interface CircularSpeedometerProps {
  speedKmh: number;
  topSpeed: number;
  gear: number;
  driftScore: number;
  isDrifting: boolean;
  currentDriftCombo: number;
  driftMultiplier: number;
}

export const CircularSpeedometer: React.FC<CircularSpeedometerProps> = ({
  speedKmh,
  topSpeed,
  gear,
  driftScore,
  isDrifting,
  currentDriftCombo,
  driftMultiplier
}) => {
  const maxDisplaySpeed = Math.max(220, topSpeed);
  const clampedSpeed = Math.max(0, Math.min(maxDisplaySpeed, speedKmh));
  const ratio = clampedSpeed / maxDisplaySpeed;

  // Arc math: 270 degree sweep from 135 deg to 405 deg (or -225 deg to 45 deg)
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
    <div className="flex flex-col items-center gap-1.5 pointer-events-auto select-none">
      {/* Circular Speedometer Gauge */}
      <div className="relative w-[136px] h-[136px] sm:w-[150px] sm:h-[150px] rounded-full bg-neutral-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl flex items-center justify-center">
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
            stroke={isRedlining ? '#ef4444' : '#f59e0b'}
            strokeWidth="7"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(135 75 75)"
            className="transition-all duration-75"
            style={{
              filter: isRedlining
                ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))'
                : 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))'
            }}
          />

          {/* Render Ticks (transformed with rotate 90 to match coordinate system) */}
          <g transform="rotate(90 75 75)">{ticks}</g>
        </svg>

        {/* Center Digital Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {/* Gear Indicator */}
          <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-white/10 text-amber-300 mb-0.5 border border-white/5">
            GEAR {gear}
          </span>

          {/* Large Speed Number */}
          <span className="font-display font-black text-4xl sm:text-5xl italic tracking-tighter text-white leading-none drop-shadow">
            {Math.round(clampedSpeed)}
          </span>

          {/* Small KM/H Label */}
          <span className="text-[10px] font-mono font-black tracking-widest text-amber-400 mt-0.5">
            KM/H
          </span>
        </div>
      </div>

      {/* DRIFT +250 COMPACT RACING PILL BELOW SPEEDOMETER */}
      <div
        className={`w-full px-3 py-1.5 rounded-xl border backdrop-blur-xl flex items-center justify-between transition-all shadow-xl ${
          isDrifting
            ? 'bg-amber-500/20 border-amber-400/80 shadow-amber-500/30'
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
            <span className="text-[9px] font-mono font-bold text-amber-300">
              x{driftMultiplier.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
