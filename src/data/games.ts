import neonDriftCover from '../assets/images/neon_drift_cover_1787309060392.jpg';
import skyWarriorCover from '../assets/images/sky_warrior_cover_1787309249169.jpg';
import ninjaDashCover from '../assets/images/ninja_dash_cover_1787309264986.jpg';
import monsterArenaCover from '../assets/images/monster_arena_cover_1787309277932.jpg';
import pixelQuestCover from '../assets/images/pixel_quest_cover_1787309463445.jpg';
import rocketRushCover from '../assets/images/rocket_rush_cover_1787309448456.jpg';
import bubbleBlastCover from '../assets/images/bubble_blast_cover_1787309225609.jpg';
import streetHoopsCover from '../assets/images/street_hoops_cover_1787309213018.jpg';
import miniGolfCover from '../assets/images/mini_golf_cover_1787309480890.jpg';
import zombieEscapeCover from '../assets/images/zombie_escape_cover_1787309077952.jpg';
import desertRacerCover from '../assets/images/desert_racer_cover_1787309138155.jpg';
import spaceMinerCover from '../assets/images/space_miner_cover_1787309437058.jpg';
import castleDefenderCover from '../assets/images/castle_defender_cover_1787309309344.jpg';
import colorRushCover from '../assets/images/color_rush_cover_1787309493646.jpg';
import fishingFrenzyCover from '../assets/images/fishing_frenzy_cover_1787309509093.jpg';
import robotBrawlCover from '../assets/images/robot_brawl_cover_1787309182947.jpg';
import jungleRunCover from '../assets/images/jungle_run_cover_1787309165379.jpg';
import gemMatchCover from '../assets/images/gem_match_cover_1787309197554.jpg';
import spaceSurvivorCover from '../assets/images/space_survivor_cover_1787309325044.jpg';
import battleCarsCover from '../assets/images/battle_cars_cover_1787309345864.jpg';
import dragonFlightCover from '../assets/images/dragon_flight_cover_1787309291021.jpg';
import pirateTreasureCover from '../assets/images/pirate_treasure_cover_1787309361104.jpg';
import snowboardHeroCover from '../assets/images/snowboard_hero_cover_1787309374745.jpg';
import magicAcademyCover from '../assets/images/magic_academy_cover_1787309391742.jpg';
import cyberSamuraiCover from '../assets/images/cyber_samurai_cover_1787309099479.jpg';
import farmFriendsCover from '../assets/images/farm_friends_cover_1787309422610.jpg';
import hauntedHouseCover from '../assets/images/haunted_house_cover_1787309408030.jpg';
import mechaBattleCover from '../assets/images/mecha_battle_cover_1787309112933.jpg';
import deepSeaCover from '../assets/images/deep_sea_cover_1787309151750.jpg';
import galaxyCommanderCover from '../assets/images/galaxy_commander_cover_1787309126320.jpg';

export interface GameItem {
  id: string;
  slug: string;
  title: string;
  category: 'Racing' | 'Action' | 'Adventure' | 'Sports' | 'Puzzle' | 'Arcade' | 'Strategy' | 'Shooter' | 'Casual';
  rating: number;
  ratingCount: number;
  plays: number;
  featured?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  trending?: boolean;
  isPopular?: boolean;
  description: string;
  instructions: string;
  controls: { key: string; action: string }[];
  tags: string[];
  themeColor: string;
  accentColor: string;
  thumbnailUrl: string;
  developer: string;
  releaseYear: string;
}

export type Game = GameItem;

