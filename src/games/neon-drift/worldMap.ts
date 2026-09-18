import {
  RoadSegment,
  District,
  Building,
  SceneryObject,
  SpeedTrap,
  DriftZone,
  JumpRamp
} from './types';

export const WORLD_WIDTH = 4400;
export const WORLD_HEIGHT = 3800;

export const DISTRICTS: District[] = [
  {
    id: 'downtown',
    name: 'Downtown Metropolis',
    bounds: { minX: 1150, minY: 1150, maxX: 2950, maxY: 2550 },
    theme: 'downtown'
  },
  {
    id: 'waterfront',
    name: 'Neon Waterfront & Bay',
    bounds: { minX: 50, minY: 1350, maxX: 1150, maxY: 3550 },
    theme: 'waterfront'
  },
  {
    id: 'beach',
    name: 'Sunken Sands Beach',
    bounds: { minX: 50, minY: 2300, maxX: 550, maxY: 3600 },
    theme: 'beach'
  },
  {
    id: 'highway',
    name: 'Pacific Coast Express',
    bounds: { minX: 2950, minY: 400, maxX: 4300, maxY: 3550 },
    theme: 'highway'
  },
  {
    id: 'industrial',
    name: 'Industrial Port & Docks',
    bounds: { minX: 350, minY: 350, maxX: 1850, maxY: 1350 },
    theme: 'industrial'
  },
  {
    id: 'drift_arena',
    name: 'Neon Drift Plaza & Skidpad',
    bounds: { minX: 1250, minY: 2550, maxX: 2150, maxY: 3450 },
    theme: 'drift_arena'
  },
  {
    id: 'north_hills',
    name: 'North Hills & Metro Tunnel',
    bounds: { minX: 1850, minY: 400, maxX: 2950, maxY: 1150 },
    theme: 'downtown'
  }
];

