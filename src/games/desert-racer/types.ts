import heroBg from '../../assets/images/desert_racer_hero_bg_1788708218180.jpg';
import dunesTrackImg from '../../assets/images/desert_track_dunes_1788708234120.jpg';
import canyonTrackImg from '../../assets/images/desert_track_canyon_1788708250771.jpg';
import stormTrackImg from '../../assets/images/desert_track_storm_1788708264333.jpg';
import sunsetTrackImg from '../../assets/images/desert_track_sunset_1788708277182.jpg';

export interface CarStats {
  speed: number; // 0 - 100 for visual bars
  accel: number;
  handling: number;
  drift: number;
  boost: number;
  braking: number;
  durability: number;
}

export interface CarModel {
  id: string;
  name: string;
  tagline: string;
  category: 'RALLY' | 'SUPER-TRUCK' | 'DRIFT' | 'ARMORED' | 'HYPER';
  topSpeed: number; // base max speed in km/h
  accel: number; // acceleration rate
  handling: number; // steering responsiveness
  drift: number; // drift control / bonus
  durability: number; // off-road resistance
  color: string;
  accentColor: string;
  stripeColor: string;
  stats: CarStats;
}

export interface RaceTrack {
  id: string;
  name: string;
  subtitle: string;
  description?: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT';
  distanceKm: number;
  laps: number;
  checkpointsPerLap: number;
  timeLimitSec: number;
  curveFrequency: number;
  hillFrequency: number;
  aiBaseSpeed: number;
  rewardCoins: number;
  bestTimeKey: string;
  previewImage: string;
  bgColor: string;
  skyGradient: [string, string, string];
}

export interface Segment {
  index: number;
  p1: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  p2: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  curve: number;
  sprites: {
    type:
      | 'cactus'
      | 'cactus_group'
      | 'palm_tree'
      | 'abandoned_structure'
      | 'rock'
      | 'mesa'
      | 'barrier'
      | 'tire_barrier'
      | 'warning_arrow'
      | 'sign_left'
      | 'sign_right'
      | 'sign_hairpin'
      | 'sign_chicane'
      | 'sign_ramp'
      | 'sign_distance_300'
      | 'sign_distance_200'
      | 'sign_distance_100'
      | 'sponsor_banner'
      | 'flag'
      | 'cliff'
      | 'dune'
      | 'checkpoint'
      | 'finish'
      | 'tumbleweed';
    offset: number;
  }[];
  color: {
    road: string;
    grass: string;
    rumble: string;
    lane: string;
    shoulder: string;
  };
  skidMarks?: { x: number; width: number; alpha: number }[];
}

