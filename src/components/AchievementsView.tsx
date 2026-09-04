import React from 'react';
import { Award, CheckCircle2, Lock, Sparkles, Trophy, Flame, Swords, Compass, Shield } from 'lucide-react';
import { INITIAL_ACHIEVEMENTS } from '../data/platformData';
import { GameItem } from '../data/games';
import { sound } from '../utils/soundEffects';

interface AchievementsViewProps {
  games: GameItem[];
  onSelectGame: (game: GameItem) => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ games, onSelectGame }) => {
  const unlockedCount = INITIAL_ACHIEVEMENTS.filter(a => a.unlocked).length;
  const totalXP = INITIAL_ACHIEVEMENTS.filter(a => a.unlocked).reduce((acc, curr) => acc + curr.xp, 0);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Swords': return <Swords className="w-5 h-5 text-rose-500" />;
      case 'Flame': return <Flame className="w-5 h-5 text-amber-500" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'Shield': return <Shield className="w-5 h-5 text-blue-500" />;
      case 'Compass': return <Compass className="w-5 h-5 text-emerald-500" />;
      case 'Trophy': return <Trophy className="w-5 h-5 text-amber-500" />;
      default: return <Award className="w-5 h-5 text-[#6D28D9]" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-[#6D28D9] text-xs font-bold uppercase">
                Milestones
              </span>
              <span className="text-xs text-slate-500 font-medium">Badges & XP</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-[#111827] tracking-tight">
              Trophies & Achievements
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Complete special in-game feats, master challenges, and accumulate platform XP.
            </p>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl">
            <div className="text-center px-3 border-r border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Unlocked</div>
              <div className="text-xl font-bold font-mono text-[#111827]">
                {unlockedCount} / {INITIAL_ACHIEVEMENTS.length}
              </div>
            </div>
            <div className="text-center px-3">
              <div className="text-xs text-slate-500 font-medium">Earned XP</div>
              <div className="text-xl font-bold font-mono text-[#6D28D9]">
                +{totalXP.toLocaleString()} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INITIAL_ACHIEVEMENTS.map((ach) => {
          const matchedGame = games.find(g => g.slug === ach.gameSlug);

          return (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                ach.unlocked
                  ? 'bg-white border-slate-200/80 shadow-xs hover:border-purple-200'
                  : 'bg-slate-50/70 border-slate-200/60 opacity-80'
              }`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                ach.unlocked 
                  ? 'bg-purple-50/60 border-purple-100 shadow-xs' 
                  : 'bg-slate-100 border-slate-200 text-slate-400'
              }`}>
                {ach.unlocked ? getIcon(ach.icon) : <Lock className="w-5 h-5 text-slate-400" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-bold text-sm text-[#111827] truncate">{ach.title}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    ach.unlocked 
                      ? 'bg-purple-50 text-[#6D28D9] border border-purple-100' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    +{ach.xp} XP
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {ach.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">
                    Category: <strong className="text-slate-700 font-medium">{ach.category}</strong>
                  </span>

                  {ach.unlocked ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Unlocked</span>
                    </span>
                  ) : matchedGame ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onSelectGame(matchedGame);
                      }}
                      className="text-[#6D28D9] hover:underline cursor-pointer font-bold"
                    >
                      Play to Unlock →
                    </button>
                  ) : (
                    <span className="text-slate-400">Locked</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