export const ROADS: RoadSegment[] = [
  // 1. GRAND CENTRAL AVENUE (Major East-West Arterial)
  {
    id: 'road-grand-central-west',
    name: 'Grand Central Ave (Bridge Section)',
    x1: 450,
    y1: 1800,
    x2: 1200,
    y2: 1800,
    width: 140,
    lanes: 4,
    type: 'bridge',
    surface: 'bridge',
    speedLimit: 140
  },
  {
    id: 'road-grand-central-mid',
    name: 'Grand Central Ave (Downtown Core)',
    x1: 1200,
    y1: 1800,
    x2: 2800,
    y2: 1800,
    width: 140,
    lanes: 4,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 120
  },
  {
    id: 'road-grand-central-east',
    name: 'Grand Central Ave (Highway Link)',
    x1: 2800,
    y1: 1800,
    x2: 3600,
    y2: 1800,
    width: 140,
    lanes: 4,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 140
  },

  // 2. NEON BOULEVARD (South Downtown Arterial)
  {
    id: 'road-neon-blvd-west',
    name: 'Neon Boulevard West',
    x1: 450,
    y1: 2400,
    x2: 1600,
    y2: 2400,
    width: 130,
    lanes: 4,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 110
  },
  {
    id: 'road-neon-blvd-mid',
    name: 'Neon Boulevard Commercial',
    x1: 1600,
    y1: 2400,
    x2: 2800,
    y2: 2400,
    width: 130,
    lanes: 4,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 110
  },
  {
    id: 'road-neon-blvd-east',
    name: 'Neon Boulevard East Interchange',
    x1: 2800,
    y1: 2400,
    x2: 3600,
    y2: 2400,
    width: 130,
    lanes: 4,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 130
  },

  // 3. NORTH METRO WAY & TUNNEL (Passing under hills)
  {
    id: 'road-harbor-way',
    name: 'Harbor Way West',
    x1: 450,
    y1: 800,
    x2: 1600,
    y2: 800,
    width: 120,
    lanes: 2,
    type: 'street',
    surface: 'asphalt',
    speedLimit: 100
  },
  {
    id: 'road-metro-tunnel',
    name: 'Neon Metro Underpass Tunnel',
    x1: 1600,
    y1: 800,
    x2: 2800,
    y2: 800,
    width: 130,
    lanes: 2,
    type: 'tunnel',
    surface: 'tunnel',
    speedLimit: 130
  },
  {
    id: 'road-harbor-way-east',
    name: 'Hilltop Expressway Link',
    x1: 2800,
    y1: 800,
    x2: 3600,
    y2: 800,
    width: 130,
    lanes: 2,
    type: 'street',
    surface: 'asphalt',
    speedLimit: 120
  },

  // 4. SOUTH COASTAL STRIP (Along Beach & Drift Arena)
  {
    id: 'road-south-bay',
    name: 'South Coastal Strip',
    x1: 450,
    y1: 3200,
    x2: 2800,
    y2: 3200,
    width: 120,
    lanes: 2,
    type: 'waterfront',
    surface: 'asphalt',
    speedLimit: 110
  },
  {
    id: 'road-south-bay-east',
    name: 'South Bay Highway Entry',
    x1: 2800,
    y1: 3200,
    x2: 3600,
    y2: 3200,
    width: 130,
    lanes: 2,
    type: 'street',
    surface: 'asphalt',
    speedLimit: 120
  },

  // 5. OCEAN DRIVE (West Coast Waterfront Boulevard)
  {
    id: 'road-ocean-drive-north',
    name: 'Ocean Drive (Harbor Strip)',
    x1: 450,
    y1: 600,
    x2: 450,
    y2: 1800,
    width: 130,
    lanes: 2,
    type: 'waterfront',
    surface: 'asphalt',
    speedLimit: 110
  },
  {
    id: 'road-ocean-drive-mid',
    name: 'Ocean Drive (Pier Boulevard)',
    x1: 450,
    y1: 1800,
    x2: 450,
    y2: 2400,
    width: 140,
    lanes: 2,
    type: 'waterfront',
    surface: 'asphalt',
    speedLimit: 120
  },
  {
    id: 'road-ocean-drive-south',
    name: 'Ocean Drive (Beach Strip)',
    x1: 450,
    y1: 2400,
    x2: 450,
    y2: 3400,
    width: 130,
    lanes: 2,
    type: 'waterfront',
    surface: 'asphalt',
    speedLimit: 110
  },

  // 6. SKYLINE PARKWAY (Downtown High-Rise Corridor)
  {
    id: 'road-skyline-north',
    name: 'Skyline Parkway North',
    x1: 1600,
    y1: 600,
    x2: 1600,
    y2: 1800,
    width: 120,
    lanes: 2,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 110
  },
  {
    id: 'road-skyline-mid',
    name: 'Skyline Parkway Downtown',
    x1: 1600,
    y1: 1800,
    x2: 1600,
    y2: 2400,
    width: 120,
    lanes: 2,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 100
  },
  {
    id: 'road-skyline-south',
    name: 'Skyline Parkway Arena Way',
    x1: 1600,
    y1: 2400,
    x2: 1600,
    y2: 3400,
    width: 120,
    lanes: 2,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 110
  },

  // 7. METROPOLIS AVENUE (Commercial Shopping & Lights)
  {
    id: 'road-metropolis-north',
    name: 'Metropolis Ave North',
    x1: 2400,
    y1: 600,
    x2: 2400,
    y2: 1800,
    width: 120,
    lanes: 2,
    type: 'street',
    surface: 'asphalt',
    speedLimit: 100
  },
  {
    id: 'road-metropolis-mid',
    name: 'Metropolis Ave Financial District',
    x1: 2400,
    y1: 1800,
    x2: 2400,
    y2: 2400,
    width: 120,
    lanes: 2,
    type: 'street',
    surface: 'asphalt',
    speedLimit: 100
  },
  {
    id: 'road-metropolis-south',
    name: 'Metropolis Ave South Way',
    x1: 2400,
    y1: 2400,
    x2: 2400,
    y2: 3400,
    width: 120,
    lanes: 2,
    type: 'street',
    surface: 'asphalt',
    speedLimit: 110
  },

  // 8. DOCKS & INDUSTRIAL ACCESS
  {
    id: 'road-docks-access',
    name: 'Harbor Docks Access',
    x1: 1050,
    y1: 600,
    x2: 1050,
    y2: 1800,
    width: 100,
    lanes: 2,
    type: 'alley',
    surface: 'asphalt',
    speedLimit: 90
  },

  // 9. HIGHWAY INTERCHANGE ARTERIAL (Eastern Downtown Boundary)
  {
    id: 'road-east-ring',
    name: 'Metro East Ring Road',
    x1: 2800,
    y1: 600,
    x2: 2800,
    y2: 3400,
    width: 120,
    lanes: 2,
    type: 'avenue',
    surface: 'asphalt',
    speedLimit: 120
  },

  // 10. PACIFIC HIGHWAY FREEWAY (High-speed 4-lane divided expressway)
  {
    id: 'road-highway-north',
    name: 'Pacific Coast Highway North',
    x1: 3600,
    y1: 400,
    x2: 3600,
    y2: 1800,
    width: 160,
    lanes: 4,
    type: 'highway',
    surface: 'asphalt',
    isElevated: true,
    speedLimit: 180
  },
  {
    id: 'road-highway-south',
    name: 'Pacific Coast Highway South',
    x1: 3600,
    y1: 1800,
    x2: 3600,
    y2: 3400,
    width: 160,
    lanes: 4,
    type: 'highway',
    surface: 'asphalt',
    isElevated: true,
    speedLimit: 180
  }
];

