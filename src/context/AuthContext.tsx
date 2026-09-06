import React, { createContext, useContext, useState } from 'react';
import { 
  db, 
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  limit
} from '../utils/firebase';
import { UserCustomization, DEFAULT_CUSTOMIZATION } from '../data/customizationItems';

export interface UserProfile {
  userId: string;
  uid?: string;
  username: string;
  displayName: string;
  display_name?: string;
  email?: string;
  avatarUrl: string;
  avatar_url?: string;
  role: 'user' | 'moderator' | 'admin';
  level: number;
  xp: number;
  bio?: string;
  customization?: UserCustomization;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  preferences?: {
    soundEnabled?: boolean;
    theme?: string;
  };
}

export interface GameScoreRecord {
  id?: string;
  userId: string;
  username: string;
  avatarUrl: string;
  gameSlug: string;
  gameTitle: string;
  score: number;
  achievedAt: string;
}

export interface GameRatingRecord {
  id?: string;
  userId: string;
  username: string;
  avatarUrl: string;
  gameSlug: string;
  rating: number;
  review?: string;
  updatedAt: string;
}

export type AuthStatus = 
  | 'checking_session'
  | 'authenticated'
  | 'unauthenticated'
  | 'loading_profile'
  | 'profile_loaded'
  | 'error';

export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  return error.message || 'Action could not be completed.';
}

