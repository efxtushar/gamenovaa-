import React from 'react';
import { GameItem } from '../data/games';
import { X, Play, Heart, Star, Gamepad2, Info } from 'lucide-react';
import { sound } from '../utils/soundEffects';

interface GameDetailModalProps {
  game: GameItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (game: GameItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (gameId: string) => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  isOpen,
  onClose,
  onPlay,
  isFavorite,
  onToggleFavorite
}) => {
  if (!isOpen || !game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Cover Banner */}
        <div className="relative w-full h-56 sm:h-64 overflow-hidden bg-slate-900 shrink-0">
          <img
            src={game.thumbnailUrl}
            alt={game.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Close button */}
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Banner Meta Overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-[#6D28D9] text-white text-xs font-bold uppercase">
                  {game.category}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/50 text-white text-xs font-medium">
                  Instant Play
                </span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                {game.title}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 text-white text-sm shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">{game.rating.toFixed(1)}</span>
              <span className="text-slate-300 text-xs">/ 5.0</span>
            </div>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Overview</span>
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {game.description}
            </p>
          </div>

          {/* How to Play / Instructions */}
          {game.instructions && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                How to Play
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {game.instructions}
              </p>
            </div>
          )}

          {/* Key Controls Mapping */}
          {game.controls && game.controls.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] mb-2.5 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Controls</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {game.controls.map((ctrl, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <span className="px-2 py-1 rounded-md bg-white text-slate-800 font-mono text-xs font-bold border border-slate-200 shadow-xs">
                      {ctrl.key}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      {ctrl.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {game.tags && game.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {game.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onToggleFavorite(game.id);
            }}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
              isFavorite
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            <span>{isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
              onPlay(game);
            }}
            className="flex-1 sm:flex-initial px-8 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

