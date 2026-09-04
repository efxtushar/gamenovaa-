import React, { useState } from 'react';
import { GameItem } from '../data/games';
import { Play, Sparkles, Gamepad2, Trophy, Flame, Swords, Crosshair, Shield } from 'lucide-react';

interface GameThumbnailProps {
  game: GameItem;
  className?: string;
  showPlayIcon?: boolean;
  priority?: boolean;
}

export const GameThumbnail: React.FC<GameThumbnailProps> = ({
  game,
  className = '',
  showPlayIcon = true,
}) => {
  const [hasError, setHasError] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Racing': return <Flame className="w-6 h-6" />;
      case 'Action': return <Swords className="w-6 h-6" />;
      case 'Shooter': return <Crosshair className="w-6 h-6" />;
      case 'Sports': return <Trophy className="w-6 h-6" />;
      case 'Puzzle': return <Sparkles className="w-6 h-6" />;
      case 'Strategy': return <Shield className="w-6 h-6" />;
      default: return <Gamepad2 className="w-6 h-6" />;
    }
  };

  return (
    <div className={`relative w-full aspect-[16/11] bg-slate-900 overflow-hidden select-none group/thumb ${className}`}>
      {/* Primary Image Cover Artwork */}
      {!hasError && game.thumbnailUrl ? (
        <img
          src={game.thumbnailUrl}
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          onError={() => setHasError(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        /* Fallback Graphic */
        <div 
          className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${game.themeColor || '#6D28D9'}33 0%, #0F172A 100%)`,
          }}
        >
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 shadow-md border border-white/20"
            style={{
              backgroundColor: `${game.themeColor || '#6D28D9'}40`,
              color: '#FFFFFF'
            }}
          >
            {getCategoryIcon(game.category)}
          </div>
          <span className="font-bold text-sm text-white text-center tracking-wide line-clamp-1">
            {game.title}
          </span>
          <span className="text-[10px] font-medium text-slate-300 tracking-wider mt-0.5 uppercase">
            {game.category}
          </span>
        </div>
      )}

      {/* Subtle Bottom Shade for Visual Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 pointer-events-none transition-opacity duration-200 group-hover:opacity-40" />

      {/* Hover Overlay with Clean Play Button */}
      {showPlayIcon && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-[#6D28D9] text-white flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-200 border-2 border-white">
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};
