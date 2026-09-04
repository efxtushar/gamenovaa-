import React from 'react';
import { GameItem } from '../data/games';
import { GameCard, CardSize } from './GameCard';

interface GameDiscoveryGridProps {
  games: GameItem[];
  onSelectGame: (game: GameItem) => void;
  favorites: string[];
  onToggleFavorite: (gameId: string, e?: React.MouseEvent) => void;
  layout?: 'masonry' | 'standard' | 'dense';
}

export const GameDiscoveryGrid: React.FC<GameDiscoveryGridProps> = ({
  games,
  onSelectGame,
  favorites,
  onToggleFavorite,
  layout = 'standard'
}) => {
  if (!games || games.length === 0) return null;

  if (layout === 'standard') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
        {games.map(game => (
          <GameCard
            key={game.id}
            game={game}
            size="standard"
            onSelect={onSelectGame}
            isFavorite={favorites.includes(game.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    );
  }

  // Rhythmic store spotlight grid
  const getCardSize = (index: number, total: number): CardSize => {
    if (layout === 'dense') return 'standard';
    const patternIndex = index % 8;
    if (patternIndex === 0 && total >= 3) return 'featured';
    if (patternIndex === 3 && total >= 4) return 'wide';
    if (patternIndex === 6 && total >= 7) return 'wide';
    return 'standard';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 auto-rows-[minmax(180px,auto)] grid-flow-dense">
      {games.map((game, index) => {
        const size = getCardSize(index, games.length);
        return (
          <GameCard
            key={game.id}
            game={game}
            size={size}
            onSelect={onSelectGame}
            isFavorite={favorites.includes(game.id)}
            onToggleFavorite={onToggleFavorite}
          />
        );
      })}
    </div>
  );
};
