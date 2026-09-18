import {
  RoadSegment,
  Building,
  SceneryObject,
  SpeedTrap,
  DriftZone,
  JumpRamp,
  TrafficCar,
  Particle,
  SkidMark,
  ActiveEventState,
  RaceEvent
} from './types';
import {
  ROADS,
  BUILDINGS,
  OPEN_AREAS,
  WORLD_SCENERY,
  SPEED_TRAPS,
  DRIFT_ZONES,
  JUMP_RAMPS,
  WORLD_WIDTH,
  WORLD_HEIGHT
} from './worldMap';
import { RACE_EVENTS } from './eventsSystem';
import { drawTrafficCar } from './trafficSystem';
import { drawClassicBlackMuscleCar } from './muscleCarRenderer';

export interface WorldRenderOptions {
  ctx: CanvasRenderingContext2D;
  viewWidth: number;
  viewHeight: number;
  camX: number;
  camY: number;
  playerX: number;
  playerY: number;
  playerAngle: number;
  playerSpeed: number;
  wheelAngle: number;
  isBraking: boolean;
  isAccelerating: boolean;
  isNitro: boolean;
  jumpHeight: number;
  isDrifting: boolean;
  invulnerable: boolean;
  trafficCars: TrafficCar[];
  particles: Particle[];
  skidMarks: SkidMark[];
  activeEvent: ActiveEventState | null;
  nearbyEvent: RaceEvent | null;
  activeDriftZone: DriftZone | null;
  speedTrapFlash: number; // 0 to 1 flash opacity
  time: number;
}

