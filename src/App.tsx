import React, { useState, useEffect, useMemo } from 'react';
import { INITIAL_GAMES, GameItem } from './data/games';
import { CATEGORIES } from './data/categories';
import { Navbar } from './components/Navbar';
import { HeroShowcase } from './components/HeroShowcase';
import { GameCard } from './components/GameCard';
import { GameDiscoveryGrid } from './components/GameDiscoveryGrid';
import { CategoryCard } from './components/CategoryCard';
import { GamePlayer } from './components/GamePlayer';
import { GameDetailModal } from './components/GameDetailModal';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminDashboard } from './components/AdminDashboard';
import { LeaderboardView } from './components/LeaderboardView';
import { AchievementsView } from './components/AchievementsView';
import { NewsUpdatesView } from './components/NewsUpdatesView';
import { HelpCenterView } from './components/HelpCenterView';
import { sound } from './utils/soundEffects';
import { 
  Flame, Trophy, Sparkles, Heart, Gamepad2, 
  Search, ChevronRight, Dices, Clock, ArrowUpRight
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db, collection, getDocs } from './utils/firebase';

export type MainNavView = 
  | 'home' 
  | 'categories' 
  | 'popular' 
  | 'new' 
  | 'recently_played' 
  | 'favorites' 
  | 'achievements' 
  | 'leaderboard' 
  | 'news' 
  | 'help';