const LOCAL_PROFILE_KEY = 'gamenova_local_profile';
const LOCAL_FAVORITES_KEY = 'gamenova_favorites';
const LOCAL_SCORES_KEY = 'gamenova_scores';
const LOCAL_RATINGS_KEY = 'gamenova_ratings';

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  username: string;
  loading: boolean;
  authStatus: AuthStatus;
  isAdmin: boolean;
  createLocalProfile: (username: string, avatarUrl?: string, avatarId?: string) => UserProfile;
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (email: string, pass: string, username: string) => Promise<UserProfile>;
  signInWithGoogle: () => Promise<UserProfile>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  updateCustomization: (customization: Partial<UserCustomization>) => void;
  favorites: string[];
  toggleFavorite: (gameId: string, gameSlug: string) => void;
  submitScore: (gameSlug: string, gameTitle: string, score: number) => Promise<void>;
  submitRating: (gameSlug: string, rating: number, review?: string) => Promise<void>;
  getGameScores: (gameSlug: string) => Promise<GameScoreRecord[]>;
  getGameRatings: (gameSlug: string) => Promise<GameRatingRecord[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from localStorage for instant, zero-flicker loading
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[GAMENOVA Profile] Failed to read local profile:', e);
    }
    return null;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_FAVORITES_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[GAMENOVA Favorites] Failed to read local favorites:', e);
    }
    return [];
  });

  const loading = false;
  const authStatus: AuthStatus = profile ? 'profile_loaded' : 'unauthenticated';

  // Derived username ensuring safe fallback
  const username = profile?.displayName || profile?.username || '';

  // Local user has administrative authority to manage custom games and test features
  const isAdmin = true;

  // Create or set a local profile (no database, no password, instant)
  const createLocalProfile = (chosenUsername: string, chosenAvatarUrl?: string, chosenAvatarId?: string): UserProfile => {
    const trimmed = chosenUsername.trim() || 'Gamer';
    const now = new Date().toISOString();
    const avatarUrl = chosenAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmed)}`;
    
    const newProfile: UserProfile = {
      userId: 'local_' + Math.random().toString(36).substring(2, 9),
      uid: 'local_' + Math.random().toString(36).substring(2, 9),
      username: trimmed,
      displayName: trimmed,
      display_name: trimmed,
      avatarUrl,
      avatar_url: avatarUrl,
      role: 'admin',
      level: 1,
      xp: 150,
      bio: 'Arcade player on GAMENOVA. Ready for high scores and new challenges.',
      customization: {
        ...DEFAULT_CUSTOMIZATION,
        avatarId: chosenAvatarId || 'avatar_nova_pilot',
        avatarUrl
      },
      preferences: {
        soundEnabled: true,
        theme: 'dark'
      },
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now
    };

    try {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(newProfile));
    } catch (e) {
      console.warn('[GAMENOVA Profile] Failed to write local profile:', e);
    }

    setProfile(newProfile);
    return newProfile;
  };

  // Update profile attributes in localStorage
  const updateUserProfile = (data: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return null;
      const updated: UserProfile = {
        ...prev,
        ...data,
        displayName: data.displayName !== undefined ? data.displayName.trim() : (data.username ? data.username.trim() : prev.displayName),
        display_name: data.displayName !== undefined ? data.displayName.trim() : (data.username ? data.username.trim() : prev.display_name),
        username: data.username !== undefined ? data.username.trim() : prev.username,
        bio: data.bio !== undefined ? data.bio.trim() : prev.bio,
        avatarUrl: data.avatarUrl || data.avatar_url || prev.avatarUrl,
        avatar_url: data.avatarUrl || data.avatar_url || prev.avatar_url,
        customization: {
          ...(prev.customization || DEFAULT_CUSTOMIZATION),
          ...(data.customization || {}),
          avatarUrl: data.avatarUrl || data.avatar_url || prev.customization?.avatarUrl || prev.avatarUrl
        },
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      try {
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('[GAMENOVA Profile] Failed to save updated profile:', e);
      }
      return updated;
    });
  };

  // Update avatar, frames, and badges in localStorage
  const updateCustomization = (newCustomization: Partial<UserCustomization>) => {
    setProfile(prev => {
      if (!prev) return null;
      const mergedCustomization: UserCustomization = {
        ...(prev.customization || DEFAULT_CUSTOMIZATION),
        ...newCustomization
      };
      const updated: UserProfile = {
        ...prev,
        customization: mergedCustomization,
        avatarUrl: newCustomization.avatarUrl || prev.avatarUrl,
        avatar_url: newCustomization.avatarUrl || prev.avatar_url,
        updatedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      try {
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('[GAMENOVA Profile] Failed to save customization:', e);
      }
      return updated;
    });
  };

  // Reset / Clear local profile
  const logout = () => {
    try {
      localStorage.removeItem(LOCAL_PROFILE_KEY);
    } catch (e) {
      console.warn('[GAMENOVA Profile] Failed to clear local profile:', e);
    }
    setProfile(null);
  };

  // Toggle favorite games in localStorage
  const toggleFavorite = (gameId: string, _gameSlug: string) => {
    setFavorites(prev => {
      const next = prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId];
      try {
        localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('[GAMENOVA Favorites] Failed to write favorites:', e);
      }
      return next;
    });
  };

  // Compatibility stubs for any legacy auth calls
  const login = async (_email: string, _pass: string): Promise<UserProfile> => {
    return createLocalProfile(_email.split('@')[0] || 'Gamer');
  };

  const register = async (_email: string, _pass: string, rawUsername: string): Promise<UserProfile> => {
    return createLocalProfile(rawUsername);
  };

  const signInWithGoogle = async (): Promise<UserProfile> => {
    return createLocalProfile('Gamer');
  };

  const resetPassword = async (_email: string): Promise<void> => {
    return;
  };

  // Submit high score locally and optionally sync
  const submitScore = async (gameSlug: string, gameTitle: string, score: number) => {
    const currentUsername = profile?.username || 'Gamer';
    const currentAvatar = profile?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=player';
    
    const record: GameScoreRecord = {
      id: 'score_' + Date.now(),
      userId: profile?.userId || 'local_user',
      username: currentUsername,
      avatarUrl: currentAvatar,
      gameSlug,
      gameTitle,
      score,
      achievedAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem(LOCAL_SCORES_KEY);
      const list: GameScoreRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [record, ...list].slice(0, 100);
      localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save score locally', e);
    }

    // Award XP to local profile
    if (profile) {
      const currentXp = (profile.xp || 0) + Math.min(Math.floor(score / 10), 100);
      const newLevel = Math.floor(currentXp / 500) + 1;
      updateUserProfile({ xp: currentXp, level: newLevel });
    }

    // Best-effort push to Firestore if online
    try {
      await addDoc(collection(db, 'scores'), record);
    } catch {
      // Offline safe
    }
  };

  // Submit rating locally and optionally sync
  const submitRating = async (gameSlug: string, rating: number, review: string = '') => {
    const currentUsername = profile?.username || 'Gamer';
    const currentAvatar = profile?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=player';

    const record: GameRatingRecord = {
      id: 'rating_' + Date.now(),
      userId: profile?.userId || 'local_user',
      username: currentUsername,
      avatarUrl: currentAvatar,
      gameSlug,
      rating,
      review,
      updatedAt: new Date().toISOString()
    };

    try {
      const raw = localStorage.getItem(LOCAL_RATINGS_KEY);
      const list: GameRatingRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [record, ...list.filter(r => r.gameSlug !== gameSlug)].slice(0, 50);
      localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save rating locally', e);
    }

    try {
      await addDoc(collection(db, 'ratings'), record);
    } catch {
      // Offline safe
    }
  };

  // Retrieve scores
  const getGameScores = async (gameSlug: string): Promise<GameScoreRecord[]> => {
    try {
      const q = query(
        collection(db, 'scores'),
        where('gameSlug', '==', gameSlug),
        orderBy('score', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: GameScoreRecord[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as GameScoreRecord));
        return list;
      }
    } catch {
      // Offline fallback
    }

    try {
      const raw = localStorage.getItem(LOCAL_SCORES_KEY);
      if (raw) {
        const all: GameScoreRecord[] = JSON.parse(raw);
        return all
          .filter(s => s.gameSlug === gameSlug)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
      }
    } catch {
      // Fallback
    }

    return [];
  };

  // Retrieve ratings
  const getGameRatings = async (gameSlug: string): Promise<GameRatingRecord[]> => {
    try {
      const q = query(
        collection(db, 'ratings'),
        where('gameSlug', '==', gameSlug),
        limit(15)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list: GameRatingRecord[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as GameRatingRecord));
        return list;
      }
    } catch {
      // Offline fallback
    }

    try {
      const raw = localStorage.getItem(LOCAL_RATINGS_KEY);
      if (raw) {
        const all: GameRatingRecord[] = JSON.parse(raw);
        return all.filter(r => r.gameSlug === gameSlug);
      }
    } catch {
      // Fallback
    }

    return [];
  };

  return (
    <AuthContext.Provider
      value={{
        user: profile,
        profile,
        username,
        loading,
        authStatus,
        isAdmin,
        createLocalProfile,
        login,
        register,
        signInWithGoogle,
        logout,
        resetPassword,
        updateUserProfile,
        updateCustomization,
        favorites,
        toggleFavorite,
        submitScore,
        submitRating,
        getGameScores,
        getGameRatings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
