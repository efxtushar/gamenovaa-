import React, { useMemo, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ArrowLeft,
  Flame,
  Zap,
  ChevronLeft,
  ChevronRight,
  Disc,
  Gauge,
  Compass,
  Trophy,
  X,
  Flag
} from 'lucide-react';
import { ActiveEventState, RaceEvent, SpeedTrap, DriftZone } from './types';
import { ROADS, OPEN_AREAS, WORLD_WIDTH, WORLD_HEIGHT, DISTRICTS } from './worldMap';
import { RACE_EVENTS } from './eventsSystem';

export interface OpenWorldHudProps {
  // Navigation & Mode
  districtName: string;
  activeEvent: ActiveEventState | null;
  nearbyEvent: RaceEvent | null;
  onStartNearbyEvent: () => void;
  onAbortEvent: () => void;
  onExitGame?: () => void;

  // Telemetry & Driving
  playerX: number;
  playerY: number;
  playerAngle: number;
  speedKmh: number;
  nitroPercent: number;
  isNitroActive: boolean;
  isDrifting: boolean;
  driftScore: number;
  driftMultiplier: number;
  airtimeSecs: number;
  score: number;
  highScore: number;

  // Notifications
  activityBanner: { text: string; subText?: string; color?: string } | null;

  // Settings & System
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isPaused: boolean;
  onTogglePause: () => void;

  // Mobile / Touch controls
  isTouchDevice: boolean;
  forceTouchControls: boolean;
  onSteerLeftStart: () => void;
  onSteerLeftEnd: () => void;
  onSteerRightStart: () => void;
  onSteerRightEnd: () => void;
  onGasStart: () => void;
  onGasEnd: () => void;
  onBrakeStart: () => void;
  onBrakeEnd: () => void;
  onDriftStart: () => void;
  onDriftEnd: () => void;
  onBoostStart: () => void;
  onBoostEnd: () => void;
}