function MainApp() {
  const { favorites, toggleFavorite, isAdmin } = useAuth();
  const [games, setGames] = useState<GameItem[]>(INITIAL_GAMES);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [detailGame, setDetailGame] = useState<GameItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentView, setCurrentView] = useState<MainNavView>('home');
  const [sortBy] = useState<'rating' | 'plays' | 'title'>('rating');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Subviews
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'favorites' | 'settings'>('overview');
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Sync custom games registered via Admin console
  useEffect(() => {
    loadCustomGames();
  }, []);

  const loadCustomGames = async () => {
    try {
      const snap = await getDocs(collection(db, 'custom_games'));
      const customList: GameItem[] = [];
      snap.forEach(d => {
        const item = d.data() as any;
        customList.push({
          id: item.id || d.id,
          slug: item.slug,
          title: item.title,
          category: item.category || 'Action',
          rating: item.rating || 5.0,
          ratingCount: item.ratingCount || 1,
          plays: item.plays || 0,
          featured: item.featured,
          isTrending: item.isTrending,
          description: item.description,
          instructions: item.instructions || 'Use keyboard or touch controls.',
          controls: [{ key: 'Arrow Keys / Touch', action: 'Move / Action' }],
          tags: ['Custom', item.category],
          themeColor: item.themeColor || '#6D28D9',
          accentColor: item.accentColor || '#6D28D9',
          thumbnailUrl: item.thumbnailUrl || '/game-assets/neon-drift.svg',
          developer: 'Community Creator',
          releaseYear: '2026'
        });
      });
      if (customList.length > 0) {
        setGames([...INITIAL_GAMES, ...customList]);
      }
    } catch {
      // Offline fallback ready
    }
  };

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === '/' && !isSearchOpen && (document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsAuthOpen(false);
        setDetailGame(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const handleSelectGame = (game: GameItem) => {
    sound.playClick();
    setSelectedGame(game);
    setIsAdminOpen(false);
    setIsProfileOpen(false);
    setDetailGame(null);

    // Record in local storage recently played
    try {
      const stored = localStorage.getItem('gamenova_recent_plays');
      const recents: string[] = stored ? JSON.parse(stored) : [];
      const updated = [game.id, ...recents.filter(id => id !== game.id && id !== game.slug)].slice(0, 10);
      localStorage.setItem('gamenova_recent_plays', JSON.stringify(updated));
    } catch {
      // fallback
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSurpriseMe = () => {
    if (!games || games.length === 0) return;
    sound.playPowerUp();
    const randomIndex = Math.floor(Math.random() * games.length);
    setSelectedGame(games[randomIndex]);
  };

  // 1. Trending Games
  const trendingGames = useMemo(() => {
    const prioritySlugs = ['zombie-escape', 'neon-drift', 'cyber-samurai', 'galaxy-commander', 'desert-racer', 'jungle-run'];
    const matched = prioritySlugs
      .map(slug => games.find(g => g.slug === slug))
      .filter((g): g is GameItem => Boolean(g));
    const rest = games.filter(g => (g.isTrending || g.trending) && !prioritySlugs.includes(g.slug));
    return [...matched, ...rest].slice(0, 6);
  }, [games]);

  // 2. Popular Games
  const popularGames = useMemo(() => {
    const prioritySlugs = ['bubble-blast', 'gem-match', 'street-hoops', 'robot-brawl', 'deep-sea', 'sky-warrior'];
    const matched = prioritySlugs
      .map(slug => games.find(g => g.slug === slug))
      .filter((g): g is GameItem => Boolean(g));
    const rest = games.filter(g => (g.isPopular || g.rating >= 4.8) && !prioritySlugs.includes(g.slug));
    return [...matched, ...rest].slice(0, 6);
  }, [games]);

  // 3. Featured games for Hero Showcase
  const featuredGames = useMemo(() => {
    const prioritySlugs = ['zombie-escape', 'neon-drift', 'cyber-samurai', 'mecha-battle', 'galaxy-commander'];
    const matched = prioritySlugs
      .map(slug => games.find(g => g.slug === slug))
      .filter((g): g is GameItem => Boolean(g));
    return matched.length > 0 ? matched : games.slice(0, 5);
  }, [games]);

  // 5. Recently played games
  const recentlyPlayedGames = useMemo(() => {
    try {
      const stored = localStorage.getItem('gamenova_recent_plays');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        const matches = ids
          .map(id => games.find(g => g.id === id || g.slug === id))
          .filter((g): g is GameItem => Boolean(g));
        if (matches.length > 0) return matches;
      }
    } catch {
      // fallback
    }
    return games.slice(0, 6);
  }, [games]);

  // Filtered Catalog
  const catalogGames = useMemo(() => {
    let result = games.filter(game => {
      // Category filter
      if (selectedCategory !== 'all') {
        const catMatch = 
          game.category.toLowerCase() === selectedCategory.toLowerCase() ||
          game.category.toLowerCase().includes(selectedCategory.toLowerCase());
        if (!catMatch) return false;
      }

      // Tab filter
      if (currentView === 'popular' && game.rating < 4.7) return false;
      if (currentView === 'new' && !game.isNew) return false;
      if (currentView === 'favorites' && !favorites.includes(game.id)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = game.title.toLowerCase().includes(q);
        const matchCat = game.category.toLowerCase().includes(q);
        const matchDesc = (game.description || '').toLowerCase().includes(q);
        const matchTags = (game.tags || []).some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCat && !matchDesc && !matchTags) return false;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'plays') return (b.plays || 0) - (a.plays || 0);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [games, selectedCategory, currentView, searchQuery, favorites, sortBy]);

  const handleNavigate = (view: MainNavView | string) => {
    setSelectedGame(null);
    setIsAdminOpen(false);
    setIsProfileOpen(false);
    setDetailGame(null);

    if (view === 'recent' || view === 'recently_played') {
      setCurrentView('recently_played');
      setSelectedCategory('all');
      return;
    }

    const validViews: MainNavView[] = [
      'home', 'categories', 'popular', 'new', 'recently_played', 
      'favorites', 'achievements', 'leaderboard', 'news', 'help'
    ];

    if (validViews.includes(view as MainNavView)) {
      setCurrentView(view as MainNavView);
      if (view === 'categories' || view === 'popular' || view === 'new') {
        setSelectedCategory('all');
      }
    } else {
      setSelectedCategory(view);
      setCurrentView('home');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#111827] flex flex-col font-sans selection:bg-[#6D28D9] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentView}
        onNavigate={handleNavigate}
        favoritesCount={favorites.length}
        onOpenSearch={() => setIsSearchOpen(true)}
        onSelectFavoritesTab={() => handleNavigate('favorites')}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenProfileModal={(tab = 'overview') => {
          setSelectedGame(null);
          setIsAdminOpen(false);
          setProfileTab(tab);
          setIsProfileOpen(true);
        }}
        onOpenAdmin={() => {
          if (isAdmin) {
            setSelectedGame(null);
            setIsProfileOpen(false);
            setIsAdminOpen(true);
          }
        }}
      />

      {/* FULLSCREEN GAME PLAYER RUNTIME */}
      {selectedGame ? (
        <GamePlayer
          game={selectedGame}
          onBack={() => setSelectedGame(null)}
          onSelectGame={handleSelectGame}
          allGames={games}
        />
      ) : (
        /* CLEAN GAME-FIRST PLATFORM MAIN LAYOUT */
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isAdminOpen ? (
            /* Admin Dashboard */
            <AdminDashboard
              games={games}
              onBack={() => setIsAdminOpen(false)}
              onUpdateGamesList={loadCustomGames}
            />
          ) : isProfileOpen ? (
            /* User Profile & Stats */
            <UserProfileModal
              games={games}
              onClose={() => setIsProfileOpen(false)}
              onSelectGame={handleSelectGame}
              initialTab={profileTab}
              onOpenAuthModal={() => setIsAuthOpen(true)}
            />
          ) : currentView === 'categories' ? (
            /* Dedicated Categories Directory View & Category Game Listings */
            <div className="space-y-8 animate-fade-in">
              {selectedCategory === 'all' ? (
                /* All Categories Directory */
                <>
                  <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
                    <div className="max-w-xl">
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-[#6D28D9] text-xs font-bold uppercase">
                        Game Categories
                      </span>
                      <h1 className="font-display font-black text-3xl text-[#111827] tracking-tight mt-2">
                        Explore Game Categories
                      </h1>
                      <p className="text-sm text-slate-600 mt-1">
                        Select a category to browse and play instantly in your browser with 60 FPS HTML5 performance.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                    {CATEGORIES.map(category => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        isSelected={false}
                        onSelect={(catName) => {
                          setSelectedCategory(catName);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                /* Specific Category Game Listing */
                <>
                  <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] mb-3 cursor-pointer group"
                        >
                          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
                          <span>Back to All Categories</span>
                        </button>
                        <h1 className="font-display font-black text-3xl text-[#111827] tracking-tight">
                          {selectedCategory} Games
                        </h1>
                        <p className="text-sm text-slate-600 mt-1">
                          {CATEGORIES.find(c => c.name.toLowerCase() === selectedCategory.toLowerCase())?.description || 
                           `Browse all ${selectedCategory} games available on GAMENOVA.`}
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-xl bg-purple-50 border border-purple-100 text-[#6D28D9] text-xs font-bold shrink-0">
                        {catalogGames.length} Titles
                      </span>
                    </div>

                    {/* Quick Category Switcher Pills */}
                    <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                          selectedCategory === 'all'
                            ? 'bg-[#6D28D9] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All Categories
                      </button>
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                            selectedCategory.toLowerCase() === cat.name.toLowerCase()
                              ? 'bg-[#6D28D9] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Games Grid for Category */}
                  {catalogGames.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
                      <p className="text-slate-500 text-sm">No games found in this category.</p>
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className="mt-4 px-4 py-2 rounded-xl bg-[#6D28D9] text-white font-bold text-xs"
                      >
                        Browse All Categories
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                      {catalogGames.map(game => (
                        <GameCard
                          key={game.id}
                          game={game}
                          onSelect={handleSelectGame}
                          isFavorite={favorites.includes(game.id)}
                          onToggleFavorite={() => toggleFavorite(game.id, game.slug)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : currentView === 'popular' || currentView === 'new' ? (
            /* Dedicated Popular / New Catalog View */
            <div className="space-y-8 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111827] tracking-tight flex items-center gap-2.5">
                    {currentView === 'popular' ? (
                      <Trophy className="w-6 h-6 text-amber-500" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-[#6D28D9]" />
                    )}
                    <span>
                      {currentView === 'popular' ? 'Popular Games' : 'New Releases'}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Showing {catalogGames.length} titles
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search titles..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#111827] placeholder-slate-400 outline-none focus:border-[#6D28D9] shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                {catalogGames.map(game => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={handleSelectGame}
                    isFavorite={favorites.includes(game.id)}
                    onToggleFavorite={() => toggleFavorite(game.id, game.slug)}
                  />
                ))}
              </div>
            </div>
          ) : currentView === 'recently_played' ? (
            /* Recently Played View */
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111827] tracking-tight flex items-center gap-2.5">
                    <Clock className="w-6 h-6 text-[#6D28D9]" />
                    <span>Recently Played Games</span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Resume your latest sessions instantly
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                {recentlyPlayedGames.map(game => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onSelect={handleSelectGame}
                    isFavorite={favorites.includes(game.id)}
                    onToggleFavorite={() => toggleFavorite(game.id, game.slug)}
                  />
                ))}
              </div>
            </div>
          ) : currentView === 'favorites' ? (
            /* Favorites View */
            <div className="space-y-8 animate-fade-in">
              <div>
                <h1 className="font-display font-black text-2xl sm:text-3xl text-[#111827] tracking-tight flex items-center gap-2.5">
                  <Heart className="w-6 h-6 fill-current text-rose-500" />
                  <span>Favorite Games</span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {catalogGames.length} saved titles ready for instant launch
                </p>
              </div>

              {catalogGames.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-3">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg text-[#111827]">No Favorite Games Saved Yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Click the heart icon on any game card to bookmark it for quick access.
                  </p>
                  <button
                    onClick={() => handleNavigate('home')}
                    className="mt-5 px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                  >
                    <span>Browse All Games</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {catalogGames.map(game => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onSelect={handleSelectGame}
                      isFavorite={favorites.includes(game.id)}
                      onToggleFavorite={() => toggleFavorite(game.id, game.slug)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : currentView === 'achievements' ? (
            /* Achievements View */
            <AchievementsView games={games} onSelectGame={handleSelectGame} />
          ) : currentView === 'leaderboard' ? (
            /* Global Leaderboard View */
            <LeaderboardView games={games} onSelectGame={handleSelectGame} />
          ) : currentView === 'news' ? (
            /* News & Patch Notes View */
            <NewsUpdatesView />
          ) : currentView === 'help' ? (
            /* Help Center View */
            <HelpCenterView />
          ) : (
            /* HOME DISCOVERY FEED: Hero + Category Row + Trending Games + Popular Games + Full Vault */
            <div className="space-y-10 pb-16">
              {/* 1. HERO BANNER SECTION */}
              <section>
                <HeroShowcase
                  games={featuredGames}
                  onSelectGame={handleSelectGame}
                  onViewDetails={(game) => setDetailGame(game)}
                  favorites={favorites}
                  onToggleFavorite={(id) => {
                    const target = games.find(g => g.id === id);
                    if (target) toggleFavorite(target.id, target.slug);
                  }}
                />
              </section>

              {/* 2. TRENDING GAMES */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <h2 className="font-display font-bold text-lg text-[#111827]">
                      Trending Games
                    </h2>
                  </div>
                  <button
                    onClick={() => handleNavigate('popular')}
                    className="text-xs text-slate-500 hover:text-[#6D28D9] flex items-center gap-1 cursor-pointer transition-colors font-semibold"
                  >
                    <span>View More</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                  {trendingGames.map(game => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onSelect={handleSelectGame}
                      isFavorite={favorites.includes(game.id)}
                      onToggleFavorite={() => toggleFavorite(game.id, game.slug)}
                    />
                  ))}
                </div>
              </section>

              {/* 4. POPULAR GAMES */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h2 className="font-display font-bold text-lg text-[#111827]">
                      Popular Games
                    </h2>
                  </div>
                  <button
                    onClick={() => handleNavigate('popular')}
                    className="text-xs text-slate-500 hover:text-[#6D28D9] flex items-center gap-1 cursor-pointer transition-colors font-semibold"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
                  {popularGames.map(game => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onSelect={handleSelectGame}
                      isFavorite={favorites.includes(game.id)}
                      onToggleFavorite={() => toggleFavorite(game.id, game.slug)}
                    />
                  ))}
                </div>
              </section>

              {/* 5. ALL 30 TITLES CATALOG GRID */}
              <section className="pt-6 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0F172A] text-purple-400 flex items-center justify-center border border-slate-800 shadow-xs shrink-0 mt-0.5">
                      <Gamepad2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-purple-400" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="font-display font-black text-xl sm:text-2xl text-[#0F172A] tracking-tight">
                          All Games
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-[#6D28D9] border border-purple-200/70 tracking-normal">
                          30 Games
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-normal tracking-wide">
                        Play instantly • No downloads required
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleSurpriseMe}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-xs shrink-0"
                    >
                      <Dices className="w-4 h-4 text-[#6D28D9]" />
                      <span className="hidden sm:inline">Random Game</span>
                    </button>

                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search titles..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#111827] placeholder-slate-400 outline-none focus:border-[#6D28D9] shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                <GameDiscoveryGrid
                  games={catalogGames}
                  onSelectGame={handleSelectGame}
                  favorites={favorites}
                  onToggleFavorite={(id) => {
                    const target = games.find(g => g.id === id);
                    if (target) toggleFavorite(target.id, target.slug);
                  }}
                  layout="standard"
                />
              </section>
            </div>
          )}
        </main>
      )}

      {/* Game Details Modal */}
      <GameDetailModal
        game={detailGame}
        isOpen={Boolean(detailGame)}
        onClose={() => setDetailGame(null)}
        onPlay={handleSelectGame}
        isFavorite={detailGame ? favorites.includes(detailGame.id) : false}
        onToggleFavorite={(id) => {
          const target = games.find(g => g.id === id);
          if (target) toggleFavorite(target.id, target.slug);
        }}
      />

      {/* Fast Live Search Palette */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        games={games}
        onSelectGame={handleSelectGame}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={() => {
          setIsAuthOpen(false);
        }}
      />

      {/* Clean Footer */}
      {!selectedGame && (
        <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-[#111827] text-sm">GAMENOVA</span>
              <span className="text-slate-400">• Free Browser Gaming</span>
            </div>
            <p className="text-slate-400 text-xs">
              © {new Date().getFullYear()} GAMENOVA. All rights reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
