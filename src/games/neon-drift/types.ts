export type RoadType = 'highway' | 'avenue' | 'street' | 'waterfront' | 'bridge' | 'tunnel' | 'alley';
export type RoadSurface = 'asphalt' | 'bridge' | 'tunnel';

export interface RoadSegment {
  id: string;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  lanes: number;
  type: RoadType;
  surface: RoadSurface;
  isElevated?: boolean;
  speedLimit: number;
}

export interface District {
  id: string;
  name: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  theme: 'downtown' | 'waterfront' | 'beach' | 'industrial' | 'highway' | 'drift_arena';
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  roofColor: string;
  neonColor: string;
  neonSign?: string;
  height3D?: number;
}

export type SceneryType =
  | 'palm_tree'
  | 'streetlight'
  | 'traffic_light'
  | 'billboard'
  | 'cone'
  | 'container'
  | 'barrier'
  | 'dock_crane'
  | 'bench'
  | 'fountain';

export interface SceneryObject {
  id: string;
  type: SceneryType;
  x: number;
  y: number;
  angle?: number;
  color?: string;
  label?: string;
}

export interface SpeedTrap {
  id: string;
  name: string;
  x: number;
  y: number;
  targetKmh: number;
  radius: number;
}

export interface DriftZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetScore: number;
  multiplier: number;
}

export interface JumpRamp {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  width: number;
  length: number;
  boost: number;
}

export interface RaceCheckpoint {
  x: number;
  y: number;
  radius: number;
  label?: string;
}

export interface RaceEvent {
  id: string;
  name: string;
  type: 'sprint' | 'circuit' | 'highway' | 'drift' | 'waterfront' | 'checkpoint';
  description: string;
  startPos: { x: number; y: number; angle: number };
  checkpoints: RaceCheckpoint[];
  targetTime: number; // in seconds
  rewardPoints: number;
  color: string;
  icon: string;
}

export interface TrafficCar {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  baseSpeed: number;
  angle: number;
  color: string;
  accentColor: string;
  model: 'sedan' | 'coupe' | 'suv' | 'van';
  width: number;
  height: number;
  roadId: string;
  laneOffset: number;
  direction: 1 | -1;
  isBraking?: boolean;
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
  type: 'smoke' | 'spark' | 'nitro' | 'airtime' | 'water' | 'flash';
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

export interface ActiveEventState {
  event: RaceEvent;
  currentCheckpointIndex: number;
  startTime: number;
  elapsedTime: number;
  isCompleted: boolean;
  isFailed?: boolean;
}
