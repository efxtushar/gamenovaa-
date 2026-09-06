export type GameMode = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type ZombieType = 'walker' | 'runner' | 'brute';

export interface ZombieConfig {
  type: ZombieType;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackInterval: number; // in seconds
  scoreValue: number;
  scale: number;
  color: number;
  clothesColor: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  score: number;
  kills: number;
  wave: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 100
}

export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  fire: boolean;
}

export interface ParticleEffect {
  update: (delta: number) => boolean;
}

export interface SettingsConfig {
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  graphicsQuality: 'high' | 'medium' | 'low';
  cameraSensitivity: number;
}
