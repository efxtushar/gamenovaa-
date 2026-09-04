import React, { useState, useEffect, useRef } from 'react';
import { GameItem } from '../data/games';
import { Search, X, Play, Star } from 'lucide-react';
import { sound } from '../utils/soundEffects';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: GameItem[];
  onSelectGame: (game: GameItem) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  games = [],
  onSelectGame
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Global shortcut (Cmd+K or Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ['All', 'Action', 'Racing', 'Shooter', 'Puzzle', 'Sports', 'Adventure', 'Arcade', 'Strategy'];

  const filteredGames = (games || []).filter((game) => {
    const q = (query || '').toLowerCase();
    const matchesQuery =
      !q ||
      game.title.toLowerCase().includes(q) ||
      game.category.toLowerCase().includes(q) ||
      (game.tags && game.tags.some((t) => t.toLowerCase().includes(q))) ||
      (game.description && game.description.toLowerCase().includes(q));

    const matchesCategory = activeCategory === 'All' || game.category.toLowerCase() === activeCategory.toLowerCase();

    return matchesQuery && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-12 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
          <Search className="w-5 h-5 text-[#6D28D9] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 30 games, genres, gameplay tags..."
            className="w-full bg-transparent text-base text-[#111827] placeholder-[#6B7280] font-sans focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-[#111827] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 text-[#6B7280] hover:text-[#111827] border border-slate-200 cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Quick Genre Filters */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                sound.playClick();
                setActiveCategory(cat);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#6D28D9] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-[#111827] border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-1 flex-1 divide-y divide-slate-100">
          {filteredGames.length > 0 ? (
            filteredGames.map((game) => (
              <div
                key={game.id}
                onClick={() => {
                  sound.playClick();
                  onSelectGame(game);
                  onClose();
                }}
                className="group p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-16 aspect-video rounded-lg overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                    <img
                      src={game.thumbnailUrl}
                      alt={game.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#111827] text-sm group-hover:text-[#6D28D9] transition-colors truncate">
                        {game.title}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium border border-slate-200">
                        {game.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] truncate mt-0.5">
                      {game.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-xs text-amber-500 font-semibold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-[#111827]">{game.rating ? game.rating.toFixed(1) : '4.8'}</span>
                  </div>

                  <button className="px-3.5 py-1.5 rounded-lg bg-slate-100 group-hover:bg-[#6D28D9] text-[#111827] group-hover:text-white text-xs font-bold flex items-center gap-1 transition-all border border-slate-200 group-hover:border-transparent cursor-pointer shadow-xs">
                    <Play className="w-3 h-3 fill-current" />
                    <span>Play</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center flex flex-col items-center">
              <p className="text-slate-600 text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching by genre or keyword</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium px-4">
          <span>{filteredGames.length} games available</span>
          <span className="hidden sm:inline">Press Enter or click to launch</span>
        </div>
      </div>
    </div>
  );
};

