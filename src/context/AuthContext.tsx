import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile,
  onAuthStateChanged, 
  User,
  doc, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  handleFirestoreError,
  OperationType
} from '../utils/firebase';
import { UserCustomization, DEFAULT_CUSTOMIZATION } from '../data/customizationItems';

export interface UserProfile {
  userId: string;
  uid?: string;
  username: string;
  displayName: string;
  display_name?: string;
  email: string;
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
  
  const code = error.code || '';
  const message = error.message || '';

  if (code) {
    console.warn('[GAMENOVA Auth]', code, message);
  }

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email already in use';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed.';
    case 'auth/operation-not-allowed':
      return 'Sign-in method is currently disabled.';
    default:
      if (message.includes('Username is required') ||
          message.includes('Username must be') ||
          message.includes('Invalid email') ||
          message.includes('Password must be') ||
          message.includes('Passwords do not match') ||
          message.includes('Email already in use')) {
        return message;
      }
      return 'Authentication failed. Please check your credentials and try again.';
  }
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  username: string;
  loading: boolean;
  authStatus: AuthStatus;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (email: string, pass: string, username: string) => Promise<UserProfile>;
  signInWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateCustomization: (customization: Partial<UserCustomization>) => Promise<void>;
  favorites: string[];
  toggleFavorite: (gameId: string, gameSlug: string) => Promise<void>;
  submitScore: (gameSlug: string, gameTitle: string, score: number) => Promise<void>;
  submitRating: (gameSlug: string, rating: number, review?: string) => Promise<void>;
  getGameScores: (gameSlug: string) => Promise<GameScoreRecord[]>;
  getGameRatings: (gameSlug: string) => Promise<GameRatingRecord[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking_session');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Derived username ensuring safe fallback (prefer displayName if present, then username)
  const username = profile?.displayName || profile?.username || user?.displayName || (user ? 'GAMENOVA User' : '');

  // Check if current user has admin authority
  const isAdmin = Boolean(
    profile?.role === 'admin' ||
    user?.email?.toLowerCase() === 'efxbro1237@gmail.com' ||
    user?.email?.toLowerCase() === 'admin@gamenova.io'
  );

  // Fetch or safely bootstrap Firestore user profile
  const fetchOrCreateUserProfile = useCallback(async (fbUser: User, customUsername?: string): Promise<UserProfile> => {
    setAuthStatus('loading_profile');
    const userDocRef = doc(db, 'users', fbUser.uid);
    let snap;
    try {
      snap = await getDoc(userDocRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
    }

    const isUserAdmin = 
      fbUser.email?.toLowerCase() === 'efxbro1237@gmail.com' ||
      fbUser.email?.toLowerCase() === 'admin@gamenova.io' ||
      fbUser.email?.toLowerCase().includes('admin');

    if (snap && snap.exists()) {
      const data = snap.data();
      const resolvedAvatar = data.customization?.avatarUrl || data.avatarUrl || data.avatar_url || fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`;
      const existingProfile: UserProfile = {
        userId: fbUser.uid,
        uid: fbUser.uid,
        username: data.username || customUsername || fbUser.displayName || 'GAMENOVA User',
        displayName: data.displayName || data.display_name || data.username || fbUser.displayName || 'GAMENOVA User',
        display_name: data.display_name || data.displayName || data.username || fbUser.displayName || 'GAMENOVA User',
        email: fbUser.email || data.email || '',
        avatarUrl: resolvedAvatar,
        avatar_url: resolvedAvatar,
        role: data.role || (isUserAdmin ? 'admin' : 'user'),
        level: data.level || 1,
        xp: data.xp || 100,
        bio: data.bio || 'Arcade player on GAMENOVA',
        customization: {
          ...DEFAULT_CUSTOMIZATION,
          ...(data.customization || {}),
          avatarUrl: resolvedAvatar
        },
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        created_at: data.created_at || data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
        updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
      };
      setProfile(existingProfile);
      setAuthStatus('profile_loaded');
      return existingProfile;
    }

    // Bootstrap first-time profile
    const chosenUsername = customUsername || fbUser.displayName || fbUser.email?.split('@')[0] || 'GAMENOVA User';
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      userId: fbUser.uid,
      uid: fbUser.uid,
      username: chosenUsername,
      displayName: chosenUsername,
      display_name: chosenUsername,
      email: fbUser.email || '',
      avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      avatar_url: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      role: isUserAdmin ? 'admin' : 'user',
      level: 1,
      xp: 150,
      bio: 'Arcade challenger on GAMENOVA',
      customization: DEFAULT_CUSTOMIZATION,
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now
    };

    try {
      await setDoc(userDocRef, newProfile);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${fbUser.uid}`);
    }

    setProfile(newProfile);
    setAuthStatus('profile_loaded');
    return newProfile;
  }, []);

  const loadUserFavorites = useCallback(async (userId: string) => {
    try {
      const q = query(collection(db, 'favorites'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const favGameIds: string[] = [];
      snap.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.gameId) favGameIds.push(item.gameId);
      });
      setFavorites(favGameIds);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'favorites');
    }
  }, []);

  // Primary Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        setAuthStatus('authenticated');
        try {
          await fetchOrCreateUserProfile(fbUser);
          await loadUserFavorites(fbUser.uid);
        } catch (err) {
          console.warn('[GAMENOVA Auth] Safe fallback after profile fetch notice:', err);
          // Safe fallback so UI is not stuck
          setProfile({
            userId: fbUser.uid,
            uid: fbUser.uid,
            username: fbUser.displayName || 'GAMENOVA User',
            displayName: fbUser.displayName || 'GAMENOVA User',
            email: fbUser.email || '',
            avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
            role: 'user',
            level: 1,
            xp: 100,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          setAuthStatus('profile_loaded');
        }
      } else {
        setProfile(null);
        setFavorites([]);
        setAuthStatus('unauthenticated');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchOrCreateUserProfile, loadUserFavorites]);

  // Firebase Email/Password Registration with Unique Username Reservation
  const register = async (email: string, pass: string, rawUsername: string): Promise<UserProfile> => {
    const trimmedUsername = rawUsername.trim();
    
    // Validation: Username format
    if (!trimmedUsername) {
      throw new Error('Username is required.');
    }
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      throw new Error('Username must be between 3 and 20 characters.');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      throw new Error('Username can only contain letters, numbers, and underscores.');
    }

    const normalizedUsername = trimmedUsername.toLowerCase();

    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;

    // 2. Update Firebase Auth displayName
    try {
      await fbUpdateProfile(fbUser, { displayName: trimmedUsername });
    } catch (e) {
      console.warn('Update displayName warning:', e);
    }

    // 3. Save complete user profile in users/{uid} in Firestore
    const isUserAdmin = 
      email.toLowerCase() === 'efxbro1237@gmail.com' ||
      email.toLowerCase() === 'admin@gamenova.io' ||
      email.toLowerCase().includes('admin');

    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      userId: fbUser.uid,
      uid: fbUser.uid,
      username: trimmedUsername,
      displayName: trimmedUsername,
      display_name: trimmedUsername,
      email: fbUser.email || email.trim(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
      role: isUserAdmin ? 'admin' : 'user',
      level: 1,
      xp: 200,
      bio: 'Arcade champion on GAMENOVA',
      customization: DEFAULT_CUSTOMIZATION,
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now
    };

    const userDocRef = doc(db, 'users', fbUser.uid);
    try {
      await setDoc(userDocRef, newProfile);
    } catch (e) {
      console.warn('[GAMENOVA Auth] Firestore write profile error:', e);
    }

    // 4. Reserve unique username mapping in Firestore (non-blocking)
    try {
      const usernameDocRef = doc(db, 'usernames', normalizedUsername);
      await setDoc(usernameDocRef, {
        username: trimmedUsername,
        userId: fbUser.uid,
        uid: fbUser.uid,
        createdAt: now
      });
    } catch (e) {
      // Non-fatal if usernames reservation fails
      console.warn('[GAMENOVA Auth] Username reservation notice:', e);
    }

    // 5. Update local application auth state with confirmed profile
    setUser(fbUser);
    setProfile(newProfile);
    setAuthStatus('profile_loaded');
    return newProfile;
  };

  // Firebase Email/Password Login
  const login = async (email: string, pass: string): Promise<UserProfile> => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;
    setUser(fbUser);
    const loadedProfile = await fetchOrCreateUserProfile(fbUser);
    await loadUserFavorites(fbUser.uid);
    return loadedProfile;
  };

  // Firebase Google Popup Sign In
  const signInWithGoogle = async (): Promise<UserProfile> => {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;
    setUser(fbUser);
    const loadedProfile = await fetchOrCreateUserProfile(fbUser);
    await loadUserFavorites(fbUser.uid);
    return loadedProfile;
  };

  // Logout
  const logout = async () => {
    await fbSignOut(auth);
    setUser(null);
    setProfile(null);
    setFavorites([]);
    setAuthStatus('unauthenticated');
  };

  // Forgot password
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  // Update profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('You must be signed in to update your profile.');
    }
    const userDocRef = doc(db, 'users', user.uid);
    const now = new Date().toISOString();

    const previousUsername = profile?.username;
    let newUsername = data.username !== undefined ? data.username.trim() : undefined;
    let newDisplayName = data.displayName !== undefined ? data.displayName.trim() : undefined;

    // Validate Display Name if provided
    if (newDisplayName !== undefined) {
      if (!newDisplayName) {
        throw new Error('Display name cannot be empty.');
      }
      if (newDisplayName.length < 2 || newDisplayName.length > 30) {
        throw new Error('Display name must be between 2 and 30 characters.');
      }
    }

    // Validate Username if provided
    if (newUsername !== undefined) {
      if (!newUsername) {
        throw new Error('Username cannot be empty.');
      }
      if (newUsername.length < 3 || newUsername.length > 20) {
        throw new Error('Username must be between 3 and 20 characters.');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        throw new Error('Username can only contain letters, numbers, and underscores.');
      }

      // Check uniqueness in usernames registry if username changed
      const normalizedNew = newUsername.toLowerCase();
      const normalizedOld = previousUsername ? previousUsername.toLowerCase() : '';

      if (normalizedNew !== normalizedOld) {
        const usernameDocRef = doc(db, 'usernames', normalizedNew);
        try {
          const usernameSnap = await getDoc(usernameDocRef);
          if (usernameSnap.exists()) {
            const existingMapping = usernameSnap.data();
            if (existingMapping.userId && existingMapping.userId !== user.uid) {
              throw new Error(`Username "@${newUsername}" is already taken by another gamer.`);
            }
          }
        } catch (uErr: any) {
          if (uErr.message && uErr.message.includes('already taken')) {
            throw uErr;
          }
          console.warn('[GAMENOVA Auth] Username check notice:', uErr);
        }

        // Reserve the new username in usernames collection
        try {
          await setDoc(usernameDocRef, {
            username: newUsername,
            userId: user.uid,
            uid: user.uid,
            updatedAt: now
          });

          // Clean up old username doc if it existed and was different
          if (normalizedOld && normalizedOld !== normalizedNew) {
            try {
              const oldUsernameDocRef = doc(db, 'usernames', normalizedOld);
              await deleteDoc(oldUsernameDocRef);
            } catch (delErr) {
              console.warn('[GAMENOVA Auth] Old username cleanup notice:', delErr);
            }
          }
        } catch (reserveErr) {
          console.warn('[GAMENOVA Auth] Username reservation notice:', reserveErr);
        }
      }
    }

    // Build payload to merge into users/{uid}
    const updatedCustomization: UserCustomization = {
      ...(profile?.customization || DEFAULT_CUSTOMIZATION),
      ...(data.customization || {})
    };

    const targetAvatar = data.avatarUrl || data.avatar_url || data.customization?.avatarUrl || profile?.avatarUrl || profile?.avatar_url;
    if (targetAvatar) {
      updatedCustomization.avatarUrl = targetAvatar;
    }

    const updatedFields: Record<string, any> = {
      ...data,
      customization: updatedCustomization,
      updatedAt: now,
      updated_at: now
    };

    if (targetAvatar) {
      updatedFields.avatarUrl = targetAvatar;
      updatedFields.avatar_url = targetAvatar;
    }

    if (newDisplayName !== undefined) {
      updatedFields.displayName = newDisplayName;
      updatedFields.display_name = newDisplayName;
    }
    if (newUsername !== undefined) {
      updatedFields.username = newUsername;
    }
    if (data.bio !== undefined) {
      updatedFields.bio = data.bio.trim();
    }

    try {
      await setDoc(userDocRef, updatedFields, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      throw new Error('Failed to save profile changes to database.');
    }

    // Synchronize Firebase Auth displayName if applicable
    const targetAuthName = newDisplayName || newUsername || profile?.displayName || profile?.username;
    if (targetAuthName && auth.currentUser) {
      try {
        await fbUpdateProfile(auth.currentUser, { 
          displayName: targetAuthName,
          photoURL: targetAvatar || auth.currentUser.photoURL
        });
      } catch (authErr) {
        console.warn('[GAMENOVA Auth] Firebase Auth displayName sync notice:', authErr);
      }
    }

    // Update local React state immediately so UI updates in real-time across navbar, header, modals
    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedFields,
        displayName: newDisplayName !== undefined ? newDisplayName : prev.displayName,
        display_name: newDisplayName !== undefined ? newDisplayName : prev.display_name,
        username: newUsername !== undefined ? newUsername : prev.username,
        bio: data.bio !== undefined ? data.bio.trim() : prev.bio,
        avatarUrl: targetAvatar || prev.avatarUrl,
        avatar_url: targetAvatar || prev.avatar_url,
        customization: updatedCustomization
      };
    });
  };

  // Customization update with Firestore persistence
  const updateCustomization = async (newCustomization: Partial<UserCustomization>) => {
    if (!user) {
      throw new Error('You must be signed in to save customization.');
    }
    const userDocRef = doc(db, 'users', user.uid);
    const now = new Date().toISOString();

    const mergedCustomization: UserCustomization = {
      ...(profile?.customization || DEFAULT_CUSTOMIZATION),
      ...newCustomization
    };

    const updatePayload: Record<string, any> = {
      customization: mergedCustomization,
      updatedAt: now,
      updated_at: now
    };

    if (newCustomization.avatarUrl) {
      updatePayload.avatarUrl = newCustomization.avatarUrl;
      updatePayload.avatar_url = newCustomization.avatarUrl;
    }

    try {
      await setDoc(userDocRef, updatePayload, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
      throw new Error('Failed to save customization to database.');
    }

    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatePayload,
        customization: mergedCustomization,
        avatarUrl: newCustomization.avatarUrl || prev.avatarUrl,
        avatar_url: newCustomization.avatarUrl || prev.avatar_url,
      };
    });
  };

  // Cloud Favorites sync
  const toggleFavorite = async (gameId: string, gameSlug: string) => {
    const nextFavorites = favorites.includes(gameId)
      ? favorites.filter(id => id !== gameId)
      : [...favorites, gameId];
    setFavorites(nextFavorites);

    if (!user) return;

    try {
      const q = query(
        collection(db, 'favorites'), 
        where('userId', '==', user.uid), 
        where('gameId', '==', gameId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const docItem of snap.docs) {
          await deleteDoc(docItem.ref);
        }
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          gameId,
          gameSlug,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'favorites');
    }
  };

  // High Score Submission with XP progression
  const submitScore = async (gameSlug: string, gameTitle: string, score: number) => {
    if (!user || !profile) return;

    try {
      await addDoc(collection(db, 'scores'), {
        userId: user.uid,
        username: profile.username || user.displayName || 'GAMENOVA User',
        avatarUrl: profile.avatarUrl,
        gameSlug,
        gameTitle,
        score,
        achievedAt: new Date().toISOString()
      });

      // Award XP
      const currentXp = (profile.xp || 0) + Math.min(Math.floor(score / 10), 100);
      const newLevel = Math.floor(currentXp / 500) + 1;
      await updateUserProfile({ xp: currentXp, level: newLevel });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'scores');
    }
  };

  // User Game Rating Submission
  const submitRating = async (gameSlug: string, rating: number, review: string = '') => {
    if (!user || !profile) return;

    try {
      await addDoc(collection(db, 'ratings'), {
        userId: user.uid,
        username: profile.username || user.displayName || 'GAMENOVA User',
        avatarUrl: profile.avatarUrl,
        gameSlug,
        rating,
        review,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'ratings');
    }
  };

  // Leaderboard retrieval
  const getGameScores = async (gameSlug: string): Promise<GameScoreRecord[]> => {
    try {
      const q = query(
        collection(db, 'scores'),
        where('gameSlug', '==', gameSlug),
        orderBy('score', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const scores: GameScoreRecord[] = [];
      snap.forEach(docSnap => {
        scores.push({ id: docSnap.id, ...docSnap.data() } as GameScoreRecord);
      });
      return scores;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'scores');
      return [];
    }
  };

  // Ratings retrieval
  const getGameRatings = async (gameSlug: string): Promise<GameRatingRecord[]> => {
    try {
      const q = query(
        collection(db, 'ratings'),
        where('gameSlug', '==', gameSlug),
        limit(15)
      );
      const snap = await getDocs(q);
      const ratings: GameRatingRecord[] = [];
      snap.forEach(docSnap => {
        ratings.push({ id: docSnap.id, ...docSnap.data() } as GameRatingRecord);
      });
      return ratings;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'ratings');
      return [];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        username,
        loading,
        authStatus,
        isAdmin,
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