// Open parking & drift lots
export interface OpenArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'drift_arena' | 'parking' | 'beach' | 'docks';
  color: string;
}

export const OPEN_AREAS: OpenArea[] = [
  {
    id: 'area-drift-arena',
    name: 'Neon Drift Arena Skidpad',
    x: 1350,
    y: 2650,
    width: 600,
    height: 480,
    type: 'drift_arena',
    color: '#0d121f'
  },
  {
    id: 'area-beach-parking',
    name: 'Oceanfront Beach Parking',
    x: 200,
    y: 2150,
    width: 200,
    height: 350,
    type: 'parking',
    color: '#0f172a'
  },
  {
    id: 'area-docks-yard',
    name: 'Harbor Container Yard',
    x: 550,
    y: 450,
    width: 450,
    height: 300,
    type: 'docks',
    color: '#131b2e'
  },
  {
    id: 'area-sands-beach',
    name: 'Sunken Sands Beach',
    x: 50,
    y: 2300,
    width: 320,
    height: 1200,
    type: 'beach',
    color: '#d97706'
  }
];

// City Buildings with Neon Billboards & Height
export const BUILDINGS: Building[] = [
  // Downtown North-West Block (Between Harbor Way, Grand Central, Skyline & Metropolis)
  {
    id: 'b-cyber-tower',
    x: 1720,
    y: 950,
    width: 220,
    height: 260,
    color: '#0d1322',
    roofColor: '#1e293b',
    neonColor: '#00f5ff',
    neonSign: 'CYBER TOWER',
    height3D: 320
  },
  {
    id: 'b-synth-labs',
    x: 2020,
    y: 950,
    width: 280,
    height: 180,
    color: '#0a0f1d',
    roofColor: '#1e1b4b',
    neonColor: '#ec4899',
    neonSign: 'SYNTH CLUB',
    height3D: 240
  },
  {
    id: 'b-hyper-tech',
    x: 1720,
    y: 1290,
    width: 220,
    height: 420,
    color: '#090d1a',
    roofColor: '#0f172a',
    neonColor: '#8b5cf6',
    neonSign: 'NEON DRIFT',
    height3D: 380
  },
  {
    id: 'b-apex-center',
    x: 2020,
    y: 1210,
    width: 280,
    height: 500,
    color: '#080c16',
    roofColor: '#172554',
    neonColor: '#38bdf8',
    neonSign: 'APEX CORP',
    height3D: 420
  },

  // Downtown South-West Block (Between Grand Central, Neon Blvd, Skyline & Metropolis)
  {
    id: 'b-tokyo-hotel',
    x: 1720,
    y: 1910,
    width: 260,
    height: 400,
    color: '#0b1120',
    roofColor: '#312e81',
    neonColor: '#f43f5e',
    neonSign: 'HOTEL LOTUS',
    height3D: 350
  },
  {
    id: 'b-nova-casino',
    x: 2060,
    y: 1910,
    width: 240,
    height: 400,
    color: '#090d18',
    roofColor: '#4c1d95',
    neonColor: '#eab308',
    neonSign: 'NOVA CASINO',
    height3D: 310
  },

  // Downtown East Block (Between Metropolis & East Ring)
  {
    id: 'b-pacific-spire',
    x: 2480,
    y: 950,
    width: 260,
    height: 380,
    color: '#070b14',
    roofColor: '#0f172a',
    neonColor: '#06b6d4',
    neonSign: 'PACIFIC TOWER',
    height3D: 450
  },
  {
    id: 'b-vanguard-hwy',
    x: 2480,
    y: 1410,
    width: 260,
    height: 300,
    color: '#0d1527',
    roofColor: '#1e293b',
    neonColor: '#a855f7',
    neonSign: 'VANGUARD AUTO',
    height3D: 280
  },
  {
    id: 'b-quantum-corp',
    x: 2480,
    y: 1910,
    width: 260,
    height: 400,
    color: '#0a0e1a',
    roofColor: '#111827',
    neonColor: '#10b981',
    neonSign: 'QUANTUM MOTORS',
    height3D: 340
  },

  // Downtown South Block (Between Neon Blvd & South Bay)
  {
    id: 'b-south-mall',
    x: 2050,
    y: 2510,
    width: 300,
    height: 580,
    color: '#090d19',
    roofColor: '#1e1b4b',
    neonColor: '#ec4899',
    neonSign: 'SYNTH MALL',
    height3D: 260
  },
  {
    id: 'b-arcade-haven',
    x: 2430,
    y: 2510,
    width: 310,
    height: 580,
    color: '#070a14',
    roofColor: '#0f172a',
    neonColor: '#f97316',
    neonSign: 'RETRO ARCADE',
    height3D: 290
  },

  // Industrial Warehouses (North-West)
  {
    id: 'w-dock-warehouse-1',
    x: 550,
    y: 900,
    width: 420,
    height: 220,
    color: '#131b2e',
    roofColor: '#334155',
    neonColor: '#38bdf8',
    neonSign: 'DOCK WAREHOUSE 01',
    height3D: 120
  },
  {
    id: 'w-dock-warehouse-2',
    x: 550,
    y: 1200,
    width: 420,
    height: 250,
    color: '#0f172a',
    roofColor: '#1e293b',
    neonColor: '#f59e0b',
    neonSign: 'CARGO STORAGE',
    height3D: 140
  },
  {
    id: 'w-harbor-logistics',
    x: 1140,
    y: 900,
    width: 380,
    height: 300,
    color: '#0a101d',
    roofColor: '#1e293b',
    neonColor: '#00f5ff',
    neonSign: 'HARBOR LOGISTICS',
    height3D: 160
  },

  // Waterfront Clubs & Pier Diners (Along Ocean Drive)
  {
    id: 'b-sunset-diner',
    x: 540,
    y: 1900,
    width: 220,
    height: 200,
    color: '#111827',
    roofColor: '#374151',
    neonColor: '#f43f5e',
    neonSign: 'SUNSET DINER',
    height3D: 90
  },
  {
    id: 'b-ocean-club',
    x: 540,
    y: 2180,
    width: 240,
    height: 200,
    color: '#0d1322',
    roofColor: '#1e1b4b',
    neonColor: '#38bdf8',
    neonSign: 'TIKI NEON BAR',
    height3D: 90
  },
  {
    id: 'b-beach-cabanas',
    x: 540,
    y: 2500,
    width: 240,
    height: 320,
    color: '#090d18',
    roofColor: '#1e293b',
    neonColor: '#ec4899',
    neonSign: 'CABANA LOUNGE',
    height3D: 110
  },
  {
    id: 'b-surf-shack',
    x: 540,
    y: 2900,
    width: 240,
    height: 240,
    color: '#080c16',
    roofColor: '#172554',
    neonColor: '#10b981',
    neonSign: 'NEON SURF CLUB',
    height3D: 80
  },

  // Highway East Logistics & Gas Station
  {
    id: 'b-nitro-station',
    x: 3720,
    y: 1200,
    width: 280,
    height: 240,
    color: '#0f172a',
    roofColor: '#1e293b',
    neonColor: '#eab308',
    neonSign: 'NITRO SPEED GAS',
    height3D: 80
  },
  {
    id: 'b-express-depot',
    x: 3720,
    y: 2000,
    width: 320,
    height: 380,
    color: '#0a0f1d',
    roofColor: '#111827',
    neonColor: '#00f5ff',
    neonSign: 'PACIFIC FREIGHT',
    height3D: 150
  }
];