export function renderOpenWorld(opts: WorldRenderOptions) {
  const {
    ctx,
    viewWidth,
    viewHeight,
    camX,
    camY,
    playerX,
    playerY,
    playerAngle,
    wheelAngle,
    isBraking,
    isAccelerating,
    isNitro,
    jumpHeight,
    invulnerable,
    trafficCars,
    particles,
    skidMarks,
    activeEvent,
    nearbyEvent,
    activeDriftZone,
    speedTrapFlash,
    time
  } = opts;

  // Viewport bounds with generous margin for seamless culling
  const pad = 240;
  const minX = camX - viewWidth / 2 - pad;
  const maxX = camX + viewWidth / 2 + pad;
  const minY = camY - viewHeight / 2 - pad;
  const maxY = camY + viewHeight / 2 + pad;

  ctx.save();
  // Center camera on camX, camY
  ctx.translate(viewWidth / 2 - camX, viewHeight / 2 - camY);

  // 1. BASE GROUND TILE & URBAN SOIL
  ctx.fillStyle = '#090d16'; // Deep midnight asphalt terrain
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  // Subtle synth city ground grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.035)';
  ctx.lineWidth = 1;
  const gridStep = 100;
  const startGX = Math.floor(minX / gridStep) * gridStep;
  const startGY = Math.floor(minY / gridStep) * gridStep;
  ctx.beginPath();
  for (let gx = startGX; gx < maxX; gx += gridStep) {
    ctx.moveTo(gx, minY);
    ctx.lineTo(gx, maxY);
  }
  for (let gy = startGY; gy < maxY; gy += gridStep) {
    ctx.moveTo(minX, gy);
    ctx.lineTo(maxX, gy);
  }
  ctx.stroke();

  // 2. OCEAN WATER & BEACH SHORELINE (West coastal sector: X < 450)
  if (minX < 550) {
    // Deep Ocean Water
    const waterGrad = ctx.createLinearGradient(0, minY, 400, minY);
    waterGrad.addColorStop(0, '#0c1a30');
    waterGrad.addColorStop(0.7, '#082f49');
    waterGrad.addColorStop(1, '#0e7490');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(minX, minY, Math.min(maxX, 450) - minX, maxY - minY);

    // Animated Ocean wave shimmer
    ctx.fillStyle = 'rgba(0, 245, 255, 0.15)';
    for (let wy = Math.floor(minY / 60) * 60; wy < maxY; wy += 50) {
      const waveOffset = Math.sin(wy * 0.05 + time * 0.003) * 35;
      ctx.fillRect(50 + waveOffset, wy, 200, 3);
    }

    // Golden Sunset Beach Sands (X: 100 to 450, Y: 2200 to 3600)
    if (maxY > 2150) {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(80, 2200, 320, 1400);

      // Wet Sand reflection edge
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.fillRect(80, 2200, 45, 1400);
    }
  }

  // 3. OPEN SPECIALIZED DISTRICTS & SKIDPADS
  for (const area of OPEN_AREAS) {
    if (
      area.x + area.width < minX ||
      area.x > maxX ||
      area.y + area.height < minY ||
      area.y > maxY
    ) {
      continue;
    }

    // Asphalt Pad
    ctx.fillStyle = area.color;
    ctx.beginPath();
    ctx.roundRect(area.x, area.y, area.width, area.height, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Specific styling for Drift Arena
    if (area.type === 'drift_arena') {
      // Outer neon barrier
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 4;
      ctx.strokeRect(area.x + 8, area.y + 8, area.width - 16, area.height - 16);

      // Giant center drift skidpad circle
      const cx = area.x + area.width / 2;
      const cy = area.y + area.height / 2;
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Painted Donut Skid Markings
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, 100, 0, Math.PI * 1.8);
      ctx.stroke();

      // Big arena text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '900 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEON DRIFT ARENA', cx, cy - 10);
    } else if (area.type === 'parking') {
      // Parking stall lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      for (let py = area.y + 20; py < area.y + area.height - 20; py += 35) {
        ctx.beginPath();
        ctx.moveTo(area.x + 15, py);
        ctx.lineTo(area.x + 75, py);
        ctx.moveTo(area.x + area.width - 75, py);
        ctx.lineTo(area.x + area.width - 15, py);
        ctx.stroke();
      }
    }
  }

  // 4. SKID MARKS (Permanent tire burnouts left on roads)
  if (skidMarks.length > 0) {
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (const sm of skidMarks) {
      if (
        (sm.x1 < minX && sm.x2 < minX) ||
        (sm.x1 > maxX && sm.x2 > maxX) ||
        (sm.y1 < minY && sm.y2 < minY) ||
        (sm.y1 > maxY && sm.y2 > maxY)
      ) {
        continue;
      }
      ctx.strokeStyle = `rgba(15, 17, 23, ${sm.alpha * 0.75})`;
      ctx.beginPath();
      ctx.moveTo(sm.x1, sm.y1);
      ctx.lineTo(sm.x2, sm.y2);
      ctx.stroke();
    }
  }

  // 5. CONNECTED ROADS & INTERSECTIONS
  for (const road of ROADS) {
    const minRoadX = Math.min(road.x1, road.x2) - road.width;
    const maxRoadX = Math.max(road.x1, road.x2) + road.width;
    const minRoadY = Math.min(road.y1, road.y2) - road.width;
    const maxRoadY = Math.max(road.y1, road.y2) + road.width;

    if (maxRoadX < minX || minRoadX > maxX || maxRoadY < minY || minRoadY > maxY) {
      continue;
    }

    const dx = road.x2 - road.x1;
    const dy = road.y2 - road.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    // A. Sidewalks & Curbs
    const curbExtra = road.type === 'highway' ? 14 : 20;
    ctx.strokeStyle = '#1e293b'; // Slate concrete sidewalk
    ctx.lineWidth = road.width + curbExtra * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();

    // B. Asphalt Surface
    ctx.strokeStyle = road.surface === 'bridge' ? '#131b2c' : '#0f172a';
    ctx.lineWidth = road.width;
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();

    // C. Wet Asphalt Sheen / Reflection
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = road.width * 0.7;
    ctx.beginPath();
    ctx.moveTo(road.x1, road.y1);
    ctx.lineTo(road.x2, road.y2);
    ctx.stroke();

    // D. Outer White Shoulder Lines
    const shoulderOffset = road.width * 0.44;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Left shoulder
    ctx.moveTo(road.x1 + nx * shoulderOffset, road.y1 + ny * shoulderOffset);
    ctx.lineTo(road.x2 + nx * shoulderOffset, road.y2 + ny * shoulderOffset);
    // Right shoulder
    ctx.moveTo(road.x1 - nx * shoulderOffset, road.y1 - ny * shoulderOffset);
    ctx.lineTo(road.x2 - nx * shoulderOffset, road.y2 - ny * shoulderOffset);
    ctx.stroke();

    // E. Center Yellow / Cyan Divider Lines
    if (road.lanes >= 2) {
      ctx.strokeStyle = road.type === 'highway' ? '#facc15' : 'rgba(254, 240, 138, 0.75)';
      ctx.lineWidth = 3;
      ctx.setLineDash([24, 18]);
      ctx.beginPath();
      ctx.moveTo(road.x1, road.y1);
      ctx.lineTo(road.x2, road.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // F. Special Tunnel Aesthetics
    if (road.type === 'tunnel') {
      // Concrete tunnel sidewalls & glowing rings
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(road.x1 + nx * (road.width / 2), road.y1 + ny * (road.width / 2));
      ctx.lineTo(road.x2 + nx * (road.width / 2), road.y2 + ny * (road.width / 2));
      ctx.moveTo(road.x1 - nx * (road.width / 2), road.y1 - ny * (road.width / 2));
      ctx.lineTo(road.x2 - nx * (road.width / 2), road.y2 - ny * (road.width / 2));
      ctx.stroke();

      // Tunnel ceiling lighting arches
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)';
      ctx.lineWidth = 3;
      for (let t = 0.05; t < 0.95; t += 0.08) {
        const tx = road.x1 + dx * t;
        const ty = road.y1 + dy * t;
        ctx.beginPath();
        ctx.moveTo(tx - nx * (road.width / 2), ty - ny * (road.width / 2));
        ctx.lineTo(tx + nx * (road.width / 2), ty + ny * (road.width / 2));
        ctx.stroke();
      }
    }

    // G. Special Suspension Bridge Aesthetics
    if (road.type === 'bridge') {
      // Glowing neon cable suspension pylons
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 5;
      const p1x = road.x1 + dx * 0.35;
      const p1y = road.y1 + dy * 0.35;
      const p2x = road.x1 + dx * 0.65;
      const p2y = road.y1 + dy * 0.65;

      // Pylon bases
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p1x - 14, p1y - road.width / 2 - 25, 28, road.width + 50);
      ctx.fillRect(p2x - 14, p2y - road.width / 2 - 25, 28, road.width + 50);

      // Suspension cable lines
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(road.x1, road.y1 - road.width / 2);
      ctx.lineTo(p1x, p1y - road.width / 2 - 20);
      ctx.lineTo(p2x, p2y - road.width / 2 - 20);
      ctx.lineTo(road.x2, road.y2 - road.width / 2);
      ctx.stroke();
    }
  }

  // 6. STREET FURNITURE & SCENERY OBJECTS (Palm trees, streetlights, traffic lights, cones, containers)
  for (const item of WORLD_SCENERY) {
    if (item.x < minX || item.x > maxX || item.y < minY || item.y > maxY) {
      continue;
    }

    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.angle) ctx.rotate(item.angle);

    switch (item.type) {
      case 'palm_tree': {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(12, 10, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk base
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Lush green/cyan palm fronds
        ctx.fillStyle = '#059669';
        for (let a = 0; a < 6; a++) {
          const frondAngle = a * (Math.PI / 3) + Math.sin(time * 0.002 + item.y) * 0.1;
          ctx.save();
          ctx.rotate(frondAngle);
          ctx.beginPath();
          ctx.ellipse(22, 0, 22, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Frond central stem
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(38, 0);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }

      case 'streetlight': {
        // Light Bloom on asphalt
        const lightGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
        lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
        lightGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
        lightGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 120, 0, Math.PI * 2);
        ctx.fill();

        // Lamp post
        ctx.fillStyle = '#475569';
        ctx.fillRect(-2, -2, 4, 4);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'traffic_light': {
        ctx.fillStyle = '#0f172a';
        ctx.roundRect(-7, -14, 14, 28, 3);
        ctx.fill();
        // Red, Amber, Green lenses
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(0, 8, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'cone': {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'container': {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(4, 4, 60, 28);
        ctx.fillStyle = item.color || '#2563eb';
        ctx.fillRect(0, 0, 60, 28);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, 60, 28);
        break;
      }

      case 'billboard': {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-60, -8, 120, 16);
        ctx.strokeStyle = item.color || '#00f5ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-60, -8, 120, 16);
        ctx.fillStyle = item.color || '#00f5ff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label || 'NEON DRIFT', 0, 0);
        break;
      }
    }

    ctx.restore();
  }

  // 7. JUMP RAMPS (Stunt launch zones)
  for (const ramp of JUMP_RAMPS) {
    if (ramp.x < minX || ramp.x > maxX || ramp.y < minY || ramp.y > maxY) {
      continue;
    }

    ctx.save();
    ctx.translate(ramp.x, ramp.y);
    ctx.rotate(ramp.angle);

    // Ramp surface with gradient elevation
    const rampGrad = ctx.createLinearGradient(0, ramp.length / 2, 0, -ramp.length / 2);
    rampGrad.addColorStop(0, '#1e293b');
    rampGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = rampGrad;
    ctx.beginPath();
    ctx.roundRect(-ramp.width / 2, -ramp.length / 2, ramp.width, ramp.length, 4);
    ctx.fill();

    // Chevrons
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-15, 6);
    ctx.lineTo(0, -6);
    ctx.lineTo(15, 6);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▲ JUMP ▲', 0, ramp.length / 2 + 14);

    ctx.restore();
  }

  // 8. DRIFT ZONES & SPEED TRAPS (World Activities)
  for (const dz of DRIFT_ZONES) {
    if (dz.x + dz.width < minX || dz.x > maxX || dz.y + dz.height < minY || dz.y > maxY) {
      continue;
    }

    // Glowing boundary
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(dz.x, dz.y, dz.width, dz.height);
    ctx.setLineDash([]);

    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`⚡ ${dz.name} (${dz.multiplier}X MULTIPLIER)`, dz.x + 12, dz.y + 24);
  }

  for (const st of SPEED_TRAPS) {
    if (st.x < minX || st.x > maxX || st.y < minY || st.y > maxY) {
      continue;
    }

    // Sensor line across road
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Camera icon
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(st.x - 14, st.y - 14, 28, 28);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(st.x - 14, st.y - 14, 28, 28);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR', st.x, st.y - 1);
    ctx.fillText(`${st.targetKmh}+`, st.x, st.y + 9);
  }

  // 9. EVENT TRIGGER MARKERS (Drive in to start street race)
  if (!activeEvent) {
    for (const ev of RACE_EVENTS) {
      const sp = ev.startPos;
      if (sp.x < minX || sp.x > maxX || sp.y < minY || sp.y > maxY) {
        continue;
      }

      ctx.save();
      ctx.translate(sp.x, sp.y);

      // Pulsing Holographic Ring
      const pulseR = 50 + Math.sin(time * 0.006) * 8;
      const ringGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, pulseR);
      ringGrad.addColorStop(0, 'rgba(0, 245, 255, 0.45)');
      ringGrad.addColorStop(0.7, 'rgba(0, 245, 255, 0.15)');
      ringGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.fill();

      // Outer glowing circle
      ctx.strokeStyle = ev.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating dashed ring
      ctx.save();
      ctx.rotate(time * 0.002);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Event Title Plate
      ctx.fillStyle = '#0a0d18';
      ctx.beginPath();
      ctx.roundRect(-75, -55, 150, 26, 6);
      ctx.fill();
      ctx.strokeStyle = ev.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🏁 ${ev.name.toUpperCase()}`, 0, -38);

      ctx.restore();
    }
  }

  // 10. ACTIVE EVENT CHECKPOINT GATES
  if (activeEvent) {
    const cpIdx = activeEvent.currentCheckpointIndex;
    const checkpoints = activeEvent.event.checkpoints;

    // Draw upcoming checkpoints (current active + next one)
    for (let i = cpIdx; i < Math.min(checkpoints.length, cpIdx + 2); i++) {
      const cp = checkpoints[i];
      const isCurrent = i === cpIdx;
      const cpColor = isCurrent ? '#00f5ff' : 'rgba(255, 255, 255, 0.5)';

      ctx.save();
      ctx.translate(cp.x, cp.y);

      // Expanding radar beacon
      const beaconR = isCurrent ? cp.radius + Math.sin(time * 0.008) * 8 : cp.radius * 0.8;
      ctx.strokeStyle = cpColor;
      ctx.lineWidth = isCurrent ? 5 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, beaconR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isCurrent ? 'rgba(0, 245, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.arc(0, 0, beaconR, 0, Math.PI * 2);
      ctx.fill();

      // Gate Flag text
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(cp.label || `GATE ${i + 1}`, 0, -beaconR - 8);

      ctx.restore();
    }
  }

  // 11. CITY BUILDINGS WITH 2.5D ELEVATED ROOFS & NEON SIGNS
  // Buildings are rendered with height projection relative to camera
  for (const b of BUILDINGS) {
    if (b.x + b.width < minX || b.x > maxX || b.y + b.height < minY || b.y > maxY) {
      continue;
    }

    const heightOffset = (b.height3D || 160) * 0.08;
    // Perspective roof shift towards screen center
    const shiftX = ((b.x + b.width / 2 - camX) / viewWidth) * heightOffset;
    const shiftY = ((b.y + b.height / 2 - camY) / viewHeight) * heightOffset;

    // Building Footprint Base Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(b.x + 8, b.y + 8, b.width, b.height);

    // Building Base / Facade Walls
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.width, b.height);

    // Wall Grid Windows
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    for (let wx = b.x + 16; wx < b.x + b.width - 16; wx += 28) {
      for (let wy = b.y + 16; wy < b.y + b.height - 16; wy += 28) {
        ctx.fillRect(wx, wy, 12, 12);
      }
    }

    // Extruded Roof Panel
    ctx.fillStyle = b.roofColor;
    ctx.beginPath();
    ctx.moveTo(b.x + shiftX, b.y + shiftY);
    ctx.lineTo(b.x + b.width + shiftX, b.y + shiftY);
    ctx.lineTo(b.x + b.width + shiftX, b.y + b.height + shiftY);
    ctx.lineTo(b.x + shiftX, b.y + b.height + shiftY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = b.neonColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Neon Rooftop Billboard Sign
    if (b.neonSign) {
      const rx = b.x + b.width / 2 + shiftX;
      const ry = b.y + b.height / 2 + shiftY;
      ctx.fillStyle = 'rgba(10, 14, 24, 0.9)';
      ctx.beginPath();
      ctx.roundRect(rx - 70, ry - 14, 140, 28, 4);
      ctx.fill();
      ctx.strokeStyle = b.neonColor;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = b.neonColor;
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = b.neonColor;
      ctx.shadowBlur = 8;
      ctx.fillText(b.neonSign, rx, ry);
      ctx.shadowBlur = 0;
    }
  }

  // 12. CITY AI TRAFFIC CARS
  for (const car of trafficCars) {
    if (car.x < minX || car.x > maxX || car.y < minY || car.y > maxY) {
      continue;
    }
    drawTrafficCar(ctx, car);
  }

  // 13. VISUAL PARTICLES (Nitro flames, tire smoke, sparks, airtime)
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;

    if (p.type === 'smoke') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'spark') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else if (p.type === 'nitro') {
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 14. PLAYER MUSCLE CAR (The classic glossy black muscle car)
  drawClassicBlackMuscleCar(ctx, {
    x: playerX,
    y: playerY,
    driftAngle: playerAngle,
    wheelAngle,
    isBraking,
    isAccelerating,
    isNitro,
    jumpHeight,
    invulnerable,
    scale: 1.05
  });

  ctx.restore(); // Restore camera translation

  // 15. SCREEN-SPACE POST-PROCESSING: SPEED TRAP FLASH
  if (speedTrapFlash > 0.02) {
    ctx.fillStyle = `rgba(255, 255, 255, ${speedTrapFlash * 0.6})`;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  // 16. NEARBY EVENT INTERACTION PROMPT
  if (nearbyEvent && !activeEvent) {
    ctx.save();
    const promptW = Math.min(viewWidth - 32, 420);
    const promptH = 68;
    const px = (viewWidth - promptW) / 2;
    const py = 90;

    ctx.fillStyle = 'rgba(10, 15, 26, 0.92)';
    ctx.beginPath();
    ctx.roundRect(px, py, promptW, promptH, 16);
    ctx.fill();
    ctx.strokeStyle = nearbyEvent.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`🏁 ${nearbyEvent.name.toUpperCase()}`, px + 20, py + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(nearbyEvent.description, px + 20, py + 48);

    // Call-to-action button badge
    ctx.fillStyle = nearbyEvent.color;
    ctx.beginPath();
    ctx.roundRect(px + promptW - 130, py + 16, 115, 36, 10);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.font = '900 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS [E] / TAP', px + promptW - 72, py + 38);

    ctx.restore();
  }
}
