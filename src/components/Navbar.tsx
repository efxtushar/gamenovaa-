import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  Heart, 
  Search,
  User as UserIcon,
  Menu,
  X,
  Edit3
} from 'lucide-react';
import { sound } from '../utils/soundEffects';
import { useAuth } from '../context/AuthContext';
import { CUSTOMIZATION_ITEMS } from '../data/customizationItems';

interface NavbarProps {
  currentTab?: string;
  onNavigate?: (tab: string, param?: string) => void;
  favoritesCount?: number;
  onOpenSearch?: () => void;
  onSelectFavoritesTab?: () => void;
  onOpenAuthModal?: () => void;
  onOpenChooseUsername?: () => void;
  onOpenProfileModal?: (tab?: 'overview' | 'favorites' | 'settings') => void;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab = 'home',
  onNavigate,
  favoritesCount = 0,
  onOpenSearch,
  onSelectFavoritesTab,
  onOpenAuthModal,
  onOpenChooseUsername,
  onOpenProfileModal,
  onOpenAdmin: _onOpenAdmin,
}) => {
  const { user, profile, loading } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Center navigation links: Home, Categories, Popular, New
  const centerNavLinks = [
    { id: 'home', label: 'Home' },
    { id: 'categories', label: 'Categories' },
    { id: 'popular', label: 'Popular' },
    { id: 'new', label: 'New' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (tabId: string) => {
    sound.playClick();
    if (onNavigate) onNavigate(tabId);
    setIsMobileMenuOpen(false);
  };

  const handleTriggerChooseUsername = () => {
    sound.playClick();
    if (onOpenChooseUsername) {
      onOpenChooseUsername();
    } else if (onOpenAuthModal) {
      onOpenAuthModal();
    }
  };

  const displayUsername = profile?.displayName || profile?.display_name || profile?.username || user?.displayName || 'Gamer';
  const avatarUrl = profile?.customization?.avatarUrl || profile?.avatarUrl || profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${displayUsername}`;
  
  // Customization equipped frame
  const customFrame = CUSTOMIZATION_ITEMS.find(
    i => i.id === (profile?.customization?.avatarFrame || 'frame_default') && i.category === 'avatarFrame'
  );
  const frameClass = customFrame?.previewValue || 'border-2 border-slate-300';

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer focus:outline-hidden touch-manipulation"
            aria-label="GAMENOVA Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#6D28D9] flex items-center justify-center text-white shadow-sm shadow-purple-500/20 group-hover:scale-105 group-hover:bg-[#5B21B6] transition-all">
              <Gamepad2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-[#111827] leading-none">
                GAMENOVA
              </span>
              <span className="hidden min-[360px]:inline-block text-[9px] sm:text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                Arcade Portal
              </span>
            </div>
          </button>
        </div>

        {/* Center: Clean Primary Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
          {centerNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#6D28D9] bg-purple-50 shadow-2xs'
                    : 'text-slate-600 hover:text-[#111827] hover:bg-slate-100/70'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#6D28D9] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Search Box, Favorites & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Quick Search Trigger */}
          {onOpenSearch && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenSearch();
              }}
              className="flex items-center justify-center gap-2 p-2 sm:px-3 sm:py-1.5 min-w-[36px] min-h-[36px] rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 text-slate-600 sm:text-slate-500 text-xs font-medium transition-colors cursor-pointer touch-manipulation"
              aria-label="Search games (Ctrl+K)"
            >
              <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-slate-600 sm:text-slate-500" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden lg:inline-block text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded-sm text-slate-400 font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Quick Favorites Trigger */}
          {onSelectFavoritesTab && (
            <button
              onClick={() => {
                sound.playClick();
                onSelectFavoritesTab();
              }}
              className={`relative flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-1.5 min-w-[36px] min-h-[36px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer touch-manipulation ${
                currentTab === 'favorites'
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
              title="Saved Favorites"
              aria-label="Favorites"
            >
              <Heart className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Favorites</span>
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:static sm:top-auto sm:right-auto px-1.5 py-0.2 min-w-[18px] text-center rounded-full bg-rose-500 sm:bg-rose-100 text-white sm:text-rose-600 text-[9px] sm:text-[10px] font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>
          )}

          {/* Profile Section */}
          {loading ? (
            <div className="w-9 sm:w-20 h-9 sm:h-8 rounded-xl bg-slate-100 animate-pulse" />
          ) : profile ? (
            /* Created Profile State with Avatar, Username & Dropdown */
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  sound.playClick();
                  setIsUserMenuOpen(!isUserMenuOpen);
                }}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pl-1.5 sm:pr-3 sm:py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 transition-all cursor-pointer shadow-xs group touch-manipulation"
                aria-label="User Account Menu"
              >
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl}
                    alt={displayUsername}
                    referrerPolicy="no-referrer"
                    className={`w-7 h-7 sm:w-7 sm:h-7 rounded-lg bg-purple-50 object-cover ${frameClass}`}
                  />
                </div>
                <span className="hidden min-[400px]:inline-block text-xs font-bold max-w-[80px] sm:max-w-[130px] truncate text-[#111827]">
                  {displayUsername}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-20px)] rounded-2xl bg-white border border-slate-200/90 shadow-xl shadow-slate-900/10 py-1.5 z-50 animate-fade-in">
                  {/* Top Header: Avatar and Username */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
                    <img
                      src={avatarUrl}
                      alt={displayUsername}
                      referrerPolicy="no-referrer"
                      className={`w-8 h-8 rounded-lg bg-purple-50 object-cover shrink-0 ${frameClass}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#111827] truncate leading-tight">{displayUsername}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">@{profile?.username || 'gamer'}</p>
                    </div>
                  </div>

                  {/* Menu Options: ONLY Profile and Edit Profile */}
                  <div className="p-1 space-y-0.5">
                    {onOpenProfileModal && (
                      <button
                        onClick={() => {
                          sound.playClick();
                          setIsUserMenuOpen(false);
                          onOpenProfileModal('overview');
                        }}
                        className="w-full px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#6D28D9] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors touch-manipulation"
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>Profile</span>
                      </button>
                    )}

                    {onOpenProfileModal && (
                      <button
                        onClick={() => {
                          sound.playClick();
                          setIsUserMenuOpen(false);
                          onOpenProfileModal('settings');
                        }}
                        className="w-full px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#6D28D9] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors touch-manipulation"
                      >
                        <Edit3 className="w-4 h-4 text-slate-400" />
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Neutral Profile/Avatar Icon button when no profile exists (NO Sign In) */
            <button
              onClick={handleTriggerChooseUsername}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 text-slate-700 hover:text-[#111827] transition-all cursor-pointer shadow-xs group touch-manipulation"
              title="Create Gamer Profile"
              aria-label="Create Gamer Profile"
            >
              <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-[#6D28D9] group-hover:border-purple-200 transition-colors">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-[#111827]">
                <span className="hidden min-[360px]:inline">Profile</span>
              </span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl md:hidden text-slate-700 hover:text-[#111827] bg-slate-100 hover:bg-slate-200/80 transition-colors touch-manipulation"
            aria-label="Toggle Mobile Navigation"
          >
            {isMobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-3 py-3 space-y-1 animate-fade-in shadow-lg">
          {centerNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleNav(link.id);
                }}
                className={`w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between touch-manipulation ${
                  isActive
                    ? 'text-[#6D28D9] bg-purple-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{link.label}</span>
                {isActive && <span className="w-2 h-2 rounded-full bg-[#6D28D9]" />}
              </button>
            );
          })}

          {/* Mobile Search Button inside drawer */}
          {onOpenSearch && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                sound.playClick();
                onOpenSearch();
              }}
              className="w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-2.5 touch-manipulation"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search All Games</span>
            </button>
          )}

          {/* Mobile Favorites Button inside drawer */}
          {onSelectFavoritesTab && (
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                sound.playClick();
                onSelectFavoritesTab();
              }}
              className="w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between touch-manipulation"
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>Favorites</span>
              </div>
              {favoritesCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
};
