import React, { useState, useEffect } from 'react';
import { GameItem } from '../data/games';
import { Play, Heart, Star, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { sound } from '../utils/soundEffects';

interface HeroShowcaseProps {
  games?: GameItem[];
  featuredGames?: GameItem[];
  onSelectGame: (game: GameItem) => void;
  onViewDetails?: (game: GameItem) => void;
  favorites?: string[];
  onToggleFavorite?: (gameId: string, e?: React.MouseEvent) => void;
}

export const HeroShowcase: React.FC<HeroShowcaseProps> = ({
  games,
  featuredGames,
  onSelectGame,
  onViewDetails,
  favorites = [],
  onToggleFavorite
}) => {
  const displayGames = games || featuredGames || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto rotate hero banner every 8 seconds
  useEffect(() => {
    if (displayGames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayGames.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [displayGames.length]);

  if (!displayGames.length) return null;
  const safeIndex = currentIndex % displayGames.length;
  const game = displayGames[safeIndex];
  if (!game) return null;
  const isFavorite = (favorites || []).includes(game.id);

  const handleNext = () => {
    sound.playClick();
    setCurrentIndex((prev) => (prev + 1) % displayGames.length);
  };

  const handlePrev = () => {
    sound.playClick();
    setCurrentIndex((prev) => (prev - 1 + displayGames.length) % displayGames.length);
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-200/50 shadow-md min-h-[340px] sm:min-h-[380px] md:min-h-[420px] flex flex-col justify-end">
      {/* Background Cinematic Artwork */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          key={game.id}
          src={game.thumbnailUrl}
          alt={game.title}
          className="w-full h-full object-cover object-center animate-fade-in transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        {/* Soft Modern Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent md:w-3/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>

      {/* Hero Content Overlay */}
      <div className="relative z-10 p-6 sm:p-8 md:p-10 max-w-xl flex flex-col items-start">
        {/* Spotlight & Genre Badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-[#6D28D9] text-white text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5 shadow-sm">
            <Sparkles className="w-3 h-3" />
            <span>Featured Game</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md text-white text-xs font-medium border border-white/20">
            {game.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-tight drop-shadow-sm">
          {game.title}
        </h1>

        {/* Description */}
        <p className="mt-2 text-slate-200 text-xs sm:text-sm line-clamp-2 leading-relaxed">
          {game.description}
        </p>

        {/* Rating and Badges */}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/10">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-white">{game.rating.toFixed(1)}</span>
            <span className="text-slate-400">/ 5.0</span>
          </div>
          <span className="text-slate-300 font-medium text-[11px] hidden sm:inline">Instant browser play • No download</span>
        </div>

        {/* Action Controls */}
        <div className="mt-5 flex items-center gap-3">
          {/* PLAY NOW Button */}
          <button
            onClick={() => {
              sound.playClick();
              onSelectGame(game);
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#6D28D9] hover:bg-[#5B21B6] text-white transition-all transform hover:scale-102 flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-900/30"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>PLAY NOW</span>
          </button>

          {/* Favorite Toggle */}
          {onToggleFavorite && (
            <button
              onClick={(e) => onToggleFavorite(game.id, e)}
              aria-label="Save to favorites"
              className={`p-2.5 rounded-xl border backdrop-blur-md transition-colors cursor-pointer ${
                isFavorite
                  ? 'bg-white text-rose-500 border-white shadow-sm'
                  : 'bg-white/15 border-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Carousel Navigation Arrows & Indicators */}
      <div className="absolute right-4 bottom-4 md:right-8 md:bottom-8 flex items-center gap-2 z-20">
        <button
          onClick={handlePrev}
          aria-label="Previous featured game"
          className="p-2 rounded-xl bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {displayGames.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                sound.playClick();
                setCurrentIndex(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === safeIndex 
                  ? 'w-5 bg-white' 
                  : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          aria-label="Next featured game"
          className="p-2 rounded-xl bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/20 text-white transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

