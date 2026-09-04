export interface CategoryItem {
  id: string;
  name: string;
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
    description: 'Fast-paced combat, mecha brawls, gladiator survival, and demolition derbies.',
    iconName: 'Swords',
    color: '#ef4444',
    accent: '#f87171',
    gameCount: 6
  },
  {
    id: 'cat-racing',
    name: 'Racing',
    slug: 'racing',
    description: 'High-speed cyber drifts, desert dune rallies, and vehicular showdowns.',
    iconName: 'Flame',
    color: '#00f0ff',
    accent: '#ff007f',
    gameCount: 2
  },
  {
    id: 'cat-arcade',
    name: 'Arcade',
    slug: 'arcade',
    description: 'Addictive classic gameplay, lightspeed reflex tests, and high-score chasers.',
    iconName: 'Gamepad2',
    color: '#f43f5e',
    accent: '#fb923c',
    gameCount: 3
  },
  {
    id: 'cat-puzzle',
    name: 'Puzzle',
    slug: 'puzzle',
    description: 'Brain-teasing bubble shooters, match-3 gems, and strategic cascades.',
    iconName: 'Sparkles',
    color: '#ec4899',
    accent: '#c084fc',
    gameCount: 2
  },
  {
    id: 'cat-sports',
    name: 'Sports',
    slug: 'sports',
    description: 'Street basketball shootouts and trick-shot physics arenas.',
    iconName: 'Trophy',
    color: '#f97316',
    accent: '#fde047',
    gameCount: 1
  },
  {
    id: 'cat-adventure',
    name: 'Adventure',
    slug: 'adventure',
    description: 'Retro 8-bit quests, ancient temple ruins, and mysterious caverns.',
    iconName: 'Compass',
    color: '#22c55e',
    accent: '#4ade80',
    gameCount: 2
  },
  {
    id: 'cat-shooter',
    name: 'Shooter',
    slug: 'shooter',
    description: 'Tactical fighter jets, sky dogfights, and bullet storm battles.',
    iconName: 'Crosshair',
    color: '#38bdf8',
    accent: '#fb923c',
    gameCount: 1
  },
  {
    id: 'cat-strategy',
    name: 'Strategy',
    slug: 'strategy',
    description: 'Fortress defense, elemental spells, and siege management.',
    iconName: 'Shield',
    color: '#fbbf24',
    accent: '#3b82f6',
    gameCount: 1
  },
  {
    id: 'cat-casual',
    name: 'Casual',
    slug: 'casual',
    description: 'Relaxing mini-golf courses, tropical boat fishing, and chill fun.',
    iconName: 'Smile',
    color: '#2dd4bf',
    accent: '#a7f3d0',
    gameCount: 2
  }
];
