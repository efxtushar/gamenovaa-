import { TrafficCar, RoadSegment } from './types';
import { ROADS, WORLD_WIDTH, WORLD_HEIGHT } from './worldMap';

const TRAFFIC_MODELS: ('sedan' | 'coupe' | 'suv' | 'van')[] = ['sedan', 'coupe', 'suv', 'van'];
const TRAFFIC_COLORS = [
  { body: '#e11d48', accent: '#fb7171' }, // Crimson
  { body: '#2563eb', accent: '#60a5fa' }, // Electric Blue
  { body: '#16a34a', accent: '#4ade80' }, // Emerald
  { body: '#d97706', accent: '#fbbf24' }, // Amber Cab
  { body: '#7c3aed', accent: '#c084fc' }, // Violet
  { body: '#0284c7', accent: '#38bdf8' }, // Cyan
  { body: '#475569', accent: '#94a3b8' }, // Slate Grey
  { body: '#f8fafc', accent: '#cbd5e1' }  // Silver White
];

export function initTrafficSystem(count: number = 14): TrafficCar[] {
  const cars: TrafficCar[] = [];

  for (let i = 0; i < count; i++) {
    const road = ROADS[i % ROADS.length];
    const t = 0.15 + (i / count) * 0.7; // distribute along road
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const laneOffset = dir === 1 ? -road.width * 0.22 : road.width * 0.22;

    const dx = road.x2 - road.x1;
    const dy = road.y2 - road.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const baseX = road.x1 + dx * t;
    const baseY = road.y1 + dy * t;
    const x = baseX + nx * laneOffset;
    const y = baseY + ny * laneOffset;

    let angle = Math.atan2(dy, dx) - Math.PI * 0.5;
    if (dir === -1) {
      angle += Math.PI;
    }

    const colorScheme = TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
    const baseSpeed = 3.2 + (i % 4) * 0.6; // ~70-110 km/h

    cars.push({
      id: i + 1,
      x,
      y,
      vx: Math.sin(angle) * baseSpeed,
      vy: -Math.cos(angle) * baseSpeed,
      speed: baseSpeed,
      baseSpeed,
      angle,
      color: colorScheme.body,
      accentColor: colorScheme.accent,
      model: TRAFFIC_MODELS[i % TRAFFIC_MODELS.length],
      width: 32,
      height: 58,
      roadId: road.id,
      laneOffset,
      direction: dir,
      isBraking: false
    });
  }

  return cars;
}

export function updateTrafficCars(
  cars: TrafficCar[],
  playerX: number,
  playerY: number,
  playerSpeed: number
) {
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const road = ROADS.find((r) => r.id === car.roadId) || ROADS[0];

    const dx = road.x2 - road.x1;
    const dy = road.y2 - road.y1;
    const roadLen = Math.hypot(dx, dy) || 1;
    const ux = dx / roadLen;
    const uy = dy / roadLen;
    const nx = -uy;
    const ny = ux;

    // Check distance to player in front
    const distToPlayer = Math.hypot(car.x - playerX, car.y - playerY);
    const forwardX = Math.sin(car.angle);
    const forwardY = -Math.cos(car.angle);

    // Vector to player
    const toPlayerX = playerX - car.x;
    const toPlayerY = playerY - car.y;
    const dotPlayer = forwardX * toPlayerX + forwardY * toPlayerY;

    // Check distance to other traffic cars in front
    let carAheadDist = 9999;
    for (let j = 0; j < cars.length; j++) {
      if (i === j) continue;
      const other = cars[j];
      const dist = Math.hypot(other.x - car.x, other.y - car.y);
      const dot = forwardX * (other.x - car.x) + forwardY * (other.y - car.y);
      if (dot > 0 && dist < carAheadDist) {
        carAheadDist = dist;
      }
    }

    // Adaptive braking
    if ((dotPlayer > 0 && distToPlayer < 90) || carAheadDist < 70) {
      car.isBraking = true;
      car.speed = Math.max(0.5, car.speed - 0.2);
    } else {
      car.isBraking = false;
      car.speed = Math.min(car.baseSpeed, car.speed + 0.08);
    }

    // Move along road direction
    const step = car.speed * car.direction;
    car.x += ux * step;
    car.y += uy * step;

    // Keep car aligned along lane center
    // Project current pos onto road
    const toCarX = car.x - road.x1;
    const toCarY = car.y - road.y1;
    const proj = toCarX * ux + toCarY * uy;

    // Road bounds check & looping
    if (proj > roadLen - 40 && car.direction === 1) {
      // Find intersecting or reverse road
      car.direction = -1;
      car.laneOffset = road.width * 0.22;
      car.angle += Math.PI;
    } else if (proj < 40 && car.direction === -1) {
      car.direction = 1;
      car.laneOffset = -road.width * 0.22;
      car.angle -= Math.PI;
    }

    // Re-lock lane lateral position
    const targetX = road.x1 + ux * proj + nx * car.laneOffset;
    const targetY = road.y1 + uy * proj + ny * car.laneOffset;
    car.x += (targetX - car.x) * 0.1;
    car.y += (targetY - car.y) * 0.1;
  }
}

export function drawTrafficCar(ctx: CanvasRenderingContext2D, car: TrafficCar) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // Drop Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Headlights beam (Volumetric forward light cone)
  const beamGrad = ctx.createLinearGradient(0, -28, 0, -160);
  beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  beamGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.25)');
  beamGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(-10, -28);
  ctx.lineTo(-28, -150);
  ctx.lineTo(28, -150);
  ctx.lineTo(10, -28);
  ctx.closePath();
  ctx.fill();

  // Car Body
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-14, -26, 28, 52, 6);
  ctx.fill();

  // Roof / Cabin
  ctx.fillStyle = '#0a0d16';
  ctx.beginPath();
  ctx.roundRect(-11, -14, 22, 30, 4);
  ctx.fill();

  // Windshield
  ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.fillRect(-9, -12, 18, 7);
  // Rear glass
  ctx.fillRect(-9, 8, 18, 5);

  // Front Headlights
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-12, -26, 5, 3);
  ctx.fillRect(7, -26, 5, 3);

  // Taillights (Red or bright red flare if braking)
  ctx.fillStyle = car.isBraking ? '#ff0033' : '#b91c1c';
  ctx.fillRect(-12, 24, 6, 3);
  ctx.fillRect(6, 24, 6, 3);

  if (car.isBraking) {
    ctx.fillStyle = 'rgba(255, 0, 50, 0.5)';
    ctx.beginPath();
    ctx.arc(-9, 25, 8, 0, Math.PI * 2);
    ctx.arc(9, 25, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
