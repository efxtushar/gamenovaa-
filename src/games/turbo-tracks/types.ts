import * as THREE from 'three';

export type GameState = 
  | 'MENU' 
  | 'TRACK_SELECT' 
  | 'GARAGE' 
  | 'COUNTDOWN' 
  | 'RACING' 
  | 'PAUSED' 
  | 'FINISH';

export interface CarConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;
  speed: number;        // 1 - 10
  acceleration: number; // 1 - 10
  handling: number;     // 1 - 10
  boost: number;        // 1 - 10
  stunt: number;        // 1 - 10
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bodyStyle: 'gt' | 'aero' | 'drift' | 'stunt';
}

export interface TrackPoint {
  x: number;
  y: number;
  z: number;
  bank?: number;     // bank tilt angle in radians
  pitch?: number;    // loop or ramp pitch
  boost?: boolean;   // contains boost pad
  jump?: boolean;    // launch ramp
  gap?: boolean;     // jump gap landing
  obstacle?: 'spinner' | 'hammer' | 'barrel' | 'laser';
}

export interface TrackConfig {
  id: string;
  num: string;
  name: string;
  themeName: string;
  description: string;
  laps: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT' | 'INSANE';
  lengthMeters: number;
  ambientColor: number;
  sunColor: number;
  fogColor: number;
  groundColor: number;
  trackColor: number;
  railColor: number;
  stripeColor: number;
  propsTheme: 'garage' | 'city' | 'skyline' | 'desert' | 'neon';
  points: TrackPoint[];
}

export interface StuntScoreNotice {
  id: number;
  label: string;
  points: number;
  time: number;
  combo: number;
}

export interface RacerState {
  id: string;
  name: string;
  isPlayer: boolean;
  color: string;
  carConfig: CarConfig;
  meshGroup: THREE.Group;
  wheels: THREE.Mesh[];
  exhaustGlow: THREE.PointLight | null;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  trackProgress: number; // 0.0 to 1.0 per lap
  currentLap: number;
  totalProgress: number; // trackProgress + currentLap
  speedKmH: number;
  steer: number;
  throttle: number;
  brake: boolean;
  isDrifting: boolean;
  driftValue: number;
  isBoosting: boolean;
  boostReserve: number; // 0 to 100
  isAirborne: boolean;
  airTimeSeconds: number;
  airFlipAccum: number;
  airRollAccum: number;
  stuntScore: number;
  rank: number;
  bestLapTime: number;
  currentLapTime: number;
  totalRaceTime: number;
  finished: boolean;
  builtCar?: any;
  steerAngle?: number;
  headingAngle?: number;
  lateralVelocity?: number;
  recoverTimer?: number;
  aiSkillFactor?: number;
  aiSteerOffset?: number;
}
