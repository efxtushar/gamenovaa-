import { TrackConfig, CarConfig } from './types';

export const ORIGINAL_CARS: CarConfig[] = [
  {
    id: 'thunder-gt',
    name: 'THUNDER GT',
    tagline: 'V8 Die-Cast Stunt King',
    description: 'A muscle-styled die-cast icon with balanced torque, high chassis durability, and steady aerial pitch control.',
    speed: 8,
    acceleration: 8,
    handling: 7,
    boost: 8,
    stunt: 8,
    primaryColor: '#e11d48',    // Crimson Red
    secondaryColor: '#1e293b',  // Dark Carbon
    accentColor: '#fbbf24',     // Gold
    bodyStyle: 'gt'
  },
  {
    id: 'bolt-xr',
    name: 'BOLT XR',
    tagline: 'Hyper-Velocity Aeroblade',
    description: 'Engineered with aggressive aerodynamic canards and dual twin-turbo exhausts for blistering top straightaway speeds.',
    speed: 10,
    acceleration: 7,
    handling: 6,
    boost: 9,
    stunt: 7,
    primaryColor: '#0284c7',    // Sky Cobalt
    secondaryColor: '#0f172a',
    accentColor: '#38bdf8',     // Electric Cyan
    bodyStyle: 'aero'
  },
  {
    id: 'fusion-r',
    name: 'FUSION R',
    tagline: 'Apex Drift Specialist',
    description: 'Featherweight composite body with ultra-responsive front steering angle. Carves through tight banked turns with ease.',
    speed: 7,
    acceleration: 9,
    handling: 10,
    boost: 8,
    stunt: 8,
    primaryColor: '#16a34a',    // Toxic Emerald
    secondaryColor: '#18181b',
    accentColor: '#4ade80',     // Neon Lime
    bodyStyle: 'drift'
  },
  {
    id: 'nova-x',
    name: 'NOVA X',
    tagline: 'Gravity-Defying Stunt Prototype',
    description: 'Equipped with active gyroscopic thrusters for rapid 360 air flips, barrel rolls, and explosive boost recovery.',
    speed: 8,
    acceleration: 8,
    handling: 8,
    boost: 10,
    stunt: 10,
    primaryColor: '#9333ea',    // Cyber Purple
    secondaryColor: '#0f172a',
    accentColor: '#f43f5e',     // Hot Pink
    bodyStyle: 'stunt'
  }
];

