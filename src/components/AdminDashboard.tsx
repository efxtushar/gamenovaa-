import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GameItem } from '../data/games';
import { 
  Plus, Edit2, Trash2, Star, Flame, Sparkles, 
  Gamepad2, Users, Database, AlertTriangle, CheckCircle, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from '../utils/firebase';
import { sound } from '../utils/soundEffects';

interface AdminDashboardProps {
  games: GameItem[];
  onBack: () => void;
  onUpdateGamesList?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  games,
  onBack,
  onUpdateGamesList
}) => {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'games' | 'stats' | 'add_game'>('games');
  const [userList, setUserList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // New Game Form state
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newCategory, setNewCategory] = useState('Action');
  const [newDesc, setNewDesc] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isTrending, setIsTrending] = useState(false);
  const [newThemeColor, setNewThemeColor] = useState('#7C3AED');
  const [savingGame, setSavingGame] = useState(false);

  useEffect(() => {
    if (activeTab === 'stats' && isAdmin) {
      loadRegisteredUsers();
    }
  }, [activeTab, isAdmin]);

  const loadRegisteredUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setUserList(list);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="p-8 rounded-2xl bg-[#131826] border border-rose-500/30 text-rose-300">
          <AlertTriangle className="w-12 h-12 mx-auto text-rose-400 mb-3" />
          <h2 className="font-display font-black text-2xl text-white">403 — RESTRICTED ACCESS</h2>
          <p className="mt-2 text-sm font-mono text-[#94A3B8] max-w-md mx-auto">
            You do not have administrative credentials to manage GAMENOVA arcade records.
          </p>
          <button
            onClick={onBack}
            className="mt-6 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
          >
            RETURN TO ARCADE
          </button>
        </div>
      </div>
    );
  }

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGame(true);
    sound.playClick();
    try {
      const slugVal = newSlug.trim() || newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await addDoc(collection(db, 'custom_games'), {
        id: `g-${slugVal}`,
        slug: slugVal,
        title: newTitle,
        category: newCategory,
        description: newDesc,
        instructions: newInstructions || 'Use Arrow Keys or Mouse to interact with the game world.',
        rating: 5.0,
        ratingCount: 1,
        plays: 0,
        featured: isFeatured,
        isTrending,
        themeColor: newThemeColor,
        accentColor: '#00E5FF',
        thumbnailUrl: `/game-assets/neon-drift.svg`,
        createdAt: new Date().toISOString()
      });
      setFeedback({ type: 'success', msg: `Custom game "${newTitle}" created successfully in Firestore!` });
      sound.playPowerUp();
      setNewTitle('');
      setNewSlug('');
      setNewDesc('');
      setNewInstructions('');
      if (onUpdateGamesList) onUpdateGamesList();
      setActiveTab('games');
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to save game' });
    } finally {
      setSavingGame(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Admin Top Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#131826] hover:bg-[#192032] border border-[#1E293B] text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#00E5FF] border border-[#7C3AED]/40 text-[10px] font-mono font-bold tracking-widest">
                ADMIN CONSOLE
              </span>
              <span className="text-xs font-mono text-[#94A3B8]">Authenticated: {profile?.username}</span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight mt-1">
              GAMENOVA SYSTEM MANAGEMENT
            </h1>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-[#131826] p-1.5 rounded-xl border border-[#1E293B]">
          <button
            onClick={() => setActiveTab('games')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'games'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#00E5FF] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Games ({games.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add_game')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add_game'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#00E5FF] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Game</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#00E5FF] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Data</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mt-4 p-4 rounded-xl text-xs flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* GAMES MANAGEMENT VIEW */}
      {activeTab === 'games' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl bg-[#131826] border border-[#1E293B] overflow-hidden">
            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-white">Registered Game Catalog</h3>
              <span className="text-xs font-mono text-[#94A3B8]">{games.length} total titles</span>
            </div>

            <div className="divide-y divide-[#1E293B] overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#080B12] text-[#94A3B8]">
                  <tr>
                    <th className="p-3">Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Rating</th>
                    <th className="p-3">Plays</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {games.map(g => (
                    <tr key={g.id} className="hover:bg-[#192032] transition-colors">
                      <td className="p-3 flex items-center gap-2">
                        <img src={g.thumbnailUrl} alt="" className="w-8 aspect-video rounded object-cover" />
                        <span className="font-sans font-semibold text-white">{g.title}</span>
                      </td>
                      <td className="p-3 text-[#94A3B8]">{g.category}</td>
                      <td className="p-3 text-amber-400">★ {g.rating.toFixed(1)}</td>
                      <td className="p-3 text-white">{(g.plays || 0).toLocaleString()}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW GAME FORM */}
      {activeTab === 'add_game' && (
        <div className="mt-6 max-w-2xl">
          <form onSubmit={handleCreateGame} className="p-6 rounded-2xl bg-[#131826] border border-[#1E293B] space-y-4">
            <h3 className="font-display font-bold text-base text-white">Register New Game</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Game Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Quantum Strike"
                className="w-full px-3 py-2 rounded-xl bg-[#080B12] border border-[#1E293B] text-xs text-white placeholder-slate-500 outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Slug (URL Key)</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value)}
                  placeholder="quantum-strike"
                  className="w-full px-3 py-2 rounded-xl bg-[#080B12] border border-[#1E293B] text-xs text-white placeholder-slate-500 outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080B12] border border-[#1E293B] text-xs text-white outline-none focus:border-[#7C3AED]"
                >
                  <option value="Action">Action</option>
                  <option value="Racing">Racing</option>
                  <option value="Shooter">Shooter</option>
                  <option value="Sports">Sports</option>
                  <option value="Puzzle">Puzzle</option>
                  <option value="Adventure">Adventure</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Short Description</label>
              <textarea
                rows={2}
                required
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="High-intensity cyber tactical combat..."
                className="w-full px-3 py-2 rounded-xl bg-[#080B12] border border-[#1E293B] text-xs text-white placeholder-slate-500 outline-none focus:border-[#7C3AED]"
              />
            </div>

            <button
              type="submit"
              disabled={savingGame}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00E5FF] text-white font-bold text-xs cursor-pointer shadow-md disabled:opacity-50"
            >
              {savingGame ? 'Registering Game...' : 'Save Game to Database'}
            </button>
          </form>
        </div>
      )}

      {/* STATS & USERS VIEW */}
      {activeTab === 'stats' && (
        <div className="mt-6 space-y-6">
          <div className="p-6 rounded-2xl bg-[#131826] border border-[#1E293B]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-white">Registered Users & Players</h3>
              <button
                onClick={loadRegisteredUsers}
                className="px-3 py-1 rounded-lg bg-[#080B12] text-xs text-[#00E5FF] border border-[#1E293B] flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingUsers ? (
              <p className="text-xs text-[#94A3B8] font-mono">Querying Firestore users collection...</p>
            ) : userList.length === 0 ? (
              <p className="text-xs text-[#94A3B8] font-mono">No users found or offline mode active.</p>
            ) : (
              <div className="divide-y divide-[#1E293B]">
                {userList.map((u, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-sans font-semibold">{u.displayName || u.username || 'Gamer'}</span>
                      {u.username && u.displayName && u.username !== u.displayName && (
                        <span className="text-purple-400 text-[10px]">@{u.username}</span>
                      )}
                    </div>
                    <span className="text-[#94A3B8]">{u.email}</span>
                    <span className="text-[#00E5FF]">LVL {u.level || 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