export interface AICar {
  id: number;
  name: string;
  carModel: CarModel;
  x: number;
  y: number;
  z: number;
  speed: number;
  targetSpeed: number;
  steer: number;
  lap: number;
  checkpointIndex?: number;
  isBraking: boolean;
  finished: boolean;
  finishTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface UpgradeLevels {
  [carId: string]: number; // 0 to 5
}

export const CARS: CarModel[] = [
  {
    id: 'dune-raider',
    name: 'DUNE RAIDER',
    tagline: 'Balanced All-Terrain Champion',
    category: 'RALLY',
    topSpeed: 215,
    accel: 0.165,
    handling: 0.055,
    drift: 0.85,
    durability: 82,
    color: '#f59e0b', // Warm Amber Gold
    accentColor: '#fbbf24',
    stripeColor: '#1e293b',
    stats: { speed: 78, accel: 82, handling: 85, drift: 80, boost: 82, braking: 84, durability: 82 }
  },
  {
    id: 'sandstorm-gt',
    name: 'SANDSTORM GT',
    tagline: 'Aerodynamic High-Speed Predator',
    category: 'HYPER',
    topSpeed: 245,
    accel: 0.18,
    handling: 0.048,
    drift: 0.75,
    durability: 70,
    color: '#06b6d4', // Cyan Neon Metallic
    accentColor: '#38bdf8',
    stripeColor: '#0f172a',
    stats: { speed: 95, accel: 88, handling: 72, drift: 70, boost: 94, braking: 78, durability: 70 }
  },
  {
    id: 'apex-buggy',
    name: 'APEX BUGGY',
    tagline: 'Lightweight Tubular Drift Beast',
    category: 'DRIFT',
    topSpeed: 205,
    accel: 0.19,
    handling: 0.065,
    drift: 0.98,
    durability: 65,
    color: '#ef4444', // Crimson Red
    accentColor: '#f87171',
    stripeColor: '#ffffff',
    stats: { speed: 72, accel: 90, handling: 95, drift: 96, boost: 80, braking: 92, durability: 65 }
  },
  {
    id: 'titan-4x4',
    name: 'TITAN 4X4',
    tagline: 'Heavy Armored Desert Dreadnought',
    category: 'ARMORED',
    topSpeed: 220,
    accel: 0.175,
    handling: 0.05,
    drift: 0.8,
    durability: 96,
    color: '#8b5cf6', // Titanium Purple
    accentColor: '#a78bfa',
    stripeColor: '#f59e0b',
    stats: { speed: 82, accel: 84, handling: 78, drift: 82, boost: 86, braking: 88, durability: 96 }
  },
  {
    id: 'cyber-phantom',
    name: 'CYBER PHANTOM',
    tagline: 'Experimental Solar Hyper-Truck',
    category: 'SUPER-TRUCK',
    topSpeed: 250,
    accel: 0.188,
    handling: 0.058,
    drift: 0.9,
    durability: 88,
    color: '#10b981', // Emerald Carbon
    accentColor: '#34d399',
    stripeColor: '#000000',
    stats: { speed: 96, accel: 92, handling: 84, drift: 88, boost: 98, braking: 90, durability: 88 }
  }
];

export const TRACKS: RaceTrack[] = [
  {
    id: 'race-1',
    name: 'RACE 01',
    subtitle: 'DESERT RUN',
    description: 'High-speed sweeping turns across rolling sand dunes.',
    difficulty: 'EASY',
    distanceKm: 3.2,
    laps: 3,
    checkpointsPerLap: 10,
    timeLimitSec: 65,
    curveFrequency: 0.35,
    hillFrequency: 0.3,
    aiBaseSpeed: 140,
    rewardCoins: 500,
    bestTimeKey: 'desert_racer_best_r1',
    previewImage: dunesTrackImg,
    bgColor: '#f97316',
    skyGradient: ['#451a03', '#7c2d12', '#b45309']
  },
  {
    id: 'race-2',
    name: 'RACE 02',
    subtitle: 'CANYON RUSH',
    description: 'Narrow canyon gorge with tight hairpins and rock pillars.',
    difficulty: 'NORMAL',
    distanceKm: 4.0,
    laps: 3,
    checkpointsPerLap: 10,
    timeLimitSec: 60,
    curveFrequency: 0.55,
    hillFrequency: 0.5,
    aiBaseSpeed: 175,
    rewardCoins: 750,
    bestTimeKey: 'desert_racer_best_r2',
    previewImage: canyonTrackImg,
    bgColor: '#ea580c',
    skyGradient: ['#3b0764', '#6b21a8', '#c2410c']
  },
  {
    id: 'race-3',
    name: 'RACE 03',
    subtitle: 'DUNE STORM',
    description: 'Severe dust storms, undulating crests, and high-speed jumps.',
    difficulty: 'HARD',
    distanceKm: 4.8,
    laps: 3,
    checkpointsPerLap: 10,
    timeLimitSec: 55,
    curveFrequency: 0.75,
    hillFrequency: 0.65,
    aiBaseSpeed: 195,
    rewardCoins: 1000,
    bestTimeKey: 'desert_racer_best_r3',
    previewImage: stormTrackImg,
    bgColor: '#d97706',
    skyGradient: ['#1e1b4b', '#431407', '#9a3412']
  },
  {
    id: 'race-4',
    name: 'RACE 04',
    subtitle: 'SUNSET CIRCUIT',
    description: 'Extreme championship course demanding precision drifting.',
    difficulty: 'EXPERT',
    distanceKm: 5.5,
    laps: 3,
    checkpointsPerLap: 10,
    timeLimitSec: 50,
    curveFrequency: 0.9,
    hillFrequency: 0.8,
    aiBaseSpeed: 215,
    rewardCoins: 1500,
    bestTimeKey: 'desert_racer_best_r4',
    previewImage: sunsetTrackImg,
    bgColor: '#b91c1c',
    skyGradient: ['#0f172a', '#311042', '#831843']
  }
];

export { heroBg };
