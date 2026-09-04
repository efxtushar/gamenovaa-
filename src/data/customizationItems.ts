export interface CustomizationItem {
  id: string;
  name: string;
  category: 'avatar' | 'avatarFrame' | 'badge';
  description: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  previewValue: string; // url, css class, or badge text
}

export interface UserCustomization {
  avatarId?: string;
  avatarUrl?: string;
  avatarFrame?: string;
  badge?: string;
  nameTagStyle?: string;
  bannerTheme?: string;
}

export const DEFAULT_CUSTOMIZATION: UserCustomization = {
  avatarId: 'avatar_nova_pilot',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=nova_pilot',
  avatarFrame: 'frame_default',
  badge: 'badge_vanguard'
};

export const CUSTOMIZATION_CATEGORIES = [
  { id: 'avatar', label: 'Avatar Icon', description: 'Gamer avatars & robotic pilots' },
  { id: 'avatarFrame', label: 'Avatar Frame', description: 'Glowing neon & tactical borders' },
  { id: 'badge', label: 'Profile Badge', description: 'Honorary insignia & titles' }
] as const;

export const CUSTOMIZATION_ITEMS: CustomizationItem[] = [
  // ==================== 1. AVATARS / PROFILE ICONS ====================
  {
    id: 'avatar_nova_pilot',
    name: 'Nova Pilot',
    category: 'avatar',
    rarity: 'common',
    description: 'Standard issue tactical droid pilot.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=nova_pilot'
  },
  {
    id: 'avatar_apex_bot',
    name: 'Apex Bot',
    category: 'avatar',
    rarity: 'common',
    description: 'Autonomous competitive battle droid.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=apex_bot'
  },
  {
    id: 'avatar_cyber_rogue',
    name: 'Cyber Rogue',
    category: 'avatar',
    rarity: 'rare',
    description: 'Infiltrator unit with sub-space stealth shielding.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=cyber_rogue'
  },
  {
    id: 'avatar_mecha_striker',
    name: 'Mecha Striker',
    category: 'avatar',
    rarity: 'rare',
    description: 'Armored assault unit with heavy plasma pulse core.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=mecha_striker'
  },
  {
    id: 'avatar_neon_spectre',
    name: 'Neon Spectre',
    category: 'avatar',
    rarity: 'epic',
    description: 'Ethereal cyber-phantom powered by neon dark matter.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=neon_spectre'
  },
  {
    id: 'avatar_arcade_king',
    name: 'Arcade Monarch',
    category: 'avatar',
    rarity: 'epic',
    description: 'Crowned master of retro arcade leaderboards.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=arcade_king'
  },
  {
    id: 'avatar_cyber_ninja',
    name: 'Cyber Ninja',
    category: 'avatar',
    rarity: 'epic',
    description: 'Stealth assassin equipped with high-frequency quantum blades.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=cyber_ninja'
  },
  {
    id: 'avatar_valkyrie_mech',
    name: 'Valkyrie Overlord',
    category: 'avatar',
    rarity: 'legendary',
    description: 'Titan-class celestial sentinel with radiant plasma aura.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=valkyrie_mech'
  },
  {
    id: 'avatar_quantum_hacker',
    name: 'Quantum Hacker',
    category: 'avatar',
    rarity: 'rare',
    description: 'Cyber-security specialist who decrypts game matrixes.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=quantum_hacker'
  },
  {
    id: 'avatar_solar_champion',
    name: 'Solar Champion',
    category: 'avatar',
    rarity: 'epic',
    description: 'Solar-powered warrior of the high-velocity circuits.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=solar_champ'
  },
  {
    id: 'avatar_void_sovereign',
    name: 'Void Sovereign',
    category: 'avatar',
    rarity: 'legendary',
    description: 'Cosmic entity wielding the power of dark singularities.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=void_sovereign'
  },
  {
    id: 'avatar_pixel_crusader',
    name: 'Pixel Crusader',
    category: 'avatar',
    rarity: 'rare',
    description: 'Retro 8-bit warrior of the golden arcade age.',
    previewValue: 'https://api.dicebear.com/7.x/bottts/svg?seed=pixel_crusader'
  },

  // ==================== 2. AVATAR FRAMES ====================
  {
    id: 'frame_default',
    name: 'Tactical Clean',
    category: 'avatarFrame',
    rarity: 'common',
    description: 'Minimalist matte border engineered for clean profile visibility.',
    previewValue: 'border-2 border-slate-300'
  },
  {
    id: 'frame_cyber_neon',
    name: 'Cyber Neon Glow',
    category: 'avatarFrame',
    rarity: 'rare',
    description: 'Vibrant neon cyan ring with soft outer luminescence.',
    previewValue: 'border-2 border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.7)] ring-2 ring-cyan-400/50'
  },
  {
    id: 'frame_plasma_hex',
    name: 'Plasma Vanguard',
    category: 'avatarFrame',
    rarity: 'rare',
    description: 'High-energy ionic purple energy rim with tactical corner aura.',
    previewValue: 'border-2 border-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.8)] ring-2 ring-purple-400/60'
  },
  {
    id: 'frame_ionic_violet',
    name: 'Ionic Violet',
    category: 'avatarFrame',
    rarity: 'epic',
    description: 'Pulsing violet particle matrix with high resonance.',
    previewValue: 'border-2 border-violet-400 shadow-[0_0_18px_rgba(139,92,246,0.8)] ring-2 ring-violet-500/60'
  },
  {
    id: 'frame_golden_prestige',
    name: 'Golden Prestige',
    category: 'avatarFrame',
    rarity: 'legendary',
    description: 'Gleaming polished gold frame crafted for leaderboard champions.',
    previewValue: 'border-2 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.85)] ring-2 ring-amber-300/70'
  },
  {
    id: 'frame_void_obsidian',
    name: 'Void Obsidian',
    category: 'avatarFrame',
    rarity: 'epic',
    description: 'Dark matter obsidian rim with pulsing violet dark-flame resonance.',
    previewValue: 'border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.85)] ring-2 ring-fuchsia-400/60'
  },
  {
    id: 'frame_prismatic_apex',
    name: 'Prismatic Apex',
    category: 'avatarFrame',
    rarity: 'legendary',
    description: 'Chromatic aurora ring designed for elite GAMENOVA players.',
    previewValue: 'border-2 border-pink-500 shadow-[0_0_22px_rgba(236,72,153,0.85)] ring-2 ring-cyan-400/60'
  },

  // ==================== 3. PROFILE BADGES ====================
  {
    id: 'badge_vanguard',
    name: 'Vanguard',
    category: 'badge',
    rarity: 'common',
    description: 'Registered GAMENOVA contender.',
    previewValue: '🛡️ Vanguard'
  },
  {
    id: 'badge_speed_demon',
    name: 'Speedrunner',
    category: 'badge',
    rarity: 'rare',
    description: 'Reflex specialist across high-speed arcade courses.',
    previewValue: '⚡ Speedrunner'
  },
  {
    id: 'badge_high_roller',
    name: 'High Roller',
    category: 'badge',
    rarity: 'rare',
    description: 'Leaderboard score hunter and arcade challenger.',
    previewValue: '🎯 High Roller'
  },
  {
    id: 'badge_cyber_warlord',
    name: 'Cyber Warlord',
    category: 'badge',
    rarity: 'epic',
    description: 'Master tactician in multi-wave survival arenas.',
    previewValue: '⚔️ Cyber Warlord'
  },
  {
    id: 'badge_shadow_assassin',
    name: 'Shadow Spectre',
    category: 'badge',
    rarity: 'epic',
    description: 'Stealth operative with high precision scores.',
    previewValue: '👁️ Shadow Spectre'
  },
  {
    id: 'badge_grandmaster',
    name: 'Apex Master',
    category: 'badge',
    rarity: 'legendary',
    description: 'Top-tier GAMENOVA champion.',
    previewValue: '👑 Apex Master'
  },
  {
    id: 'badge_arcade_pro',
    name: 'Arcade Pro',
    category: 'badge',
    rarity: 'rare',
    description: 'Dedicated retro and modern arcade enthusiast.',
    previewValue: '🕹️ Arcade Pro'
  },
  {
    id: 'badge_champion',
    name: 'Nova Legend',
    category: 'badge',
    rarity: 'legendary',
    description: 'Legendary player insignia.',
    previewValue: '🏆 Nova Legend'
  }
];
