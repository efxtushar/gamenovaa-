export type MainCategory = 
  | 'Action' 
  | 'Racing' 
  | 'Adventure' 
  | 'Arcade' 
  | 'Puzzle' 
  | 'Sports' 
  | 'Shooting' 
  | 'Strategy' 
  | 'Platformer' 
  | 'Other';

export interface CategoryItem {
  id: string;
  name: MainCategory;
  slug: string;
  description: string;
  iconName: string;
  color: string;
  accent: string;
  gameCount: number;
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-action',
    name: 'Action',
    slug: 'action',
    description: 'Fast-paced melee brawls, cyber boxing, laser katana swordplay, and gladiator arenas.',
    iconName: 'Swords',
    color: '#ef4444',
    accent: '#f87171',
    gameCount: 5
  },
  {
    id: 'cat-racing',
    name: 'Racing',
    slug: 'racing',
    description: 'High-speed stunt tracks, neon cyberpunk drifts, desert dune rallies, and combat demolition derbies.',
    iconName: 'Flame',
    color: '#00f0ff',
    accent: '#ff007f',
    gameCount: 4
  },
  {
    id: 'cat-adventure',
    name: 'Adventure',
    slug: 'adventure',
    description: 'Submarine deep-sea diving, pirate treasure expeditions, temple ruins, and haunted mansions.',
    iconName: 'Compass',
    color: '#22c55e',
    accent: '#4ade80',
    gameCount: 4
  },
  {
    id: 'cat-arcade',
    name: 'Arcade',
    slug: 'arcade',
    description: 'Classic reflex chasers, cosmic rocket dodging, color gates, and high-score runs.',
    iconName: 'Gamepad2',
    color: '#f43f5e',
    accent: '#fb923c',
    gameCount: 3
  },
  {
    id: 'cat-puzzle',
    name: 'Puzzle',
    slug: 'puzzle',
    description: 'Brain-teasing bubble shooters, gem cascades, and arcane rune-matching puzzles.',
    iconName: 'Sparkles',
    color: '#ec4899',
    accent: '#c084fc',
    gameCount: 3
  },
  {
    id: 'cat-sports',
    name: 'Sports',
    slug: 'sports',
    description: 'Street basketball shootouts, championship mini-golf, and alpine snowboarding.',
    iconName: 'Trophy',
    color: '#f97316',
    accent: '#fde047',
    gameCount: 3
  },
  {
    id: 'cat-shooting',
    name: 'Shooting',
    slug: 'shooting',
    description: 'Tactical fighter jet dogfights, galactic starship dogfights, and survival bullet storms.',
    iconName: 'Crosshair',
    color: '#38bdf8',
    accent: '#818cf8',
    gameCount: 2
  },
  {
    id: 'cat-strategy',
    name: 'Strategy',
    slug: 'strategy',
    description: 'Castle siege defense, asteroid mining logistics, RTS galactic conquest, and farm management.',
    iconName: 'Shield',
    color: '#fbbf24',
    accent: '#f59e0b',
    gameCount: 4
  },
  {
    id: 'cat-platformer',
    name: 'Platformer',
    slug: 'platformer',
    description: 'Precision jump mechanics, rooftop ninja dashes, and retro 8-bit platforming.',
    iconName: 'Layers',
    color: '#8b5cf6',
    accent: '#a78bfa',
    gameCount: 2
  },
  {
    id: 'cat-other',
    name: 'Other',
    slug: 'other',
    description: 'Casual deep-sea rod fishing, timing games, and unique sandbox experiences.',
    iconName: 'Dices',
    color: '#10b981',
    accent: '#34d399',
    gameCount: 1
  }
];
