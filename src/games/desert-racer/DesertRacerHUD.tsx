import React from 'react';
import { 
  Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Flag, Zap, Flame, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Timer, Trophy
} from 'lucide-react';
import { TrackMinimap } from './TrackMinimap';
import { CircularSpeedometer } from './CircularSpeedometer';

interface DesertRacerHUDProps {
  speedKmh: number;
  topSpeed: number;
  position: number;
  totalRacers: number;
  lap: number;
  totalLaps: number;
  raceTimeFormatted: string;
  bestTimeFormatted: string;
  trackProgress: number; // 0 to 1
  aiProgressList: { id: number; progress: number; color: string; name?: string }[];
  checkpointText?: string;
  checkpointDistanceMeters?: number | null;
  checkpointBanner?: string | null;
  driftScore: number;
  currentDriftCombo: number;
  driftMultiplier: number;
  isDrifting: boolean;
  boostRemaining?: number;
  isBoosting?: boolean;
  countdownVal: '3' | '2' | '1' | 'GO!' | '';
  isStarting: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onPause: () => void;
  onInputPress: (key: 'left' | 'right' | 'up' | 'down' | 'drift' | 'boost', pressed: boolean) => void;
  isMobile: boolean;
  trackName?: string;
}

export const DesertRacerHUD: React.FC<DesertRacerHUDProps> = ({
  speedKmh,
  topSpeed,
  position,
  totalRacers,
  lap,
  totalLaps,
  raceTimeFormatted,
  bestTimeFormatted,
  trackProgress,
  aiProgressList,
  checkpointText,
  checkpointBanner,
  driftScore,
  currentDriftCombo,
  driftMultiplier,
  isDrifting,
  boostRemaining = 100,
  isBoosting = false,
  countdownVal,
  isStarting,
  isMuted,
  isFullscreen,
  onToggleMute,
  onToggleFullscreen,
  onPause,
  onInputPress,
  isMobile,
  trackName = 'DESERT RUN'
}) => {
  // Gear calculation
  const gear = speedKmh < 40 ? 1 : speedKmh < 85 ? 2 : speedKmh < 135 ? 3 : speedKmh < 190 ? 4 : 5;

  const padNumber = (num: number) => num.toString().padStart(2, '0');

  // Map AI names
  const aiLabels: { [id: number]: string } = {
    1: 'AI 1',
    2: 'AI 2',
    3: 'AI 3',
    4: 'AI 4'
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden font-sans">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STARTING GRID LIGHTS & CINEMATIC COUNTDOWN OVERLAY
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isStarting && countdownVal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
          <div className="px-8 py-5 rounded-2xl bg-neutral-950/90 border border-white/20 backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-3 animate-fadeIn">
            {/* 5-Pod Formula/Motorsport Starting Light Gantry */}
            <div className="flex items-center gap-3.5 px-4 py-2 rounded-xl bg-black/80 border border-zinc-800 shadow-inner">
              {[1, 2, 3, 4, 5].map(podIdx => {
                const isRed = 
                  (countdownVal === '3' && podIdx <= 3) ||
                  (countdownVal === '2' && podIdx <= 4) ||
                  (countdownVal === '1' && podIdx <= 5);
                const isGo = countdownVal === 'GO!';

                return (
                  <div
                    key={podIdx}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-100 ${
                      isGo
                        ? 'bg-emerald-400 border-emerald-200 shadow-[0_0_20px_#10b981]'
                        : isRed
                        ? 'bg-red-500 border-red-300 shadow-[0_0_20px_#ef4444]'
                        : 'bg-zinc-900 border-zinc-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Cinematic Large Typography */}
            <div className="h-20 flex items-center justify-center">
              <span
                className={`text-6xl sm:text-8xl font-black italic tracking-wider transition-all scale-105 ${
                  countdownVal === 'GO!'
                    ? 'text-emerald-400 drop-shadow-[0_0_35px_#10b981]'
                    : 'text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.85)]'
                }`}
              >
                {countdownVal}
              </span>
            </div>
            <span className="text-[10px] font-mono font-black tracking-[0.3em] uppercase text-neutral-400">
              DESERT CHAMPIONSHIP
            </span>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP HUD BAR:
          LEFT: DESERT RACER • POSITION 01/05 • LAP 01/03
          CENTER: LARGE HORIZONTAL RACE PROGRESS BAR
          RIGHT: TIME 00:42.58 • BEST 00:39.21
          CORNER: PAUSE • SOUND • FULLSCREEN
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full flex items-start justify-between gap-2 sm:gap-4 pointer-events-none">
        
        {/* ── TOP LEFT: DESERT RACER • POSITION & LAP ── */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="px-3.5 py-2.5 rounded-2xl bg-neutral-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-mono font-black tracking-wider text-white">
                DESERT <span className="text-amber-400">RACER</span>
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* POSITION */}
              <div className="flex flex-col">
                <span className="text-[8px] font-mono font-black uppercase tracking-wider text-neutral-400">
                  POSITION
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-black text-2xl sm:text-3xl italic text-amber-400 leading-none">
                    {padNumber(position)}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    / {padNumber(totalRacers)}
                  </span>
                </div>
              </div>

              <div className="w-px h-8 bg-white/15" />

              {/* LAP */}
              <div className="flex flex-col">
                <span className="text-[8px] font-mono font-black uppercase tracking-wider text-neutral-400">
                  LAP
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-black text-2xl sm:text-3xl italic text-white leading-none">
                    {padNumber(Math.min(lap, totalLaps))}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    / {padNumber(totalLaps)}
                  </span>
                </div>
              </div>

              <div className="w-px h-8 bg-white/15" />

              {/* CHECKPOINT */}
              <div className="flex flex-col">
                <span className="text-[8px] font-mono font-black uppercase tracking-wider text-neutral-400">
                  CHECKPOINT
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display font-black text-2xl sm:text-3xl italic text-amber-300 leading-none">
                    {checkpointText || '00 / 10'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TOP CENTER: LARGE HORIZONTAL RACE-PROGRESS BAR ── */}
        <div className="flex-1 max-w-lg mx-2 flex flex-col items-center gap-1.5 pointer-events-none">
          {/* Checkpoint Banner Flash */}
          {checkpointBanner && (
            <div className="animate-bounce px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black font-black font-display text-xs tracking-wider uppercase shadow-xl flex items-center gap-1.5 border border-yellow-200">
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>{checkpointBanner}</span>
            </div>
          )}

          {/* Large Horizontal Race-Progress Container */}
          <div className="w-full px-3.5 py-2 rounded-2xl bg-neutral-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col gap-1">
            {/* Header Track Name & Status */}
            <div className="flex items-center justify-between text-[9px] font-mono font-black text-neutral-400 px-0.5">
              <span className="text-neutral-300">START</span>
              <span className="text-amber-400 tracking-wider">RACE PROGRESS</span>
              <span className="flex items-center gap-1 text-white">
                FINISH
                <Flag className="w-2.5 h-2.5 text-amber-400" />
              </span>
            </div>

            {/* Progress Bar Track */}
            <div className="relative w-full h-3 rounded-full bg-neutral-900 overflow-visible border border-zinc-800">
              {/* Checkpoint markers along track */}
              <div className="absolute left-[18%] top-0 bottom-0 w-0.5 bg-zinc-700 z-0" title="Sector 1" />
              <div className="absolute left-[32%] top-0 bottom-0 w-0.5 bg-zinc-700 z-0" title="Sector 2" />
              <div className="absolute left-[46%] top-0 bottom-0 w-0.5 bg-zinc-700 z-0" title="Sector 3" />

              {/* Player Progress Fill */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(2, trackProgress * 100))}%` }}
              />

              {/* AI Competitors along track */}
              {aiProgressList.map((ai, index) => {
                const label = ai.name || aiLabels[ai.id] || `AI ${index + 1}`;
                const leftPercent = Math.min(97, Math.max(3, ai.progress * 100));

                return (
                  <div
                    key={ai.id}
                    className="absolute top-1/2 -translate-y-1/2 -ml-3 flex flex-col items-center pointer-events-none transition-all duration-150 z-10"
                    style={{ left: `${leftPercent}%` }}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-black shadow-md flex items-center justify-center"
                      style={{ backgroundColor: ai.color }}
                    >
                      <span className="text-[6px] font-mono font-black text-black leading-none">
                        {index + 1}
                      </span>
                    </div>
                    {/* Small tag above */}
                    <span className="text-[7px] font-mono font-bold text-neutral-400 uppercase -mt-4 bg-black/70 px-1 rounded">
                      {label}
                    </span>
                  </div>
                );
              })}

              {/* PLAYER Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -ml-3.5 flex flex-col items-center pointer-events-none transition-all duration-75 z-20"
                style={{ left: `${Math.min(98, Math.max(2, trackProgress * 100))}%` }}
              >
                {/* Floating PLAYER Badge */}
                <span className="text-[8px] font-mono font-black text-black bg-amber-400 px-1 py-0.2 rounded-sm shadow-md uppercase tracking-wider mb-0.5">
                  PLAYER
                </span>
                <div className="w-4 h-4 rounded-full bg-amber-300 border-2 border-black shadow-[0_0_12px_#f59e0b] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-black" />
                </div>
              </div>

              {/* Finish Line Flag Marker */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex items-center justify-center z-10">
                <div className="w-3 h-3 rounded-full bg-white border border-black flex items-center justify-center shadow">
                  <Flag className="w-2 h-2 text-black" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TOP RIGHT: TIME & BEST TIME + CONTROLS ── */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          {/* Top Right Corner Utilities: Pause, Sound, Fullscreen */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPause}
              title="Pause Race (Esc)"
              className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 border border-white/15 hover:border-amber-400 text-neutral-300 hover:text-white backdrop-blur-xl shadow-lg transition-all cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 text-amber-400" />
            </button>

            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 border border-white/15 hover:border-amber-400 text-neutral-300 hover:text-white backdrop-blur-xl shadow-lg transition-all cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 border border-white/15 hover:border-amber-400 text-neutral-300 hover:text-white backdrop-blur-xl shadow-lg transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Time & Best Time Card */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-neutral-950/90 border border-white/15 backdrop-blur-2xl shadow-2xl flex items-center gap-3 sm:gap-4">
            {/* TIME */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Timer className="w-2.5 h-2.5 text-amber-400" />
                TIME
              </span>
              <span className="font-display font-black text-xl sm:text-2xl italic text-white leading-none">
                {raceTimeFormatted}
              </span>
            </div>

            <div className="w-px h-8 bg-white/15" />

            {/* BEST */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                <Trophy className="w-2.5 h-2.5 text-amber-500" />
                BEST
              </span>
              <span className="font-display font-black text-base sm:text-lg italic text-amber-400/90 leading-none">
                {bestTimeFormatted || '--:--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BOTTOM HUD BAR:
          BOTTOM LEFT: TRACK MINIMAP
          BOTTOM RIGHT: CIRCULAR SPEEDOMETER + DRIFT BADGE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className={`w-full flex items-end justify-between gap-3 pointer-events-none transition-all ${isMobile ? 'pb-18 sm:pb-20' : 'pb-1'}`}>
        {/* BOTTOM LEFT: MINIMAP OF RACING TRACK */}
        <div className="pointer-events-auto">
          <TrackMinimap
            trackProgress={trackProgress}
            aiProgressList={aiProgressList}
            trackName={trackName}
          />
        </div>

        {/* BOTTOM RIGHT: CIRCULAR / DIGITAL SPEEDOMETER + DRIFT */}
        <div className="pointer-events-auto">
          <CircularSpeedometer
            speedKmh={speedKmh}
            topSpeed={topSpeed}
            gear={gear}
            driftScore={driftScore}
            isDrifting={isDrifting}
            currentDriftCombo={currentDriftCombo}
            driftMultiplier={driftMultiplier}
            boostRemaining={boostRemaining}
            isBoosting={isBoosting}
          />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MOBILE ON-SCREEN TOUCH CONTROLS
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isMobile && (
        <div className="fixed inset-x-0 bottom-0 pointer-events-none z-30 pb-3 px-3 flex items-end justify-between">
          {/* Steer Left / Right */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onPointerDown={e => {
                e.preventDefault();
                onInputPress('left', true);
              }}
              onPointerUp={e => {
                e.preventDefault();
                onInputPress('left', false);
              }}
              onPointerCancel={e => {
                e.preventDefault();
                onInputPress('left', false);
              }}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-neutral-950/85 active:bg-amber-500/40 border border-white/20 active:border-amber-400 text-white backdrop-blur-md flex items-center justify-center shadow-2xl touch-none cursor-pointer"
              aria-label="Steer Left"
            >
              <ChevronLeft className="w-7 h-7 text-amber-400" />
            </button>

            <button
              onPointerDown={e => {
                e.preventDefault();
                onInputPress('right', true);
              }}
              onPointerUp={e => {
                e.preventDefault();
                onInputPress('right', false);
              }}
              onPointerCancel={e => {
                e.preventDefault();
                onInputPress('right', false);
              }}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-neutral-950/85 active:bg-amber-500/40 border border-white/20 active:border-amber-400 text-white backdrop-blur-md flex items-center justify-center shadow-2xl touch-none cursor-pointer"
              aria-label="Steer Right"
            >
              <ChevronRight className="w-7 h-7 text-amber-400" />
            </button>
          </div>

          {/* Boost, Drift, Brake, Gas */}
          <div className="flex items-end gap-1.5 sm:gap-2 pointer-events-auto">
            {/* BOOST BUTTON */}
            <button
              onPointerDown={e => {
                e.preventDefault();
                onInputPress('boost', true);
              }}
              onPointerUp={e => {
                e.preventDefault();
                onInputPress('boost', false);
              }}
              onPointerCancel={e => {
                e.preventDefault();
                onInputPress('boost', false);
              }}
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center font-mono font-black text-[9px] sm:text-[10px] shadow-2xl touch-none cursor-pointer transition-colors border ${
                isBoosting
                  ? 'bg-cyan-500/50 border-cyan-300 text-cyan-200 shadow-[0_0_15px_#06b6d4]'
                  : 'bg-neutral-950/85 active:bg-cyan-500/40 border-cyan-400/40 text-cyan-300'
              }`}
              aria-label="Boost Nitro"
            >
              <Flame className="w-3.5 h-3.5 mb-0.5 text-cyan-400" />
              <span>BOOST</span>
            </button>

            {/* DRIFT BUTTON */}
            <button
              onPointerDown={e => {
                e.preventDefault();
                onInputPress('drift', true);
              }}
              onPointerUp={e => {
                e.preventDefault();
                onInputPress('drift', false);
              }}
              onPointerCancel={e => {
                e.preventDefault();
                onInputPress('drift', false);
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-neutral-950/85 active:bg-amber-500/40 border border-amber-400/40 text-amber-300 backdrop-blur-md flex flex-col items-center justify-center font-mono font-black text-[9px] sm:text-[10px] shadow-2xl touch-none cursor-pointer"
              aria-label="Drift"
            >
              <Zap className="w-3.5 h-3.5 mb-0.5" />
              <span>DRIFT</span>
            </button>

            {/* BRAKE BUTTON */}
            <button
              onPointerDown={e => {
                e.preventDefault();
                onInputPress('down', true);
              }}
              onPointerUp={e => {
                e.preventDefault();
                onInputPress('down', false);
              }}
              onPointerCancel={e => {
                e.preventDefault();
                onInputPress('down', false);
              }}
              className="w-11 h-13 sm:w-12 sm:h-14 rounded-2xl bg-neutral-950/85 active:bg-red-500/40 border border-red-500/40 text-red-300 backdrop-blur-md flex flex-col items-center justify-center shadow-2xl touch-none cursor-pointer"
              aria-label="Brake"
            >
              <ArrowDown className="w-4.5 h-4.5" />
              <span className="text-[8px] sm:text-[9px] font-mono font-bold">BRAKE</span>
            </button>

            {/* GAS BUTTON */}
            <button
              onPointerDown={e => {
                e.preventDefault();
                onInputPress('up', true);
              }}
              onPointerUp={e => {
                e.preventDefault();
                onInputPress('up', false);
              }}
              onPointerCancel={e => {
                e.preventDefault();
                onInputPress('up', false);
              }}
              className="w-15 h-16 sm:w-16 sm:h-18 rounded-2xl bg-amber-500/35 active:bg-amber-500/65 border-2 border-amber-400 text-amber-300 backdrop-blur-md flex flex-col items-center justify-center shadow-2xl shadow-amber-500/30 touch-none cursor-pointer"
              aria-label="Accelerate"
            >
              <ArrowUp className="w-5.5 h-5.5 text-amber-300 mb-0.5" />
              <span className="text-[9px] sm:text-[10px] font-mono font-black tracking-wider text-amber-200">GAS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