export const TRACK_CONFIGS: TrackConfig[] = [
  // -------------------------------------------------------------
  // TRACK 01 — GARAGE RUSH
  // -------------------------------------------------------------
  {
    id: 'garage-rush',
    num: '01',
    name: 'GARAGE RUSH',
    themeName: 'Workshop Stunt Arena',
    description: 'Loop past giant wrenches, launch over a massive steel toolbox, and barrel-roll off the workbench into a 360° vertical loop.',
    laps: 3,
    difficulty: 'EASY',
    lengthMeters: 620,
    ambientColor: 0x242733,
    sunColor: 0xffeedd,
    fogColor: 0x141620,
    groundColor: 0x222630,      // Workshop floor concrete
    trackColor: 0xff5500,       // Iconic bright orange toy track
    railColor: 0x0284c7,        // High-contrast blue side rails
    stripeColor: 0xffffff,
    propsTheme: 'garage',
    points: [
      { x: 0, y: 3, z: 0 },                       // Start Grid
      { x: 0, y: 3, z: 60, boost: true },         // Straightaway acceleration
      { x: 25, y: 5, z: 110, bank: 0.35 },        // Banked right turn
      { x: 75, y: 8, z: 130, bank: 0.4 },
      { x: 130, y: 10, z: 110, bank: 0.3 },       // Toolbox climb
      { x: 160, y: 14, z: 60, jump: true },       // Ramp jump over giant wrench
      { x: 160, y: 7, z: 0, gap: true },          // Gap landing
      { x: 140, y: 4, z: -50, bank: -0.35 },      // Banked left
      // VERTICAL LOOP SECTION
      { x: 100, y: 4, z: -80, boost: true },      // Loop entry boost
      { x: 70, y: 16, z: -85, pitch: Math.PI },   // Inverted peak of loop!
      { x: 40, y: 4, z: -80 },                    // Loop exit
      // S-CURVES THROUGH GIANT CANS
      { x: -10, y: 4, z: -60, obstacle: 'spinner' },
      { x: -50, y: 6, z: -40, bank: 0.3 },
      { x: -70, y: 7, z: 0, bank: -0.35 },
      { x: -50, y: 5, z: 40 },
      { x: -20, y: 3, z: 20, boost: true }        // Final turn onto finish line
    ]
  },

  // -------------------------------------------------------------
  // TRACK 02 — CITY LOOP
  // -------------------------------------------------------------
  {
    id: 'city-loop',
    num: '02',
    name: 'CITY LOOP',
    themeName: 'Toy Skyscraper Metro',
    description: 'Weave through towering toy architecture, spiral up a multi-tier corkscrew, and leap across the miniature suspension bridge.',
    laps: 3,
    difficulty: 'MEDIUM',
    lengthMeters: 740,
    ambientColor: 0x1a2035,
    sunColor: 0xffeecc,
    fogColor: 0x0b1021,
    groundColor: 0x181e2e,
    trackColor: 0x06b6d4,       // Cyan electric ribbon
    railColor: 0xf43f5e,        // Neon magenta rails
    stripeColor: 0xffffff,
    propsTheme: 'city',
    points: [
      { x: 0, y: 4, z: 0 },
      { x: 0, y: 4, z: 70, boost: true },
      { x: 30, y: 7, z: 120, bank: 0.4 },
      // CORKSCREW ELEVATION
      { x: 70, y: 12, z: 140, bank: 0.45 },
      { x: 100, y: 17, z: 120, bank: 0.5 },
      { x: 100, y: 22, z: 80, bank: 0.5 },
      { x: 70, y: 26, z: 60, bank: 0.45 },
      { x: 30, y: 28, z: 70, boost: true },       // Skybridge straight
      { x: -20, y: 30, z: 90, jump: true },       // Mega jump between towers
      { x: -80, y: 18, z: 110, gap: true },       // Catch ramp
      { x: -130, y: 10, z: 80, bank: -0.4 },
      { x: -140, y: 5, z: 20, obstacle: 'spinner' },
      { x: -110, y: 4, z: -40, bank: -0.35 },
      { x: -60, y: 4, z: -60, boost: true },
      { x: -20, y: 4, z: -40, bank: 0.25 }
    ]
  },

  // -------------------------------------------------------------
  // TRACK 03 — SKYLINE JUMP
  // -------------------------------------------------------------
  {
    id: 'skyline-jump',
    num: '03',
    name: 'SKYLINE JUMP',
    themeName: 'Stratosphere Launch',
    description: 'Suspended in high atmosphere with massive vertigo ramps, double air flips, floating boost pads, and zero safety rails on jumps!',
    laps: 3,
    difficulty: 'HARD',
    lengthMeters: 810,
    ambientColor: 0x22354c,
    sunColor: 0xfff3db,
    fogColor: 0x111c2e,
    groundColor: 0x09101d,
    trackColor: 0xf59e0b,       // Sunset Gold
    railColor: 0x10b981,        // Emerald rails
    stripeColor: 0xffffff,
    propsTheme: 'skyline',
    points: [
      { x: 0, y: 15, z: 0 },
      { x: 0, y: 16, z: 70, boost: true },
      { x: 20, y: 22, z: 120, jump: true },      // Big launch ramp
      { x: 35, y: 16, z: 180, gap: true },       // High air gap
      { x: 60, y: 12, z: 210, bank: 0.5 },       // High-G banked wallride
      { x: 110, y: 10, z: 200, bank: 0.45 },
      { x: 140, y: 8, z: 140 },
      // VERTICAL SKY LOOP
      { x: 140, y: 8, z: 80, boost: true },
      { x: 135, y: 24, z: 45, pitch: Math.PI },   // Inverted apex
      { x: 130, y: 8, z: 10 },
      // SECOND JUMP
      { x: 100, y: 14, z: -40, jump: true },
      { x: 50, y: 10, z: -100, gap: true },
      { x: 0, y: 8, z: -120, bank: -0.45 },
      { x: -60, y: 10, z: -90, obstacle: 'laser' },
      { x: -80, y: 12, z: -30, bank: 0.35 },
      { x: -50, y: 14, z: 10, boost: true }
    ]
  },

  // -------------------------------------------------------------
  // TRACK 04 — DESERT STUNT
  // -------------------------------------------------------------
  {
    id: 'desert-stunt',
    num: '04',
    name: 'DESERT STUNT',
    themeName: 'Canyon Dune Rollercoaster',
    description: 'Blaze over golden sand dunes, jump across a deep sandstone chasm, and drift through giant toy cacti and oil drums.',
    laps: 3,
    difficulty: 'MEDIUM',
    lengthMeters: 690,
    ambientColor: 0x3d2b1f,
    sunColor: 0xffeed5,
    fogColor: 0x241810,
    groundColor: 0xd97706,      // Desert Sand
    trackColor: 0xd946ef,       // Magenta track
    railColor: 0xfacc15,        // Sun gold rails
    stripeColor: 0xffffff,
    propsTheme: 'desert',
    points: [
      { x: 0, y: 3, z: 0 },
      { x: 0, y: 4, z: 65, boost: true },
      { x: 35, y: 8, z: 115, bank: 0.4 },
      { x: 85, y: 14, z: 130, jump: true },       // Canyon launch
      { x: 140, y: 6, z: 120, gap: true },        // Dune bowl landing
      { x: 170, y: 4, z: 70, bank: 0.45 },
      { x: 160, y: 4, z: 0, obstacle: 'barrel' },
      { x: 120, y: 6, z: -50, bank: -0.35 },
      { x: 70, y: 10, z: -90, boost: true },
      { x: 10, y: 12, z: -100, bank: 0.4 },
      { x: -45, y: 9, z: -70, obstacle: 'spinner' },
      { x: -80, y: 6, z: -20, bank: -0.4 },
      { x: -60, y: 4, z: 25 },
      { x: -25, y: 3, z: 20, boost: true }
    ]
  },

  // -------------------------------------------------------------
  // TRACK 05 — NEON CIRCUIT
  // -------------------------------------------------------------
  {
    id: 'neon-circuit',
    num: '05',
    name: 'NEON CIRCUIT',
    themeName: 'Cyber Overdrive Matrix',
    description: 'The ultimate high-speed neon proving ground: dual sequential loop-the-loops, inverted ceiling tracks, and pulsing hyper boost pads.',
    laps: 3,
    difficulty: 'INSANE',
    lengthMeters: 890,
    ambientColor: 0x110726,
    sunColor: 0x00f0ff,
    fogColor: 0x070114,
    groundColor: 0x080313,
    trackColor: 0x8b5cf6,       // Glowing violet ribbon
    railColor: 0x06b6d4,        // Electrified cyan rails
    stripeColor: 0xf43f5e,      // Laser pink striping
    propsTheme: 'neon',
    points: [
      { x: 0, y: 4, z: 0 },
      { x: 0, y: 4, z: 80, boost: true },
      // LOOP 1
      { x: 15, y: 5, z: 120, boost: true },
      { x: 15, y: 22, z: 155, pitch: Math.PI },
      { x: 15, y: 5, z: 190 },
      { x: 50, y: 7, z: 220, bank: 0.5 },
      { x: 100, y: 11, z: 210, bank: 0.45 },
      // LOOP 2
      { x: 130, y: 12, z: 160, boost: true },
      { x: 130, y: 28, z: 125, pitch: Math.PI },
      { x: 130, y: 10, z: 90 },
      // HIGH SPEED JUMP
      { x: 100, y: 16, z: 30, jump: true },
      { x: 50, y: 8, z: -40, gap: true },
      { x: 0, y: 6, z: -80, bank: -0.45 },
      { x: -60, y: 8, z: -100, obstacle: 'laser' },
      { x: -110, y: 10, z: -60, bank: 0.4 },
      { x: -100, y: 8, z: 0, obstacle: 'spinner' },
      { x: -60, y: 5, z: 40, bank: -0.35 },
      { x: -20, y: 4, z: 20, boost: true }
    ]
  }
];
