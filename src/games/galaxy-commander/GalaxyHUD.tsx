import React from 'react';
import {
  Pause,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Crosshair as CrosshairIcon
} from 'lucide-react';
import { ShipConfig } from './types';

interface GalaxyHUDProps {
  ship: ShipConfig;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  wave: number;
  activeHostiles: number;
  score: number;
  kills: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  energyBlastCooldown: number; // frames left (0 = ready)
  isFullscreen: boolean;
  soundEnabled: boolean;
  isTouchDevice: boolean;
  joystickPos: { x: number; y: number; active: boolean };
  onToggleFullscreen: () => void;
  onToggleSound: () => void;
  onPause: () => void;
  onTriggerReload: () => void;
  onFireEnergyBlast: () => void;
  onMobileFireStart: () => void;
  onMobileFireEnd: () => void;
  onJoystickTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onJoystickTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onJoystickTouchEnd: (e: React.TouchEvent<HTMLDivElement>) => void;
}

export const GalaxyHUD: React.FC<GalaxyHUDProps> = ({
  ship,
  health,
  maxHealth,
  shield,
  maxShield,
  wave,
  activeHostiles,
  score,
  kills,
  ammo,
  maxAmmo,
  isReloading,
  energyBlastCooldown,
  isFullscreen,
  soundEnabled,
  isTouchDevice,
  joystickPos,
  onToggleFullscreen,
  onToggleSound,
  onPause,
  onTriggerReload,
  onFireEnergyBlast,
  onMobileFireStart,
  onMobileFireEnd,
  onJoystickTouchStart,
  onJoystickTouchMove,
  onJoystickTouchEnd
}) => {
  const hpPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (shield / maxShield) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none font-mono">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TOP HUD ROW
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full flex items-start justify-between gap-2">
        {/* TOP LEFT: GALAXY COMMANDER • HP • SHIELD */}
        <div className="pointer-events-auto bg-[#030712]/85 border border-cyan-500/20 backdrop-blur-md rounded-xl p-3 sm:p-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.6)] min-w-[190px] sm:min-w-[240px]">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2">
            <span className="text-[11px] sm:text-xs font-black tracking-widest text-cyan-400 font-sans">
              GALAXY COMMANDER
            </span>
            <span className="text-[9px] text-slate-400 font-semibold">{ship.name.split(' ')[0]}</span>
          </div>

          {/* HP Bar */}
          <div className="space-y-1 mb-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400 font-bold">HP</span>
              <span className={health <= 30 ? 'text-rose-400 font-black animate-pulse' : 'text-slate-200'}>
                {Math.floor(health)} / {maxHealth}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-950/80 rounded-sm overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-150 rounded-sm ${
                  health > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                    : health > 25
                    ? 'bg-gradient-to-r from-amber-500 to-rose-400'
                    : 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* SHIELD Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-cyan-400 font-bold">SHIELD</span>
              <span className="text-cyan-200">{Math.floor(shield)} / {maxShield}</span>
            </div>
            <div className="w-full h-2 bg-slate-950/80 rounded-sm overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-cyan-200 transition-all duration-150 rounded-sm shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* TOP CENTER: WAVE 02 • OBJECTIVE */}
        <div className="pointer-events-auto bg-[#030712]/85 border border-cyan-500/20 backdrop-blur-md rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.6)] text-center">
          <div className="text-xs sm:text-sm font-black tracking-widest text-white font-sans">
            WAVE {wave.toString().padStart(2, '0')}
          </div>
          <div className="text-[9px] sm:text-[10px] text-cyan-300 font-bold tracking-wider mt-0.5">
            OBJECTIVE: DESTROY ALL HOSTILES • {activeHostiles}
          </div>
        </div>

        {/* TOP RIGHT: SCORE • KILLS • SYSTEM BUTTONS */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Score & Kills Card */}
          <div className="bg-[#030712]/85 border border-cyan-500/20 backdrop-blur-md rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center gap-4">
            <div className="text-right">
              <div className="text-[9px] text-slate-400 tracking-wider">SCORE</div>
              <div className="text-xs sm:text-sm font-black text-cyan-400 tracking-widest font-mono">
                {score.toString().padStart(6, '0')}
              </div>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-right">
              <div className="text-[9px] text-slate-400 tracking-wider">KILLS</div>
              <div className="text-xs sm:text-sm font-black text-rose-400 tracking-wider font-mono">
                {kills.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Controls row right below: Pause, Fullscreen, Sound */}
          <div className="flex items-center gap-1.5">
            <button
              id="gc-sound-btn"
              type="button"
              onClick={onToggleSound}
              className="w-8 h-8 rounded-lg bg-[#030712]/85 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-md"
              title="Toggle Audio"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            <button
              id="gc-fullscreen-btn"
              type="button"
              onClick={onToggleFullscreen}
              className="w-8 h-8 rounded-lg bg-[#030712]/85 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-md"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              id="gc-pause-btn"
              type="button"
              onClick={onPause}
              className="w-8 h-8 rounded-lg bg-[#030712]/85 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-md"
              title="Pause Game (ESC)"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          BOTTOM HUD ROW
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full flex items-end justify-between gap-2 mt-auto">
        {/* BOTTOM LEFT: COMPACT DESKTOP CONTROLS HINT */}
        <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 bg-[#030712]/80 border border-white/10 rounded-xl px-3.5 py-2 backdrop-blur-md shadow-lg pointer-events-auto">
          <span className="text-slate-200 font-bold">WASD</span> MOVE
          <span className="text-slate-600">•</span>
          <span className="text-cyan-400 font-bold">CLICK</span> FIRE
          <span className="text-slate-600">•</span>
          <span className="text-purple-400 font-bold">SPACE</span> BLAST
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-bold">R</span> RELOAD
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-bold">ESC</span> PAUSE
        </div>

        {/* BOTTOM RIGHT: WEAPON • AMMO • ENERGY BLAST */}
        <div className="pointer-events-auto ml-auto bg-[#030712]/85 border border-cyan-500/20 backdrop-blur-md rounded-xl p-2.5 sm:p-3 shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center gap-3">
          {/* Weapon & Ammo */}
          <div className="text-right pr-2">
            <div className="text-[9px] text-slate-400 tracking-wider">WEAPON</div>
            <div className="text-[11px] sm:text-xs font-black text-cyan-400 font-sans tracking-wide">
              {ship.weaponName}
            </div>
            <div className="text-[10px] text-slate-300 flex items-center justify-end gap-1.5 mt-0.5 font-mono">
              {isReloading ? (
                <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> RELOADING
                </span>
              ) : (
                <span>
                  AMMO <strong className="text-white font-black">{ammo}</strong> / {maxAmmo}
                </span>
              )}
            </div>
          </div>

          {/* Energy Blast Cooldown */}
          <div className="border-l border-white/10 pl-3 text-center min-w-[80px]">
            <div className="text-[9px] text-slate-400 tracking-wider">ENERGY BLAST</div>
            <div
              className={`text-[10px] font-black font-mono mt-0.5 rounded px-2 py-1 transition-all ${
                energyBlastCooldown === 0
                  ? 'bg-purple-950/90 border border-purple-400/60 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.5)] animate-pulse'
                  : 'bg-slate-950 border border-white/10 text-slate-500'
              }`}
            >
              {energyBlastCooldown === 0 ? 'READY' : `${Math.ceil(energyBlastCooldown / 60).toString().padStart(2, '0')}s`}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MOBILE VIRTUAL CONTROLS OVERLAY (TOUCH ONLY)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isTouchDevice && (
        <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-end p-4 pb-14">
          <div className="flex items-end justify-between w-full">
            {/* Virtual Joystick (Left) */}
            <div
              className="pointer-events-auto relative w-28 h-28 rounded-full bg-slate-950/60 border border-cyan-400/40 backdrop-blur-sm flex items-center justify-center touch-none select-none shadow-[0_0_20px_rgba(0,240,255,0.2)]"
              onTouchStart={onJoystickTouchStart}
              onTouchMove={onJoystickTouchMove}
              onTouchEnd={onJoystickTouchEnd}
            >
              <div
                className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 border border-cyan-200/50 shadow-[0_0_16px_rgba(0,240,255,0.8)] pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
                }}
              />
            </div>

            {/* Action Buttons (Right) */}
            <div className="pointer-events-auto flex items-end gap-3 select-none">
              {/* Reload */}
              <button
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  onTriggerReload();
                }}
                className="w-12 h-12 rounded-2xl bg-slate-950/70 border border-white/15 active:border-cyan-400 text-slate-300 flex flex-col items-center justify-center backdrop-blur-md active:scale-95 shadow-lg"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span className="text-[8px] text-slate-400 font-bold mt-0.5">RELOAD</span>
              </button>

              {/* Special Blast */}
              <button
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  onFireEnergyBlast();
                }}
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md active:scale-95 shadow-lg transition-all ${
                  energyBlastCooldown === 0
                    ? 'bg-purple-950/90 border-2 border-purple-400 text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.6)]'
                    : 'bg-slate-950/70 border border-white/15 text-slate-500 opacity-60'
                }`}
              >
                <Zap className="w-5 h-5 text-purple-300" />
                <span className="text-[8px] font-bold mt-0.5">BLAST</span>
              </button>

              {/* Primary Fire */}
              <button
                type="button"
                onTouchStart={e => {
                  e.preventDefault();
                  onMobileFireStart();
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  onMobileFireEnd();
                }}
                className="w-16 h-16 rounded-3xl bg-cyan-950/90 border-2 border-cyan-400 active:bg-cyan-900 text-cyan-300 flex flex-col items-center justify-center backdrop-blur-md active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.5)]"
              >
                <CrosshairIcon className="w-6 h-6 text-cyan-400" />
                <span className="text-[9px] font-black tracking-wider text-cyan-100 mt-0.5">FIRE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
