import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GameItem } from '../data/games';
import { 
  Trophy, Heart, Check, Calendar, Mail, User as UserIcon, ArrowLeft,
  Edit3, Shield, Lock, AlertCircle, Loader2, Sparkles, X, CheckCircle2,
  Palette, UserCheck, Flame
} from 'lucide-react';
import { sound } from '../utils/soundEffects';
import { GameCard } from './GameCard';
import { 
  CUSTOMIZATION_ITEMS, 
  CUSTOMIZATION_CATEGORIES, 
  CustomizationItem, 
  UserCustomization 
} from '../data/customizationItems';

interface UserProfileModalProps {
  games: GameItem[];
  onClose: () => void;
  onSelectGame: (game: GameItem) => void;
  initialTab?: 'overview' | 'favorites' | 'settings';
  onOpenAuthModal?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  games,
  onClose,
  onSelectGame,
  initialTab = 'overview',
}) => {
  const { user, profile, username, updateUserProfile, updateCustomization, favorites, toggleFavorite, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'favorites' | 'settings'>(initialTab);
  
  // Edit Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [editBio, setEditBio] = useState('');
  
  // Customization State (Selected within Edit Profile)
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedFrame, setSelectedFrame] = useState('frame_default');
  const [selectedBadge, setSelectedBadge] = useState('badge_vanguard');
  
  // Active Customize Category Tab
  const [customCategory, setCustomCategory] = useState<'avatar' | 'avatarFrame' | 'badge'>('avatar');

  // Form status & validation
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userHighScores, setUserHighScores] = useState<any[]>([]);

  // Sync state whenever profile changes
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || profile.display_name || profile.username || user?.displayName || '');
      setUsernameInput(profile.username || '');
      setEditBio(profile.bio || '');
      const currentAvatar = profile.customization?.avatarUrl || profile.avatarUrl || profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid || 'player'}`;
      setSelectedAvatar(currentAvatar);
      setSelectedAvatarId(profile.customization?.avatarId || 'avatar_nova_pilot');
      setSelectedFrame(profile.customization?.avatarFrame || 'frame_default');
      setSelectedBadge(profile.customization?.badge || 'badge_vanguard');
    } else if (user) {
      setDisplayName(user.displayName || 'GAMENOVA User');
      setUsernameInput(user.email?.split('@')[0] || 'player');
      setEditBio('Arcade player on GAMENOVA');
      const defaultUrl = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`;
      setSelectedAvatar(defaultUrl);
      setSelectedAvatarId('avatar_nova_pilot');
      setSelectedFrame('frame_default');
      setSelectedBadge('badge_vanguard');
    }
  }, [profile, user]);

  // Load sample high scores
  useEffect(() => {
    const fetchScores = async () => {
      try {
        const topScores = [
          { gameTitle: 'Zombie Escape', score: 14850, date: 'Today', rank: '#1' },
          { gameTitle: 'Neon Drift', score: 9200, date: 'Yesterday', rank: '#3' },
          { gameTitle: 'Sky Warrior', score: 6400, date: '3 days ago', rank: '#5' },
        ];
        setUserHighScores(topScores);
      } catch (e) {
        console.error(e);
      }
    };
    fetchScores();
  }, []);

  if (!user && !profile) return null;

  const favoriteGames = (games || []).filter(g => favorites.includes(g.id));
  const currentDisplayName = profile?.displayName || profile?.display_name || profile?.username || username || 'Gamer';
  const currentUsername = profile?.username || user?.displayName || 'player';
  const activeAvatar = profile?.customization?.avatarUrl || profile?.avatarUrl || profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid || 'player'}`;
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Active Member';

  const equippedFrameItem = CUSTOMIZATION_ITEMS.find(
    i => i.id === (profile?.customization?.avatarFrame || 'frame_default') && i.category === 'avatarFrame'
  );
  const equippedFrameClass = equippedFrameItem?.previewValue || 'border-2 border-slate-300';

  const equippedBadgeItem = CUSTOMIZATION_ITEMS.find(
    i => i.id === (profile?.customization?.badge || 'badge_vanguard') && i.category === 'badge'
  );

  // Live preview frame and badge in customize mode
  const previewFrameItem = CUSTOMIZATION_ITEMS.find(
    i => i.id === selectedFrame && i.category === 'avatarFrame'
  );
  const previewFrameClass = previewFrameItem?.previewValue || 'border-2 border-slate-300';

  const previewBadgeItem = CUSTOMIZATION_ITEMS.find(
    i => i.id === selectedBadge && i.category === 'badge'
  );

  // Save all profile and customization changes together
  const handleSaveProfileAndCustomization = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    sound.playClick();

    const trimmedDisplayName = displayName.trim();
    const trimmedUsername = usernameInput.trim();
    const trimmedBio = editBio.trim();

    // 1. Validation: Display Name
    if (!trimmedDisplayName) {
      setErrorMessage('Display Name cannot be empty.');
      return;
    }
    if (trimmedDisplayName.length < 2) {
      setErrorMessage('Display Name must be at least 2 characters.');
      return;
    }
    if (trimmedDisplayName.length > 30) {
      setErrorMessage('Display Name cannot exceed 30 characters.');
      return;
    }

    // 2. Validation: Username
    if (!trimmedUsername) {
      setErrorMessage('Username cannot be empty.');
      return;
    }
    if (trimmedUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters.');
      return;
    }
    if (trimmedUsername.length > 20) {
      setErrorMessage('Username cannot exceed 20 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setErrorMessage('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (trimmedBio.length > 200) {
      setErrorMessage('Player bio cannot exceed 200 characters.');
      return;
    }

    setSaving(true);

    try {
      const customizationPayload: UserCustomization = {
        avatarId: selectedAvatarId,
        avatarUrl: selectedAvatar,
        avatarFrame: selectedFrame,
        badge: selectedBadge
      };

      await updateUserProfile({
        displayName: trimmedDisplayName,
        display_name: trimmedDisplayName,
        username: trimmedUsername,
        bio: trimmedBio,
        avatarUrl: selectedAvatar,
        avatar_url: selectedAvatar,
        customization: customizationPayload
      });

      sound.playPowerUp();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      console.error('[GAMENOVA Profile Edit Error]', err);
      const friendlyMsg = err?.message || 'Failed to update profile. Please try again.';
      setErrorMessage(friendlyMsg);
    } finally {
      setSaving(false);
    }
  };

  // Quick select avatar
  const handleSelectAvatar = (item: CustomizationItem) => {
    sound.playClick();
    setSelectedAvatar(item.previewValue);
    setSelectedAvatarId(item.id);
  };

  // Quick select frame
  const handleSelectFrame = (item: CustomizationItem) => {
    sound.playClick();
    setSelectedFrame(item.id);
  };

  // Quick select badge
  const handleSelectBadge = (item: CustomizationItem) => {
    sound.playClick();
    setSelectedBadge(item.id);
  };

  // Category items
  const activeCategoryItems = CUSTOMIZATION_ITEMS.filter(i => i.category === customCategory);

  // Check if anything was modified
  const hasChanges = 
    (profile?.displayName || '') !== displayName.trim() ||
    (profile?.username || '') !== usernameInput.trim() ||
    (profile?.bio || '') !== editBio.trim() ||
    (profile?.customization?.avatarUrl || profile?.avatarUrl || '') !== selectedAvatar ||
    (profile?.customization?.avatarFrame || 'frame_default') !== selectedFrame ||
    (profile?.customization?.badge || 'badge_vanguard') !== selectedBadge;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-[#111827] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Games</span>
        </button>

        {/* Global Save Toast Notice */}
        {savedSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Profile & customization saved!</span>
          </div>
        )}
      </div>

      {/* Header Profile Summary Card */}
      <div className="rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <img
                src={activeAvatar}
                alt={currentDisplayName}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-purple-50 object-cover shadow-sm transition-all ${equippedFrameClass}`}
                referrerPolicy="no-referrer"
              />
              {equippedBadgeItem && (
                <span className="absolute -top-2 -left-2 bg-slate-900 border border-purple-400 text-purple-200 font-bold text-[9px] px-1.5 py-0.5 rounded-md shadow-xs">
                  {equippedBadgeItem.previewValue}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-[#111827]">
                  {currentDisplayName}
                </h1>
                <span className="text-xs font-mono font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  @{currentUsername}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                  isAdmin 
                    ? 'bg-amber-50 border border-amber-200 text-amber-700' 
                    : 'bg-purple-50 border border-purple-100 text-[#6D28D9]'
                }`}>
                  {isAdmin ? 'Portal Admin' : 'Verified Gamer'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] mt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Member since {memberSince}
                </span>
                {equippedBadgeItem && (
                  <span className="flex items-center gap-1 text-[#6D28D9] font-bold">
                    <span>Rank:</span>
                    <span>{equippedBadgeItem.name}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-2 max-w-lg leading-relaxed">
                {profile?.bio || 'Arcade player on GAMENOVA. Ready for high scores and new challenges.'}
              </p>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0 w-full sm:w-auto justify-around sm:justify-start">
              <div className="text-center px-3">
                <div className="text-[10px] font-semibold text-[#6B7280] uppercase">Favorites</div>
                <div className="text-base font-bold text-rose-500">{favorites.length}</div>
              </div>
              <div className="w-[1px] h-8 bg-slate-200" />
              <div className="text-center px-3">
                <div className="text-[10px] font-semibold text-[#6B7280] uppercase">Equipped Badge</div>
                <div className="text-xs font-bold text-[#6D28D9] truncate max-w-[100px]">{equippedBadgeItem?.name || 'Vanguard'}</div>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('settings');
              }}
              className={`w-full sm:w-auto px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-[#6D28D9] text-white border-[#6D28D9]'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-[#6D28D9]'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('overview');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#6D28D9] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#111827] hover:bg-slate-50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Overview & Records</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('favorites');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'bg-[#6D28D9] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#111827] hover:bg-slate-50'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorites ({favorites.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('settings');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#6D28D9] text-white shadow-xs'
                : 'text-slate-600 hover:text-[#111827] hover:bg-slate-50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile & Customize</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* High Scores Section */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-[#111827] flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Personal Best Records</span>
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">Verified Plays</span>
              </div>

              <div className="space-y-2.5">
                {userHighScores.map((score, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[#111827]">{score.gameTitle}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{score.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-[#6D28D9]">{score.score.toLocaleString()} PTS</div>
                      <div className="text-[10px] font-bold text-emerald-600">{score.rank} Tier</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Customization Summary */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-[#111827] flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#6D28D9]" />
                  <span>Gamer Profile Setup</span>
                </h3>
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveTab('settings');
                  }}
                  className="text-xs font-bold text-[#6D28D9] hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center gap-4">
                <img
                  src={activeAvatar}
                  alt={currentDisplayName}
                  className={`w-16 h-16 rounded-xl bg-slate-800 object-cover ${equippedFrameClass}`}
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">{currentDisplayName}</div>
                  <div className="text-xs font-mono text-purple-300">@{currentUsername}</div>
                  {equippedBadgeItem && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-900/80 border border-purple-500/40 text-purple-200 text-[10px] font-bold">
                      <span>{equippedBadgeItem.previewValue}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Frame</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">{equippedFrameItem?.name || 'Tactical Clean'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Badge</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">{equippedBadgeItem?.name || 'Vanguard'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          <div>
            {favoriteGames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {favoriteGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(game.id, game.slug)}
                    onSelect={() => {
                      onClose();
                      onSelectGame(game);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200/80">
                <Heart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-display font-bold text-base text-[#111827]">No favorites yet</h3>
                <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
                  Click the heart icon on any game card to bookmark it for quick access.
                </p>
              </div>
            )}
          </div>
        )}

        {/* EDIT PROFILE & CUSTOMIZE TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-rose-700 font-medium">
                  {errorMessage}
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Success Notification */}
            {savedSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-800 font-bold">
                  Profile and customization changes saved successfully to your Firestore account!
                </div>
              </div>
            )}

            <form onSubmit={handleSaveProfileAndCustomization} className="space-y-6">
              {/* 1. GAMER IDENTITY & USERNAME EDITING */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-display font-black text-lg sm:text-xl text-[#111827] flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-[#6D28D9]" />
                    <span>Gamer Identity</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your unique gamer handle and display name
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Username Handle */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Username Handle <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">
                        {usernameInput.length} / 20
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                        @
                      </span>
                      <input
                        type="text"
                        disabled={saving}
                        maxLength={20}
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value.replace(/\s+/g, ''))}
                        placeholder="alex_nova"
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#6D28D9] focus:ring-2 focus:ring-purple-100 text-xs text-[#111827] font-mono outline-none transition-all shadow-xs"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Letters, numbers, and underscores (3-20 characters).
                    </p>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Display Name <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-mono text-slate-400">
                        {displayName.length} / 30
                      </span>
                    </div>
                    <input
                      type="text"
                      disabled={saving}
                      maxLength={30}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Nova"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:border-[#6D28D9] focus:ring-2 focus:ring-purple-100 text-xs text-[#111827] outline-none transition-all shadow-xs"
                    />
                    <p className="text-[11px] text-slate-400">
                      Your public gamer title shown on top headers and leaderboards.
                    </p>
                  </div>
                </div>

                {/* Player Bio */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Player Bio
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      {editBio.length} / 200
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    disabled={saving}
                    maxLength={200}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Share your favorite genres or gaming style..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:border-[#6D28D9] focus:ring-2 focus:ring-purple-100 text-xs text-[#111827] outline-none transition-all resize-none shadow-xs"
                  />
                </div>
              </div>

              {/* 2. CUSTOMIZE SECTION (AVATARS, FRAMES, BADGES) */}
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-lg space-y-6">
                {/* Header & Live Preview */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-900/60 border border-purple-500/30 flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <h3 className="font-display font-black text-xl text-white">
                        Customize
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose your avatar icon, frame, and badge. All items are available immediately with no level locks.
                    </p>
                  </div>

                  {/* Live Avatar Preview Card */}
                  <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl shrink-0">
                    <div className="relative shrink-0">
                      <img
                        src={selectedAvatar || activeAvatar}
                        alt="Preview"
                        className={`w-12 h-12 rounded-xl bg-slate-900 object-cover ${previewFrameClass}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Live Preview</div>
                      <div className="text-xs font-bold text-white truncate max-w-[120px]">{displayName || currentDisplayName}</div>
                      {previewBadgeItem && (
                        <div className="text-[9px] font-bold text-purple-300 mt-0.5">{previewBadgeItem.previewValue}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Selection Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-800/80">
                  {CUSTOMIZATION_CATEGORIES.map((cat) => {
                    const isActive = customCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setCustomCategory(cat.id as any);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                          isActive
                            ? 'bg-[#6D28D9] text-white shadow-[0_0_12px_rgba(109,40,217,0.5)] border border-purple-400'
                            : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 1. AVATAR ICON SELECTION GRID */}
                {customCategory === 'avatar' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Click an avatar icon to select it for your gamer profile:</span>
                      <span className="text-[11px] font-mono text-purple-400 font-bold">{activeCategoryItems.length} Avatars</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                      {activeCategoryItems.map((item) => {
                        const isSelected = (selectedAvatar === item.previewValue) || (selectedAvatarId === item.id);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectAvatar(item)}
                            className={`p-3 rounded-2xl border transition-all relative flex flex-col items-center justify-between cursor-pointer select-none group ${
                              isSelected
                                ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-400/50 shadow-[0_0_14px_rgba(168,85,247,0.35)]'
                                : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-purple-500/40'
                            }`}
                          >
                            {/* Top Selected Indicator */}
                            <div className="w-full flex items-center justify-end mb-1">
                              {isSelected ? (
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-purple-400/50 transition-colors" />
                              )}
                            </div>

                            {/* Avatar Image */}
                            <div className="my-1">
                              <img
                                src={item.previewValue}
                                alt={item.name}
                                className="w-16 h-16 rounded-xl bg-slate-900 object-cover shadow-sm group-hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            {/* Item Name */}
                            <div className="mt-2 text-center w-full">
                              <div className="text-xs font-bold text-white truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. AVATAR FRAME SELECTION GRID */}
                {customCategory === 'avatarFrame' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Select a frame border to surround your avatar:</span>
                      <span className="text-[11px] font-mono text-purple-400 font-bold">{activeCategoryItems.length} Frames</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                      {activeCategoryItems.map((item) => {
                        const isSelected = selectedFrame === item.id;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectFrame(item)}
                            className={`p-3.5 rounded-2xl border transition-all relative flex flex-col items-center justify-between cursor-pointer select-none group ${
                              isSelected
                                ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-400/50 shadow-[0_0_14px_rgba(168,85,247,0.35)]'
                                : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-purple-500/40'
                            }`}
                          >
                            <div className="w-full flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-white">{item.name}</span>
                              {isSelected ? (
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-700" />
                              )}
                            </div>

                            {/* Frame Preview */}
                            <div className="my-2 p-2">
                              <img
                                src={selectedAvatar || activeAvatar}
                                alt="Frame preview"
                                className={`w-14 h-14 rounded-xl bg-slate-900 object-cover ${item.previewValue}`}
                                referrerPolicy="no-referrer"
                              />
                            </div>

                            <p className="text-[10px] text-slate-400 text-center line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. PROFILE BADGE SELECTION GRID */}
                {customCategory === 'badge' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Select a profile badge to represent your gaming status:</span>
                      <span className="text-[11px] font-mono text-purple-400 font-bold">{activeCategoryItems.length} Badges</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                      {activeCategoryItems.map((item) => {
                        const isSelected = selectedBadge === item.id;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectBadge(item)}
                            className={`p-4 rounded-2xl border transition-all relative flex flex-col items-center justify-between cursor-pointer select-none group ${
                              isSelected
                                ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-400/50 shadow-[0_0_14px_rgba(168,85,247,0.35)]'
                                : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 hover:border-purple-500/40'
                            }`}
                          >
                            <div className="w-full flex items-center justify-end mb-1">
                              {isSelected ? (
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-700" />
                              )}
                            </div>

                            <div className="text-2xl mb-1">{item.previewValue.split(' ')[0]}</div>
                            <span className="text-xs font-bold text-purple-200 bg-purple-900/60 px-2.5 py-0.5 rounded-md border border-purple-500/40 my-1">
                              {item.previewValue}
                            </span>

                            <p className="text-[10px] text-slate-400 text-center line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SAVE CHANGES & CANCEL CONTROLS */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-[#111827]">Ready to apply changes?</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your username, display name, avatar, frame, and badge will sync directly to your Firestore profile.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      sound.playClick();
                      if (profile) {
                        setDisplayName(profile.displayName || profile.display_name || profile.username || user?.displayName || '');
                        setUsernameInput(profile.username || '');
                        setEditBio(profile.bio || '');
                        const currentAvatar = profile.customization?.avatarUrl || profile.avatarUrl || profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid || 'player'}`;
                        setSelectedAvatar(currentAvatar);
                        setSelectedAvatarId(profile.customization?.avatarId || 'avatar_nova_pilot');
                        setSelectedFrame(profile.customization?.avatarFrame || 'frame_default');
                        setSelectedBadge(profile.customization?.badge || 'badge_vanguard');
                      }
                      setErrorMessage(null);
                      setActiveTab('overview');
                    }}
                    className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
