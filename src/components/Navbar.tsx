import React, { useState, useRef, useEffect } from 'react';
import { 
  Gamepad2, 
  LogIn, 
  LogOut, 
  Heart, 
  Search,
  User as UserIcon,
  Shield,
  Menu,
  X,
  Sparkles
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
  onOpenProfileModal,
  onOpenAdmin,
}) => {
  const { user, profile, loading, logout, isAdmin } = useAuth();
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

  const handleNav = (tab: string) => {
    sound.playClick();
    setIsMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  // Extract precise username to display: displayName > username > user.displayName
  const displayUsername = profile?.displayName || profile?.display_name || profile?.username || user?.displayName || 'Gamer';
  const handleTag = profile?.username ? `@${profile.username}` : null;
  const avatarUrl = profile?.customization?.avatarUrl || profile?.avatarUrl || profile?.avatar_url || user?.photoURL || (user ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}` : '');

  const customFrame = CUSTOMIZATION_ITEMS.find(
    i => i.id === profile?.customization?.avatarFrame && i.category === 'avatarFrame'
  );
  const frameClass = customFrame?.previewValue || 'border border-purple-100';

  const customBadge = CUSTOMIZATION_ITEMS.find(
    i => i.id === profile?.customization?.badge && i.category === 'badge'
  );

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
            aria-label="GAMENOVA Home"
          >
            <div className="w-9 h-9 rounded-xl bg-[#6D28D9] flex items-center justify-center shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-black text-xl tracking-tight text-[#111827] group-hover:text-[#6D28D9] transition-colors leading-none">
              GAMENOVA
            </span>
          </button>
        </div>

        {/* Center Navigation: Home, Categories, Popular, New */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
          {centerNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white bg-[#6D28D9] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827] hover:bg-white/60'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Side: Search Box, Favorites & Authenticated User */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Box Trigger */}
          {onOpenSearch && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenSearch();
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-500 hover:text-[#111827] transition-all cursor-pointer shadow-xs"
              title="Search games (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">Search...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white text-slate-400 border border-slate-200">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Favorites Quick Access */}
          {onSelectFavoritesTab && (
            <button
              onClick={() => {
                sound.playClick();
                onSelectFavoritesTab();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs text-xs font-semibold ${
                currentTab === 'favorites'
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-[#111827]'
              }`}
              title="View Favorites"
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Favorites</span>
              {favoritesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>
          )}

          {/* User Auth Section */}
          {loading ? (
            <div className="w-20 h-8 rounded-xl bg-slate-100 animate-pulse" />
          ) : user ? (
            /* Logged In State with Username & Dropdown */
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  sound.playClick();
                  setIsUserMenuOpen(!isUserMenuOpen);
                }}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 transition-all cursor-pointer shadow-xs group"
                aria-label="User Account Menu"
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={displayUsername}
                    referrerPolicy="no-referrer"
                    className={`w-7 h-7 rounded-lg bg-purple-50 object-cover ${frameClass}`}
                  />
                </div>
                <span className="text-xs font-bold max-w-[100px] sm:max-w-[140px] truncate text-[#111827]">
                  {displayUsername}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-fade-in">
                  <div className="p-3 border-b border-slate-100 bg-slate-50/70 rounded-t-2xl flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl}
                        alt={displayUsername}
                        referrerPolicy="no-referrer"
                        className={`w-10 h-10 rounded-xl bg-purple-50 object-cover ${frameClass}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#111827] truncate">{displayUsername}</p>
                      {customBadge ? (
                        <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-[#6D28D9] text-[10px] font-bold">
                          <span>{customBadge.previewValue}</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium">Gamer</p>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    {onOpenProfileModal && (
                      <button
                        onClick={() => {
                          sound.playClick();
                          setIsUserMenuOpen(false);
                          onOpenProfileModal('overview');
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-[#6D28D9] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span>Profile</span>
                      </button>
                    )}

                    {isAdmin && onOpenAdmin && (
                      <button
                        onClick={() => {
                          sound.playClick();
                          setIsUserMenuOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-[#6D28D9]" />
                        <span>Admin Portal</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Logged Out State: Clean Sign In button */
            <button
              onClick={() => {
                sound.playClick();
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="px-4 py-1.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-xl md:hidden text-slate-600 hover:text-[#111827] hover:bg-slate-100 transition-colors"
            aria-label="Toggle Mobile Navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white px-4 py-3 space-y-1">
          {centerNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#6D28D9] bg-purple-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

