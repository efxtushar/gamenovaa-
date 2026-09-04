import React from 'react';
import { GameItem } from '../data/games';
import { GameThumbnail } from './GameThumbnail';
import { Heart, Star, Flame } from 'lucide-react';
import { sound } from '../utils/soundEffects';

export type CardSize = 'standard' | 'featured' | 'wide' | 'tall' | 'compact';

interface GameCardProps {
  game: GameItem;
  onSelect?: (game: GameItem) => void;
  onSelectGame?: (game: GameItem | string) => void;
  isFavorite: boolean;
  onToggleFavorite: (gameId: string, e?: React.MouseEvent) => void;
  size?: CardSize;
  featuredSize?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onSelect,
  onSelectGame,
  isFavorite,
  onToggleFavorite,
  size = 'standard',
  featuredSize = false
}) => {
  const actualSize: CardSize = featuredSize ? 'featured' : (size as CardSize);

  const handleCardClick = () => {
    sound.playClick();
    if (onSelect) onSelect(game);
    if (onSelectGame) onSelectGame(game);
  };

  // Grid span styling
  const getSpanClasses = () => {
    switch (actualSize) {
      case 'featured':
        return 'col-span-2 row-span-2';
      case 'wide':
        return 'col-span-2';
      case 'tall':
        return 'col-span-1 row-span-2';
      case 'compact':
      case 'standard':
      default:
        return 'col-span-1';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl bg-white border border-slate-200/90 hover:border-[#6D28D9]/50 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 ${getSpanClasses()}`}
    >
      {/* Game Thumbnail Cover */}
      <div className={`relative w-full overflow-hidden bg-slate-900 ${actualSize === 'tall' ? 'min-h-[240px] flex-1' : 'aspect-[16/11]'}`}>
        <GameThumbnail game={game} />

        {/* Favorite Button (Top Right) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            sound.playClick();
            onToggleFavorite(game.id, e);
          }}
          aria-label={isFavorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md transition-all z-20 cursor-pointer shadow-sm ${
            isFavorite
              ? 'bg-white text-rose-500 shadow'
              : 'bg-black/40 hover:bg-black/60 text-white/80 hover:text-white'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Hot / Trending Badge */}
        {(game.isTrending || game.trending) && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#6D28D9] text-white text-[10px] font-bold tracking-wide uppercase z-10 flex items-center gap-1 shadow-md">
            <Flame className="w-2.5 h-2.5 fill-current" />
            <span>Hot</span>
          </div>
        )}
      </div>

      {/* Game Card Footer Info: Title, Genre, Rating */}
      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2 bg-white">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm text-[#111827] group-hover:text-[#6D28D9] transition-colors truncate">
            {game.title}
          </h3>
          <p className="text-xs text-[#6B7280] truncate mt-0.5">
            {game.category}
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold shrink-0 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-[#111827]">{game.rating ? game.rating.toFixed(1) : '4.8'}</span>
        </div>
      </div>
    </div>
  );
};