export const OpenWorldHud: React.FC<OpenWorldHudProps> = ({
  districtName,
  activeEvent,
  nearbyEvent,
  onStartNearbyEvent,
  onAbortEvent,
  onExitGame,
  playerX,
  playerY,
  playerAngle,
  speedKmh,
  nitroPercent,
  isNitroActive,
  isDrifting,
  driftScore,
  driftMultiplier,
  airtimeSecs,
  score,
  highScore,
  activityBanner,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  isPaused,
  onTogglePause,
  isTouchDevice,
  forceTouchControls,
  onSteerLeftStart,
  onSteerLeftEnd,
  onSteerRightStart,
  onSteerRightEnd,
  onGasStart,
  onGasEnd,
  onBrakeStart,
  onBrakeEnd,
  onDriftStart,
  onDriftEnd,
  onBoostStart,
  onBoostEnd
}) => {
  // Speedometer arc calculations (max display 280 km/h)
  const arcDashOffset = useMemo(() => {
    const maxSpeed = 280;
    const ratio = Math.min(1, Math.max(0, speedKmh / maxSpeed));
    return 188 - ratio * 188;
  }, [speedKmh]);

  // Minimap coordinates transformation
  const mapW = 100;
  const mapH = 86;
  const playerMapX = (playerX / WORLD_WIDTH) * mapW;
  const playerMapY = (playerY / WORLD_HEIGHT) * mapH;

  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between overflow-hidden z-20 font-sans">
      {/* -------------------------------------------------------------
          TOP BAR: MODE / EVENT INFO, DISTRICT, SCORE, SYSTEM BUTTONS
          ------------------------------------------------------------- */}
      <div className="w-full px-3 sm:px-6 pt-3 sm:pt-4 flex items-start justify-between gap-2 pointer-events-none">
        {/* TOP LEFT: DISTRICT & MODE BADGE */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onExitGame && (
            <button
              id="neon-hud-back-btn"
              type="button"
              onClick={onExitGame}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-cyan-400/50 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXIT</span>
            </button>
          )}

          {activeEvent ? (
            // ACTIVE EVENT HEADER
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-cyan-950/80 border border-cyan-400/60 backdrop-blur-md shadow-lg shadow-cyan-950/40 animate-pulse">
              <Flag className="w-4 h-4 text-cyan-400 fill-current" />
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-cyan-300 font-bold uppercase tracking-wider">
                  {activeEvent.event.name}
                </span>
                <span className="font-mono text-xs font-black text-white">
                  CP {activeEvent.currentCheckpointIndex + 1} / {activeEvent.event.checkpoints.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onAbortEvent}
                className="ml-2 px-2 py-0.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 border border-rose-400/40 text-[9px] font-mono font-bold cursor-pointer"
                title="Abort Event"
              >
                EXIT
              </button>
            </div>
          ) : (
            // FREE ROAM DISTRICT BADGE
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 border border-white/15 backdrop-blur-md shadow-md">
              <Compass className="w-4 h-4 text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase leading-none">
                  FREE ROAM
                </span>
                <span className="font-mono text-xs font-black text-slate-100 tracking-wide leading-tight">
                  {districtName}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* TOP CENTER: NOTIFICATION BANNER (Speed Traps, Drift Zone multiplier, etc.) */}
        <div className="flex-1 flex justify-center px-2 pointer-events-none">
          {activityBanner && (
            <div
              className={`px-4 py-1.5 rounded-2xl bg-slate-950/90 border shadow-2xl backdrop-blur-md flex flex-col items-center animate-bounce ${
                activityBanner.color === 'amber'
                  ? 'border-amber-400 shadow-amber-500/30 text-amber-300'
                  : 'border-cyan-400 shadow-cyan-500/30 text-cyan-300'
              }`}
            >
              <span className="font-mono text-xs sm:text-sm font-black tracking-wider uppercase">
                {activityBanner.text}
              </span>
              {activityBanner.subText && (
                <span className="font-mono text-[9px] text-white/90">
                  {activityBanner.subText}
                </span>
              )}
            </div>
          )}
        </div>

        {/* TOP RIGHT: HIGH SCORE, SOUND, FULLSCREEN & PAUSE */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Score Counter */}
          <div className="hidden sm:flex flex-col items-end px-3 py-1 rounded-xl bg-slate-950/80 border border-white/15 backdrop-blur-md shadow-md">
            <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase leading-none">
              SCORE
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-cyan-300 tabular-nums leading-tight">
              {score.toLocaleString()}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            id="neon-hud-audio-btn"
            type="button"
            onClick={onToggleSound}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-cyan-400/50 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="neon-hud-fullscreen-btn"
            type="button"
            onClick={onToggleFullscreen}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-cyan-400/50 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Pause Toggle */}
          <button
            id="neon-hud-pause-btn"
            type="button"
            onClick={onTogglePause}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 hover:border-cyan-400/50 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            title="Pause (Esc / P)"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-cyan-400 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------
          MIDDLE SECTION: DRIFT / AIRTIME POPUP INDICATORS
          ------------------------------------------------------------- */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {isDrifting && driftScore > 0 && (
          <div className="px-5 py-2 rounded-2xl bg-slate-950/85 border border-cyan-400 shadow-[0_0_24px_rgba(0,245,255,0.4)] backdrop-blur-md animate-bounce duration-150 flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-cyan-400 fill-current animate-pulse" />
              <span className="font-mono text-xs font-black tracking-widest text-cyan-300">
                DRIFT SCORE
              </span>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider drop-shadow-[0_0_10px_rgba(0,245,255,0.8)]">
              +{driftScore.toLocaleString()}
            </div>
            {driftMultiplier > 1 && (
              <div className="mt-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-mono text-[10px] font-black tracking-wider shadow-sm">
                COMBO {driftMultiplier}X
              </div>
            )}
          </div>
        )}

        {airtimeSecs > 0 && !isDrifting && (
          <div className="px-4 py-1.5 rounded-xl bg-slate-950/85 border border-amber-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] backdrop-blur-md flex flex-col items-center">
            <span className="font-mono text-xs sm:text-sm font-black text-amber-300 tracking-wider">
              ▲ AIRTIME STUNT ▲
            </span>
            <span className="font-mono text-[10px] text-white">
              +{Math.floor(airtimeSecs * 600)} PTS
            </span>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          BOTTOM BAR: REAL OPEN-WORLD MINIMAP & SPEEDOMETER CLUSTER
          ------------------------------------------------------------- */}
      <div className="w-full px-3 sm:px-6 pb-4 pt-2 flex items-end justify-between gap-3 pointer-events-none">
        {/* BOTTOM LEFT: REAL VECTOR OPEN-WORLD MINIMAP */}
        <div className="flex flex-col items-start gap-1 pointer-events-auto">
          <div className="relative w-28 h-24 sm:w-34 sm:h-28 rounded-2xl bg-slate-950/90 border border-cyan-500/35 backdrop-blur-md shadow-[0_6px_28px_rgba(0,0,0,0.7)] p-1.5 overflow-hidden flex items-center justify-center">
            {/* SVG REAL CITY ROAD MAP */}
            <svg className="w-full h-full" viewBox={`0 0 ${mapW} ${mapH}`}>
              {/* Ocean Blue Coastline on the West */}
              <rect x="0" y="0" width="10" height={mapH} fill="rgba(8, 47, 73, 0.6)" />

              {/* Drift Arena Skidpad */}
              <rect
                x={(1350 / WORLD_WIDTH) * mapW}
                y={(2650 / WORLD_HEIGHT) * mapH}
                width={(600 / WORLD_WIDTH) * mapW}
                height={(480 / WORLD_HEIGHT) * mapH}
                fill="rgba(168, 85, 247, 0.25)"
                stroke="#a855f7"
                strokeWidth="0.5"
              />

              {/* All Connected City Roads */}
              {ROADS.map((r) => {
                const x1 = (r.x1 / WORLD_WIDTH) * mapW;
                const y1 = (r.y1 / WORLD_HEIGHT) * mapH;
                const x2 = (r.x2 / WORLD_WIDTH) * mapW;
                const y2 = (r.y2 / WORLD_HEIGHT) * mapH;
                const isHwy = r.type === 'highway';
                return (
                  <line
                    key={r.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isHwy ? '#facc15' : '#38bdf8'}
                    strokeWidth={isHwy ? '3' : '2'}
                    strokeOpacity={isHwy ? '0.85' : '0.65'}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Race Events Locations (Flags/Rings) */}
              {RACE_EVENTS.map((ev) => {
                const ex = (ev.startPos.x / WORLD_WIDTH) * mapW;
                const ey = (ev.startPos.y / WORLD_HEIGHT) * mapH;
                return (
                  <circle
                    key={ev.id}
                    cx={ex}
                    cy={ey}
                    r="2.2"
                    fill={ev.color}
                    stroke="#ffffff"
                    strokeWidth="0.6"
                  />
                );
              })}

              {/* Active Event Checkpoints Path */}
              {activeEvent && (
                <polyline
                  points={activeEvent.event.checkpoints
                    .map((c) => `${(c.x / WORLD_WIDTH) * mapW},${(c.y / WORLD_HEIGHT) * mapH}`)
                    .join(' ')}
                  fill="none"
                  stroke="#00f5ff"
                  strokeWidth="1.2"
                  strokeDasharray="2 1.5"
                />
              )}

              {/* Player Icon: Cyan Triangle with True Heading */}
              <g
                transform={`translate(${playerMapX}, ${playerMapY}) rotate(${
                  playerAngle * (180 / Math.PI)
                })`}
              >
                <polygon points="0,-4 3,3 0,1.5 -3,3" fill="#00f5ff" stroke="#ffffff" strokeWidth="0.8" />
              </g>
            </svg>

            {/* Minimap Label */}
            <div className="absolute top-1 left-1.5 flex items-center gap-1 font-mono text-[7px] font-bold text-slate-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              GPS
            </div>
          </div>
        </div>

        {/* BOTTOM RIGHT: SPEEDOMETER, NITRO GAUGE & ACTION BUTTONS */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <div className="relative p-2.5 sm:p-3 rounded-3xl bg-slate-950/85 border border-white/15 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center gap-3">
            {/* Speed Dial SVG */}
            <div className="relative flex items-center justify-center w-18 h-18 sm:w-22 sm:h-22">
              <svg className="w-full h-full -rotate-[120deg]" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="5"
                  strokeDasharray="188 282"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="url(#speedoGradientOpen)"
                  strokeWidth="5.5"
                  strokeDasharray="188 282"
                  strokeDashoffset={arcDashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-100"
                />
                <defs>
                  <linearGradient id="speedoGradientOpen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f5ff" />
                    <stop offset="60%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Speed Digital Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-xl sm:text-2xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow-[0_0_8px_rgba(0,245,255,0.6)]">
                  {speedKmh}
                </span>
                <span className="font-mono text-[8px] sm:text-[9px] font-black text-cyan-400 tracking-wider mt-0.5 leading-none">
                  KM/H
                </span>
              </div>
            </div>

            {/* Quick Interactive Drift & Boost Buttons + Nitro Bar */}
            <div className="flex flex-col gap-1.5">
              {/* Nitro Boost Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-300">
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-cyan-400" /> NITRO
                  </span>
                  <span>{Math.floor(nitroPercent)}%</span>
                </div>
                <div className="w-24 sm:w-28 h-2 rounded-full bg-slate-900 border border-white/15 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      isNitroActive
                        ? 'bg-gradient-to-r from-cyan-400 to-white animate-pulse'
                        : 'bg-gradient-to-r from-cyan-500 to-fuchsia-500'
                    }`}
                    style={{ width: `${Math.max(0, nitroPercent)}%` }}
                  />
                </div>
              </div>

              {/* Drift & Boost Action Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onMouseDown={onDriftStart}
                  onMouseUp={onDriftEnd}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onDriftStart();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onDriftEnd();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 active:bg-purple-600/70 border border-purple-400/50 text-purple-200 font-mono text-[9px] font-black tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer select-none"
                >
                  <Flame className="w-3 h-3 text-purple-400 fill-current" />
                  <span>DRIFT</span>
                </button>

                <button
                  type="button"
                  onMouseDown={onBoostStart}
                  onMouseUp={onBoostEnd}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onBoostStart();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    onBoostEnd();
                  }}
                  className={`px-2.5 py-1.5 rounded-xl font-mono text-[9px] font-black tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer select-none ${
                    isNitroActive
                      ? 'bg-cyan-500 border border-white text-slate-950 shadow-[0_0_12px_#00f5ff]'
                      : 'bg-cyan-600/30 hover:bg-cyan-600/50 active:bg-cyan-600/70 border border-cyan-400/50 text-cyan-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-cyan-400 fill-current" />
                  <span>BOOST</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          MOBILE GLASS TOUCH CONTROLS (Steering, Gas, Brake, Action)
          ------------------------------------------------------------- */}
      {(isTouchDevice || forceTouchControls) && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none pb-3 px-3 sm:px-6 flex items-end justify-between z-30">
          {/* Bottom Left Steering: LEFT & RIGHT */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              id="mobile-steer-left"
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                onSteerLeftStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onSteerLeftEnd();
              }}
              className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-slate-950/60 border border-cyan-500/40 active:bg-cyan-500/30 active:border-cyan-400 active:scale-95 flex items-center justify-center text-cyan-300 backdrop-blur-md shadow-xl select-none transition-transform"
              aria-label="Steer Left"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>

            <button
              id="mobile-steer-right"
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                onSteerRightStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onSteerRightEnd();
              }}
              className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-slate-950/60 border border-cyan-500/40 active:bg-cyan-500/30 active:border-cyan-400 active:scale-95 flex items-center justify-center text-cyan-300 backdrop-blur-md shadow-xl select-none transition-transform"
              aria-label="Steer Right"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          {/* Event Action Button for Mobile when near event */}
          {nearbyEvent && !activeEvent && (
            <button
              type="button"
              onClick={onStartNearbyEvent}
              onTouchStart={(e) => {
                e.preventDefault();
                onStartNearbyEvent();
              }}
              className="pointer-events-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-slate-950 font-mono text-xs font-black tracking-wider shadow-[0_0_20px_rgba(0,245,255,0.6)] animate-bounce active:scale-95"
            >
              🏁 START RACE
            </button>
          )}

          {/* Bottom Right Pedals: BRAKE & GAS */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              id="mobile-pedal-brake"
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                onBrakeStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onBrakeEnd();
              }}
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-slate-950/60 border border-rose-500/40 active:bg-rose-500/30 active:border-rose-400 active:scale-95 flex flex-col items-center justify-center text-rose-300 font-mono text-[9px] font-bold backdrop-blur-md shadow-xl select-none transition-transform"
              aria-label="Brake"
            >
              <Disc className="w-4 h-4 mb-0.5" />
              <span>BRAKE</span>
            </button>

            <button
              id="mobile-pedal-gas"
              type="button"
              onTouchStart={(e) => {
                e.preventDefault();
                onGasStart();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onGasEnd();
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/60 border border-cyan-500/50 active:bg-cyan-500/35 active:border-cyan-400 active:scale-95 flex flex-col items-center justify-center text-[#00f5ff] font-mono text-[10px] font-black backdrop-blur-md shadow-xl select-none transition-transform"
              aria-label="Accelerate"
            >
              <Gauge className="w-5 h-5 mb-0.5" />
              <span>GAS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
