export type GameModeState = 'START' | 'SHIP_SELECT' | 'PLAYING' | 'WAVE_CLEAR' | 'PAUSED' | 'GAMEOVER';

export type EnemyType = 'scout' | 'fighter' | 'heavy' | 'elite';

export type ShipId = 'valkyrie' | 'dreadnought' | 'phantom';

export interface ShipConfig {
  id: ShipId;
  name: string;
  class: string;
  tagline: string;
  speedRating: number; // 0-100
  firepowerRating: number; // 0-100
  shieldRating: number; // 0-100
  maneuverabilityRating: number; // 0-100
  baseHp: number;
  baseShield: number;
  speed: number;
  turnSpeed: number;
  fireRateCooldown: number; // frames
  ammoCapacity: number;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  bulletColor: string;
  bulletGlow: string;
  weaponName: string;
  bulletDamage: number;
  bulletSpeed: number;
  bulletRadius: number;
  cannons: { x: number; y: number }[];
}

export interface Star {
  x: number;
  y: number;
  z: number; // 1 (far/slow), 2 (mid), 3 (near/fast), 4 (hyper-fast streak)
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

export interface NebulaCloud {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

export interface Planet {
  x: number;
  y: number;
  radius: number;
  baseColor: string;
  glowColor: string;
  hasRing: boolean;
  ringColor?: string;
  hasBands?: boolean;
  speed: number;
}

export interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  hp: number;
  maxHp: number;
  color: string;
  vertices: { x: number; y: number }[];
  craters: { x: number; y: number; r: number }[];
}

export interface SpaceDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  alpha: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  glowColor: string;
  isPlayer: boolean;
  life: number;
  maxLife: number;
  isEnergyBlast?: boolean;
  length?: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  hp: number;
  maxHp: number;
  shield?: number;
  maxShield?: number;
  speed: number;
  shootCooldown: number;
  shootInterval: number;
  behaviorTimer: number;
  hitFlash: number;
  alive: boolean;
  deathAnim: number; // 1 -> 0
  radius: number;
  color: string;
  glowColor: string;
  trailParticlesTimer?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'spark' | 'plasma' | 'smoke' | 'debris' | 'shockwave';
}

export interface CrosshairState {
  x: number;
  y: number;
  isLockedOn: boolean;
  hitMarkerTimer: number; // frames left to display hit marker
}
