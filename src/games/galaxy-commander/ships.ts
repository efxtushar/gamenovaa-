import { ShipConfig, ShipId } from './types';

export const PLAYABLE_SHIPS: ShipConfig[] = [
  {
    id: 'valkyrie',
    name: 'VALKYRIE INTERCEPTOR',
    class: 'LIGHT INTERCEPTOR • MK-IV',
    tagline: 'Supreme agility and rapid plasma dual-cannons for hit-and-run dominance.',
    speedRating: 92,
    firepowerRating: 78,
    shieldRating: 80,
    maneuverabilityRating: 95,
    baseHp: 100,
    baseShield: 100,
    speed: 6.4,
    turnSpeed: 0.22,
    fireRateCooldown: 10,
    ammoCapacity: 28,
    primaryColor: '#0ea5e9',
    accentColor: '#38bdf8',
    glowColor: '#00f0ff',
    bulletColor: '#00f0ff',
    bulletGlow: '#38bdf8',
    weaponName: 'PLASMA CANNON',
    bulletDamage: 20,
    bulletSpeed: 17,
    bulletRadius: 4,
    cannons: [
      { x: -14, y: 0 },
      { x: 14, y: 0 }
    ]
  },
  {
    id: 'dreadnought',
    name: 'DREADNOUGHT MK-II',
    class: 'HEAVY BATTLECRUISER',
    tagline: 'Fortified hull with quad high-caliber pulse cannons and overcharged shield generators.',
    speedRating: 65,
    firepowerRating: 95,
    shieldRating: 100,
    maneuverabilityRating: 60,
    baseHp: 130,
    baseShield: 130,
    speed: 4.9,
    turnSpeed: 0.14,
    fireRateCooldown: 14,
    ammoCapacity: 24,
    primaryColor: '#8b5cf6',
    accentColor: '#c084fc',
    glowColor: '#a855f7',
    bulletColor: '#c084fc',
    bulletGlow: '#9333ea',
    weaponName: 'PULSE CANNON',
    bulletDamage: 32,
    bulletSpeed: 15,
    bulletRadius: 5.5,
    cannons: [
      { x: -18, y: -4 },
      { x: -8, y: 2 },
      { x: 8, y: 2 },
      { x: 18, y: -4 }
    ]
  },
  {
    id: 'phantom',
    name: 'PHANTOM STRIKER',
    class: 'COVERT STRIKE FIGHTER',
    tagline: 'Experimental stealth fighter firing high-frequency triple laser lances with blistering speed.',
    speedRating: 88,
    firepowerRating: 88,
    shieldRating: 70,
    maneuverabilityRating: 88,
    baseHp: 90,
    baseShield: 80,
    speed: 6.8,
    turnSpeed: 0.20,
    fireRateCooldown: 8,
    ammoCapacity: 30,
    primaryColor: '#f43f5e',
    accentColor: '#fb7185',
    glowColor: '#f43f5e',
    bulletColor: '#fb7185',
    bulletGlow: '#f43f5e',
    weaponName: 'LASER LANCE',
    bulletDamage: 18,
    bulletSpeed: 19,
    bulletRadius: 3.5,
    cannons: [
      { x: -16, y: -2 },
      { x: 0, y: -16 },
      { x: 16, y: -2 }
    ]
  }
];

export function getShipConfig(id: ShipId): ShipConfig {
  return PLAYABLE_SHIPS.find(s => s.id === id) || PLAYABLE_SHIPS[0];
}

/**
 * Procedurally draws the player's spaceship on canvas
 */
