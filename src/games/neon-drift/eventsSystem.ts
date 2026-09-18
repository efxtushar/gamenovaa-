import { RaceEvent } from './types';

export const RACE_EVENTS: RaceEvent[] = [
  {
    id: 'event-street-sprint',
    name: 'Street Sprint',
    type: 'sprint',
    description: 'High-speed blast through Grand Central Avenue and Metropolis shopping district.',
    startPos: { x: 1300, y: 1800, angle: Math.PI * 0.5 }, // East on Grand Central
    checkpoints: [
      { x: 1600, y: 1800, radius: 85, label: 'CP 1' },
      { x: 2000, y: 1800, radius: 85, label: 'CP 2' },
      { x: 2400, y: 1800, radius: 95, label: 'CP 3 (Turn Right)' },
      { x: 2400, y: 2100, radius: 85, label: 'CP 4' },
      { x: 2400, y: 2400, radius: 95, label: 'CP 5 (Turn Left)' },
      { x: 2800, y: 2400, radius: 95, label: 'FINISH' }
    ],
    targetTime: 38,
    rewardPoints: 8000,
    color: '#00f5ff',
    icon: 'Zap'
  },
  {
    id: 'event-city-circuit',
    name: 'City Circuit',
    type: 'circuit',
    description: 'Full high-octane lap through downtown skyscrapers, underpass tunnel, and Skyline Parkway.',
    startPos: { x: 1600, y: 2400, angle: -Math.PI * 0.5 }, // North on Skyline Parkway
    checkpoints: [
      { x: 1600, y: 1800, radius: 90, label: 'CP 1' },
      { x: 1600, y: 1200, radius: 90, label: 'CP 2' },
      { x: 1600, y: 800, radius: 95, label: 'CP 3 (Tunnel Entry)' },
      { x: 2200, y: 800, radius: 90, label: 'CP 4 (Underpass Mid)' },
      { x: 2800, y: 800, radius: 95, label: 'CP 5 (Tunnel Exit)' },
      { x: 2800, y: 1300, radius: 90, label: 'CP 6' },
      { x: 2800, y: 1800, radius: 95, label: 'CP 7' },
      { x: 2400, y: 2400, radius: 90, label: 'CP 8' },
      { x: 1600, y: 2400, radius: 100, label: 'FINISH LAP' }
    ],
    targetTime: 62,
    rewardPoints: 14000,
    color: '#a855f7',
    icon: 'Trophy'
  },
  {
    id: 'event-highway-run',
    name: 'Highway Run',
    type: 'highway',
    description: 'Top-speed 4-lane expressway dash from South Bay up to North Hills.',
    startPos: { x: 3600, y: 3200, angle: 0 }, // North on Highway
    checkpoints: [
      { x: 3600, y: 2700, radius: 110, label: 'CP 1' },
      { x: 3600, y: 2200, radius: 110, label: 'CP 2 (Speed Trap)' },
      { x: 3600, y: 1700, radius: 110, label: 'CP 3' },
      { x: 3600, y: 1200, radius: 110, label: 'CP 4' },
      { x: 3600, y: 700, radius: 110, label: 'CP 5' },
      { x: 3600, y: 450, radius: 120, label: 'EXPRESSWAY FINISH' }
    ],
    targetTime: 42,
    rewardPoints: 10000,
    color: '#f97316',
    icon: 'Flame'
  },
  {
    id: 'event-waterfront-race',
    name: 'Waterfront Race',
    type: 'waterfront',
    description: 'Scenic palm-lined coastal sprint along Ocean Drive with high-speed seaside curves.',
    startPos: { x: 450, y: 700, angle: Math.PI }, // South on Ocean Drive
    checkpoints: [
      { x: 450, y: 1200, radius: 90, label: 'CP 1' },
      { x: 450, y: 1600, radius: 90, label: 'CP 2' },
      { x: 450, y: 1800, radius: 100, label: 'CP 3 (Pier Bridge)' },
      { x: 450, y: 2200, radius: 90, label: 'CP 4' },
      { x: 450, y: 2600, radius: 90, label: 'CP 5 (Beach Strip)' },
      { x: 450, y: 3000, radius: 90, label: 'CP 6' },
      { x: 450, y: 3350, radius: 100, label: 'COASTAL FINISH' }
    ],
    targetTime: 48,
    rewardPoints: 11000,
    color: '#06b6d4',
    icon: 'Compass'
  },
  {
    id: 'event-drift-challenge',
    name: 'Drift Challenge',
    type: 'drift',
    description: 'Slalom drift around cones and obstacles at the Neon Drift Arena.',
    startPos: { x: 1400, y: 2700, angle: Math.PI * 0.5 }, // East into Arena
    checkpoints: [
      { x: 1550, y: 2750, radius: 100, label: 'DRIFT 1' },
      { x: 1800, y: 2750, radius: 100, label: 'DRIFT 2' },
      { x: 1800, y: 3000, radius: 100, label: 'DRIFT 3' },
      { x: 1550, y: 3000, radius: 100, label: 'DRIFT 4' },
      { x: 1650, y: 2880, radius: 120, label: 'DONUT FINISH' }
    ],
    targetTime: 45,
    rewardPoints: 12000,
    color: '#ec4899',
    icon: 'RotateCcw'
  },
  {
    id: 'event-checkpoint-rush',
    name: 'Checkpoint Rush',
    type: 'checkpoint',
    description: 'Cross-city time trial navigating through industrial docks, bridge, and downtown.',
    startPos: { x: 600, y: 800, angle: Math.PI * 0.5 }, // East out of Docks
    checkpoints: [
      { x: 1050, y: 800, radius: 90, label: 'CP 1 (Harbor)' },
      { x: 1050, y: 1300, radius: 90, label: 'CP 2' },
      { x: 1050, y: 1800, radius: 95, label: 'CP 3 (Turn East)' },
      { x: 1600, y: 1800, radius: 90, label: 'CP 4 (Grand Central)' },
      { x: 2000, y: 1800, radius: 90, label: 'CP 5' },
      { x: 2000, y: 2200, radius: 90, label: 'CP 6' },
      { x: 2000, y: 2600, radius: 95, label: 'CP 7 (Arena Way)' },
      { x: 1700, y: 2850, radius: 110, label: 'RUSH FINISH' }
    ],
    targetTime: 55,
    rewardPoints: 13000,
    color: '#eab308',
    icon: 'Flag'
  }
];
