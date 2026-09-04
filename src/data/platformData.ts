export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  xp: number;
  unlocked: boolean;
  unlockedAt?: string;
  gameSlug?: string;
}

export interface LeaderboardPlayer {
  rank: number;
  username: string;
  avatarUrl: string;
  score: number;
  game: string;
  badge: string;
  level: number;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  category: 'Event' | 'Update' | 'Tournament' | 'Patch';
  summary: string;
  readTime: string;
  featured?: boolean;
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-first-blood',
    title: 'First Blood',
    description: 'Score your first elimination in any action game.',
    icon: 'Swords',
    category: 'Combat',
    xp: 250,
    unlocked: true,
    unlockedAt: '2 hours ago',
    gameSlug: 'zombie-escape'
  },
  {
    id: 'ach-speed-demon',
    title: 'Speed Demon',
    description: 'Maintain 200+ MPH drift speed for 10 consecutive seconds in Neon Drift.',
    icon: 'Flame',
    category: 'Racing',
    xp: 500,
    unlocked: true,
    unlockedAt: 'Yesterday',
    gameSlug: 'neon-drift'
  },
  {
    id: 'ach-combo-master',
    title: 'Combo Maestro',
    description: 'Trigger a 10x bubble avalanche or gem cascade.',
    icon: 'Sparkles',
    category: 'Puzzle',
    xp: 350,
    unlocked: true,
    unlockedAt: '3 days ago',
    gameSlug: 'bubble-blast'
  },
  {
    id: 'ach-cyber-ronin',
    title: 'Cyber Ronin',
    description: 'Deflect 50 laser projectiles with katana parry in Cyber Samurai.',
    icon: 'Shield',
    category: 'Action',
    xp: 750,
    unlocked: false,
    gameSlug: 'cyber-samurai'
  },
  {
    id: 'ach-abyssal-diver',
    title: 'Abyssal Explorer',
    description: 'Reach a depth of 500m in Deep Sea Adventure without hull breach.',
    icon: 'Compass',
    category: 'Adventure',
    xp: 600,
    unlocked: false,
    gameSlug: 'deep-sea'
  },
  {
    id: 'ach-galaxy-fleet',
    title: 'Fleet Admiral',
    description: 'Annihilate 10 enemy battlecruisers in Galaxy Commander.',
    icon: 'Trophy',
    category: 'Strategy',
    xp: 1000,
    unlocked: false,
    gameSlug: 'galaxy-commander'
  },
  {
    id: 'ach-swish-king',
    title: 'Street Legend',
    description: 'Sink 5 consecutive fire-shots in Street Hoops.',
    icon: 'Trophy',
    category: 'Sports',
    xp: 450,
    unlocked: false,
    gameSlug: 'street-hoops'
  },
  {
    id: 'ach-mecha-overlord',
    title: 'Steel Titan',
    description: 'Defeat the Goliath Mecha boss on Veteran difficulty.',
    icon: 'Award',
    category: 'Action',
    xp: 1200,
    unlocked: false,
    gameSlug: 'mecha-battle'
  }
];

export const TOP_PLAYERS: LeaderboardPlayer[] = [
  {
    rank: 1,
    username: 'VortexValkyrie',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Vortex',
    score: 148200,
    game: 'Zombie Escape',
    badge: '👑 Grandmaster',
    level: 48
  },
  {
    rank: 2,
    username: 'NeonShadow_99',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow',
    score: 132450,
    game: 'Neon Drift',
    badge: '⚡ Cyber Elite',
    level: 42
  },
  {
    rank: 3,
    username: 'AeroStrike',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aero',
    score: 119800,
    game: 'Sky Warrior',
    badge: '🔥 Top Ace',
    level: 39
  },
  {
    rank: 4,
    username: 'PixelGlitch',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Glitch',
    score: 98600,
    game: 'Pixel Quest',
    badge: '💎 Master',
    level: 35
  },
  {
    rank: 5,
    username: 'QuantumBlade',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum',
    score: 91200,
    game: 'Cyber Samurai',
    badge: '⚔️ Ronin',
    level: 31
  }
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Season 3 Cyber Cup Tournament Live',
    date: 'Aug 21, 2026',
    category: 'Tournament',
    summary: 'Compete in Neon Drift and Zombie Escape for exclusive badges and 50,000 XP prize pool.',
    readTime: '2 min read',
    featured: true
  },
  {
    id: 'ann-2',
    title: 'Engine Update v2.5: 60 FPS Ultra Smoothing',
    date: 'Aug 20, 2026',
    category: 'Patch',
    summary: 'Optimized Canvas 2D render pipelines and zero-latency keyboard input buffering for all 30 titles.',
    readTime: '1 min read'
  },
  {
    id: 'ann-3',
    title: 'New Game Dropped: Cyber Samurai v2',
    date: 'Aug 19, 2026',
    category: 'Update',
    summary: 'Expanded wave attacks, neon bullet deflections, and thunder blade special abilities.',
    readTime: '3 min read'
  }
];