export function drawPlayerShip(
  ctx: CanvasRenderingContext2D,
  ship: ShipConfig,
  x: number,
  y: number,
  bankAngle: number,
  shield: number,
  maxShield: number,
  hitFlash: number,
  time: number,
  muzzleFlash: boolean = false,
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(bankAngle);

  // Hit Flash
  if (hitFlash > 0) {
    ctx.filter = 'brightness(3) drop-shadow(0 0 16px #ef4444)';
  }

  // 1. ENGINE EXHAUST GLOW (ANIMATED)
  const pulse = Math.sin(time * 24) * 0.2 + 0.8;
  const flameLength = (20 + Math.random() * 8) * pulse;

  if (ship.id === 'valkyrie') {
    // Twin engines
    [-8, 8].forEach(exX => {
      const grad = ctx.createLinearGradient(exX, 14, exX, 14 + flameLength);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, ship.glowColor);
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(exX - 3, 14);
      ctx.lineTo(exX + 3, 14);
      ctx.lineTo(exX, 14 + flameLength);
      ctx.closePath();
      ctx.fill();
    });
  } else if (ship.id === 'dreadnought') {
    // Quad heavy engines
    [-14, -6, 6, 14].forEach(exX => {
      const grad = ctx.createLinearGradient(exX, 18, exX, 18 + flameLength * 1.2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, ship.glowColor);
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(exX - 3.5, 18);
      ctx.lineTo(exX + 3.5, 18);
      ctx.lineTo(exX, 18 + flameLength * 1.2);
      ctx.closePath();
      ctx.fill();
    });
  } else {
    // Phantom Tri-exhaust
    [-10, 0, 10].forEach(exX => {
      const len = exX === 0 ? flameLength * 1.3 : flameLength * 0.9;
      const grad = ctx.createLinearGradient(exX, 12, exX, 12 + len);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, ship.glowColor);
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(exX - 2.5, 12);
      ctx.lineTo(exX + 2.5, 12);
      ctx.lineTo(exX, 12 + len);
      ctx.closePath();
      ctx.fill();
    });
  }

  // 2. SHIELD DOME WITH IMPACT RIPPLE
  if (shield > 0) {
    const shieldRatio = shield / maxShield;
    const shieldAlpha = 0.2 + shieldRatio * 0.35 + (Math.sin(time * 6) + 1) * 0.05;
    ctx.save();
    ctx.strokeStyle = ship.glowColor;
    ctx.shadowColor = ship.glowColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = shieldAlpha;

    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 42, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle internal hexagonal / concentric energy ring
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 32, 0, 0, Math.PI * 2);
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = shieldAlpha * 0.4;
    ctx.stroke();

    ctx.restore();
  }

  // 3. SHIP HULL RENDERING
  if (ship.id === 'valkyrie') {
    // Sleek aerodynamic delta wing
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = ship.accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = ship.glowColor;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, -28); // Sharp nose
    ctx.lineTo(6, -12);
    ctx.lineTo(12, -4);
    ctx.lineTo(26, 14); // Right wingtip
    ctx.lineTo(16, 20);
    ctx.lineTo(8, 14);
    ctx.lineTo(0, 18);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-16, 20);
    ctx.lineTo(-26, 14); // Left wingtip
    ctx.lineTo(-12, -4);
    ctx.lineTo(-6, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Wing panel accents
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(6, -6);
    ctx.lineTo(14, 10);
    ctx.lineTo(0, 12);
    ctx.lineTo(-14, 10);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.fill();

    // Cyan Cockpit Visor
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, -8, 4.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dual Plasma Cannon Barrels
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-15, -6, 3, 18);
    ctx.fillRect(12, -6, 3, 18);
  } else if (ship.id === 'dreadnought') {
    // Heavy Armored Cruiser
    ctx.fillStyle = '#0b0914';
    ctx.strokeStyle = ship.accentColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ship.glowColor;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(14, -14);
    ctx.lineTo(24, -2);
    ctx.lineTo(30, 16); // Heavy right wing plate
    ctx.lineTo(20, 22);
    ctx.lineTo(0, 16);
    ctx.lineTo(-20, 22);
    ctx.lineTo(-30, 16); // Heavy left wing plate
    ctx.lineTo(-24, -2);
    ctx.lineTo(-14, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Heavy reinforced frontal armor plates
    ctx.fillStyle = '#2e1065';
    ctx.fillRect(-16, -6, 32, 12);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1;
    ctx.strokeRect(-16, -6, 32, 12);

    // Amethyst Energy Core
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Quad Cannons
    ctx.fillStyle = '#475569';
    ctx.fillRect(-19, -8, 3, 16);
    ctx.fillRect(-9, -4, 3, 14);
    ctx.fillRect(6, -4, 3, 14);
    ctx.fillRect(16, -8, 3, 16);
  } else {
    // Phantom Striker: Forward-swept stealth predator
    ctx.fillStyle = '#11050a';
    ctx.strokeStyle = ship.accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = ship.glowColor;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(0, -32); // Long stealth prow
    ctx.lineTo(8, -14);
    ctx.lineTo(26, -4); // Forward swept wing
    ctx.lineTo(22, 12);
    ctx.lineTo(10, 8);
    ctx.lineTo(0, 14);
    ctx.lineTo(-10, 8);
    ctx.lineTo(-22, 12);
    ctx.lineTo(-26, -4);
    ctx.lineTo(-8, -14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Crimson Stealth Canopy
    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -10, 4, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Triple Laser Emitters
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-17, -8, 2.5, 14);
    ctx.fillRect(-1.5, -20, 3, 12);
    ctx.fillRect(14.5, -8, 2.5, 14);
  }

  // 4. MUZZLE FLASH ON CANNON BARRELS
  if (muzzleFlash) {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = ship.glowColor;
    ctx.shadowBlur = 18;
    ship.cannons.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