// Open-world Speed Traps (Radar flash when speeding)
export const SPEED_TRAPS: SpeedTrap[] = [
  {
    id: 'st-highway-alpha',
    name: 'Pacific Highway Radar',
    x: 3600,
    y: 1800,
    targetKmh: 190,
    radius: 75
  },
  {
    id: 'st-grand-central',
    name: 'Grand Central Speed Camera',
    x: 2000,
    y: 1800,
    targetKmh: 160,
    radius: 75
  },
  {
    id: 'st-ocean-drive',
    name: 'Ocean Drive Coastal Radar',
    x: 450,
    y: 2100,
    targetKmh: 150,
    radius: 75
  },
  {
    id: 'st-neon-blvd',
    name: 'Neon Boulevard Trap',
    x: 2200,
    y: 2400,
    targetKmh: 155,
    radius: 75
  }
];

// Open-world Drift Zones (Bonus drift points)
export const DRIFT_ZONES: DriftZone[] = [
  {
    id: 'dz-drift-arena',
    name: 'DRIFT ARENA SKIDPAD',
    x: 1350,
    y: 2650,
    width: 600,
    height: 480,
    targetScore: 15000,
    multiplier: 3
  },
  {
    id: 'dz-pier-hairpin',
    name: 'PIER HARBOR HAIRPIN',
    x: 350,
    y: 1650,
    width: 250,
    height: 300,
    targetScore: 8000,
    multiplier: 2
  },
  {
    id: 'dz-skyline-plaza',
    name: 'SKYLINE METRO CHICANE',
    x: 1480,
    y: 2250,
    width: 300,
    height: 250,
    targetScore: 7000,
    multiplier: 2
  }
];

