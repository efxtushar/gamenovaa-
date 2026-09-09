import React from 'react';
import { ArrowRight, RotateCcw, Home, Trophy, Crosshair, Zap } from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface WaveClearModalProps {
  wave: number;
  score: number;
  kills: number;
  accuracy: number;
  rewardPoints: number;
  onNextWave: () => void;
  onReplay: () => void;
  onMainMenu: () => void;
}

export const WaveClearModal: React.FC<WaveClearModalProps> = ({
  wave,
  score,
  kills,
  accuracy,
  rewardPoints,
  onNextWave,
  onReplay,
  onMainMenu
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-mono">
      <div className="w-full max-w-sm sm:max-w-md bg-[#030712]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_50px_rgba(0,240,255,0.2)] relative overflow-hidden">
        {/* Glow ambient background rings */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 text-[10px] tracking-widest uppercase mb-3">
          <Trophy className="w-3 h-3 text-cyan-400" /> SECTOR SECURED
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-wider text-white font-sans uppercase">
          MISSION COMPLETE
        </h2>
        <p className="text-xs text-cyan-400 mt-1 uppercase tracking-widest font-bold">
          WAVE {wave.toString().padStart(2, '0')} CLEARED
        </p>

        {/* 4 Stats Grid: SCORE, KILLS, ACCURACY, REWARD */}
        <div className="my-6 grid grid-cols-2 gap-2 text-left text-xs">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
            <div className="text-[9px] text-slate-400 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-cyan-400" /> SCORE
            </div>
            <div className="text-base font-black text-cyan-300 mt-0.5 font-mono">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
            <div className="text-[9px] text-slate-400 flex items-center gap-1">
              <Crosshair className="w-2.5 h-2.5 text-rose-400" /> KILLS
            </div>
            <div className="text-base font-black text-rose-400 mt-0.5 font-mono">
              {kills.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
            <div className="text-[9px] text-slate-400">ACCURACY</div>
            <div className="text-base font-black text-amber-400 mt-0.5 font-mono">
              {Math.min(100, Math.max(12, Math.floor(accuracy)))}%
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
            <div className="text-[9px] text-slate-400">REWARD</div>
            <div className="text-base font-black text-emerald-400 mt-0.5 font-mono">
              +{rewardPoints.toLocaleString()} PTS
            </div>
          </div>
        </div>

        {/* Buttons: NEXT WAVE, REPLAY, MAIN MENU */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onNextWave();
            }}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(0,240,255,0.4)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            NEXT WAVE <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onReplay();
              }}
              className="py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> REPLAY
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onMainMenu();
              }}
              className="py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" /> MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