export const INITIAL_GAMES: GameItem[] = [
  {
    id: 'g-neon-drift',
    slug: 'neon-drift',
    title: 'Neon Drift',
    category: 'Racing',
    rating: 4.8,
    ratingCount: 1420,
    plays: 89340,
    featured: true,
    isTrending: true,
    isPopular: true,
    description: 'Tear through glowing cyberpunk city skylines at 200 MPH. Master precision power slides, trigger nitro boosts, and overtake neon rivals before time expires.',
    instructions: 'Steer your cyber supercar through the glowing highway. Drift around tight turns to build up your Nitro meter, then blast past opposing drivers!',
    controls: [
      { key: '← / → or A / D', action: 'Steer Left / Right' },
      { key: '↑ or W', action: 'Accelerate' },
      { key: 'Spacebar', action: 'Nitro Boost / Drift' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Cyberpunk', 'Drifting', 'Speed', 'Retro Wave', 'High Score'],
    themeColor: '#00f0ff',
    accentColor: '#ff007f',
    thumbnailUrl: neonDriftCover,
    developer: 'Nova Studios',
    releaseYear: '2026'
  },
  {
    id: 'g-sky-warrior',
    slug: 'sky-warrior',
    title: 'Sky Warrior',
    category: 'Shooter',
    rating: 4.9,
    ratingCount: 2310,
    plays: 124500,
    featured: true,
    isTrending: true,
    isPopular: true,
    description: 'High-altitude tactical dogfights against rogue aerial armadas. Unleash homing missiles, barrel roll through bullet storms, and annihilate massive flying fortresses.',
    instructions: 'Pilot the experimental jet fighter. Dodge enemy tracer fire, collect weapon crates for triple lasers and EMP strikes, and down the sector mothership.',
    controls: [
      { key: 'Arrow Keys or WASD', action: 'Maneuver Jet' },
      { key: 'Spacebar / J', action: 'Fire Vulcan Cannons' },
      { key: 'K or E', action: 'Launch Homing Missiles' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Shmup', 'Air Combat', 'Arcade', 'Bullet Hell', 'Explosions'],
    themeColor: '#38bdf8',
    accentColor: '#f97316',
    thumbnailUrl: skyWarriorCover,
    developer: 'Aero Dynamics',
    releaseYear: '2026'
  },
  {
    id: 'g-ninja-dash',
    slug: 'ninja-dash',
    title: 'Ninja Dash',
    category: 'Action',
    rating: 4.7,
    ratingCount: 1980,
    plays: 105400,
    featured: true,
    isPopular: true,
    description: 'Sprint across misty temple rooftops under moonlight. Vault over spikes, deflect shurikens with your katana, and unleash shadow dashes to slice enemy ronin.',
    instructions: 'Run at full speed across infinite pagoda rooftops. Jump over spikes and pitfalls, throw shurikens at guard samurai, and collect gold coins.',
    controls: [
      { key: 'Spacebar / ↑', action: 'Jump / Double Jump' },
      { key: 'J / X', action: 'Katana Slash Attack' },
      { key: 'K / C', action: 'Throw Shuriken' },
      { key: '↓ or S', action: 'Slide under Obstacles' }
    ],
    tags: ['Ninja', 'Runner', 'Platformer', 'Sword Combat', 'Action'],
    themeColor: '#a855f7',
    accentColor: '#00f0ff',
    thumbnailUrl: ninjaDashCover,
    developer: 'Shadow Forge',
    releaseYear: '2026'
  },
  {
    id: 'g-monster-arena',
    slug: 'monster-arena',
    title: 'Monster Arena',
    category: 'Action',
    rating: 4.9,
    ratingCount: 3420,
    plays: 215000,
    featured: true,
    isTrending: true,
    isPopular: true,
    description: 'Enter the blood-soaked gladiator colosseum! Slay hydras, minotaurs, and skeletal hordes while collecting magical runes to unlock god-tier spells.',
    instructions: 'Survive relentless monster waves in the arena. Move with arrow keys or mouse, attack with sword strikes, and unleash spinning orb spells to clear mobs.',
    controls: [
      { key: 'WASD / Arrow Keys', action: 'Move Gladiator' },
      { key: 'Mouse Click / Space', action: 'Sword Strike' },
      { key: 'Q / E', action: 'Cast Elemental Magic' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Gladiator', 'Survival', 'Fantasy', 'Combat', 'Arena'],
    themeColor: '#ef4444',
    accentColor: '#eab308',
    thumbnailUrl: monsterArenaCover,
    developer: 'Titan Core',
    releaseYear: '2026'
  },
  {
    id: 'g-pixel-quest',
    slug: 'pixel-quest',
    title: 'Pixel Quest',
    category: 'Adventure',
    rating: 4.8,
    ratingCount: 1750,
    plays: 93200,
    isPopular: true,
    description: 'A nostalgic 8-bit retro platformer. Journey across emerald kingdoms, bounce on slimy foes, uncover hidden warp pipes, and rescue the captured pixel king.',
    instructions: 'Run, jump, and stomp across vintage platform stages. Collect golden pixel coins and power mushrooms to reach the victory castle flag.',
    controls: [
      { key: '← / → or A / D', action: 'Move Left / Right' },
      { key: 'Spacebar or ↑ / W', action: 'Jump / High Bounce' },
      { key: 'Shift', action: 'Sprint' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Retro', '8-Bit', 'Platformer', 'Adventure', 'Pixel Art'],
    themeColor: '#10b981',
    accentColor: '#facc15',
    thumbnailUrl: pixelQuestCover,
    developer: 'BitPixel Games',
    releaseYear: '2026'
  },
  {
    id: 'g-rocket-rush',
    slug: 'rocket-rush',
    title: 'Rocket Rush',
    category: 'Arcade',
    rating: 4.7,
    ratingCount: 1120,
    plays: 68900,
    description: 'Thrust through a chaotic meteor storm deep in outer space. Collect hyper-fuel tanks, activate force-fields, and set new galactic distance records.',
    instructions: 'Guide your booster rocket through dense asteroid fields. Tap thrust to stay aloft, avoid colliding with meteors, and collect floating fuel cores.',
    controls: [
      { key: 'Spacebar / Click', action: 'Fire Thrusters' },
      { key: '← / → or A / D', action: 'Steer Rocket Pitch' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Space', 'Arcade', 'Hyper Casual', 'Dodge', 'High Speed'],
    themeColor: '#f472b6',
    accentColor: '#38bdf8',
    thumbnailUrl: rocketRushCover,
    developer: 'Nova Arcade',
    releaseYear: '2026'
  },
  {
    id: 'g-bubble-blast',
    slug: 'bubble-blast',
    title: 'Bubble Blast',
    category: 'Puzzle',
    rating: 4.9,
    ratingCount: 3100,
    plays: 168000,
    featured: true,
    isPopular: true,
    description: 'Aim, match, and pop vibrant bubbling orbs! Create massive color chain cascades, trigger explosive rainbow bombs, and clear boards in record time.',
    instructions: 'Point the bottom bubble cannon at clusters of 3 or more matching bubbles to pop them. Bounce shots off side walls for trick shots!',
    controls: [
      { key: 'Mouse Move / Drag', action: 'Aim Cannon Trajectory' },
      { key: 'Click / Tap / Space', action: 'Launch Bubble' },
      { key: 'C / Switch', action: 'Swap Next Bubble' }
    ],
    tags: ['Match 3', 'Bubble Shooter', 'Physics', 'Puzzle', 'Addictive'],
    themeColor: '#ec4899',
    accentColor: '#06b6d4',
    thumbnailUrl: bubbleBlastCover,
    developer: 'Zenith Puzzles',
    releaseYear: '2026'
  },
  {
    id: 'g-street-hoops',
    slug: 'street-hoops',
    title: 'Street Hoops',
    category: 'Sports',
    rating: 4.8,
    ratingCount: 1640,
    plays: 87200,
    isPopular: true,
    description: 'Show off your clutch shooting on neon-lit street courts. Master the parabolic shot arc, sink three-pointers in rhythm, and trigger "On Fire" streak mode.',
    instructions: 'Click and drag to set shot angle and power. Release to shoot the basketball. Sink consecutive baskets to activate score multipliers!',
    controls: [
      { key: 'Mouse Drag & Release', action: 'Aim Shot Angle & Power' },
      { key: 'Spacebar', action: 'Quick Tap Shoot (Timed Mode)' },
      { key: 'R', action: 'Reset Ball' }
    ],
    tags: ['Basketball', 'Sports', 'Physics', 'Streetball', 'Arcade'],
    themeColor: '#f97316',
    accentColor: '#38bdf8',
    thumbnailUrl: streetHoopsCover,
    developer: 'DunkCity Games',
    releaseYear: '2026'
  },
  {
    id: 'g-mini-golf-world',
    slug: 'mini-golf-world',
    title: 'Mini Golf World',
    category: 'Casual',
    rating: 4.6,
    ratingCount: 890,
    plays: 51200,
    isNew: true,
    description: 'Putt your way across floating island courses complete with waterfalls, windmills, warp tunnels, and tricky ramps. Aim for a perfect Hole-in-One!',
    instructions: 'Pull back on the golf ball to adjust power and direction. Watch out for sand traps, water hazards, and moving obstacles!',
    controls: [
      { key: 'Click/Drag & Pull Back', action: 'Aim & Power' },
      { key: 'Release', action: 'Putt Golf Ball' },
      { key: 'R', action: 'Retry Hole' }
    ],
    tags: ['Mini Golf', 'Physics', 'Relaxing', 'Casual', 'Sports'],
    themeColor: '#2dd4bf',
    accentColor: '#facc15',
    thumbnailUrl: miniGolfCover,
    developer: 'Par3 Studios',
    releaseYear: '2026'
  },
  {
    id: 'g-zombie-escape',
    slug: 'zombie-escape',
    title: 'Zombie Escape',
    category: 'Shooter',
    rating: 4.8,
    ratingCount: 2190,
    plays: 138000,
    isTrending: true,
    isPopular: true,
    description: 'Post-apocalyptic ruins crawling with infected undead hordes! Arm yourself with shotguns and laser turrets to reach the evac chopper before midnight.',
    instructions: 'Dual-stick survival shooter. Move through urban alleyways, aim your weapon at shambling undead, reload wisely, and find the rescue point.',
    controls: [
      { key: 'WASD / Arrow Keys', action: 'Move Survivor' },
      { key: 'Mouse Aim & Click', action: 'Aim & Fire Weapons' },
      { key: 'R', action: 'Reload Clip' },
      { key: '1, 2, 3', action: 'Switch Guns' }
    ],
    tags: ['Zombies', 'Shooter', 'Survival', 'Horror', 'Action'],
    themeColor: '#84cc16',
    accentColor: '#ef4444',
    thumbnailUrl: zombieEscapeCover,
    developer: 'DeadZone Studio',
    releaseYear: '2026'
  },
  {
    id: 'g-desert-racer',
    slug: 'desert-racer',
    title: 'Desert Racer',
    category: 'Racing',
    rating: 4.7,
    ratingCount: 1330,
    plays: 74500,
    description: 'Dune buggy physics madness across rolling sand dunes. Catch insane air over canyon jumps, perform mid-air backflips, and beat the desert clock.',
    instructions: 'Balance your buggy throttle and mid-air rotation. Land flat on dune slopes to maintain maximum speed boost and avoid rollovers.',
    controls: [
      { key: '↑ / W', action: 'Gas / Accelerate' },
      { key: '↓ / S', action: 'Brake / Reverse' },
      { key: '← / → or A / D', action: 'Tilt / Balance Vehicle' },
      { key: 'Spacebar', action: 'Nitro Surge' }
    ],
    tags: ['Offroad', 'Physics', 'Racing', 'Buggy', 'Stunts'],
    themeColor: '#eab308',
    accentColor: '#f97316',
    thumbnailUrl: desertRacerCover,
    developer: 'DuneRiders',
    releaseYear: '2026'
  },
  {
    id: 'g-space-miner',
    slug: 'space-miner',
    title: 'Space Miner',
    category: 'Strategy',
    rating: 4.8,
    ratingCount: 1540,
    plays: 81200,
    description: 'Command an orbital mining drone! Laser-drill deep inside mineral-rich asteroids, collect rare platinum crystals, and upgrade your cargo refinery.',
    instructions: 'Fly your drone around asteroid clusters. Fire mining lasers at mineral veins, grab floating ore chunks, and deposit them into the base freighter.',
    controls: [
      { key: 'WASD / Arrow Keys', action: 'Pilot Drone' },
      { key: 'Mouse Click / Space', action: 'Fire Mining Laser' },
      { key: 'E', action: 'Tractor Beam' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Mining', 'Space', 'Resource Management', 'Strategy', 'Upgrades'],
    themeColor: '#38bdf8',
    accentColor: '#c084fc',
    thumbnailUrl: spaceMinerCover,
    developer: 'AstroCorp',
    releaseYear: '2026'
  },
  {
    id: 'g-castle-defender',
    slug: 'castle-defender',
    title: 'Castle Defender',
    category: 'Strategy',
    rating: 4.9,
    ratingCount: 2670,
    plays: 159000,
    featured: true,
    isPopular: true,
    description: 'Defend your medieval fortress from goblin siege engines! Build archer towers, cannon batteries, and call down devastating meteor storms.',
    instructions: 'Place defensive towers along siege pathways. Upgrade range and damage, and trigger castle gate ballistas when bosses approach.',
    controls: [
      { key: 'Mouse Click / Drag', action: 'Select & Place Towers' },
      { key: '1, 2, 3', action: 'Cast Special Spells' },
      { key: 'Spacebar', action: 'Speed up Wave Time' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Tower Defense', 'Strategy', 'Medieval', 'Fantasy', 'Siege'],
    themeColor: '#6366f1',
    accentColor: '#f43f5e',
    thumbnailUrl: castleDefenderCover,
    developer: 'Kingdom Lab',
    releaseYear: '2026'
  },
  {
    id: 'g-color-rush',
    slug: 'color-rush',
    title: 'Color Rush',
    category: 'Arcade',
    rating: 4.7,
    ratingCount: 950,
    plays: 62000,
    isNew: true,
    description: 'High-speed rhythm reflex test! Switch your orb color to match incoming neon barriers as the tempo accelerates into overdrive.',
    instructions: 'Tap or click to change your color aura. Pass only through barriers that match your current hue; mismatching results in instant shatter.',
    controls: [
      { key: 'Spacebar / Click / Tap', action: 'Switch Color State' },
      { key: '← / →', action: 'Shift Tunnel Lanes' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Rhythm', 'Reflex', 'Speed', 'Colors', 'Hyper Casual'],
    themeColor: '#ec4899',
    accentColor: '#00f0ff',
    thumbnailUrl: colorRushCover,
    developer: 'VibeWorks',
    releaseYear: '2026'
  },
  {
    id: 'g-fishing-frenzy',
    slug: 'fishing-frenzy',
    title: 'Fishing Frenzy',
    category: 'Casual',
    rating: 4.6,
    ratingCount: 820,
    plays: 49000,
    description: 'Relax on peaceful tranquil lakes or brave the deep sea. Cast your line, hook legendary prize fish, and build your exotic aquarium collection.',
    instructions: 'Cast your fishing hook into the water. Reel in gently when a fish bites, maintaining line tension in the green zone to land the catch.',
    controls: [
      { key: 'Click / Space (Hold & Release)', action: 'Cast Fishing Line' },
      { key: 'Spacebar (Hold)', action: 'Reel In Catch' },
      { key: '← / →', action: 'Steer Hook Underwater' }
    ],
    tags: ['Fishing', 'Relaxing', 'Nature', 'Casual', 'Collection'],
    themeColor: '#0ea5e9',
    accentColor: '#10b981',
    thumbnailUrl: fishingFrenzyCover,
    developer: 'BlueWaters',
    releaseYear: '2026'
  },
  {
    id: 'g-robot-brawl',
    slug: 'robot-brawl',
    title: 'Robot Brawl',
    category: 'Action',
    rating: 4.8,
    ratingCount: 1620,
    plays: 91000,
    description: 'Heavyweight cyber boxing in the underground mecha circuit! Throw titanium hooks, parry electric punches, and execute sparks-flying knockout combos.',
    instructions: 'Duck and weave around enemy jabs. Counter with powerful uppercuts and activate your overload kinetic blast when your power meter glows.',
    controls: [
      { key: '← / → or A / D', action: 'Dodge Left / Right' },
      { key: 'J / Space', action: 'Left Jab / Right Cross' },
      { key: 'K / Shift', action: 'Heavy Uppercut' },
      { key: 'S / ↓', action: 'Guard Shield' }
    ],
    tags: ['Boxing', 'Robots', 'Fighting', 'Action', 'Combo'],
    themeColor: '#f43f5e',
    accentColor: '#38bdf8',
    thumbnailUrl: robotBrawlCover,
    developer: 'Iron Fist',
    releaseYear: '2026'
  },
  {
    id: 'g-jungle-run',
    slug: 'jungle-run',
    title: 'Jungle Run',
    category: 'Adventure',
    rating: 4.9,
    ratingCount: 2840,
    plays: 182000,
    featured: true,
    isTrending: true,
    isPopular: true,
    description: '3D perspective endless escape through ancient Mayan temples! Dodge collapsing ruins, slide under fallen trees, and grab golden idol artifacts.',
    instructions: 'Navigate 3 lanes at breakneck speed. Swipe or use arrow keys to switch lanes, jump over stone barriers, and slide under low jungle roots.',
    controls: [
      { key: '← / → or A / D', action: 'Change Running Lane' },
      { key: '↑ / W / Space', action: 'Jump over Obstacles' },
      { key: '↓ / S', action: 'Slide Under Hazards' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Temple Run', '3D Runner', 'Jungle', 'Adventure', 'Addictive'],
    themeColor: '#15803d',
    accentColor: '#facc15',
    thumbnailUrl: jungleRunCover,
    developer: 'Safari Studios',
    releaseYear: '2026'
  },
  {
    id: 'g-gem-match',
    slug: 'gem-match',
    title: 'Gem Match',
    category: 'Puzzle',
    rating: 4.8,
    ratingCount: 2010,
    plays: 119000,
    isPopular: true,
    description: 'Sparkling jewel puzzle cascades! Swap glowing rubies, sapphires, and diamonds to create explosive hyper-cubes and lightning gem clears.',
    instructions: 'Swap adjacent gems to form rows or columns of 3 or more matching colors. Form 4-gem and 5-gem combos for special power crystals.',
    controls: [
      { key: 'Click / Drag Gem', action: 'Swap Adjacent Gems' },
      { key: 'R', action: 'Reshuffle Board' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Match 3', 'Jewels', 'Puzzle', 'Cascades', 'Relaxing'],
    themeColor: '#f472b6',
    accentColor: '#a855f7',
    thumbnailUrl: gemMatchCover,
    developer: 'JewelCraft',
    releaseYear: '2026'
  },
  {
    id: 'g-space-survivor',
    slug: 'space-survivor',
    title: 'Space Survivor',
    category: 'Action',
    rating: 4.9,
    ratingCount: 2890,
    plays: 176000,
    featured: true,
    isTrending: true,
    isPopular: true,
    description: 'Bullet-heaven roguelite in deep space! Pilot your flagship against infinite swarms of alien drones. Level up auto-firing plasma rings and lasers.',
    instructions: 'Move your ship around the battlefield. Weapons auto-fire at nearby threats. Pick up glowing energy orbs to level up and choose weapon synergies!',
    controls: [
      { key: 'WASD / Arrow Keys', action: 'Maneuver Flagship' },
      { key: 'Auto-Attack', action: 'Lasers Fire Automatically' },
      { key: 'Spacebar', action: 'Emergency EMP Burst' },
      { key: 'P', action: 'Pause / Level Up Menu' }
    ],
    tags: ['Vampire Survivors', 'Bullet Hell', 'Roguelite', 'Space', 'Upgrades'],
    themeColor: '#38bdf8',
    accentColor: '#f43f5e',
    thumbnailUrl: spaceSurvivorCover,
    developer: 'Vortex Rogues',
    releaseYear: '2026'
  },
  {
    id: 'g-battle-cars',
    slug: 'battle-cars',
    title: 'Battle Cars',
    category: 'Action',
    rating: 4.8,
    ratingCount: 1480,
    plays: 84300,
    isTrending: true,
    description: 'Enter the neon demolition derby! Equip heavy armor, spiked front bumpers, roof-mounted miniguns, and smash opposing combat vehicles to scrap.',
    instructions: 'Drive into enemy cars at full speed to deal ramming damage. Collect weapon crates for rockets, oil slicks, and repair wrenches.',
    controls: [
      { key: '↑ / W', action: 'Drive Forward' },
      { key: '↓ / S', action: 'Reverse / Brake' },
      { key: '← / → or A / D', action: 'Steer Vehicle' },
      { key: 'Spacebar', action: 'Fire Primary Weapon' },
      { key: 'Shift', action: 'Nitro Ram' }
    ],
    tags: ['Demolition Derby', 'Combat Racing', 'Vehicles', 'Action', 'Explosions'],
    themeColor: '#ef4444',
    accentColor: '#facc15',
    thumbnailUrl: battleCarsCover,
    developer: 'Anarchy Motors',
    releaseYear: '2026'
  },
  {
    id: 'g-dragon-flight',
    slug: 'dragon-flight',
    title: 'Dragon Flight',
    category: 'Adventure',
    rating: 4.9,
    ratingCount: 1820,
    plays: 96000,
    featured: true,
    isNew: true,
    description: 'Take flight on an ancient emerald dragon through glowing mystical mountains! Breathe torrents of flame onto dark wyverns and navigate crystal spires.',
    instructions: 'Tap Space or Screen to flap wings and gain altitude. Press F or J to fire explosive dragon breath fireballs at oncoming aerial enemies.',
    controls: [
      { key: 'Spacebar / Up Arrow', action: 'Flap Wings & Gain Altitude' },
      { key: 'F / J', action: 'Breathe Fireball' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Dragons', 'Flight', 'Fantasy', 'Fire Breath', 'Adventure'],
    themeColor: '#10b981',
    accentColor: '#f97316',
    thumbnailUrl: dragonFlightCover,
    developer: 'Mythic Sky Games',
    releaseYear: '2026'
  },
  {
    id: 'g-pirate-treasure',
    slug: 'pirate-treasure',
    title: 'Pirate Treasure',
    category: 'Adventure',
    rating: 4.7,
    ratingCount: 1190,
    plays: 68400,
    isNew: true,
    description: 'Captain your pirate sloop through treacherous Caribbean reefs! Seek out sunken treasure chests of Aztec gold while evading royal navy frigates.',
    instructions: 'Steer your sailing ship across tropical waters. Collect all 5 sunken gold chests without crashing into coral reefs or being sunk by warships.',
    controls: [
      { key: 'WASD / Arrow Keys', action: 'Steer & Accelerate Sloop' },
      { key: 'Spacebar', action: 'Fire Broadside Cannons' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Pirates', 'Sailing', 'Treasure', 'Naval Combat', 'Adventure'],
    themeColor: '#eab308',
    accentColor: '#0284c7',
    thumbnailUrl: pirateTreasureCover,
    developer: 'BlackFlag Studios',
    releaseYear: '2026'
  },
  {
    id: 'g-snowboard-hero',
    slug: 'snowboard-hero',
    title: 'Snowboard Hero',
    category: 'Sports',
    rating: 4.8,
    ratingCount: 1430,
    plays: 77800,
    isPopular: true,
    description: 'Carve down steep alpine powder peaks! Slalom around dense frozen pine trees, hit mega-ramps for 720 spins, and outrun the mountain avalanche.',
    instructions: 'Tilt left and right to carve down the mountain slope. Hit blue kicker ramps to get massive air and earn style trick points.',
    controls: [
      { key: '← / → or A / D', action: 'Carve Left / Right' },
      { key: 'Spacebar', action: 'Ollie / Jump Ramps' },
      { key: 'Shift', action: 'Speed Tuck' }
    ],
    tags: ['Snowboarding', 'Extreme Sports', 'Alpine', 'Tricks', 'Winter'],
    themeColor: '#00f0ff',
    accentColor: '#ef4444',
    thumbnailUrl: snowboardHeroCover,
    developer: 'Peak Performance',
    releaseYear: '2026'
  },
  {
    id: 'g-magic-academy',
    slug: 'magic-academy',
    title: 'Magic Academy',
    category: 'Puzzle',
    rating: 4.8,
    ratingCount: 1670,
    plays: 89100,
    featured: true,
    description: 'Enter the Grand Spire of Sorcery! Cast elemental spells from your wizard staff to shatter falling arcane runes before they overwhelm the courtyard.',
    instructions: 'Move your wizard mage along the bottom of the screen. Tap or click to fire arcane energy bolts directly at matching color spell runes.',
    controls: [
      { key: 'Mouse Move / Drag', action: 'Position Wizard' },
      { key: 'Mouse Click / Space', action: 'Cast Magic Spell' },
      { key: '1, 2, 3', action: 'Switch Element Type' }
    ],
    tags: ['Wizard', 'Magic', 'Runes', 'Spells', 'Puzzle'],
    themeColor: '#8b5cf6',
    accentColor: '#38bdf8',
    thumbnailUrl: magicAcademyCover,
    developer: 'Arcane Lore',
    releaseYear: '2026'
  },
  {
    id: 'g-cyber-samurai',
    slug: 'cyber-samurai',
    title: 'Cyber Samurai',
    category: 'Action',
    rating: 4.9,
    ratingCount: 2540,
    plays: 142000,
    isTrending: true,
    isPopular: true,
    description: 'Rooftop duel in Neo-Kyoto! Wield your high-frequency laser katana against swarms of corporate hunter drones with split-second parry timing.',
    instructions: 'Time your katana strikes with surgical precision. Slash drones as they enter your strike zone to build massive score streaks.',
    controls: [
      { key: 'Spacebar / J / Click', action: 'Slash Laser Katana' },
      { key: 'K / Shift', action: 'Deflect / Parry Shield' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Cyberpunk', 'Katana', 'Samurai', 'Slash', 'Action'],
    themeColor: '#00f0ff',
    accentColor: '#f43f5e',
    thumbnailUrl: cyberSamuraiCover,
    developer: 'Neon Bushido',
    releaseYear: '2026'
  },
  {
    id: 'g-farm-friends',
    slug: 'farm-friends',
    title: 'Farm Friends',
    category: 'Casual',
    rating: 4.7,
    ratingCount: 990,
    plays: 58000,
    description: 'Cultivate a sunny countryside paradise! Plant seeds across rich soil plots, water sprouts, harvest ripe carrots, and expand your family ranch.',
    instructions: 'Click empty soil plots to sow vegetable seeds. Wait for crops to ripen into golden harvests, then click to collect coins.',
    controls: [
      { key: 'Mouse Click / Tap', action: 'Plant / Harvest Crops' },
      { key: 'U', action: 'Upgrade Farm Tools' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Farming', 'Crops', 'Harvest', 'Relaxing', 'Casual'],
    themeColor: '#22c55e',
    accentColor: '#f97316',
    thumbnailUrl: farmFriendsCover,
    developer: 'Sunny Acre Games',
    releaseYear: '2026'
  },
  {
    id: 'g-haunted-house',
    slug: 'haunted-house',
    title: 'Haunted House',
    category: 'Puzzle',
    rating: 4.8,
    ratingCount: 1340,
    plays: 72000,
    description: 'Explore the pitch-black halls of Blackwood Manor. Sweep your ultraviolet flashlight to reveal hidden spectral ghosts and banish them back to the realm.',
    instructions: 'Move your flashlight beam across the dark room. Hold the light directly over floating apparitions until they fully dissipate.',
    controls: [
      { key: 'Mouse Move / Touch', action: 'Direct Flashlight Beam' },
      { key: 'Spacebar', action: 'Super UV Light Flash' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Horror', 'Haunted', 'Flashlight', 'Ghosts', 'Puzzle'],
    themeColor: '#a855f7',
    accentColor: '#facc15',
    thumbnailUrl: hauntedHouseCover,
    developer: 'Midnight Spooks',
    releaseYear: '2026'
  },
  {
    id: 'g-mecha-battle',
    slug: 'mecha-battle',
    title: 'Mecha Battle',
    category: 'Action',
    rating: 4.9,
    ratingCount: 2210,
    plays: 131000,
    isPopular: true,
    description: 'Heavy armor giant robot warfare! Step into the cockpit of the Vanguard Mecha to duel against colossal rogue Titan automatons with plasma railguns.',
    instructions: 'Maneuver your war machine across the combat arena. Fire primary cannons at the Titan boss while evading incoming rocket barrages.',
    controls: [
      { key: 'A / D or ← / →', action: 'Walk Mecha' },
      { key: 'Spacebar / Click', action: 'Fire Plasma Railgun' },
      { key: 'S / Shift', action: 'Deploy Force Field' }
    ],
    tags: ['Mecha', 'Giant Robots', 'Sci-Fi', 'Boss Battle', 'Action'],
    themeColor: '#0284c7',
    accentColor: '#ef4444',
    thumbnailUrl: mechaBattleCover,
    developer: 'Vanguard Dynamics',
    releaseYear: '2026'
  },
  {
    id: 'g-deep-sea-adventure',
    slug: 'deep-sea-adventure',
    title: 'Deep Sea Adventure',
    category: 'Adventure',
    rating: 4.8,
    ratingCount: 1470,
    plays: 83000,
    description: 'Submerge into oceanic abyssal trenches in an explorer submersible! Collect glowing deep-sea pearls to replenish oxygen and dodge giant predator anglerfish.',
    instructions: 'Pilot the submarine through dark waters. Collect luminous pearls to keep your oxygen meter full, avoiding jagged sea floor rocks and predators.',
    controls: [
      { key: 'WASD / Arrow Keys', action: 'Steer Submersible' },
      { key: 'Spacebar', action: 'Flash Floodlights' },
      { key: 'P', action: 'Pause Game' }
    ],
    tags: ['Submarine', 'Underwater', 'Ocean', 'Abyss', 'Adventure'],
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    thumbnailUrl: deepSeaCover,
    developer: 'Nautilus Labs',
    releaseYear: '2026'
  },
  {
    id: 'g-galaxy-commander',
    slug: 'galaxy-commander',
    title: 'Galaxy Commander',
    category: 'Strategy',
    rating: 4.9,
    ratingCount: 3120,
    plays: 194000,
    featured: true,
    isTrending: true,
    isPopular: true,
    description: 'Grand galactic conquest RTS! Build orbital fleets from your home world, dispatch star destroyers across warp lanes, and capture enemy stellar colonies.',
    instructions: 'Click your blue home planet, then click neutral or red enemy systems to dispatch half your fleet. Conquer all 4 planetary colonies to win!',
    controls: [
      { key: 'Mouse Click', action: 'Select & Dispatch Fleet' },
      { key: 'Drag Box', action: 'Select Multiple Planets' },
      { key: 'Spacebar', action: 'Warp Speed Mode' }
    ],
    tags: ['RTS', 'Space Strategy', 'Fleet', 'Galactic', 'Conquest'],
    themeColor: '#6366f1',
    accentColor: '#00f0ff',
    thumbnailUrl: galaxyCommanderCover,
    developer: 'Stellar Command',
    releaseYear: '2026'
  }
];