// Open-world Jump Ramps (Stunt airtime physics)
export const JUMP_RAMPS: JumpRamp[] = [
  {
    id: 'ramp-arena-entry',
    name: 'Drift Arena Stunt Ramp',
    x: 1320,
    y: 2880,
    angle: Math.PI * 0.5, // facing East
    width: 70,
    length: 50,
    boost: 14
  },
  {
    id: 'ramp-skyline-gap',
    name: 'Skyline Rooftop Launch',
    x: 1600,
    y: 1400,
    angle: Math.PI, // facing South
    width: 60,
    length: 50,
    boost: 16
  },
  {
    id: 'ramp-docks-channel',
    name: 'Harbor Channel Jump',
    x: 800,
    y: 800,
    angle: Math.PI * 0.5, // facing East
    width: 60,
    length: 50,
    boost: 15
  },
  {
    id: 'ramp-highway-drop',
    name: 'Highway Overpass Ramp',
    x: 3450,
    y: 2100,
    angle: 0, // facing North
    width: 65,
    length: 50,
    boost: 17
  }
];

// Street Furniture, Palm Trees, Traffic Lights, Street Lights
export function generateWorldScenery(): SceneryObject[] {
  const items: SceneryObject[] = [];

  // 1. Palm trees along Ocean Drive (Waterfront & Beach)
  for (let y = 650; y < 3400; y += 120) {
    items.push({
      id: `palm-west-${y}`,
      type: 'palm_tree',
      x: 350 + Math.sin(y * 0.02) * 15,
      y,
      angle: Math.sin(y * 0.05) * 0.3
    });
    items.push({
      id: `palm-east-${y}`,
      type: 'palm_tree',
      x: 540,
      y: y + 50,
      angle: Math.cos(y * 0.05) * 0.3
    });
  }

  // 2. Palm trees on Beach Sands
  for (let y = 2350; y < 3500; y += 160) {
    items.push({
      id: `palm-beach-${y}`,
      type: 'palm_tree',
      x: 180 + Math.sin(y * 0.04) * 50,
      y,
      angle: 0.2
    });
  }

  // 3. Streetlights along Grand Central Avenue
  for (let x = 500; x < 3600; x += 220) {
    items.push({
      id: `light-gc-n-${x}`,
      type: 'streetlight',
      x,
      y: 1720,
      angle: 0
    });
    items.push({
      id: `light-gc-s-${x}`,
      type: 'streetlight',
      x,
      y: 1880,
      angle: Math.PI
    });
  }

  // 4. Streetlights along Neon Boulevard
  for (let x = 600; x < 3500; x += 220) {
    items.push({
      id: `light-nb-n-${x}`,
      type: 'streetlight',
      x,
      y: 2325,
      angle: 0
    });
    items.push({
      id: `light-nb-s-${x}`,
      type: 'streetlight',
      x,
      y: 2475,
      angle: Math.PI
    });
  }

  // 5. Streetlights along Pacific Highway
  for (let y = 500; y < 3400; y += 200) {
    items.push({
      id: `light-hwy-w-${y}`,
      type: 'streetlight',
      x: 3510,
      y,
      angle: -Math.PI / 2
    });
    items.push({
      id: `light-hwy-e-${y}`,
      type: 'streetlight',
      x: 3690,
      y,
      angle: Math.PI / 2
    });
  }

  // 6. Traffic Lights at Major Road Intersections
  const intersections = [
    { x: 1600, y: 1800, label: 'Grand Central & Skyline' },
    { x: 2400, y: 1800, label: 'Grand Central & Metropolis' },
    { x: 2800, y: 1800, label: 'Grand Central & East Ring' },
    { x: 1600, y: 2400, label: 'Neon Blvd & Skyline' },
    { x: 2400, y: 2400, label: 'Neon Blvd & Metropolis' },
    { x: 2800, y: 2400, label: 'Neon Blvd & East Ring' },
    { x: 1600, y: 800, label: 'Metro Tunnel West Portal' },
    { x: 2800, y: 800, label: 'Metro Tunnel East Portal' },
    { x: 450, y: 1800, label: 'Ocean Drive & Bay Bridge' },
    { x: 450, y: 2400, label: 'Ocean Drive & Neon Blvd' }
  ];

  intersections.forEach((inter, idx) => {
    items.push({
      id: `traffic-light-nw-${idx}`,
      type: 'traffic_light',
      x: inter.x - 75,
      y: inter.y - 75,
      label: inter.label
    });
    items.push({
      id: `traffic-light-se-${idx}`,
      type: 'traffic_light',
      x: inter.x + 75,
      y: inter.y + 75,
      label: inter.label
    });
  });

  // 7. Shipping Containers at Industrial Docks (Forming alley shortcuts)
  const containerColors = ['#dc2626', '#2563eb', '#16a34a', '#ca8a04', '#0284c7'];
  for (let i = 0; i < 18; i++) {
    const cx = 600 + (i % 6) * 70;
    const cy = 520 + Math.floor(i / 6) * 60;
    items.push({
      id: `container-${i}`,
      type: 'container',
      x: cx,
      y: cy,
      color: containerColors[i % containerColors.length]
    });
  }

  // 8. Drift Cones in Drift Arena
  const conePositions = [
    { x: 1550, y: 2850 },
    { x: 1750, y: 2850 },
    { x: 1650, y: 2750 },
    { x: 1650, y: 2950 },
    { x: 1450, y: 2750 },
    { x: 1850, y: 2750 },
    { x: 1450, y: 3000 },
    { x: 1850, y: 3000 }
  ];
  conePositions.forEach((pos, idx) => {
    items.push({
      id: `cone-${idx}`,
      type: 'cone',
      x: pos.x,
      y: pos.y
    });
  });

  // 9. Billboards along Highway and Grand Central
  items.push({
    id: 'billboard-hwy-1',
    type: 'billboard',
    x: 3700,
    y: 1500,
    label: 'NOVA MOTORS 2026',
    color: '#00f5ff'
  });
  items.push({
    id: 'billboard-hwy-2',
    type: 'billboard',
    x: 3700,
    y: 2500,
    label: 'HYPER NITRO BOOST',
    color: '#ec4899'
  });
  items.push({
    id: 'billboard-gc-1',
    type: 'billboard',
    x: 2100,
    y: 1710,
    label: 'CYBER DRIFT CHAMPIONSHIP',
    color: '#f59e0b'
  });

  return items;
}

export const WORLD_SCENERY = generateWorldScenery();
