import React from 'react';
import { ArrowLeft, Target, Shield, Zap, Crosshair, AlertTriangle } from 'lucide-react';

interface MissionsBriefingModalProps {
  onBack: () => void;
}

export const MissionsBriefingModal: React.FC<MissionsBriefingModalProps> = ({ onBack }) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none font-mono">
      <div className="w-full max-w-2xl bg-[#030712]/95 border border-cyan-500/25 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,240,255,0.15)] flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div>
            <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
              TACTICAL INTEL DATABASE
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-wide uppercase mt-0.5">
              MISSION BRIEFING & HOSTILE THREATS
            </h2>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK
          </button>
        </div>

        {/* Section 1: Objective */}
        <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 mb-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <Target className="w-4 h-4" /> PRIMARY DIRECTIVE
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">
            Deep-space hostile armada detected in Sector 7. Pilot your chosen starfighter, intercept enemy squadrons across sequential waves, and preserve fleet hull integrity at all costs.
          </p>
        </div>

        {/* Section 2: Hostile Classifications */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> ENEMY CLASSIFICATIONS
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* SCOUT */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-cyan-400/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400">SCOUT</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                  FAST • WEAK
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-1">
                Agile needle interceptors. Rapid sine-wave strafing and directional micro-lasers. Easy to eliminate individually.
              </p>
            </div>

            {/* FIGHTER */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-amber-400/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400">FIGHTER</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 font-bold">
                  BALANCED
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-1">
                Predatory winged raiders. Flanks to combat altitude and discharges dual high-temperature plasma bolts.
              </p>
            </div>

            {/* HEAVY */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-purple-400/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-400">HEAVY</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-bold">
                  HIGH HP • SLOW
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-1">
                Massive armored dreadnoughts. Heavy damage absorption and lethal 3-way spread artillery salvos.
              </p>
            </div>

            {/* ELITE */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-rose-400/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400">ELITE</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30 font-bold">
                  SHIELDED • LETHAL
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-1">
                Command strike craft with regenerative energy shields, evasive dogfight tracking, and burst laser fire.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Pilot Controls Reference */}
        <div className="border-t border-white/10 pt-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            PILOT CONTROLS & COMBAT SYSTEMS
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
              <div className="text-slate-400 text-[10px]">WASD / ARROWS</div>
              <div className="font-bold text-white mt-0.5">Thruster Maneuvers</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
              <div className="text-slate-400 text-[10px]">MOUSE AIM</div>
              <div className="font-bold text-cyan-300 mt-0.5">Turret Targeting</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
              <div className="text-slate-400 text-[10px]">LEFT CLICK / TAP</div>
              <div className="font-bold text-cyan-400 mt-0.5">Primary Cannons</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
              <div className="text-slate-400 text-[10px]">SPACE / BLAST BTN</div>
              <div className="font-bold text-purple-400 mt-0.5">EMP Energy Blast</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
              <div className="text-slate-400 text-[10px]">R KEY / RELOAD</div>
              <div className="font-bold text-amber-400 mt-0.5">Magazine Reload</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
              <div className="text-slate-400 text-[10px]">ESC / PAUSE</div>
              <div className="font-bold text-slate-300 mt-0.5">Tactical Pause</div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onBack}
          className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          CLOSE INTEL DATABASE
        </button>
      </div>
    </div>
  );
};
